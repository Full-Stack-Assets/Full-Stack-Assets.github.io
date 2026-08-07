# GitHub Pages Migration Backend Exceptions

Date: 2026-08-07

Only backends or server runtimes that remain necessary after the public frontend moves to GitHub Pages belong here. Frontend hosting, custom domains, and Git-triggered frontend deployments must not remain on Vercel merely for convenience.

### Full-Stack-Assets/BeyondMythos.com
- Backend host/project: existing Node/Express runtime; connected Vercel inventory did not return an exact matching project
- Required capabilities: Stripe/payment endpoints, Express API/server behavior
- Public API base URL: must be resolved from the existing production runtime before frontend cutover
- Required environment variables: names must be inventoried from repository/runtime configuration before export; never copy values into Pages
- Repository-to-host Git deployment required: only if the retained backend is currently deployed from this repository
- Frontend domain hosted by GitHub Pages: yes
- Future removal path: isolate payment/API endpoints into a dedicated backend service so the website repository can remain frontend-only

### Full-Stack-Assets/moviesrule.com
- Backend host/project: Vercel `prj_mNhX5lzSDRgIcC1HpBwsnKihVdbe` only if required after frontend separation
- Required capabilities: NextAuth authentication, Prisma/PostgreSQL data access, server routes
- Public API base URL: must be established as a dedicated HTTPS backend origin before Pages cutover
- Required environment variables: database URL, auth secrets/provider credentials and any server-only configuration names discovered during implementation; values must never enter static output
- Repository-to-host Git deployment required: no for the Pages frontend; retained backend deployment must be separated or explicitly scoped
- Frontend domain hosted by GitHub Pages: yes
- Future removal path: move auth/data APIs to a dedicated service or backend repository, then remove the remaining Vercel project if Vercel is still used

### Full-Stack-Assets/Dropfable.com
- Backend host/project: current Express server runtime; no exact matching Vercel project returned in connected inventories
- Required capabilities: Express API/server behavior, Google GenAI server-side access where private credentials are required, any Firebase privileged/server operations
- Public API base URL: must be established before Pages cutover
- Required environment variables: server-only Google/Firebase/runtime variable names discovered during implementation; values must never be embedded in Vite output
- Repository-to-host Git deployment required: no for the Pages frontend; retained backend deployment must be isolated
- Frontend domain hosted by GitHub Pages: yes
- Future removal path: split `server.ts` into a dedicated backend deployment and keep the Vite application as the Pages artifact

### Full-Stack-Assets/portfolio-hub
- Backend host/project: Vercel `prj_M3u771hc2XLGL55xqsN81XO3Rrbn` only if authentication remains required
- Required capabilities: NextAuth server-side authentication
- Public API base URL: resolve during implementation if auth is retained
- Required environment variables: NextAuth/server authentication variable names only; never values
- Repository-to-host Git deployment required: no for the Pages frontend
- Frontend domain hosted by GitHub Pages: yes
- Future removal path: either remove server authentication from the public portfolio or move authentication to a dedicated external identity/backend service

### Other HYBRID_DYNAMIC rows
Before a HYBRID_DYNAMIC repository is changed, append a repository-specific section using the same schema and resolve its concrete backend project/API origin. A generic exception is not sufficient for cutover approval.

## Explicit non-exception

`WireandLogic.com` is not an exception to migrate. It is excluded from the migration entirely and must remain untouched until explicitly re-authorized.
