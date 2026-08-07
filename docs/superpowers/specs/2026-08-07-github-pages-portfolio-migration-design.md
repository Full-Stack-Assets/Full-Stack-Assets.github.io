# GitHub Pages Portfolio Migration Design

Date: 2026-08-07
Owner: Full-Stack-Assets
Status: Approved direction, pending implementation plan

## Objective

Move the active website portfolio to GitHub Pages as the public frontend deployment target, assign each domain-named repository to its corresponding production domain by default, eliminate the current dependency on `productweld.tech/<repo-name>` for unrelated projects, and remove Vercel frontend/domain/Git attachments after each replacement is verified.

## Explicit Exclusion

`WireandLogic.com` is out of scope for this migration until the owner explicitly re-authorizes work on it. Do not change its GitHub Pages configuration, Vercel project, Git integration, DNS, custom domains, aliases, environment configuration, or repository files as part of this rollout.

## Scope

Include active repositories that represent public-facing websites or web frontends.

Exclude repositories that are primarily:

- backend/control-plane services with no public website surface;
- native iOS or other native applications;
- Godot, Unreal, or other game-engine projects unless they contain a separately deployable web frontend;
- developer tooling, libraries, templates, or infrastructure-only repositories;
- archived repositories unless explicitly reactivated;
- `WireandLogic.com` until separately authorized.

## Domain Policy

1. If a repository name itself is a domain name, treat that exact name as the intended production domain by default.
2. Examples include `BeyondMythos.com`, `Nextgengear.cc`, `moviesrule.com`, `TheTunerDepot.com`, `astrokobi.online`, `astrokobi.site`, and `astrokobi.space`.
3. If repository configuration clearly specifies a different canonical domain, flag the discrepancy for review rather than silently overriding it.
4. Websites without a dedicated custom domain use their native `Full-Stack-Assets.github.io/<repo>` GitHub Pages URL.
5. `productweld.tech` may remain attached to the account-level `Full-Stack-Assets.github.io` site if that is ProductWeld's intended root site, but it must not function as the implicit parent path for unrelated website projects.

## Architecture Classification

Every in-scope website repository must be classified before changes:

### Static

Plain HTML/CSS/JavaScript or other already-static content. Deploy directly with GitHub Pages.

### Static Build / Export

Framework-based frontend that can produce static output, such as a compatible Next.js, Astro, Vite, or similar project. Configure the repository to produce a Pages-compatible artifact and deploy it through GitHub Actions.

### Hybrid Dynamic

Frontend contains server-side dependencies that GitHub Pages cannot execute, such as authentication handlers, databases, server actions, payment callbacks, server-rendered routes, or private APIs. Move the public/static frontend to Pages while preserving only the external runtime services genuinely required for dynamic features.

GitHub Pages must own the public website and canonical frontend domain. Any retained external backend must be documented explicitly and must not remain an accidental Vercel frontend dependency.

## Known Examples

- `Nextgengear.cc`: Next.js/Tina-based build; evaluate and adapt for static export where feasible.
- `astrokobi.online`: Next.js/Tina-based build; evaluate and adapt for static export where feasible.
- `moviesrule.com`: currently includes Next.js, Prisma/PostgreSQL, authentication, and server-runtime assumptions. Its public frontend can move to Pages, but dynamic data/auth functionality requires a separately hosted runtime or architectural adaptation.
- `BeyondMythos.com`: Express/Stripe-backed Node application with generated static content. Separate the static/public surface from runtime-dependent commerce/API behavior where necessary.

## Deployment Standard

Each in-scope website receives an appropriate GitHub Pages deployment path:

1. canonical build command;
2. framework-specific static export where required;
3. GitHub Actions workflow using GitHub Pages artifact/deploy actions;
4. correct base path and asset handling;
5. SPA/static route fallback where required;
6. custom `CNAME` only for the site's own intended domain;
7. HTTPS enabled after DNS validation;
8. deployment triggered from the canonical production branch.

Do not use one universal workflow if repository frameworks differ materially.

## Vercel Detachment Requirement

