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

test('snapshot examples come from the verified 2026-08-11 import bundle', () => {
  assert.match(html, /Observed 2026-08-11T20:10:00\.000Z/);
  assert.match(html, /c017fe69393ce3b0/);
  for (const name of [
    'Nichesmith_Real_Estate_Agent_Prompt_Pack.docx',
    'Nichesmith_Loan_Officer_Prompt_Pack.docx',
    'nichesmith-logo-light.svg',
    'support.js',
    'HostGraph-Procurement-Command-Center',
    'tradewind-dealflow',
    'BeyondMythos.com',
    '-MoviesRule.com',
  ]) {
    assert.match(html, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(html, /Authentication Service|Payment Integration|User Dashboard|Reporting Module/);
  assert.doesNotMatch(html, /42 reusable assets|61 reusable assets|39 reusable assets/);
});
