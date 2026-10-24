'use strict';
const net = require('node:net');
const http = require('node:http');

// Explicit local endpoints only. Never scan ports, resolve arbitrary hosts, or execute commands.
function declaredServices(pkg, limit = 24) {
  const input = pkg?.cassets?.services;
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const result = [];
  for (const item of input.slice(0, 100)) {
    if (result.length >= limit) break;
    if (!item || typeof item.name !== 'string' || typeof item.port !== 'number') continue;
    const name = item.name.trim();
    const port = item.port;
    if (!name || name.length > 80 || !Number.isInteger(port) || port < 1 || port > 65535) continue;
    const host = item.host === '::1' ? '::1' : item.host === '127.0.0.1' || item.host === undefined ? '127.0.0.1' : null;
    if (!host || seen.has(name)) continue;
    seen.add(name);
    const healthPath = typeof item.healthPath === 'string' && /^\/[a-zA-Z0-9/_-]{0,120}$/.test(item.healthPath) ? item.healthPath : null;
    result.push({ name, host, port, healthPath, dependsOn: Array.isArray(item.dependsOn) ?
      item.dependsOn.filter(x => typeof x === 'string' && x.length <= 80).slice(0, 20) : [] });
  }
  return result;
}

function dependencies(services) {
  const known = new Set(services.map(s => s.name));
  const edges = [];
  const missing = [];
  for (const service of services) {
    for (const dep of service.dependsOn) {
      if (known.has(dep)) edges.push({ from: service.name, to: dep });
      else missing.push({ from: service.name, to: dep });
    }
  }
  const adjacency = new Map(services.map(s => [s.name, []]));
  for (const edge of edges) adjacency.get(edge.from).push(edge.to);
  const visiting = new Set(), visited = new Set(), cycles = new Set();
  function visit(node) {
    if (visiting.has(node)) { cycles.add(node); return; }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of adjacency.get(node) || []) visit(next);
    visiting.delete(node);
    visited.add(node);
  }
  for (const s of services) visit(s.name);
  return { edges, missing, cyclic: cycles.size > 0 };
}

function tcpProbe(service, timeoutMs = 1200) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (status, reason) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ name: service.name, host: service.host, port: service.port, status, reason });
    };
    socket.setTimeout(Math.max(100, Math.min(timeoutMs, 3000)));
    socket.once('connect', () => finish('reachable', 'TCP accepted; application health not verified'));
    socket.once('timeout', () => finish('unreachable', 'Connection timed out'));
    socket.once('error', error => finish('unreachable', error.code || 'Connection failed'));
    try { socket.connect(service.port, service.host); }
    catch { finish('unreachable', 'Connection failed'); }
  });
}

function httpProbe(service, timeoutMs = 1200) {
  return new Promise(resolve => {
    let settled = false;
    const finish = (status, reason) => {
      if (settled) return;
      settled = true;
      resolve({ name: service.name, host: service.host, port: service.port, status, reason });
    };
    const req = http.request({ host: service.host, port: service.port, path: service.healthPath,
      method: 'GET', agent: false, timeout: Math.max(100, Math.min(timeoutMs, 3000)),
      headers: { Accept: 'application/json' } }, res => {
      const code = res.statusCode || 0;
      res.destroy();
      finish(code >= 200 && code < 300 ? 'healthy' : 'unhealthy', 'HTTP ' + code + '; downstream health not verified');
    });
    req.once('timeout', () => { req.destroy(); finish('unreachable', 'HTTP timed out'); });
    req.once('error', err => finish('unreachable', err.code || 'HTTP request failed'));
    req.end();
  });
}

async function checkServices(services, probe = service => service.healthPath ? httpProbe(service) : tcpProbe(service)) {
  const output = [];
  // Sequential and bounded: do not flood local ports or launch services.
  for (const service of services.slice(0, 24)) output.push(await probe(service));
  return output;
}

module.exports = { declaredServices, dependencies, tcpProbe, httpProbe, checkServices };
