# GitHub Pages Portfolio Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every in-scope active website frontend to GitHub Pages on its intended domain, remove the current productweld.tech parent-path dependency, and detach Vercel frontend/domain/Git connections after each replacement is verified, while leaving WireandLogic.com untouched.

**Architecture:** The rollout is inventory-driven and executed per repository. Each website is classified as Static, Static Build/Export, or Hybrid Dynamic; GitHub Pages owns the public frontend and canonical domain, while only necessary external backend services remain. Vercel detachment occurs only after the replacement passes deployment, routing, asset, HTTPS, and functional verification.

**Tech Stack:** GitHub Actions, GitHub Pages, DNS/custom domains, Next.js static export where compatible, framework-native static builds, existing external APIs/backends where required, Vercel project/domain/Git integration cleanup.

## Global Constraints

- `WireandLogic.com` is explicitly out of scope. Do not change its GitHub Pages configuration, Vercel project, Git integration, DNS, custom domains, aliases, environment configuration, or repository files.
- Only active public-facing website or web-frontend repositories are in scope.
- Archived repositories remain excluded unless explicitly reactivated.
- Domain-named repositories use that exact repository-name domain by default unless repository configuration clearly proves a different canonical domain.
- Sites without a dedicated domain use `https://full-stack-assets.github.io/<repo>/`.
- GitHub Pages must own the public website and canonical frontend domain.
- Do not remove a backend runtime that is still required for database, auth, payment, API, or server-side functionality.
- Do not remove Vercel custom domains or Git links until the GitHub Pages replacement is verified.
- Use per-repository migration branches and pull requests; do not bulk-edit default branches directly.
- Preserve rollback information for every DNS and hosting change.

---

## File Structure

Central control repository (`Full-Stack-Assets/Full-Stack-Assets.github.io`):

- `docs/superpowers/specs/2026-08-07-github-pages-portfolio-migration-design.md` — approved migration contract.
- `docs/superpowers/plans/2026-08-07-github-pages-portfolio-migration.md` — this execution plan.
- `docs/migrations/github-pages-portfolio-manifest.md` — authoritative per-repo classification, domain, Vercel mapping, branch, and migration status.
- `docs/migrations/github-pages-rollback.md` — previous DNS/Vercel/project values and rollback notes.
- `docs/migrations/github-pages-exceptions.md` — only retained backend/runtime exceptions.

Per migrated repository:

- `.github/workflows/pages.yml` — Pages build/deploy workflow.
- `CNAME` or `public/CNAME` — custom domain file when the repository owns a dedicated domain; choose the path copied into the final Pages artifact.
- Framework config file only when required for static export, e.g. `next.config.js`, `next.config.mjs`, or `next.config.ts`.
- `package.json` — only when build/export scripts or obsolete Vercel-only dependencies must change.
- `.gitignore` — remove tracked `.vercel` linkage or ensure `.vercel/` is ignored.
- `vercel.json` — delete only when no retained backend/runtime requires it.

---

### Task 1: Build the Portfolio Migration Manifest

**Files:**
- Create: `docs/migrations/github-pages-portfolio-manifest.md`
- Create: `docs/migrations/github-pages-rollback.md`
- Create: `docs/migrations/github-pages-exceptions.md`

**Interfaces:**
- Consumes: connected GitHub repository inventory; connected Vercel teams/projects; approved design spec.
- Produces: one authoritative migration table used by every later task.

- [ ] **Step 1: Enumerate active GitHub repositories owned by `Full-Stack-Assets`**

Record for every repository: repository name, visibility, archived flag, default branch, whether it is a public-facing website, whether the repository name is itself a domain, and whether it is excluded.

- [ ] **Step 2: Hard-exclude WireandLogic.com**

Add this exact manifest entry before any other classification:

```markdown
| Full-Stack-Assets/WireandLogic | EXCLUDED | wireandlogic.com | Do not modify GitHub, Vercel, DNS, domains, aliases, environment variables, or repository files until explicitly re-authorized. |
```

- [ ] **Step 3: Map Vercel projects across both connected teams**

For every in-scope website, record all matching Vercel project IDs and names from:

```text
team_Ao2Jw39zz5Y6wC73uOpAiuvz  full-stack-assets-projects
team_hsszzwcQbEI5QQ3ql9vRJ3rA  stacks-d75c43ca
```

For each match, record custom domains, generated aliases, whether the project reports `live`, and latest deployment state.

- [ ] **Step 4: Classify each in-scope website**

Use exactly one classification:

```text
STATIC
STATIC_EXPORT
HYBRID_DYNAMIC
```

Classification rule:

```text
STATIC         => existing deployable HTML/CSS/JS output with no server runtime
STATIC_EXPORT  => framework app that can generate static output for Pages
HYBRID_DYNAMIC => public frontend can be static, but auth/database/payment/API/server runtime remains external
```

