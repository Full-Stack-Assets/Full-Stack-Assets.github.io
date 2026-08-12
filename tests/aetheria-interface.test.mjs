import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('aetheria/index.html', 'utf8');

test('approved Aetheria generative-audio workspace is present', () => {
  for (const label of [
    'AETHERIA',
    'One Workspace for Generative Audio',
    'Music',
    'SFX',
    'Narration',
    'Agents',
    'Voices',
    'Recent Creations',
    'AI Audio',
    'ElevenLabs',
    'Creator Tools',
  ]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /review-only/i);
  assert.doesNotMatch(html, /sk-proj-/i);
});
