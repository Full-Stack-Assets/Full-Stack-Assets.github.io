import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectFile = relativePath => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const readProjectFile = relativePath => fs.readFileSync(projectFile(relativePath), 'utf8');
const html = readProjectFile('buildgraph/index.html');
const script = readProjectFile('buildgraph/app.js');

function attribute(markup, name) {
  const match = markup.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? null;
}

function openingTags(name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => match[0]);
}

function controls(name) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, 'gi'))]
    .map(match => ({ opening: `<${name}${match[1]}>`, content: match[2] }));
}

function hasAccessibleName(opening, content = '') {
  if (attribute(opening, 'aria-label')?.trim() || attribute(opening, 'aria-labelledby')?.trim()) return true;
  const id = attribute(opening, 'id');
  if (id && new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*(["'])${id}\\1`, 'i').test(html)) return true;
  if (controls('label').some(label => label.content.includes(opening))) return true;
  return content.replace(/<[^>]+>/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ').trim().length > 0;
}

function actionControl(action) {
  return controls('button').find(control => attribute(control.opening, 'data-action') === action);
}

test('workspace exposes semantic, named page landmarks', () => {
  assert.equal(openingTags('header').length >= 1, true, 'a page header is required');
  assert.equal(openingTags('main').length, 1, 'the workspace must have exactly one main landmark');

  const navigation = openingTags('nav');
  assert.equal(navigation.length >= 1, true, 'workspace navigation is required');
  assert.equal(navigation.every(tag => attribute(tag, 'aria-label') || attribute(tag, 'aria-labelledby')), true,
    'every navigation landmark must have an accessible name');
  assert.match(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/i, 'the page needs a visible h1');
});

test('project search and filters are labelled and announce their results', () => {
  const search = openingTags('input').find(tag => attribute(tag, 'type')?.toLowerCase() === 'search');
  assert.ok(search, 'a search input is required');
  assert.equal(hasAccessibleName(search), true, 'the search input must have an accessible name');
  assert.match(search, /\bdata-search\b/i, 'the search input needs the data-search behavior hook');

  const filters = openingTags('select').filter(tag => /\bdata-filter\b/i.test(tag));
  assert.equal(filters.length >= 1, true, 'at least one project filter is required');
  assert.equal(filters.every(tag => hasAccessibleName(tag)), true, 'every project filter must have an accessible name');

  const resultCount = [...openingTags('span'), ...openingTags('output'), ...openingTags('small')]
    .find(tag => /\bdata-(?:result|project)-count\b/i.test(tag));
  assert.ok(resultCount, 'a data-result-count or data-project-count status is required');
  assert.equal(attribute(resultCount, 'aria-live'), 'polite', 'filtered result totals must be announced politely');

  const clear = actionControl('clear-filters');
  assert.ok(clear, 'a clear-filters button is required');
  assert.equal(hasAccessibleName(clear.opening, clear.content), true, 'the clear-filters button must have a name');
});

test('workspace import, export, and project document controls are available', () => {
  const importControl = actionControl('import-workspace') ?? actionControl('import');
  assert.ok(importControl, 'an import or import-workspace button is required');
  assert.equal(hasAccessibleName(importControl.opening, importControl.content), true,
    'the workspace import button must have an accessible name');

  const fileInputs = openingTags('input').filter(tag => attribute(tag, 'type')?.toLowerCase() === 'file');
  const jsonInput = fileInputs.find(tag => /(?:application\/json|\.json)/i.test(attribute(tag, 'accept') ?? ''));
  assert.ok(jsonInput, 'workspace import needs a JSON file input');

  for (const format of ['json', 'csv', 'markdown', 'zip']) {
    const control = actionControl(`export-${format}`)
      ?? controls('button').find(button => attribute(button.opening, 'data-export') === format);
    assert.ok(control, `an export control for ${format} is required`);
    assert.equal(hasAccessibleName(control.opening, control.content), true, `export-${format} must have an accessible name`);
  }

  const documentInput = fileInputs.find(tag => /\bdata-document-input\b/i.test(tag));
  assert.ok(documentInput, 'document upload needs a dedicated file input');
  assert.match(`${html}\n${script}`, /upload-document|data-document-input/i,
    'the application must expose document upload behavior');
  for (const action of ['download-document', 'delete-document']) {
    const control = actionControl(action);
    assert.ok(control, `a ${action} control is required`);
    assert.equal(hasAccessibleName(control.opening, control.content), true, `${action} must have an accessible name`);
  }
});

test('the interactive application is loaded as a local JavaScript module', () => {
  assert.equal(fs.existsSync(projectFile('buildgraph/styles.css')), true, 'styles.css must exist');
  assert.equal(fs.existsSync(projectFile('buildgraph/core.mjs')), true, 'core.mjs must exist');
  assert.equal(fs.existsSync(projectFile('buildgraph/data/projects.json')), true, 'projects.json must exist');

  const moduleScript = openingTags('script').find(tag => attribute(tag, 'src') === './app.js');
  assert.ok(moduleScript, 'index.html must load ./app.js');
  assert.equal(attribute(moduleScript, 'type'), 'module', 'app.js must be loaded with type="module"');
  assert.match(script, /from\s+['"]\.\/core\.mjs['"]/, 'app.js must use the tested workspace core');
  assert.match(script, /(?:fetch\s*\(|projects\.json)/, 'app.js must load the public project data');
  assert.match(script, /window\.BuildGraph\s*=\s*Object\.freeze/, 'app.js must expose the local integration API');
  assert.match(script, /importWorkspace\s*\(/, 'the integration API must support validated workspace imports');
  assert.doesNotMatch(`${html}\n${script}`, /sk-proj-|api[_-]?key\s*[:=]|authorization\s*[:=]/i);
});

test('dialogs, live notifications, buttons, and links expose accessible contracts', () => {
  const dialogs = controls('dialog');
  assert.equal(dialogs.length >= 1, true, 'at least one native dialog is required');
  for (const dialog of dialogs) {
    const labelledBy = attribute(dialog.opening, 'aria-labelledby');
    assert.ok(labelledBy, 'every dialog must use aria-labelledby');
    assert.match(html, new RegExp(`\\bid\\s*=\\s*(["'])${labelledBy}\\1`, 'i'),
      `dialog label ${labelledBy} must exist`);
    const localButtons = [...dialog.content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
      .map(match => ({ opening: `<button${match[1]}>`, content: match[2] }));
    const close = localButtons.find(control =>
      /\bdata-dialog-close\b/i.test(control.opening) || attribute(control.opening, 'value') === 'cancel');
    assert.ok(close, `dialog ${labelledBy} needs a cancel or data-dialog-close control`);
    assert.equal(hasAccessibleName(close.opening, close.content), true,
      `dialog ${labelledBy} close control must have an accessible name`);
  }

  const toast = [...openingTags('div'), ...openingTags('output')]
    .find(tag => /\bdata-toast(?:-region)?\b/i.test(tag));
  assert.ok(toast, 'a data-toast live notification region is required');
  assert.equal(attribute(toast, 'role'), 'status');
  assert.equal(attribute(toast, 'aria-live'), 'polite');
  assert.equal(attribute(toast, 'aria-atomic'), 'true');

  for (const button of controls('button')) {
    assert.equal(hasAccessibleName(button.opening, button.content), true, 'every button must have an accessible name');
  }

  const anchors = controls('a');
  assert.equal(anchors.length >= 1, true, 'the workspace needs at least one link');
  for (const anchor of anchors) {
    const href = attribute(anchor.opening, 'href');
    assert.ok(href, 'every link must have an href');
    assert.doesNotMatch(href.trim(), /^javascript:/i, 'links may not use javascript: URLs');
    assert.equal(hasAccessibleName(anchor.opening, anchor.content), true, 'every link must have an accessible name');
    if (attribute(anchor.opening, 'target') === '_blank') {
      const rel = new Set((attribute(anchor.opening, 'rel') ?? '').toLowerCase().split(/\s+/));
      assert.equal(rel.has('noopener') && rel.has('noreferrer'), true,
        'links opening a new tab must use rel="noopener noreferrer"');
    }
  }
});
