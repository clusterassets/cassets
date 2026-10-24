'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { declaredServices, dependencies, checkServices, httpProbe } = require('../../src/modules/service-readiness');

test('only explicit safe loopback service declarations are accepted', () => {
  const services = declaredServices({ cassets: { services: [
    { name: 'api', port: 3000, dependsOn: ['postgres'] },
    { name: 'remote', host: 'example.com', port: 443 },
    { name: 'bad', port: -1 },
    { name: 'api', port: 4000 },
    { name: 'postgres', host: '::1', port: 5432 }
  ] } });
  assert.deepEqual(services.map(x => x.name), ['api', 'postgres']);
  assert.equal(services[0].host, '127.0.0.1');
});

test('dependency analysis reports missing references and cycles separately', () => {
  const graph = dependencies([
    { name: 'a', dependsOn: ['b', 'unknown'] },
    { name: 'b', dependsOn: ['a'] }
  ]);
  assert.equal(graph.cyclic, true);
  assert.deepEqual(graph.missing, [{ from: 'a', to: 'unknown' }]);
});

test('checks are opt-in, sequential and never imply application health', async () => {
  const calls = [];
  const result = await checkServices([
    { name: 'db', host: '127.0.0.1', port: 5432 },
    { name: 'api', host: '127.0.0.1', port: 3000 }
  ], async s => { calls.push(s.name); return { name: s.name, status: 'reachable' }; });
  assert.deepEqual(calls, ['db', 'api']);
  assert.equal(result.length, 2);
});

test('unconfigured packages do not trigger inferred network probes', () => {
  assert.deepEqual(declaredServices({ scripts: { dev: 'node index.js' } }), []);
});

test('HTTP health paths are strictly local and cannot contain query or redirect URLs', () => {
  const services = declaredServices({ cassets: { services: [
    { name: 'api', port: 3000, healthPath: '/health/live' },
    { name: 'bad', port: 3001, healthPath: '//evil.example' },
    { name: 'query', port: 3002, healthPath: '/health?token=x' }
  ] } });
  assert.equal(services[0].healthPath, '/health/live');
  assert.equal(services[1].healthPath, null);
  assert.equal(services[2].healthPath, null);
});

test('HTTP 2xx is healthy, HTTP 503 unhealthy, and redirects are not followed', async () => {
  const http = require('node:http');
  const server = http.createServer((req, res) => {
    res.statusCode = req.url === '/ready' ? 200 : req.url === '/redirect' ? 302 : 503;
    res.end('ok');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const probe = healthPath => httpProbe({ name: 'api', host: '127.0.0.1', port, healthPath });
    assert.equal((await probe('/ready')).status, 'healthy');
    assert.equal((await probe('/fail')).status, 'unhealthy');
    assert.equal((await probe('/redirect')).status, 'unhealthy');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
