# Full-Stack-Assets.github.io

Canonical GitHub Pages host for the [fullstackassets.com](https://fullstackassets.com/) résumé and company site.

## Hosting

- Production host: GitHub Pages
- Source branch: `main`
- Custom domain: `fullstackassets.com`
- Public artifact: résumé / case studies / services / blog only
- Vercel runtime dependency: none

The deployment workflow copies the hiring-site pages from `Full-Stack-Assets/FullStackAssets` (index, resume, services, case-studies, blog, robots, sitemap). It does **not** inject or publish the Agentic Capability Library, customer library, publisher studio, enterprise registry, BuildGraph, or Aetheria onto this apex.

Library, publisher, and enterprise belong on `library.fullstackassets.com` (FullStackAssets marketplace repo). BuildGraph and Aetheria stay in this repository for now but are not deployed to the custom domain.

The host artifact builder strips Vercel Analytics references, rejects symbolic links and missing required résumé paths, forbids marketplace routes on the artifact, writes the canonical `CNAME`, and deploys through GitHub Pages.

Paid commerce remains disabled until separately approved.
