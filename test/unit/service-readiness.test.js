'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { declaredServices, dependencies, checkServices } = require('../../src/modules/service-readiness');

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
