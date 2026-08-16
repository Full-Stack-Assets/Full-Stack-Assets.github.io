import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('../buildgraph/data/projects.json', import.meta.url));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function collectStrings(value, path = '$', found = []) {
  if (typeof value === 'string') {
    found.push({ path, value });
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => collectStrings(item, `${path}.${key}`, found));
  }
  return found;
}

function absoluteUrls(value) {
  return collectStrings(value).flatMap(entry => {
    if (!/^https?:\/\//i.test(entry.value.trim())) return [];
    return [{ ...entry, url: new URL(entry.value) }];
  });
}

test('public repository artifact uses schema version 1', () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(Array.isArray(data.repositories), true);
  assert.equal(data.repositories.length > 0, true, 'the public catalog must include repository evidence');
});

test('source declaration and repository records are public-only', () => {
  assert.equal(data.source?.visibility, 'public-only');
  assert.equal(data.source?.provider, 'GitHub');
  assert.equal(data.source?.publicRepositories, data.repositories.length,
    'the declared public count must match the artifact');

  const privateRecords = data.repositories.filter(repository =>
    repository?.visibility !== 'public' || repository?.private === true);
  assert.deepEqual(privateRecords.map(repository => repository.fullName ?? repository.name), [],
    'the public artifact must contain exactly zero private or non-public repository records');
});

test('repository evidence has stable, unique identifiers', () => {
  const ids = data.repositories.map(repository => repository.id);
  assert.equal(ids.every(id => ['number', 'string'].includes(typeof id) && String(id).length > 0), true,
    'every repository needs a non-empty GitHub id');
  assert.equal(new Set(ids.map(String)).size, ids.length, 'repository ids must be unique');

  for (const repository of data.repositories) {
    assert.equal(typeof repository.name, 'string');
    assert.equal(repository.fullName, `${data.source.owner}/${repository.name}`);
    assert.match(repository.htmlUrl, /^https:\/\/github\.com\//i);
    assert.equal(Array.isArray(repository.branches), true);
    assert.equal(Array.isArray(repository.recentChanges), true);
  }
});

test('retired deployment hosts are absent from every public URL', () => {
  const bannedHosts = ['vercel.app', 'render.com', 'full-stack-assets.github.io'];
  const violations = absoluteUrls(data).filter(({ url }) => {
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    return bannedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
  });

  assert.deepEqual(violations.map(({ path, value }) => `${path}: ${value}`), []);
});

test('the artifact contains no javascript navigation URLs', () => {
  const violations = collectStrings(data)
    .filter(({ value }) => /^\s*javascript\s*:/i.test(value));
  assert.deepEqual(violations.map(({ path, value }) => `${path}: ${value}`), []);
});

test('homepage deployments are backed by enabled GitHub Pages evidence', () => {
  for (const repository of data.repositories) {
    if (!repository.hasPages) {
      assert.equal(repository.homepage, null,
        `${repository.fullName} has no Pages deployment, so homepage must be null`);
      continue;
    }

    if (repository.homepage !== null) {
      const deployment = new URL(repository.homepage);
      assert.equal(deployment.protocol, 'https:', `${repository.fullName} homepage must use HTTPS`);
    }
  }
});
