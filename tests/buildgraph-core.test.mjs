import test from 'node:test';
import assert from 'node:assert/strict';

async function loadCore() {
  try {
    return await import('../buildgraph/core.mjs');
  } catch (error) {
    assert.fail(`BuildGraph workspace core is unavailable: ${error.code || error.message}`);
  }
}

test('derives archived, active, and inactive repository states from evidence', async () => {
  const { deriveStatus } = await loadCore();
  const now = new Date('2026-08-16T12:00:00.000Z');

  assert.equal(deriveStatus({ archived: true, pushedAt: '2026-08-16T11:00:00.000Z' }, now), 'archived');
  assert.equal(deriveStatus({ archived: false, pushedAt: '2026-08-01T11:00:00.000Z' }, now), 'active');
  assert.equal(deriveStatus({ archived: false, pushedAt: '2025-08-01T11:00:00.000Z' }, now), 'inactive');
});

test('normalizes repository evidence into a complete project node with working resource links', async () => {
  const { normalizeRepository } = await loadCore();
  const project = normalizeRepository({
    id: 42,
    name: 'OpportunityOS',
    fullName: 'Full-Stack-Assets/OpportunityOS',
    description: 'Opportunity execution platform',
    htmlUrl: 'https://github.com/Full-Stack-Assets/OpportunityOS',
    homepage: 'https://fullstackassets.com/opportunityos/',
    visibility: 'public',
    archived: false,
    defaultBranch: 'main',
    branches: [{ name: 'main', protected: true }, { name: 'release', protected: false }],
    recentChanges: [{ sha: 'abcdef123456', message: 'Ship graph workspace', url: 'https://github.com/Full-Stack-Assets/OpportunityOS/commit/abcdef123456' }],
    openIssues: [{ number: 7, title: 'Add verifier', url: 'https://github.com/Full-Stack-Assets/OpportunityOS/issues/7' }],
    openPullRequests: [{ number: 9, title: 'Improve intake', url: 'https://github.com/Full-Stack-Assets/OpportunityOS/pull/9' }],
    language: 'TypeScript',
    topics: ['agents', 'automation'],
    pushedAt: '2026-08-15T12:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    createdAt: '2026-06-01T12:00:00.000Z',
    openIssuesCount: 2,
  }, new Date('2026-08-16T12:00:00.000Z'));

  assert.equal(project.purpose, 'Opportunity execution platform');
  assert.equal(project.status, 'active');
  assert.deepEqual(project.stack, ['TypeScript']);
  assert.deepEqual(project.tags, ['agents', 'automation']);
  assert.equal(project.repository.defaultBranch, 'main');
  assert.equal(project.repository.branches.length, 2);
  assert.equal(project.resources.issues, 'https://github.com/Full-Stack-Assets/OpportunityOS/issues');
  assert.equal(project.resources.pullRequests, 'https://github.com/Full-Stack-Assets/OpportunityOS/pulls');
  assert.equal(project.resources.deployments, 'https://github.com/Full-Stack-Assets/OpportunityOS/deployments');
  assert.equal(project.deployment.url, 'https://fullstackassets.com/opportunityos/');
});

test('filters and sorts project nodes across searchable metadata', async () => {
  const { filterProjects } = await loadCore();
  const projects = [
    { id: 'a', name: 'HostGraph', purpose: 'Procurement intelligence', status: 'active', visibility: 'public', health: 'healthy', priority: 'high', stack: ['TypeScript'], tags: ['procurement'], metadata: { pushedAt: '2026-08-15T00:00:00Z' } },
    { id: 'b', name: 'Temporal Drift', purpose: 'Worldline simulation', status: 'inactive', visibility: 'private', health: 'stale', priority: 'low', stack: ['Godot'], tags: ['simulation'], metadata: { pushedAt: '2026-01-01T00:00:00Z' } },
    { id: 'c', name: 'OpportunityOS', purpose: 'Autonomous execution', status: 'active', visibility: 'public', health: 'attention', priority: 'critical', stack: ['TypeScript'], tags: ['agents'], metadata: { pushedAt: '2026-08-16T00:00:00Z' } },
  ];

  assert.deepEqual(filterProjects(projects, { query: 'procurement' }).map(project => project.id), ['a']);
  assert.deepEqual(filterProjects(projects, { status: 'active', visibility: 'public', sort: 'recent' }).map(project => project.id), ['c', 'a']);
  assert.deepEqual(filterProjects(projects, { health: 'stale', tag: 'simulation' }).map(project => project.id), ['b']);
});

