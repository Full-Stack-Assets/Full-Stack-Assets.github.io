import {
  applyProjectPatch,
  buildZip,
  createDocumentRecord,
  filterProjects,
  normalizeRepository,
  toCsv,
  toMarkdown,
  upsertRelationship,
  validateWorkspaceImport,
} from './core.mjs';

const STORAGE_KEY = 'buildgraph-workspace-v2';
const DB_NAME = 'buildgraph-documents';
const DB_VERSION = 1;
const DOCUMENT_STORE = 'documents';
const MAX_ZOOM = 1.5;
const MIN_ZOOM = 0.7;

const sourceLabels = {
  github: 'Public GitHub',
  'google-drive-evidence': 'Google Drive evidence',
  'chatgpt-project-history': 'Project history',
  'local-private-import': 'Local private import',
};

const resourceConfig = {
  repository: { label: 'Repository', icon: 'ri-github-line', tab: 'repository' },
  branches: { label: 'Branches', icon: 'ri-git-branch-line', tab: 'repository' },
  commits: { label: 'Recent changes', icon: 'ri-git-commit-line', tab: 'activity' },
  issues: { label: 'Open issues', icon: 'ri-error-warning-line', tab: 'repository' },
  pullRequests: { label: 'Pull requests', icon: 'ri-git-pull-request-line', tab: 'repository' },
  deployment: { label: 'Deployment', icon: 'ri-rocket-2-line', tab: 'overview' },
  documentation: { label: 'Documentation', icon: 'ri-book-open-line', tab: 'overview' },
  documents: { label: 'Documents', icon: 'ri-file-copy-2-line', tab: 'documents' },
  dependencies: { label: 'Dependencies', icon: 'ri-node-tree', tab: 'connections' },
};