Vercel removal is a required migration phase, not optional cleanup.

For each successfully migrated website:

1. identify all matching or duplicate Vercel projects across all connected teams;
2. identify custom domains, Vercel aliases, Git-derived preview aliases, Git repository links, environment variables, and Vercel-specific settings;
3. verify the GitHub Pages replacement before destructive detachment;
4. remove the site's custom production domain from Vercel;
5. disconnect the GitHub repository from corresponding Vercel projects where supported;
6. remove obsolete `.vercel` project linkage from source control if present;
7. remove or replace frontend-only Vercel configuration and packages that are no longer needed;
8. stop future Vercel preview/production builds for the migrated repository;
9. identify and detach duplicate Vercel projects linked to the same frontend;
10. retire or delete obsolete Vercel frontend projects only after verifying that they do not contain a backend/runtime dependency still required by the site.

If a backend service must temporarily remain on Vercel, document it as an explicit exception with its project ID, purpose, required environment variables, API surface, and future removal path. The repository must not remain connected to Vercel merely for frontend deployment.

## DNS Cutover Sequence

For custom-domain sites:

1. make the Pages build succeed at the temporary GitHub Pages URL;
2. verify key routes/assets and client-side behavior;
3. configure repository `CNAME`;
4. update DNS to GitHub Pages according to the domain's apex/subdomain requirements;
5. confirm GitHub domain verification and HTTPS issuance;
6. validate apex/`www` canonical behavior;
7. validate the live site;
8. only then remove matching production domains/aliases from Vercel.

Preserve the prior DNS values long enough to support rollback if the cutover fails.

## Verification Gates

A website is not considered migrated until all applicable checks pass:

- GitHub Pages Actions build succeeds;
- deployed HTML loads without an error/paused-hosting page;
- CSS, JavaScript, images, fonts, and downloadable assets resolve correctly;
- internal navigation works on refresh/direct entry;
- canonical domain resolves to GitHub Pages;
- HTTPS is valid;
- apex and `www` behavior is intentional;
- forms and API calls point to valid external endpoints;
- authentication boundaries still work where applicable;
- commerce links and payment flows do not rely on removed frontend routes;
- analytics still function or have a documented replacement;
- no unintended `productweld.tech/<repo>` canonical URLs remain;
- Vercel no longer owns the migrated frontend domain or receives Git-triggered frontend deployments;
- any retained Vercel backend exception is documented.

## Rollback

For every custom-domain migration, record:

- previous DNS records;
- previous production host/project;
- previous deployment identifier where useful;
- Git commit immediately before Pages migration;
- Git commit containing Pages migration;
- any Vercel project/domain removed during cutover.

If Pages verification fails after DNS cutover, restore the prior DNS target and investigate before attempting detachment again.

## Execution Strategy

Use per-repository migration branches and pull requests rather than bulk direct changes to protected/default branches. Migrate in batches, starting with the simplest static/exportable sites, then hybrid sites requiring backend separation.

Suggested sequence:

1. static domain-named sites;
2. static-build/exportable Next/Astro/Vite sites;
3. hybrid sites with external API/database/auth dependencies;
4. account-level portfolio/root cleanup for `productweld.tech` routing assumptions;
5. final Vercel duplicate-project sweep and detachment audit.

## Non-Goals

- Do not redesign website visual appearance solely for this migration.
- Do not rewrite working dynamic applications into static-only products unless necessary for the public frontend and separately planned.
- Do not remove a backend database/auth/payment/API runtime merely because Vercel frontend hosting is being removed.
- Do not modify `WireandLogic.com`.
- Do not change unrelated repositories just to give every repo a Pages site.

## Success Criteria

The migration is complete when every in-scope active website is either:

1. publicly served through GitHub Pages on its own canonical domain or native GitHub Pages URL, with no Vercel frontend/Git/domain attachment remaining; or
2. explicitly documented as a hybrid exception where only a necessary backend runtime remains outside Pages while the public frontend and canonical domain are owned by GitHub Pages.

`WireandLogic.com` remains untouched until separately authorized.