test('applies an editable metadata patch without mutating repository evidence', async () => {
  const { applyProjectPatch } = await loadCore();
  const original = [{ id: 'a', name: 'HostGraph', status: 'active', priority: 'unassigned', owner: 'Full-Stack-Assets', purpose: 'Procurement', tags: ['ops'], dependencies: [] }];
  const updated = applyProjectPatch(original, 'a', {
    status: 'completed',
    priority: 'high',
    owner: 'Nic',
    purpose: 'Margin intelligence command center',
    tags: ['ops', 'procurement'],
    dependencies: ['repo-b'],
  });

  assert.equal(original[0].status, 'active');
  assert.equal(updated[0].status, 'completed');
  assert.equal(updated[0].priority, 'high');
  assert.deepEqual(updated[0].tags, ['ops', 'procurement']);
  assert.deepEqual(updated[0].dependencies, ['repo-b']);
});

test('sanitizes deployment and documentation URLs in metadata patches', async () => {
  const { applyProjectPatch } = await loadCore();
  const [updated] = applyProjectPatch([{ id: 'a', name: 'HostGraph' }], 'a', {
    deployment: { environment: 'preview', status: 'linked', url: 'javascript:alert(1)' },
    documentation: [
      { label: 'Unsafe', url: 'javascript:alert(1)' },
      { label: 'Safe', url: 'https://example.com/docs' },
    ],
  });

  assert.deepEqual(updated.deployment, { environment: 'preview', status: 'linked', url: null });
  assert.deepEqual(updated.documentation, [{ label: 'Safe', url: 'https://example.com/docs' }]);
});

test('adds only valid non-duplicate graph connections', async () => {
  const { upsertRelationship } = await loadCore();
  const projects = [{ id: 'a' }, { id: 'b' }];
  const first = upsertRelationship([], { source: 'a', target: 'b', type: 'depends-on', label: 'API contract' }, projects);

  assert.deepEqual(first, [{ id: 'a--depends-on--b', source: 'a', target: 'b', type: 'depends-on', label: 'API contract' }]);
  assert.equal(upsertRelationship(first, { source: 'a', target: 'b', type: 'depends-on' }, projects).length, 1);
  assert.throws(() => upsertRelationship(first, { source: 'a', target: 'a', type: 'related' }, projects), /itself/i);
  assert.throws(() => upsertRelationship(first, { source: 'a', target: 'missing', type: 'related' }, projects), /unknown target/i);
});

test('validates imported workspaces and removes unsafe navigation URLs', async () => {
  const { validateWorkspaceImport } = await loadCore();
  const imported = validateWorkspaceImport({
    schemaVersion: 1,
    projects: [{
      id: 'a', name: 'Safe project', purpose: 'Test', status: 'active', priority: 'high', owner: 'Nic',
      stack: [], tags: [], dependencies: [], visibility: 'private', health: 'healthy',
      repository: { url: 'https://github.com/Full-Stack-Assets/Safe', branches: [], recentChanges: [], openIssues: [], openPullRequests: [] },
      deployment: { url: 'javascript:alert(1)', status: 'unknown', environment: 'test' },
      documentation: [{ label: 'Unsafe', url: 'javascript:alert(1)' }, { label: 'Safe', url: 'https://example.com/docs' }],
      resources: {}, metadata: {}, files: [],
    }],
    relationships: [],
    overrides: {},
  });

  assert.equal(imported.projects[0].deployment.url, null);
  assert.deepEqual(imported.projects[0].documentation, [{ label: 'Safe', url: 'https://example.com/docs' }]);
  assert.throws(() => validateWorkspaceImport({ schemaVersion: 1, projects: [{ id: 'a', name: 'A' }], relationships: [{ source: 'a', target: 'missing', type: 'related' }] }), /unknown target/i);
});

test('rejects imported project IDs that differ only by number versus string type', async () => {
  const { validateWorkspaceImport } = await loadCore();

  assert.throws(() => validateWorkspaceImport({
    schemaVersion: 1,
    projects: [{ id: 42, name: 'Numeric' }, { id: '42', name: 'String' }],
    relationships: [],
  }), /duplicate project id: 42/i);
});