const state = {
  bundledProjects: [],
  importedProjects: [],
  projects: [],
  relationships: [],
  overrides: {},
  repositoryOverrides: {},
  positions: {},
  documents: [],
  visibleProjects: [],
  selectedId: null,
  inspectorTab: 'overview',
  activityTab: 'activity',
  currentView: 'map',
  expanded: true,
  zoom: 1,
  pendingImport: null,
  currentDocumentId: null,
  previewUrl: null,
  dragging: null,
  suppressProjectClick: false,
  graphNodes: [],
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const elements = {
  app: $('[data-app]'),
  loading: $('[data-loading]'),
  search: $('[data-search]'),
  projectList: $('[data-project-list]'),
  projectCount: $('[data-project-count]'),
  focusName: $('[data-focus-name]'),
  focusSummary: $('[data-focus-summary]'),
  sourceSummary: $('[data-source-summary]'),
  mapTitle: $('[data-map-title]'),
  mapViewport: $('[data-map-viewport]'),
  mapNodes: $('[data-map-nodes]'),
  mapEmpty: $('[data-map-empty]'),
  connectors: $('[data-connectors]'),
  minimap: $('[data-minimap]'),
  zoom: $('[data-zoom]'),
  inspector: $('[data-inspector]'),
  activityFeed: $('[data-activity-feed]'),
  importInput: $('[data-import-input]'),
  documentInput: $('[data-document-input]'),
  editDialog: $('[data-edit-dialog]'),
  editForm: $('[data-edit-form]'),
  connectionDialog: $('[data-connection-dialog]'),
  connectionForm: $('[data-connection-form]'),
  importDialog: $('[data-import-dialog]'),
  documentDialog: $('[data-document-dialog]'),
  confirmDialog: $('[data-confirm-dialog]'),
  toastRegion: $('[data-toast-region]'),
  exportMenu: $('[data-export-menu]'),
  saveState: $('[data-save-state]'),
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function externalLink(url, label, icon = 'ri-external-link-line', detail = '') {
  const destination = safeUrl(url);
  if (!destination) {
    return `<div class="resource-link" aria-disabled="true"><i class="${icon}" aria-hidden="true"></i><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail || 'Not linked')}</small></span><i class="ri-forbid-line" aria-hidden="true"></i></div>`;
  }
  return `<a class="resource-link" href="${escapeHtml(destination)}" target="_blank" rel="noopener noreferrer"><i class="${icon}" aria-hidden="true"></i><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail || new URL(destination).hostname)}</small></span><i class="ri-external-link-line" aria-hidden="true"></i></a>`;
}

function formatDate(value, fallback = 'Unknown') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatRelativeDate(value) {
  if (!value) return 'Date unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (Math.abs(days) < 1) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days > -30 && days < 0) return `${Math.abs(days)} days ago`;
  return formatDate(value);
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

function projectById(id) {
  return state.projects.find(project => project.id === id) || null;
}

function selectedProject() {
  return projectById(state.selectedId);
}

function getStoredWorkspace() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveWorkspace({ quiet = false } = {}) {
  const payload = {
    schemaVersion: 2,
    importedProjects: state.importedProjects,
    relationships: state.relationships,
    overrides: state.overrides,
    repositoryOverrides: state.repositoryOverrides,
    positions: state.positions,
    selectedId: state.selectedId,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    elements.saveState.textContent = 'Local changes saved automatically';
    if (!quiet) toast('Saved locally', 'Workspace changes are stored on this device.', 'success');
  } catch (error) {
    elements.saveState.textContent = 'Local save failed';
    toast('Could not save locally', error.message, 'error');
  }
}

function applyStoredWorkspace() {
  const stored = getStoredWorkspace();
  state.importedProjects = Array.isArray(stored.importedProjects) ? stored.importedProjects : [];
  state.relationships = Array.isArray(stored.relationships) ? stored.relationships : [];
  state.overrides = stored.overrides && typeof stored.overrides === 'object' ? stored.overrides : {};
  state.repositoryOverrides = stored.repositoryOverrides && typeof stored.repositoryOverrides === 'object' ? stored.repositoryOverrides : {};
  state.positions = stored.positions && typeof stored.positions === 'object' ? stored.positions : {};
  state.selectedId = stored.selectedId || null;
}

function rebuildProjects() {
  const merged = new Map(state.bundledProjects.map(project => [project.id, project]));
  for (const project of state.importedProjects) {
    if (!merged.has(project.id)) merged.set(project.id, project);
  }

  let projects = [...merged.values()];
  for (const [projectId, patch] of Object.entries(state.overrides)) {
    if (!merged.has(projectId)) continue;
    try {
      projects = applyProjectPatch(projects, projectId, patch);
    } catch {
      // Ignore stale local patches for projects no longer present.
    }
  }

  projects = projects.map(project => {
    const repositoryPatch = state.repositoryOverrides[project.id];
    if (!repositoryPatch) return project;
    return {
      ...project,
      repository: { ...project.repository, ...repositoryPatch.repository },
      metadata: { ...project.metadata, ...repositoryPatch.metadata },
      health: repositoryPatch.health || project.health,
    };
  });

  const ids = new Set(projects.map(project => project.id));
  state.projects = projects;
  state.relationships = state.relationships.filter(relationship => ids.has(relationship.source) && ids.has(relationship.target));
}

function currentFilters() {
  return {
    query: elements.search.value,
    status: $('[data-filter="status"]').value,
    visibility: $('[data-filter="visibility"]').value,
    health: $('[data-filter="health"]').value,
    tag: $('[data-filter="tag"]').value,
    sort: $('[data-sort]').value,
  };
}

function viewMatches(project) {
  if (['map', 'projects', 'settings', 'connections', 'activity', 'documents'].includes(state.currentView)) return true;
  if (state.currentView === 'repositories') return Boolean(project.repository?.url);
  const terms = `${project.name} ${project.purpose} ${(project.tags || []).join(' ')}`.toLowerCase();
  if (state.currentView === 'research') return /research|model|physics|data|simulation|analysis|atlas|nasa|pqc|worldline/.test(terms);
  if (state.currentView === 'business') return /business|deal|supplier|margin|quote|bid|acquisition|real estate|rental|opportunity/.test(terms);
  if (state.currentView === 'media') return /media|music|song|photo|game|worldgen|creative|wedding/.test(terms);
  return true;
}

function updateVisibleProjects() {
  state.visibleProjects = filterProjects(state.projects, currentFilters()).filter(viewMatches);
  if (!state.visibleProjects.some(project => project.id === state.selectedId)) {
    state.selectedId = state.visibleProjects[0]?.id || null;
  }
}

function populateTagFilter() {
  const select = $('[data-filter="tag"]');
  const current = select.value;
  const tags = [...new Set(state.projects.flatMap(project => project.tags || []))].sort((a, b) => a.localeCompare(b));
  select.innerHTML = '<option value="all">Tags</option>' + tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
  select.value = tags.includes(current) ? current : 'all';
}

function renderProjectList() {
  elements.projectCount.textContent = String(state.visibleProjects.length);
  elements.projectList.innerHTML = state.visibleProjects.length
    ? state.visibleProjects.map(project => `<button type="button" role="option" data-project-id="${escapeHtml(project.id)}" aria-selected="${project.id === state.selectedId}"><span class="status-dot status-${escapeHtml(project.status)}" aria-hidden="true"></span><span class="project-copy"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.stack?.join(', ') || sourceLabels[project.metadata?.source] || 'Stack unclassified')}</small></span><i class="ri-arrow-right-s-line" aria-hidden="true"></i></button>`).join('')
    : '<div class="empty-state"><i class="ri-search-eye-line" aria-hidden="true"></i>No matching projects.<br>Adjust a filter or import a catalog.</div>';
}

function renderFocusSummary() {
  const project = selectedProject();
  elements.focusName.textContent = project?.name || 'No project selected';
  elements.mapTitle.textContent = project ? `${project.name} ecosystem` : 'Project ecosystem';
  elements.focusSummary.innerHTML = project
    ? `<span class="status-dot status-${escapeHtml(project.status)}" aria-hidden="true"></span><span>${escapeHtml(project.status)} · ${escapeHtml(project.priority || 'unassigned')} priority</span>`
    : '<span class="status-dot" aria-hidden="true"></span><span>Select a project</span>';
}

function renderSourceSummary() {
  const counts = new Map();
  for (const project of state.projects) {
    const source = project.metadata?.source || (project.visibility === 'public' ? 'github' : 'local-private-import');
    counts.set(source, (counts.get(source) || 0) + 1);
  }
  elements.sourceSummary.innerHTML = [...counts.entries()].map(([source, count]) => `<li><span><i class="${source === 'github' ? 'ri-github-line' : 'ri-hard-drive-3-line'}" aria-hidden="true"></i>${escapeHtml(sourceLabels[source] || source)}</span><strong>${count}</strong></li>`).join('');
}

function scoreRelated(project, candidate) {
  let score = 0;
  const projectTags = new Set(project.tags || []);
  const projectStack = new Set(project.stack || []);
  for (const tag of candidate.tags || []) if (projectTags.has(tag)) score += 3;
  for (const technology of candidate.stack || []) if (projectStack.has(technology)) score += 2;
  if (project.owner && candidate.owner === project.owner) score += 1;
  if (project.status === candidate.status) score += 0.5;
  return score;
}

function graphResources(project) {
  const firstDocumentation = project.documentation?.find(item => safeUrl(item.url));
  return [
    { key: 'repository', url: project.resources?.repository || project.repository?.url, detail: project.repository?.fullName || 'Not registered' },
    { key: 'branches', url: project.resources?.branches, detail: `${project.repository?.branches?.length || 0} visible` },
    { key: 'issues', url: project.resources?.issues, detail: `${project.repository?.openIssues?.length || project.repository?.openIssuesCount || 0} open` },
    { key: 'pullRequests', url: project.resources?.pullRequests, detail: `${project.repository?.openPullRequests?.length || 0} open` },
    { key: 'deployment', url: project.deployment?.url, detail: project.deployment?.environment || 'Not registered' },
    { key: 'documentation', url: firstDocumentation?.url, detail: `${project.documentation?.length || 0} linked` },
    { key: 'documents', url: null, detail: `${documentsForProject(project.id).length + (project.files?.length || 0)} local` },
    { key: 'dependencies', url: null, detail: `${project.dependencies?.length || 0} declared` },
  ];
}

function relatedProjects(project) {
  const directlyRelated = [];
  for (const relationship of state.relationships) {
    if (relationship.source === project.id) directlyRelated.push({ id: relationship.target, relationship });
    if (relationship.target === project.id) directlyRelated.push({ id: relationship.source, relationship });
  }
  const seen = new Set([project.id]);
  const result = [];
  for (const item of directlyRelated) {
    const candidate = projectById(item.id);
    if (candidate && !seen.has(candidate.id) && state.visibleProjects.some(entry => entry.id === candidate.id)) {
      seen.add(candidate.id);
      result.push({ project: candidate, relationship: item.relationship });
    }
  }
  const fallback = state.visibleProjects
    .filter(candidate => !seen.has(candidate.id))
    .map(candidate => ({ project: candidate, relationship: null, score: scoreRelated(project, candidate) }))
    .sort((left, right) => right.score - left.score || left.project.name.localeCompare(right.project.name));
  for (const item of fallback) {
    seen.add(item.project.id);
    result.push(item);
  }
  return result;
}

function nodePosition(projectId, key, fallback) {
  const saved = state.positions[`${projectId}:${key}`];
  if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return fallback;
  return { x: Math.max(6, Math.min(94, saved.x)), y: Math.max(8, Math.min(92, saved.y)) };
}

function radialPosition(index, total, radiusX, radiusY, phase = -Math.PI / 2) {
  const angle = phase + (Math.PI * 2 * index / Math.max(total, 1));
  return { x: 50 + Math.cos(angle) * radiusX, y: 50 + Math.sin(angle) * radiusY };
}

function graphNodeMarkup(node) {
  if (node.kind === 'center') {
    return `<button type="button" class="graph-node center" data-project-id="${escapeHtml(node.project.id)}" data-node-key="center" style="left:${node.x}%;top:${node.y}%" aria-label="Focused project: ${escapeHtml(node.project.name)}"><span class="node-icon"><i class="ri-focus-3-line" aria-hidden="true"></i></span><span class="node-copy"><strong>${escapeHtml(node.project.name)}</strong><small>${escapeHtml(node.project.status)} · ${escapeHtml(node.project.priority || 'unassigned')}</small></span></button>`;
  }
  if (node.kind === 'resource') {
    const config = resourceConfig[node.resource.key];
    return `<button type="button" class="graph-node resource" data-resource-key="${escapeHtml(node.resource.key)}" data-resource-url="${escapeHtml(node.resource.url || '')}" data-node-key="resource-${escapeHtml(node.resource.key)}" style="left:${node.x}%;top:${node.y}%"><span class="node-icon"><i class="${config.icon}" aria-hidden="true"></i></span><span class="node-copy"><strong>${escapeHtml(config.label)}</strong><small>${escapeHtml(node.resource.detail)}</small></span></button>`;
  }
  return `<button type="button" class="graph-node project" data-project-id="${escapeHtml(node.project.id)}" data-node-key="project-${escapeHtml(node.project.id)}" data-status="${escapeHtml(node.project.status)}" style="left:${node.x}%;top:${node.y}%"><span class="node-icon"><i class="ri-node-tree" aria-hidden="true"></i></span><span class="node-copy"><strong>${escapeHtml(node.project.name)}</strong><small>${escapeHtml(node.relationship?.type || node.project.status)}</small></span></button>`;
}

function renderConnectors() {
  if (!state.graphNodes.length) {
    elements.connectors.innerHTML = '';
    return;
  }
  elements.connectors.setAttribute('viewBox', '0 0 100 100');
  elements.connectors.setAttribute('preserveAspectRatio', 'none');
  elements.connectors.innerHTML = state.graphNodes.filter(node => node.kind !== 'center').map(node => {
    const curveX = 50 + (node.x - 50) * 0.48;
    const curveY = 50 + (node.y - 50) * 0.18;
    const className = node.kind === 'project' && node.relationship ? 'relationship' : '';
    return `<path class="${className}" d="M 50 50 Q ${curveX.toFixed(2)} ${curveY.toFixed(2)} ${node.x.toFixed(2)} ${node.y.toFixed(2)}"></path>`;
  }).join('');
}

function renderMinimap() {
  elements.minimap.innerHTML = state.graphNodes.map(node => `<span style="left:${node.x}%;top:${node.y}%"></span>`).join('');
}

function renderMap() {
  const project = selectedProject();
  elements.mapNodes.style.transform = `scale(${state.zoom})`;
  elements.zoom.textContent = `${Math.round(state.zoom * 100)}%`;
  elements.mapEmpty.hidden = Boolean(project);
  if (!project) {
    elements.mapNodes.innerHTML = '';
    state.graphNodes = [];
    renderConnectors();
    renderMinimap();
    return;
  }

  const resources = graphResources(project).slice(0, state.expanded ? 8 : 4);
  const relatedLimit = window.matchMedia('(max-width: 520px)').matches ? 4 : state.expanded ? 9 : 4;
  const related = relatedProjects(project).slice(0, relatedLimit);
  const graphNodes = [{ kind: 'center', project, x: 50, y: 50 }];
  resources.forEach((resource, index) => {
    const fallback = radialPosition(index, resources.length, 21, 25, -Math.PI / 2 + 0.18);
    graphNodes.push({ kind: 'resource', resource, ...nodePosition(project.id, `resource-${resource.key}`, fallback) });
  });
  related.forEach((item, index) => {
    const fallback = radialPosition(index, related.length, 40, 41, -Math.PI / 2 - 0.1);
    graphNodes.push({ kind: 'project', ...item, ...nodePosition(project.id, `project-${item.project.id}`, fallback) });
  });
  state.graphNodes = graphNodes;
  elements.mapNodes.innerHTML = graphNodes.map(graphNodeMarkup).join('');
  renderConnectors();
  renderMinimap();
}

function projectHeading(project) {
  return `<div class="project-heading"><div><h2>${escapeHtml(project.name)}</h2><p><span class="status-dot status-${escapeHtml(project.status)}" aria-hidden="true"></span>${escapeHtml(project.status)} · ${escapeHtml(project.visibility || 'unknown')}</p></div><div class="project-heading-actions"><button type="button" class="icon-button" data-action="edit-project" aria-label="Edit project metadata"><i class="ri-edit-line" aria-hidden="true"></i></button><button type="button" class="icon-button" data-action="add-connection" aria-label="Add project connection"><i class="ri-link-m" aria-hidden="true"></i></button></div></div>`;
}

function repositoryResources(project) {
  const entries = [
    ['Repository', project.resources?.repository || project.repository?.url, 'ri-github-line'],
    ['Branches', project.resources?.branches, 'ri-git-branch-line'],
    ['Commits', project.resources?.commits, 'ri-git-commit-line'],
    ['Issues', project.resources?.issues, 'ri-error-warning-line'],
    ['Pull requests', project.resources?.pullRequests, 'ri-git-pull-request-line'],
    ['Actions', project.resources?.actions, 'ri-play-circle-line'],
    ['Deployments', project.resources?.deployments, 'ri-rocket-2-line'],
    ['Project board', project.resources?.projectBoard, 'ri-layout-grid-line'],
  ];
  return entries.map(([label, url, icon]) => externalLink(url, label, icon)).join('');
}

function renderOverview(project) {
  const source = sourceLabels[project.metadata?.source] || project.metadata?.source || 'Unclassified';
  return `${projectHeading(project)}
    <section class="detail-section"><h3>Purpose</h3><p>${escapeHtml(project.purpose || 'Purpose not documented.')}</p><div class="button-row"><button type="button" class="primary" data-action="edit-project"><i class="ri-edit-line" aria-hidden="true"></i>Edit metadata</button><button type="button" class="secondary" data-action="upload-document"><i class="ri-upload-2-line" aria-hidden="true"></i>Add file</button></div></section>
    <section class="detail-section"><h3>Project metadata</h3><dl class="metadata-list"><div><dt>Owner</dt><dd>${escapeHtml(project.owner || 'Unassigned')}</dd></div><div><dt>Priority</dt><dd>${escapeHtml(project.priority || 'unassigned')}</dd></div><div><dt>Health</dt><dd>${escapeHtml(project.health || 'unknown')}</dd></div><div><dt>Last activity</dt><dd>${escapeHtml(formatRelativeDate(project.metadata?.pushedAt || project.metadata?.updatedAt))}</dd></div><div><dt>Source</dt><dd>${escapeHtml(source)}</dd></div><div><dt>Evidence state</dt><dd>${escapeHtml(project.metadata?.recordState || 'Repository evidence')}</dd></div></dl></section>
    <section class="detail-section"><h3>Technology stack</h3><div class="pill-list">${(project.stack?.length ? project.stack : ['Unclassified']).map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div></section>
    <section class="detail-section"><h3>Tags</h3><div class="pill-list">${(project.tags?.length ? project.tags : ['No tags']).map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div></section>
    <section class="detail-section"><h3>Deployment</h3>${externalLink(project.deployment?.url, project.deployment?.environment || 'Deployment', 'ri-rocket-2-line', project.deployment?.status || 'Not registered')}</section>
    <section class="detail-section"><h3>Documentation</h3><div class="resource-list">${project.documentation?.length ? project.documentation.map(item => externalLink(item.url, item.label || 'Documentation', 'ri-book-open-line')).join('') : '<div class="empty-state"><i class="ri-book-open-line" aria-hidden="true"></i>No linked documentation.</div>'}</div></section>`;
}

function itemLink(item, type) {
  const url = safeUrl(item.url);
  const icon = type === 'branch' ? 'ri-git-branch-line' : type === 'issue' ? 'ri-error-warning-line' : type === 'pull' ? 'ri-git-pull-request-line' : 'ri-git-commit-line';
  const title = item.title || item.message || item.name || item.sha || 'Repository item';
  const detail = type === 'branch'
    ? `${item.protected ? 'Protected' : 'Open'} branch`
    : [item.author, item.user, formatRelativeDate(item.date || item.updatedAt)].filter(Boolean).join(' · ');
  return externalLink(url, title, icon, detail);
}

function renderRepository(project) {
  const repository = project.repository || {};
  return `${projectHeading(project)}
    <section class="detail-section"><h3>Repository profile</h3><dl class="metadata-list"><div><dt>Location</dt><dd>${escapeHtml(repository.fullName || 'Not registered')}</dd></div><div><dt>Default branch</dt><dd>${escapeHtml(repository.defaultBranch || 'Unknown')}</dd></div><div><dt>Open issues</dt><dd>${repository.openIssues?.length || repository.openIssuesCount || 0}</dd></div><div><dt>Open PRs</dt><dd>${repository.openPullRequests?.length || 0}</dd></div><div><dt>Stars / forks</dt><dd>${project.metadata?.stars || 0} / ${project.metadata?.forks || 0}</dd></div></dl><div class="button-row"><button type="button" class="secondary" data-action="refresh"><i class="ri-refresh-line" aria-hidden="true"></i>Refresh evidence</button></div></section>
    <section class="detail-section"><h3>Quick actions</h3><div class="resource-list">${repositoryResources(project)}</div></section>
    <section class="detail-section"><h3>Active branches</h3><div class="resource-list">${repository.branches?.length ? repository.branches.map(item => itemLink(item, 'branch')).join('') : '<div class="empty-state">No branch evidence available.</div>'}</div></section>
    <section class="detail-section"><h3>Recent changes</h3><div class="activity-list">${repository.recentChanges?.length ? repository.recentChanges.map(item => itemLink(item, 'commit')).join('') : '<div class="empty-state">No recent commit evidence available.</div>'}</div></section>
    <section class="detail-section"><h3>Open issues</h3><div class="activity-list">${repository.openIssues?.length ? repository.openIssues.map(item => itemLink(item, 'issue')).join('') : '<div class="empty-state">No open issue references.</div>'}</div></section>
    <section class="detail-section"><h3>Pull requests</h3><div class="activity-list">${repository.openPullRequests?.length ? repository.openPullRequests.map(item => itemLink(item, 'pull')).join('') : '<div class="empty-state">No open pull request references.</div>'}</div></section>`;
}

function projectActivity(project) {
  const entries = [];
  for (const change of project.repository?.recentChanges || []) entries.push({ ...change, kind: 'commit', project });
  for (const issue of project.repository?.openIssues || []) entries.push({ ...issue, kind: 'issue', project });
  for (const pull of project.repository?.openPullRequests || []) entries.push({ ...pull, kind: 'pull', project });
  return entries.sort((left, right) => new Date(right.date || right.updatedAt || 0) - new Date(left.date || left.updatedAt || 0));
}

function activityMarkup(item) {
  const icon = item.kind === 'issue' ? 'ri-error-warning-line' : item.kind === 'pull' ? 'ri-git-pull-request-line' : item.kind === 'document' ? 'ri-file-line' : 'ri-git-commit-line';
  const title = item.title || item.message || item.name || 'Activity';
  const detail = [item.project?.name, item.author || item.owner, formatRelativeDate(item.date || item.updatedAt || item.uploadedAt)].filter(Boolean).join(' · ');
  const url = safeUrl(item.url);
  if (url) return externalLink(url, title, icon, detail);
  if (item.kind === 'document' && item.id) return `<button type="button" class="activity-item" data-document-id="${escapeHtml(item.id)}"><i class="${icon}" aria-hidden="true"></i><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><i class="ri-eye-line" aria-hidden="true"></i></button>`;
  return `<div class="activity-item"><i class="${icon}" aria-hidden="true"></i><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><i class="ri-information-line" aria-hidden="true"></i></div>`;
}

function renderActivity(project) {
  const activity = projectActivity(project);
  return `${projectHeading(project)}<section class="detail-section"><h3>Repository and document activity</h3><div class="activity-list">${[...activity, ...documentsForProject(project.id).map(document => ({ ...document, kind: 'document', project }))].map(activityMarkup).join('') || '<div class="empty-state"><i class="ri-pulse-line" aria-hidden="true"></i>No activity evidence yet.</div>'}</div></section>`;
}

function documentsForProject(projectId) {
  return state.documents.filter(document => document.projectId === projectId);
}

function renderDocuments(project) {
  const documents = documentsForProject(project.id);
  const importedFiles = project.files || [];
  return `${projectHeading(project)}
    <section class="detail-section"><h3>Local document library</h3><div class="drop-zone" data-document-drop><i class="ri-upload-cloud-2-line" aria-hidden="true"></i><strong>Drop project files here</strong><small>Files stay in this browser until you export them.</small><button type="button" data-action="upload-document">Choose files</button></div></section>
    <section class="detail-section"><h3>Stored files · ${documents.length + importedFiles.length}</h3><div class="document-list">${documents.map(document => `<button type="button" class="document-item" data-document-id="${escapeHtml(document.id)}"><i class="ri-file-line" aria-hidden="true"></i><span><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(formatBytes(document.size))} · v${document.version || 1} · ${escapeHtml(formatDate(document.uploadedAt))}</small></span><i class="ri-eye-line" aria-hidden="true"></i></button>`).join('')}${importedFiles.map(file => `<div class="document-item"><i class="ri-file-info-line" aria-hidden="true"></i><span><strong>${escapeHtml(file.name || file.label || 'Associated file')}</strong><small>${escapeHtml(file.fileType || file.type || 'Metadata only')} · ${escapeHtml(file.owner || 'Owner unknown')}</small></span><i class="ri-information-line" aria-hidden="true"></i></div>`).join('')}${documents.length + importedFiles.length ? '' : '<div class="empty-state"><i class="ri-folder-open-line" aria-hidden="true"></i>No files associated with this project.</div>'}</div></section>`;
}

function renderConnections(project) {
  const connections = state.relationships.filter(relationship => relationship.source === project.id || relationship.target === project.id);
  const dependencyEntries = (project.dependencies || []).map(dependency => ({ id: `dependency-${dependency}`, type: 'depends-on', other: projectById(dependency)?.name || dependency, label: 'Declared dependency', removable: false }));
  const entries = connections.map(relationship => {
    const otherId = relationship.source === project.id ? relationship.target : relationship.source;
    return { ...relationship, other: projectById(otherId)?.name || otherId, removable: true };
  });
  return `${projectHeading(project)}<section class="detail-section"><h3>Graph relationships</h3><div class="button-row"><button type="button" class="primary" data-action="add-connection"><i class="ri-link-m" aria-hidden="true"></i>Add connection</button></div></section><section class="detail-section"><h3>Connected nodes · ${entries.length + dependencyEntries.length}</h3><div class="connection-list">${[...entries, ...dependencyEntries].map(connection => `<div class="connection-item"><i class="ri-node-tree" aria-hidden="true"></i><span><strong>${escapeHtml(connection.other)}</strong><small>${escapeHtml(connection.type)}${connection.label ? ` · ${escapeHtml(connection.label)}` : ''}</small></span>${connection.removable ? `<button type="button" class="icon-button" data-remove-relationship="${escapeHtml(connection.id)}" aria-label="Remove connection to ${escapeHtml(connection.other)}"><i class="ri-close-line" aria-hidden="true"></i></button>` : '<i class="ri-lock-line" aria-hidden="true"></i>'}</div>`).join('') || '<div class="empty-state"><i class="ri-share-line" aria-hidden="true"></i>No connections yet.</div>'}</div></section>`;
}

function renderInspector() {
  const project = selectedProject();
  $$('[data-tab]').forEach(button => {
    const selected = button.dataset.tab === state.inspectorTab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  elements.inspector.setAttribute('aria-labelledby', `project-tab-${state.inspectorTab}`);
  if (!project) {
    elements.inspector.innerHTML = '<div class="inspector-empty"><i class="ri-cursor-line" aria-hidden="true"></i><strong>Select a project node</strong><span>Repository, activity, documents, and relationships will appear here.</span></div>';
    return;
  }
  const renderers = { overview: renderOverview, repository: renderRepository, activity: renderActivity, documents: renderDocuments, connections: renderConnections };
  elements.inspector.innerHTML = (renderers[state.inspectorTab] || renderOverview)(project);
}

function allActivity() {
  const activity = state.projects.flatMap(projectActivity);
  const documents = state.documents.map(document => ({ ...document, kind: 'document', project: projectById(document.projectId) }));
  return [...activity, ...documents].sort((left, right) => new Date(right.date || right.updatedAt || right.uploadedAt || 0) - new Date(left.date || left.updatedAt || left.uploadedAt || 0));
}

function renderActivityTray() {
  const activity = allActivity();
  const issues = activity.filter(item => item.kind === 'issue');
  const pulls = activity.filter(item => item.kind === 'pull');
  const commits = activity.filter(item => item.kind === 'commit');
  const documents = activity.filter(item => item.kind === 'document');
  $('[data-activity-count]').textContent = String(activity.length);
  $('[data-issue-count]').textContent = String(issues.length);
  $('[data-pr-count]').textContent = String(pulls.length);
  $('[data-commit-count]').textContent = String(commits.length);
  $('[data-document-count]').textContent = String(documents.length);
  $$('[data-activity-tab]').forEach(button => {
    const selected = button.dataset.activityTab === state.activityTab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  elements.activityFeed.setAttribute('aria-labelledby', `activity-tab-${state.activityTab}`);
  const groups = { activity, issues, pulls, commits, documents };
  elements.activityFeed.innerHTML = (groups[state.activityTab] || activity).slice(0, 12).map(activityMarkup).join('') || '<div class="empty-state">No items in this activity view.</div>';
}

function renderAll() {
  rebuildProjects();
  populateTagFilter();
  updateVisibleProjects();
  renderProjectList();
  renderFocusSummary();
  renderSourceSummary();
  renderMap();
  renderInspector();
  renderActivityTray();
}

function selectProject(projectId, { focusInspector = false } = {}) {
  if (!projectById(projectId)) return;
  state.selectedId = projectId;
  saveWorkspace({ quiet: true });
  renderAll();
  if (focusInspector) elements.inspector.focus?.();
}

function setInspectorTab(tab) {
  state.inspectorTab = tab;
  renderInspector();
}

function setZoom(value) {
  state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 10) / 10));
  renderMap();
}

function clearFilters() {
  elements.search.value = '';
  $$('[data-filter]').forEach(select => { select.value = 'all'; });
  $('[data-sort]').value = 'recent';
  state.currentView = 'map';
  $$('[data-view]').forEach(button => {
    const selected = button.dataset.view === 'map';
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  renderAll();
}

function toast(title, message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.innerHTML = `<i class="${type === 'error' ? 'ri-error-warning-line' : 'ri-checkbox-circle-line'}" aria-hidden="true"></i><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(message)}</small></span>`;
  elements.toastRegion.append(item);
  window.setTimeout(() => item.remove(), 4800);
}

function openEditDialog() {
  const project = selectedProject();
  if (!project) return;
  elements.editForm.elements.purpose.value = project.purpose || '';
  elements.editForm.elements.status.value = project.status || 'inactive';
  elements.editForm.elements.priority.value = project.priority || 'unassigned';
  elements.editForm.elements.owner.value = project.owner || '';
  elements.editForm.elements.health.value = project.health || 'unknown';
  elements.editForm.elements.tags.value = (project.tags || []).join(', ');
  elements.editDialog.showModal();
}

function openConnectionDialog() {
  if (!state.projects.length) return;
  const options = state.projects.slice().sort((a, b) => a.name.localeCompare(b.name)).map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join('');
  elements.connectionForm.elements.source.innerHTML = options;
  elements.connectionForm.elements.target.innerHTML = options;
  elements.connectionForm.elements.source.value = state.selectedId || state.projects[0].id;
  elements.connectionForm.elements.target.value = state.projects.find(project => project.id !== state.selectedId)?.id || state.projects[0].id;
  elements.connectionForm.elements.label.value = '';
  elements.connectionDialog.showModal();
}

function askConfirm(title, message, actionLabel = 'Confirm') {
  $('[data-confirm-title]').textContent = title;
  $('[data-confirm-message]').textContent = message;
  $('[data-confirm-button]').textContent = actionLabel;
  elements.confirmDialog.returnValue = '';
  elements.confirmDialog.showModal();
  return new Promise(resolve => {
    elements.confirmDialog.addEventListener('close', () => resolve(elements.confirmDialog.returnValue === 'confirm'), { once: true });
  });
}

function openDocumentDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DOCUMENT_STORE)) request.result.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function documentTransaction(mode, operation) {
  const database = await openDocumentDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, mode);
    const store = transaction.objectStore(DOCUMENT_STORE);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function loadDocuments() {
  try {
    state.documents = await documentTransaction('readonly', store => store.getAll());
  } catch (error) {
    state.documents = [];
    toast('Document storage unavailable', `${error.message}. Metadata tools remain available.`, 'error');
  }
}

async function uploadDocuments(files) {
  const project = selectedProject();
  if (!project || !files?.length) return;
  let stored = 0;
  for (const file of files) {
    try {
      const record = createDocumentRecord(file, project.id, project.owner || 'Unassigned');
      await documentTransaction('readwrite', store => store.put({ ...record, blob: file }));
      state.documents = state.documents.filter(document => document.id !== record.id);
      state.documents.push({ ...record, blob: file });
      stored += 1;
    } catch (error) {
      toast(`Could not store ${file.name}`, error.message, 'error');
    }
  }
  if (stored) toast('Files added', `${stored} file${stored === 1 ? '' : 's'} associated with ${project.name}.`, 'success');
  renderAll();
  elements.documentInput.value = '';
}

async function previewDocument(documentId) {
  const record = state.documents.find(document => document.id === documentId)
    || await documentTransaction('readonly', store => store.get(documentId)).catch(() => null);
  if (!record?.blob) {
    toast('Preview unavailable', 'This record does not contain a local file blob.', 'error');
    return;
  }
  state.currentDocumentId = documentId;
  $('[data-document-title]').textContent = record.name;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = URL.createObjectURL(record.blob);
  const preview = $('[data-document-preview]');
  if (record.fileType.startsWith('image/')) {
    preview.innerHTML = `<img src="${escapeHtml(state.previewUrl)}" alt="Preview of ${escapeHtml(record.name)}">`;
  } else if (record.fileType === 'application/pdf') {
    preview.innerHTML = `<iframe src="${escapeHtml(state.previewUrl)}" title="Preview of ${escapeHtml(record.name)}"></iframe>`;
  } else if (record.fileType.startsWith('text/') || /json|javascript|xml|csv|markdown/.test(record.fileType)) {
    preview.innerHTML = `<pre>${escapeHtml(await record.blob.text())}</pre>`;
  } else {
    preview.innerHTML = `<div class="empty-state"><i class="ri-file-download-line" aria-hidden="true"></i><strong>${escapeHtml(record.name)}</strong><br>${escapeHtml(record.fileType)} · ${escapeHtml(formatBytes(record.size))}<br>Download this file to open it in its native application.</div>`;
  }
  elements.documentDialog.showModal();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function downloadCurrentDocument() {
  const record = state.documents.find(document => document.id === state.currentDocumentId);
  if (!record?.blob) return;
  downloadBlob(record.blob, record.name);
  toast('Download started', record.name, 'success');
}

async function deleteCurrentDocument() {
  const record = state.documents.find(document => document.id === state.currentDocumentId);
  if (!record) return;
  elements.documentDialog.close();
  const confirmed = await askConfirm('Delete local document?', `${record.name} will be removed from this browser.`, 'Delete document');
  if (!confirmed) return;
  try {
    await documentTransaction('readwrite', store => store.delete(record.id));
    state.documents = state.documents.filter(document => document.id !== record.id);
    toast('Document deleted', record.name, 'success');
    renderAll();
  } catch (error) {
    toast('Delete failed', error.message, 'error');
  }
}

function workspaceExport() {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    projects: state.projects.map(project => structuredClone(project)),
    relationships: structuredClone(state.relationships),
    overrides: structuredClone(state.overrides),
    documents: state.documents.map(({ blob, ...metadata }) => metadata),
  };
}

async function exportWorkspace(format) {
  const workspace = workspaceExport();
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'json') downloadBlob(new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' }), `buildgraph-workspace-${stamp}.json`);
  if (format === 'csv') downloadBlob(new Blob([toCsv(workspace.projects)], { type: 'text/csv' }), `buildgraph-projects-${stamp}.csv`);
  if (format === 'markdown') downloadBlob(new Blob([toMarkdown(workspace)], { type: 'text/markdown' }), `buildgraph-workspace-${stamp}.md`);
  if (format === 'zip') {
    const files = [
      { name: 'workspace.json', data: JSON.stringify(workspace, null, 2) },
      { name: 'projects.csv', data: toCsv(workspace.projects) },
      { name: 'workspace.md', data: toMarkdown(workspace) },
      { name: 'README.md', data: '# BuildGraph export\n\nThis archive preserves project records, graph relationships, document metadata, and locally stored project files.\n' },
      ...state.documents.filter(document => document.blob).map(document => ({ name: `documents/${document.projectId}/${document.name}`, data: document.blob })),
    ];
    downloadBlob(new Blob([await buildZip(files)], { type: 'application/zip' }), `buildgraph-complete-${stamp}.zip`);
  }
  elements.exportMenu.hidden = true;
  $('[data-action="toggle-export"]').setAttribute('aria-expanded', 'false');
  toast('Export prepared', `${format.toUpperCase()} download contains the current local workspace.`, 'success');
}

async function parseImport(file) {
  try {
    const payload = validateWorkspaceImport(JSON.parse(await file.text()));
    state.pendingImport = payload;
    $('[data-import-summary]').textContent = `${payload.projects.length} projects and ${payload.relationships.length} relationships are ready. Imported metadata remains in this browser.`;
    elements.importDialog.showModal();
  } catch (error) {
    toast('Import rejected', error.message, 'error');
  } finally {
    elements.importInput.value = '';
  }
}

function applyImport(mode) {
  if (!state.pendingImport) return;
  const incoming = state.pendingImport;
  if (mode === 'replace') {
    state.importedProjects = incoming.projects;
    state.relationships = incoming.relationships;
    state.overrides = incoming.overrides || {};
  } else {
    const projects = new Map(state.importedProjects.map(project => [project.id, project]));
    for (const project of incoming.projects) {
      if (!state.bundledProjects.some(publicProject => publicProject.id === project.id)) projects.set(project.id, project);
    }
    state.importedProjects = [...projects.values()];
    const allProjects = [...state.bundledProjects, ...state.importedProjects];
    for (const relationship of incoming.relationships) {
      try {
        state.relationships = upsertRelationship(state.relationships, relationship, allProjects);
      } catch {
        // Validation already checked the incoming graph. Ignore only cross-catalog collisions.
      }
    }
    state.overrides = { ...state.overrides, ...(incoming.overrides || {}) };
  }
  state.pendingImport = null;
  rebuildProjects();
  state.selectedId = incoming.projects[0]?.id || state.selectedId;
  saveWorkspace({ quiet: true });
  elements.importDialog.close();
  toast('Catalog imported', `${incoming.projects.length} projects were applied in ${mode} mode.`, 'success');
  renderAll();
}

async function refreshRepository() {
  const project = selectedProject();
  if (!project?.repository?.fullName || project.metadata?.source !== 'github') {
    toast('Refresh unavailable', 'Only public GitHub repository nodes can refresh without credentials.', 'error');
    return;
  }
  const fullName = project.repository.fullName.split('/').map(encodeURIComponent).join('/');
  const base = `https://api.github.com/repos/${fullName}`;
  try {
    toast('Refreshing repository', `Loading current public evidence for ${project.name}.`, 'success');
    const request = url => fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(response => {
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      return response.json();
    });
    const [repository, branches, commits, issues, pulls] = await Promise.all([
      request(base), request(`${base}/branches?per_page=20`), request(`${base}/commits?per_page=10`), request(`${base}/issues?state=open&per_page=20`), request(`${base}/pulls?state=open&per_page=20`),
    ]);
    state.repositoryOverrides[project.id] = {
      health: repository.archived ? 'archived' : repository.disabled ? 'attention' : 'healthy',
      repository: {
        defaultBranch: repository.default_branch,
        branches: branches.map(branch => ({ name: branch.name, protected: branch.protected, sha: branch.commit.sha, url: `${project.repository.url}/tree/${encodeURIComponent(branch.name)}` })),
        recentChanges: commits.map(commit => ({ sha: commit.sha.slice(0, 12), message: commit.commit.message.split('\n')[0], author: commit.author?.login || commit.commit.author?.name, date: commit.commit.author?.date, url: commit.html_url })),
        openIssues: issues.filter(issue => !issue.pull_request).map(issue => ({ number: issue.number, title: issue.title, user: issue.user?.login, updatedAt: issue.updated_at, url: issue.html_url })),
        openPullRequests: pulls.map(pull => ({ number: pull.number, title: pull.title, user: pull.user?.login, updatedAt: pull.updated_at, url: pull.html_url })),
        openIssuesCount: repository.open_issues_count,
      },
      metadata: { updatedAt: repository.updated_at, pushedAt: repository.pushed_at, stars: repository.stargazers_count, forks: repository.forks_count, refreshedAt: new Date().toISOString() },
    };
    saveWorkspace({ quiet: true });
    renderAll();
    $('[data-refresh-label]').textContent = `Refreshed ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
    toast('Repository refreshed', `${project.name} now reflects current public GitHub evidence.`, 'success');
  } catch (error) {
    toast('Refresh failed', `${error.message}. Bundled evidence is still available.`, 'error');
  }
}

function switchView(view) {
  state.currentView = view;
  $$('[data-view]').forEach(button => {
    const selected = button.dataset.view === view;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  if (['documents', 'connections', 'activity'].includes(view)) setInspectorTab(view);
  if (view === 'settings') {
    setInspectorTab('overview');
    toast('Local-first workspace', 'Edits, imports, node positions, and documents are stored on this device.', 'success');
  }
  renderAll();
}

function removeRelationship(relationshipId) {
  const relationship = state.relationships.find(item => item.id === relationshipId);
  if (!relationship) return;
  const otherId = relationship.source === state.selectedId ? relationship.target : relationship.source;
  askConfirm('Remove graph connection?', `The connection to ${projectById(otherId)?.name || otherId} will be removed from this local workspace.`, 'Remove connection').then(confirmed => {
    if (!confirmed) return;
    state.relationships = state.relationships.filter(item => item.id !== relationshipId);
    saveWorkspace({ quiet: true });
    renderAll();
    toast('Connection removed', 'The graph and exports now reflect this change.', 'success');
  });
}

function beginNodeDrag(event) {
  const node = event.target.closest('.graph-node:not(.center)');
  if (!node || event.button !== 0) return;
  state.dragging = { node, key: node.dataset.nodeKey, startX: event.clientX, startY: event.clientY, moved: false };
  node.setPointerCapture?.(event.pointerId);
}

function moveNode(event) {
  if (!state.dragging) return;
  const distance = Math.hypot(event.clientX - state.dragging.startX, event.clientY - state.dragging.startY);
  if (distance < 3 && !state.dragging.moved) return;
  state.dragging.moved = true;
  const bounds = elements.mapViewport.getBoundingClientRect();
  const x = Math.max(6, Math.min(94, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(8, Math.min(92, ((event.clientY - bounds.top) / bounds.height) * 100));
  state.dragging.node.style.left = `${x}%`;
  state.dragging.node.style.top = `${y}%`;
  const graphNode = state.graphNodes.find(node => `${node.kind === 'resource' ? `resource-${node.resource.key}` : `project-${node.project?.id}`}` === state.dragging.key);
  if (graphNode) {
    graphNode.x = x;
    graphNode.y = y;
    renderConnectors();
    renderMinimap();
  }
}

function endNodeDrag() {
  if (!state.dragging) return;
  if (state.dragging.moved) {
    const x = parseFloat(state.dragging.node.style.left);
    const y = parseFloat(state.dragging.node.style.top);
    state.positions[`${state.selectedId}:${state.dragging.key}`] = { x, y };
    saveWorkspace({ quiet: true });
    state.suppressProjectClick = true;
    window.setTimeout(() => { state.suppressProjectClick = false; }, 0);
  }
  state.dragging = null;
}

elements.editForm.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  if (!elements.editForm.reportValidity()) return;
  const project = selectedProject();
  if (!project) return;
  const data = new FormData(elements.editForm);
  state.overrides[project.id] = {
    ...(state.overrides[project.id] || {}),
    purpose: data.get('purpose'),
    status: data.get('status'),
    priority: data.get('priority'),
    owner: data.get('owner') || 'Unassigned',
    health: data.get('health'),
    tags: String(data.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean),
  };
  elements.editDialog.close();
  saveWorkspace({ quiet: true });
  renderAll();
  toast('Project updated', `${project.name} metadata was saved locally.`, 'success');
});

elements.connectionForm.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const data = new FormData(elements.connectionForm);
  try {
    state.relationships = upsertRelationship(state.relationships, {
      source: data.get('source'), target: data.get('target'), type: data.get('type'), label: data.get('label'),
    }, state.projects);
    elements.connectionDialog.close();
    saveWorkspace({ quiet: true });
    renderAll();
    toast('Connection added', 'The MindMap and workspace exports were updated.', 'success');
  } catch (error) {
    toast('Connection rejected', error.message, 'error');
  }
});

document.addEventListener('click', async event => {
  const projectControl = event.target.closest('[data-project-id]');
  if (projectControl && !state.suppressProjectClick) {
    selectProject(projectControl.dataset.projectId);
    return;
  }

  const documentControl = event.target.closest('[data-document-id]');
  if (documentControl) {
    await previewDocument(documentControl.dataset.documentId);
    return;
  }

  const removeControl = event.target.closest('[data-remove-relationship]');
  if (removeControl) {
    removeRelationship(removeControl.dataset.removeRelationship);
    return;
  }

  const tab = event.target.closest('[data-tab]');
  if (tab) {
    setInspectorTab(tab.dataset.tab);
    return;
  }

  const activityTab = event.target.closest('[data-activity-tab]');
  if (activityTab) {
    state.activityTab = activityTab.dataset.activityTab;
    renderActivityTray();
    return;
  }

  const view = event.target.closest('[data-view]');
  if (view) {
    switchView(view.dataset.view);
    return;
  }

  const exportControl = event.target.closest('[data-export]');
  if (exportControl) {
    await exportWorkspace(exportControl.dataset.export);
    return;
  }

  const resource = event.target.closest('[data-resource-key]');
  if (resource) {
    const destination = safeUrl(resource.dataset.resourceUrl);
    if (destination) window.open(destination, '_blank', 'noopener,noreferrer');
    else setInspectorTab(resourceConfig[resource.dataset.resourceKey]?.tab || 'overview');
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) {
    if (!event.target.closest('.menu-shell')) {
      elements.exportMenu.hidden = true;
      $('[data-action="toggle-export"]').setAttribute('aria-expanded', 'false');
    }
    return;
  }

  if (action === 'toggle-export') {
    elements.exportMenu.hidden = !elements.exportMenu.hidden;
    event.target.closest('[data-action]').setAttribute('aria-expanded', String(!elements.exportMenu.hidden));
  }
  if (action === 'import') elements.importInput.click();
  if (action === 'refresh') await refreshRepository();
  if (action === 'clear-filters') clearFilters();
  if (action === 'fit-map') setZoom(1);
  if (action === 'focus-selected') setZoom(1.2);
  if (action === 'zoom-in') setZoom(state.zoom + 0.1);
  if (action === 'zoom-out') setZoom(state.zoom - 0.1);
  if (action === 'expand-all') { state.expanded = true; renderMap(); }
  if (action === 'collapse-all') { state.expanded = false; renderMap(); }
  if (action === 'toggle-navigation') document.body.classList.toggle('navigation-collapsed');
  if (action === 'toggle-outline') document.body.classList.toggle('outline-collapsed');
  if (action === 'toggle-activity') document.body.classList.toggle('activity-collapsed');
  if (action === 'edit-project') openEditDialog();
  if (action === 'add-connection') openConnectionDialog();
  if (action === 'upload-document') elements.documentInput.click();
  if (action === 'open-activity-details') setInspectorTab('activity');
  if (action === 'apply-import-merge') { event.preventDefault(); applyImport('merge'); }
  if (action === 'apply-import-replace') { event.preventDefault(); applyImport('replace'); }
  if (action === 'download-document') { event.preventDefault(); await downloadCurrentDocument(); }
  if (action === 'delete-document') { event.preventDefault(); await deleteCurrentDocument(); }
});

elements.search.addEventListener('input', renderAll);
$$('[data-filter], [data-sort]').forEach(control => control.addEventListener('change', renderAll));
elements.importInput.addEventListener('change', () => parseImport(elements.importInput.files[0]));
elements.documentInput.addEventListener('change', () => uploadDocuments(elements.documentInput.files));
elements.mapViewport.addEventListener('pointerdown', beginNodeDrag);
elements.mapViewport.addEventListener('pointermove', moveNode);
elements.mapViewport.addEventListener('pointerup', endNodeDrag);
elements.mapViewport.addEventListener('pointercancel', endNodeDrag);

document.addEventListener('dragover', event => {
  if (event.target.closest('[data-document-drop]')) event.preventDefault();
});
document.addEventListener('drop', event => {
  if (!event.target.closest('[data-document-drop]')) return;
  event.preventDefault();
  uploadDocuments(event.dataTransfer.files);
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.search.focus();
    elements.search.select();
  }
  if (event.key === 'Escape' && !$$('dialog[open]').length && document.activeElement === elements.search && elements.search.value) {
    elements.search.value = '';
    renderAll();
  }
});

document.addEventListener('keydown', event => {
  const currentTab = event.target.closest('[role="tab"]');
  const tablist = currentTab?.closest('[role="tablist"]');
  if (!tablist || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = $$('[role="tab"]', tablist);
  const currentIndex = tabs.indexOf(currentTab);
  const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (currentIndex + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
});

elements.mapViewport.addEventListener('keydown', event => {
  if (['+', '='].includes(event.key)) { event.preventDefault(); setZoom(state.zoom + 0.1); return; }
  if (['-', '_'].includes(event.key)) { event.preventDefault(); setZoom(state.zoom - 0.1); return; }
  if (event.key === 'Enter') { event.preventDefault(); setInspectorTab('overview'); return; }
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !state.visibleProjects.length) return;
  event.preventDefault();
  const currentIndex = Math.max(0, state.visibleProjects.findIndex(project => project.id === state.selectedId));
  const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
  const nextIndex = (currentIndex + delta + state.visibleProjects.length) % state.visibleProjects.length;
  selectProject(state.visibleProjects[nextIndex].id);
});

window.addEventListener('beforeunload', () => {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
});

window.addEventListener('resize', () => renderMap());

window.BuildGraph = Object.freeze({
  importWorkspace(payload, mode = 'merge') {
    if (!['merge', 'replace'].includes(mode)) throw new Error('Import mode must be merge or replace.');
    const workspace = validateWorkspaceImport(payload);
    state.pendingImport = workspace;
    applyImport(mode);
    return { projects: workspace.projects.length, relationships: workspace.relationships.length, mode };
  },
  exportWorkspace() {
    return workspaceExport();
  },
  selectProject(projectId) {
    selectProject(projectId);
    return selectedProject()?.id || null;
  },
});

async function initialize() {
  applyStoredWorkspace();
  $('[data-current-date]').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  try {
    const response = await fetch('./data/projects.json');
    if (!response.ok) throw new Error(`Catalog request returned ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.repositories)) throw new Error('Public repository catalog is malformed.');
    state.bundledProjects = payload.repositories.map(repository => normalizeRepository(repository));
    await loadDocuments();
    rebuildProjects();
    if (!projectById(state.selectedId)) {
      state.selectedId = state.projects.find(project => /opportunity/i.test(project.name))?.id || state.projects[0]?.id || null;
    }
    elements.loading.hidden = true;
    elements.app.hidden = false;
    renderAll();
    requestAnimationFrame(renderMap);
  } catch (error) {
    elements.loading.innerHTML = `<i class="ri-error-warning-line" aria-hidden="true"></i><strong>BuildGraph could not load</strong><span>${escapeHtml(error.message)}</span><button type="button" class="secondary" onclick="location.reload()">Try again</button>`;
  }
}

initialize();