- [ ] **Step 5: Record canonical domain and fallback Pages URL**

For a domain-named repo, use the repo-name domain. For non-domain repos, record:

```text
https://full-stack-assets.github.io/<repo>/
```

- [ ] **Step 6: Record rollback state before any implementation**

For each custom-domain site, add previous DNS target, prior Vercel project ID(s), current Vercel custom domain/alias set, and current default-branch HEAD SHA to `docs/migrations/github-pages-rollback.md`.

- [ ] **Step 7: Commit the manifest documents**

```bash
git add docs/migrations/github-pages-portfolio-manifest.md docs/migrations/github-pages-rollback.md docs/migrations/github-pages-exceptions.md
git commit -m "docs: inventory pages portfolio migration"
```

**Verification gate:** No repository may proceed to Task 2+ unless it appears in the manifest and is not marked EXCLUDED.

---

### Task 2: Migrate STATIC Websites

**Files per repository:**
- Create: `.github/workflows/pages.yml`
- Create or update: `CNAME` when a custom domain exists
- Modify only if necessary: `.gitignore`

**Interfaces:**
- Consumes: `STATIC` entries from the manifest.
- Produces: a verified GitHub Pages deployment at the temporary Pages URL and then the canonical domain.

- [ ] **Step 1: Create a migration branch**

Use:

```text
chore/github-pages-migration
```

- [ ] **Step 2: Add a direct Pages workflow**

Create `.github/workflows/pages.yml` with:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

If the production branch is not `main`, replace `main` with the repository's recorded canonical production branch from the manifest.

- [ ] **Step 3: Add the custom domain when applicable**

For a domain-named repo, create `CNAME` containing exactly the intended apex domain, for example:

```text
Nextgengear.cc
```

Normalize DNS hostnames to lowercase when configuring DNS, but preserve the repo-name rule in documentation.

- [ ] **Step 4: Verify static artifact paths**

Search HTML/CSS/JS for hardcoded `/repo-name/`, `productweld.tech/`, or Vercel deployment URLs. Replace only references that would make the Pages deployment load the wrong origin or parent path.

- [ ] **Step 5: Commit and open a PR**

```bash
git add .github/workflows/pages.yml CNAME .gitignore
git commit -m "chore: deploy site with GitHub Pages"
```

- [ ] **Step 6: Run Pages verification before DNS cutover**

Required checks:

```text
HTTP 200 on homepage
CSS loads
JavaScript loads
images/fonts/downloads load
internal links work
refresh/direct-entry routes do not 404 for supported static routes
no productweld.tech parent-path dependency
```

- [ ] **Step 7: Merge only after checks pass**

Do not remove Vercel attachments yet; proceed to Task 5 only after the Pages URL is healthy.

---

### Task 3: Migrate STATIC_EXPORT Framework Websites

**Files per repository:**
- Create: `.github/workflows/pages.yml`
- Modify: framework config (`next.config.js|mjs|ts`, `vite.config.*`, `astro.config.*`, or equivalent)
- Modify: `package.json` only when build/export scripts require adjustment
- Create: `public/CNAME` for frameworks that copy `public/` into the final artifact, otherwise `CNAME` in the built artifact path
- Modify: `.gitignore` if `.vercel/` is not ignored

**Interfaces:**
- Consumes: `STATIC_EXPORT` entries from the manifest.
- Produces: framework-generated static artifact deployable through Pages.

- [ ] **Step 1: Create `chore/github-pages-migration` branch**

- [ ] **Step 2: Make Next.js projects export static output when supported**

For Next.js repositories, add or merge these settings in the existing Next config:

```js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

If the repository uses CommonJS, preserve CommonJS syntax instead of changing module format.

For sites without a custom domain and therefore hosted at `/repo-name/`, additionally set:

```js
basePath: '/repo-name',
assetPrefix: '/repo-name/',
```

Do not set `basePath` or `assetPrefix` for a site that will use its own custom apex domain.

- [ ] **Step 3: Add a framework-build Pages workflow**

Use `.github/workflows/pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

For a non-Next framework, replace `path: out` with that framework's actual static output directory recorded in the manifest after inspection, e.g. `dist`.

- [ ] **Step 4: Place the custom-domain CNAME in the exported artifact**

For Next.js, create `public/CNAME` containing the exact intended domain so `next build` copies it to `out/CNAME`.

- [ ] **Step 5: Remove frontend-only Vercel coupling from the build**

Delete or replace Vercel-only frontend imports that fail static export, such as Vercel analytics/speed-insights components, only when they are not required by retained backend functionality.

- [ ] **Step 6: Run repository tests before Pages build**

Run the repository's existing test/typecheck/lint commands that are present in `package.json`. Then run:

```bash
npm ci
npm run build
```

Expected: static output directory exists and contains `index.html`.

- [ ] **Step 7: Commit and open a PR**

```bash
git add .github/workflows/pages.yml package.json next.config.* public/CNAME .gitignore
git commit -m "chore: export site for GitHub Pages"
```

- [ ] **Step 8: Verify the temporary Pages deployment**

Confirm all asset, route, and direct-entry checks from Task 2 before any DNS/Vercel changes.

---

### Task 4: Migrate HYBRID_DYNAMIC Website Frontends

**Files per repository:**
- Create: `.github/workflows/pages.yml`
- Create: `public/CNAME` or `CNAME`
- Modify: frontend framework config
- Modify: frontend environment/API configuration
- Create/update central: `docs/migrations/github-pages-exceptions.md`

**Interfaces:**
- Consumes: `HYBRID_DYNAMIC` entries from the manifest.
- Produces: Pages-hosted public frontend plus a documented explicit backend exception.

- [ ] **Step 1: Identify server-only routes and capabilities**

Record each dependency under the repository in `docs/migrations/github-pages-exceptions.md` using this exact structure:

```markdown
### <repository>
- Backend host/project: <provider + project ID>
- Required capabilities: <auth/database/payments/API list>
- Public API base URL: <origin consumed by Pages frontend>
- Required environment variables: <names only, never secret values>
- Repository-to-host Git deployment required: yes/no
- Frontend domain hosted by GitHub Pages: yes
- Future removal path: <specific architectural replacement>
```

- [ ] **Step 2: Separate browser-safe API calls from server runtime**

The Pages frontend may call an HTTPS API origin. Do not embed database credentials, private API keys, Stripe secrets, auth secrets, or server-only environment variables in static JavaScript.

- [ ] **Step 3: Replace same-origin server assumptions**

For frontend calls such as:

```js
fetch('/api/...')
```

replace with an explicit public API base variable that is safe to expose, e.g.:

```js
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
fetch(`${API_BASE}/api/...`);
```

Only use public-prefixed variables in the static frontend.

- [ ] **Step 4: Build/export the public frontend using Task 3 workflow rules**

- [ ] **Step 5: Verify dynamic boundaries from the Pages origin**

Required checks:

```text
login/auth redirect still functions where applicable
public data requests succeed from Pages origin
CORS allows the Pages/custom-domain origin
checkout links or client-side payment initiation reach the retained backend safely
no private env value appears in generated HTML/JS
```

- [ ] **Step 6: Commit and PR**

Use commit message:

```text
chore: move public frontend to GitHub Pages
```

- [ ] **Step 7: Do not detach the retained backend**

Only the frontend domain/Git deploy linkage is removed from Vercel in Task 5. If the backend itself remains on Vercel, preserve the backend project and record it as an exception.

---

### Task 5: Cut Over Custom Domains and Detach Vercel Frontends

**Files:**
- Update central: `docs/migrations/github-pages-rollback.md`
- Update central: `docs/migrations/github-pages-portfolio-manifest.md`
- Per repo: remove tracked `.vercel/` linkage when present
- Per repo: remove `vercel.json` only when no retained backend requires it

**Interfaces:**
- Consumes: a verified Pages deployment from Tasks 2–4.
- Produces: canonical domain served by GitHub Pages and no Vercel frontend/domain/Git attachment.

- [ ] **Step 1: Confirm replacement is healthy before touching Vercel**

The manifest status must be `PAGES_VERIFIED` before continuing.

- [ ] **Step 2: Apply GitHub Pages DNS for the custom domain**

For an apex domain, use GitHub Pages' current documented apex records. For `www`, point the CNAME to:

```text
full-stack-assets.github.io
```

Do not reuse old Vercel CNAME targets.

- [ ] **Step 3: Verify canonical domain and HTTPS**

Required:

```text
apex resolves to GitHub Pages
www behavior is intentional
TLS certificate valid
homepage returns expected site, not "deployment temporarily paused"
```

- [ ] **Step 4: Remove custom production domains from matching Vercel frontend projects**

Remove the migrated domain only from projects identified in the manifest. Do not change WireandLogic.com.

- [ ] **Step 5: Disconnect Git integration for migrated frontend projects**

Disable repository-triggered preview/production deployments for each migrated frontend project. If a Vercel backend exception remains, disconnect only the frontend project; do not break required backend delivery.

- [ ] **Step 6: Remove repository-local Vercel linkage**

If tracked, remove:

```text
.vercel/project.json
```

Ensure `.gitignore` contains:

```text
.vercel
```

Delete `vercel.json` only if the manifest shows `Retained Vercel backend: no`.

- [ ] **Step 7: Sweep duplicate Vercel frontend projects**