test('exports reusable project records and graph relationships in practical formats', async () => {
  const { toCsv, toMarkdown, buildZip } = await loadCore();
  const workspace = {
    schemaVersion: 1,
    projects: [
      { id: 'a', name: 'HostGraph', purpose: 'Procurement, savings', status: 'active', priority: 'high', owner: 'Nic', visibility: 'public', health: 'healthy', stack: ['TypeScript'], tags: ['procurement'], repository: { url: 'https://github.com/Full-Stack-Assets/HostGraph' }, deployment: { url: 'https://fullstackassets.com/HostGraph/' }, metadata: { pushedAt: '2026-08-15T00:00:00Z' } },
      { id: 'b', name: 'OpportunityOS', purpose: 'Execution', status: 'active', priority: 'critical', owner: 'Nic', visibility: 'private', health: 'attention', stack: ['TypeScript'], tags: ['agents'], repository: { url: 'https://github.com/Full-Stack-Assets/OpportunityOS' }, deployment: { url: null }, metadata: { pushedAt: '2026-08-16T00:00:00Z' } },
    ],
    relationships: [{ source: 'b', target: 'a', type: 'reuses', label: 'Procurement workflow' }],
  };

  const csv = toCsv(workspace.projects);
  assert.match(csv, /"Procurement, savings"/);
  assert.match(csv, /OpportunityOS/);

  const markdown = toMarkdown(workspace);
  assert.match(markdown, /\[HostGraph\]\(https:\/\/github\.com\/Full-Stack-Assets\/HostGraph\)/);
  assert.match(markdown, /OpportunityOS → HostGraph \(reuses: Procurement workflow\)/);

  const zip = await buildZip([
    { name: 'projects.csv', data: csv },
    { name: 'workspace.md', data: markdown },
  ]);
  assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.match(new TextDecoder().decode(zip), /projects\.csv/);
  assert.match(new TextDecoder().decode(zip), /workspace\.md/);
});

test('neutralizes spreadsheet formula prefixes in CSV cells', async () => {
  const { toCsv } = await loadCore();
  const csv = toCsv([{
    id: '=2+3',
    name: '+SUM(A1:A2)',
    purpose: '-2+3',
    status: '@SUM(A1:A2)',
  }]);
  const cells = csv.split('\n')[1].split(',');

  assert.deepEqual(cells.slice(0, 4), ["'=2+3", "'+SUM(A1:A2)", "'-2+3", "'@SUM(A1:A2)"]);
});

test('normalizes ZIP entry names so they cannot traverse outside the archive', async () => {
  const { buildZip } = await loadCore();
  const zip = await buildZip([{ name: 'documents/../../escape.txt', data: 'safe' }]);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const nameLength = view.getUint16(26, true);
  const entryName = new TextDecoder().decode(zip.slice(30, 30 + nameLength));

  assert.equal(entryName, 'escape.txt');
});

test('creates complete document metadata for project-local file storage', async () => {
  const { createDocumentRecord } = await loadCore();
  const record = createDocumentRecord({ name: 'architecture.pdf', type: 'application/pdf', size: 4096, lastModified: 1786852800000 }, 'repo-42', 'Nic', new Date('2026-08-16T12:00:00.000Z'));

  assert.equal(record.projectId, 'repo-42');
  assert.equal(record.name, 'architecture.pdf');
  assert.equal(record.fileType, 'application/pdf');
  assert.equal(record.size, 4096);
  assert.equal(record.uploadedAt, '2026-08-16T12:00:00.000Z');
  assert.equal(record.version, 1);
  assert.equal(record.owner, 'Nic');
  assert.equal(record.description, '');
});

test('creates unique document IDs for repeated records with the same file tuple', async () => {
  const { createDocumentRecord } = await loadCore();
  const file = { name: 'architecture.pdf', type: 'application/pdf', size: 4096, lastModified: 1786852800000 };
  const now = new Date('2026-08-16T12:00:00.000Z');

  const first = createDocumentRecord(file, 'repo-42', 'Nic', now);
  const second = createDocumentRecord(file, 'repo-42', 'Nic', now);

  assert.notEqual(first.id, second.id);
});
