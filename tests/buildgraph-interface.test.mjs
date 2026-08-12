import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('buildgraph/index.html', 'utf8');

test('approved BuildGraph memory and reuse dashboard is present', () => {
  for (const label of [
    'BUILDGRAPH OS',
    'Project Memory, Reuse & Duplicate-Work Prevention',
    'Projects',
    'Assets',
    'Duplicates Found',
    'Top Duplicates',
    'Knowledge Graph',
    'Developer Tools',
    '87',
    '3,601',
    '487',
  ]) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(html, /review snapshot/i);
  assert.doesNotMatch(html, /sk-proj-/i);
});