For the same repository/domain, identify duplicate projects in both teams. Detach domains and Git integrations from every duplicate frontend project after confirming none is the retained backend exception.

- [ ] **Step 8: Update migration records**

Set manifest status to:

```text
MIGRATED_PAGES_VERCEL_DETACHED
```

Record the exact removed Vercel project IDs/domains in `docs/migrations/github-pages-rollback.md`.

- [ ] **Step 9: Commit repository cleanup**

```bash
git add .gitignore vercel.json .vercel
git commit -m "chore: remove obsolete Vercel frontend linkage"
```

---

### Task 6: Correct the Account-Level productweld.tech Behavior

**Files:**
- Inspect/modify: `CNAME` in `Full-Stack-Assets/Full-Stack-Assets.github.io`
- Inspect/modify: account-level site HTML/config that generates repo links
- Update: `docs/migrations/github-pages-portfolio-manifest.md`

**Interfaces:**
- Consumes: individual site migrations already using their own domains/native Pages URLs.
- Produces: ProductWeld root no longer acts as implicit parent path for unrelated sites.

- [ ] **Step 1: Keep `CNAME` as `productweld.tech` only if this repository is the intended ProductWeld root site**

Do not use it to route unrelated projects beneath `productweld.tech/<repo>`.

- [ ] **Step 2: Search the root site for generated project links using `productweld.tech/<repo>`**

Replace those links with each site's `Canonical URL` from the migration manifest.

- [ ] **Step 3: Verify the root site itself still deploys correctly**

Check homepage, navigation, project links, custom domain, and HTTPS.

- [ ] **Step 4: Commit**

```bash
git add CNAME .
git commit -m "fix: route portfolio sites to canonical domains"
```

---

### Task 7: Final Portfolio Verification and Vercel Sweep

**Files:**
- Update: `docs/migrations/github-pages-portfolio-manifest.md`
- Update: `docs/migrations/github-pages-exceptions.md`
- Update: `docs/migrations/github-pages-rollback.md`

**Interfaces:**
- Consumes: all completed migration PRs and Vercel detachment actions.
- Produces: final migration audit.

- [ ] **Step 1: Verify every non-excluded website has one terminal status**

Allowed terminal statuses:

```text
MIGRATED_PAGES_VERCEL_DETACHED
MIGRATED_PAGES_BACKEND_EXCEPTION
```

`WireandLogic.com` must remain:

```text
EXCLUDED
```

- [ ] **Step 2: Check every canonical URL**

Confirm no site displays a Vercel paused/error page and every Pages/custom-domain URL serves the expected frontend.

- [ ] **Step 3: Search GitHub code for obsolete frontend references**

Across migrated repositories, search for:

```text
productweld.tech/
.vercel/project.json
*.vercel.app
@vercel/analytics
@vercel/speed-insights
```

Classify each remaining occurrence as either required/documented or remove it through a focused follow-up PR.

- [ ] **Step 4: Re-list both Vercel teams**

Ensure migrated frontend repos no longer have custom production domains or Git-triggered frontend deployments. Retained backend exceptions must match `docs/migrations/github-pages-exceptions.md` exactly.

- [ ] **Step 5: Review DNS rollback records**

Confirm every changed custom domain has sufficient previous values documented to reverse the cutover.

- [ ] **Step 6: Commit the final audit**

```bash
git add docs/migrations/
git commit -m "docs: complete GitHub Pages migration audit"
```

---

## Initial Execution Order

Run the plan in this order:

1. Build the complete manifest and Vercel map.
2. Migrate simple STATIC sites first.
3. Migrate STATIC_EXPORT sites, including the Next/Tina properties that successfully export.
4. Migrate HYBRID_DYNAMIC public frontends with explicit backend exceptions.
5. For each verified site, perform DNS cutover and Vercel detachment immediately after verification rather than waiting for the entire portfolio.
6. Correct account-level ProductWeld link behavior after individual canonical URLs are known.
7. Run the final cross-portfolio audit.

Known likely early candidates to inspect first because they are explicit website/domain repos:

```text
BeyondMythos.com
Nextgengear.cc
moviesrule.com
TheTunerDepot.com
astrokobi.online
astrokobi.site
astrokobi.space
-MoviesRule.com
-Astrokobi.com
Dropfable.com
```

Do not infer that every item above is automatically deployable as static; Task 1 classification controls.

## Self-Review Result

- Spec coverage: domain policy, repository classification, Pages deployment, hybrid backend exceptions, productweld.tech correction, DNS sequencing, verification gates, rollback, duplicate Vercel sweep, and WireandLogic exclusion are all represented by tasks.
- Placeholder scan: no `TBD`, `TODO`, or undefined implementation placeholders remain.
- Type/interface consistency: manifest statuses and classification values are defined once and reused consistently.
