const ACTIVE_WINDOW_DAYS = 120;

export function deriveStatus(repository, now = new Date()) {
  if (repository.archived) return 'archived';
  const pushedAt = new Date(repository.pushedAt || 0);
  if (Number.isNaN(pushedAt.getTime())) return 'inactive';
  const ageDays = (now.getTime() - pushedAt.getTime()) / 86_400_000;
  return ageDays <= ACTIVE_WINDOW_DAYS ? 'active' : 'inactive';
}

function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeRepository(repository, now = new Date()) {
  const repositoryUrl = safeHttpUrl(repository.htmlUrl);
  const fullName = repository.fullName || repository.name;
  const owner = fullName.includes('/') ? fullName.split('/')[0] : 'Unassigned';
  const base = repositoryUrl?.replace(/\/$/, '') || '';
  const status = repository.status || deriveStatus(repository, now);
  const stack = repository.language ? [repository.language] : [];
  const homepage = safeHttpUrl(repository.homepage);

  return {
    id: `repo-${repository.id ?? fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: repository.name,
    purpose: repository.description || 'Purpose not documented.',
    status,
    priority: repository.priority || 'unassigned',
    owner,
    health: repository.archived ? 'archived' : status === 'inactive' ? 'stale' : repository.description ? 'healthy' : 'attention',
    visibility: repository.visibility || 'public',
    stack,
    tags: [...new Set(repository.topics || [])],
    repository: {
      fullName,
      url: repositoryUrl,
      defaultBranch: repository.defaultBranch || 'main',
      branches: repository.branches || [],
      recentChanges: repository.recentChanges || [],
      openIssues: repository.openIssues || [],
      openPullRequests: repository.openPullRequests || [],
      openIssuesCount: repository.openIssuesCount || 0,
    },
    deployment: {
      environment: homepage ? 'production' : 'not registered',
      status: homepage ? 'linked' : 'unknown',
      url: homepage,
    },
    documentation: repositoryUrl ? [{ label: 'Repository overview', url: repositoryUrl }] : [],
    files: [],
    dependencies: [],
    resources: {
      repository: repositoryUrl,
      branches: base ? `${base}/branches` : null,
      commits: base ? `${base}/commits/${repository.defaultBranch || 'main'}` : null,
      issues: base ? `${base}/issues` : null,
      pullRequests: base ? `${base}/pulls` : null,
      actions: base ? `${base}/actions` : null,
      deployments: base ? `${base}/deployments` : null,
      projectBoard: base ? `${base}/projects` : null,
      settings: base ? `${base}/settings` : null,
    },
    metadata: {
      source: 'github',
      createdAt: repository.createdAt || null,
      updatedAt: repository.updatedAt || null,
      pushedAt: repository.pushedAt || null,
      size: repository.size || 0,
      stars: repository.stars || 0,
      forks: repository.forks || 0,
      archived: Boolean(repository.archived),
    },
  };
}

export function filterProjects(projects, filters = {}) {
  const query = (filters.query || '').trim().toLowerCase();
  const matches = projects.filter(project => {
    const haystack = [project.name, project.purpose, project.owner, ...(project.stack || []), ...(project.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (!query || haystack.includes(query))
      && (!filters.status || filters.status === 'all' || project.status === filters.status)
      && (!filters.visibility || filters.visibility === 'all' || project.visibility === filters.visibility)
      && (!filters.health || filters.health === 'all' || project.health === filters.health)
      && (!filters.tag || filters.tag === 'all' || (project.tags || []).includes(filters.tag));
  });

  const priority = { critical: 0, high: 1, medium: 2, low: 3, unassigned: 4 };
  return matches.sort((left, right) => {
    if (filters.sort === 'name') return left.name.localeCompare(right.name);
    if (filters.sort === 'priority') return (priority[left.priority] ?? 5) - (priority[right.priority] ?? 5) || left.name.localeCompare(right.name);
    return new Date(right.metadata?.pushedAt || 0) - new Date(left.metadata?.pushedAt || 0) || left.name.localeCompare(right.name);
  });
}

export function applyProjectPatch(projects, projectId, patch) {
  let found = false;
  const editable = ['status', 'priority', 'owner', 'purpose', 'health', 'tags', 'dependencies', 'deployment', 'documentation'];
  const updated = projects.map(project => {
    if (project.id !== projectId) return project;
    found = true;
    const next = { ...project };
    for (const key of editable) {
      if (!(key in patch)) continue;
      if (key === 'tags' || key === 'dependencies') {
        next[key] = [...new Set((patch[key] || []).map(value => String(value).trim()).filter(Boolean))];
      } else if (key === 'deployment') {
        next.deployment = { ...patch.deployment, url: safeHttpUrl(patch.deployment?.url) };
      } else if (key === 'documentation') {
        next.documentation = sanitizeLinkList(patch.documentation);
      } else {
        next[key] = patch[key];
      }
    }
    return next;
  });
  if (!found) throw new Error(`Unknown project: ${projectId}`);
  return updated;
}

export function upsertRelationship(relationships, relationship, projects) {
  const ids = new Set(projects.map(project => project.id));
  if (!ids.has(relationship.source)) throw new Error(`Unknown source project: ${relationship.source}`);
  if (!ids.has(relationship.target)) throw new Error(`Unknown target project: ${relationship.target}`);
  if (relationship.source === relationship.target) throw new Error('A project cannot connect to itself.');
  const type = String(relationship.type || 'related').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'related';
  const id = `${relationship.source}--${type}--${relationship.target}`;
  if (relationships.some(item => item.id === id)) return [...relationships];
  return [...relationships, {
    id,
    source: relationship.source,
    target: relationship.target,
    type,
    label: String(relationship.label || '').trim(),
  }];
}

function sanitizeLinkList(items) {
  return (items || []).map(item => ({ ...item, url: safeHttpUrl(item.url) })).filter(item => item.url);
}

export function validateWorkspaceImport(payload) {
  if (!payload || payload.schemaVersion !== 1) throw new Error('Unsupported or missing workspace schema version.');
  if (!Array.isArray(payload.projects) || !Array.isArray(payload.relationships || [])) throw new Error('Workspace projects and relationships must be arrays.');

  const seen = new Set();
  const projects = payload.projects.map(project => {
    if (!project?.id || !project?.name) throw new Error('Every imported project requires an id and name.');
    const identity = String(project.id);
    if (seen.has(identity)) throw new Error(`Duplicate project id: ${project.id}`);
    seen.add(identity);
    const clone = structuredClone(project);
    clone.stack = Array.isArray(clone.stack) ? clone.stack : [];
    clone.tags = Array.isArray(clone.tags) ? clone.tags : [];
    clone.dependencies = Array.isArray(clone.dependencies) ? clone.dependencies : [];
    clone.files = Array.isArray(clone.files) ? clone.files : [];
    clone.repository = clone.repository || {};
    clone.repository.url = safeHttpUrl(clone.repository.url);
    clone.repository.branches = sanitizeLinkList(clone.repository.branches);
    clone.repository.recentChanges = sanitizeLinkList(clone.repository.recentChanges);
    clone.repository.openIssues = sanitizeLinkList(clone.repository.openIssues);
    clone.repository.openPullRequests = sanitizeLinkList(clone.repository.openPullRequests);
    clone.deployment = clone.deployment || {};
    clone.deployment.url = safeHttpUrl(clone.deployment.url);
    clone.documentation = sanitizeLinkList(clone.documentation);
    clone.resources = Object.fromEntries(Object.entries(clone.resources || {}).map(([key, value]) => [key, safeHttpUrl(value)]));
    return clone;
  });

  let relationships = [];
  for (const relationship of payload.relationships || []) {
    relationships = upsertRelationship(relationships, relationship, projects);
  }

  return {
    schemaVersion: 1,
    generatedAt: payload.generatedAt || null,
    projects,
    relationships,
    overrides: payload.overrides && typeof payload.overrides === 'object' ? structuredClone(payload.overrides) : {},
  };
}

function csvCell(value) {
  const raw = Array.isArray(value) ? value.join('|') : String(value ?? '');
  const text = /^\s*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(projects) {
  const headers = ['id', 'name', 'purpose', 'status', 'priority', 'owner', 'visibility', 'health', 'stack', 'tags', 'repository', 'deployment', 'lastPushed'];
  const rows = projects.map(project => [
    project.id,
    project.name,
    project.purpose,
    project.status,
    project.priority,
    project.owner,
    project.visibility,
    project.health,
    project.stack || [],
    project.tags || [],
    project.repository?.url,
    project.deployment?.url,
    project.metadata?.pushedAt,
  ]);
  return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
}

export function toMarkdown(workspace) {
  const names = new Map(workspace.projects.map(project => [project.id, project.name]));
  const projectLines = workspace.projects.map(project => {
    const name = project.repository?.url ? `[${project.name}](${project.repository.url})` : project.name;
    const deployment = project.deployment?.url ? ` · [Deployment](${project.deployment.url})` : '';
    return `- ${name} — ${project.status} · ${project.priority} · ${(project.stack || []).join(', ') || 'Stack unclassified'}${deployment}\n  - ${project.purpose}`;
  });
  const relationshipLines = (workspace.relationships || []).map(relationship => {
    const suffix = relationship.label ? `: ${relationship.label}` : '';
    return `- ${names.get(relationship.source) || relationship.source} → ${names.get(relationship.target) || relationship.target} (${relationship.type}${suffix})`;
  });
  return `# BuildGraph Workspace\n\n## Projects\n\n${projectLines.join('\n')}\n\n## Relationships\n\n${relationshipLines.join('\n') || '- None'}\n`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function header(size) {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

function normalizeZipEntryName(value) {
  const segments = [];
  const path = String(value || '').replaceAll('\\', '/').replace(/^[a-z]:/i, '');
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/') || 'file';
}

export async function buildZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(normalizeZipEntryName(file.name));
    const data = typeof file.data === 'string' ? encoder.encode(file.data) : new Uint8Array(await file.data.arrayBuffer?.() || file.data);
    const checksum = crc32(data);
    const local = header(30);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x0800, true);
    local.view.setUint32(14, checksum, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, data.length, true);
    local.view.setUint16(26, name.length, true);
    localParts.push(local.bytes, name, data);

    const central = header(46);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x0800, true);
    central.view.setUint32(16, checksum, true);
    central.view.setUint32(20, data.length, true);
    central.view.setUint32(24, data.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    centralParts.push(central.bytes, name);
    offset += local.bytes.length + name.length + data.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, centralDirectory.length, true);
  end.view.setUint32(16, offset, true);
  return concatBytes([...localParts, centralDirectory, end.bytes]);
}

let documentRecordSequence = 0;

function documentRecordNonce(now) {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  documentRecordSequence += 1;
  return `${now.getTime().toString(36)}-${documentRecordSequence.toString(36)}`;
}

export function createDocumentRecord(file, projectId, owner = 'Unassigned', now = new Date()) {
  const slug = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `${projectId}-${file.lastModified || now.getTime()}-${slug}-${documentRecordNonce(now)}`,
    projectId,
    name: file.name,
    fileType: file.type || 'application/octet-stream',
    size: Number(file.size) || 0,
    uploadedAt: now.toISOString(),
    modifiedAt: file.lastModified ? new Date(file.lastModified).toISOString() : now.toISOString(),
    version: 1,
    owner,
    description: '',
  };
}
