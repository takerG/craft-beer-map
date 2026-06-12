import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('all platform-dependent capabilities default to blocked', () => {
  const capabilities = JSON.parse(
    fs.readFileSync('ai-mode/experiments/platform-capabilities.json', 'utf8'),
  );

  assert.equal(capabilities.status, 'blocked');
  for (const value of Object.values(capabilities.capabilities)) {
    assert.equal(value.status, 'unverified');
    assert.equal(value.evidence, null);
  }
});
