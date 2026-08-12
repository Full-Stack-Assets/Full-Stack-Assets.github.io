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

test('linked local assets exist and preserve review-only behavior', () => {
  assert.equal(fs.existsSync('aetheria/styles.css'), true, 'styles.css must exist');
  assert.equal(fs.existsSync('aetheria/app.js'), true, 'app.js must exist');

  const css = fs.readFileSync('aetheria/styles.css', 'utf8');
  const script = fs.readFileSync('aetheria/app.js', 'utf8');

  assert.match(css, /@media\s*\(max-width:/);
  assert.match(css, /\.tool-card/);
  assert.match(script, /data-action/);
  assert.match(script, /local synthetic preview/i);
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(script, /sk-proj-|api[_-]?key|authorization/i);
});
