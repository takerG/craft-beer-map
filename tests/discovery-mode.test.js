import test from 'node:test';
import assert from 'node:assert/strict';

import { getDetailPanelMode, shouldUseDiscoveryExperience } from '../src/discovery-mode.js';

test('discovery experience is enabled for mobile and desktop widths', () => {
  assert.equal(shouldUseDiscoveryExperience(390), true);
  assert.equal(shouldUseDiscoveryExperience(1440), true);
});

test('detail panel uses the same bottom sheet mode on every viewport', () => {
  assert.equal(getDetailPanelMode(390), 'bottom-sheet');
  assert.equal(getDetailPanelMode(1440), 'bottom-sheet');
});
