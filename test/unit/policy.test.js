const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultManifest, enabled } = require('../../src/modules/policy');

test('auto npmignore is only enabled for publishable packages', () => {
  const base = { node: true, publishableNpm: false };
  const manifest = defaultManifest(base);
  assert.equal(enabled('npmignore', base, manifest, { npmignore: 'auto' }), false);
  assert.equal(enabled('npmignore', { ...base, publishableNpm: true }, manifest, { npmignore: 'auto' }), true);
});

test('dismissed templates stay disabled', () => {
  const stack = { node: true, publishableNpm: true };
  const manifest = defaultManifest(stack);
  manifest.dismissed = ['npmignore'];
  assert.equal(enabled('npmignore', stack, manifest, { npmignore: 'always' }), false);
});
