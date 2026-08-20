# Full-Stack-Assets.github.io

Canonical GitHub Pages host for [fullstackassets.com](https://fullstackassets.com/).

## Hosting

- Production host: GitHub Pages
- Source branch: `main`
- Custom domain: `fullstackassets.com`
- Canonical Agentic Capability Library route: `/library/`
- BuildGraph route: `/buildgraph/`
- Aetheria route: `/aetheria/`
- Vercel runtime dependency: none

The deployment workflow builds the public artifact from `Full-Stack-Assets/FullStackAssets` and preserves the existing apex-host architecture. Before the host artifact is assembled, it verifies the source repository, materializes the hash-checked Canon-derived Library catalog, injects the Library discovery and sitemap entries, generates the static `/library/` tree, and re-verifies the assembled source.

The host artifact builder then requires and copies the generated Library, preserves the BuildGraph and Aetheria routes, strips Vercel Analytics references, rejects symbolic links and missing required paths, verifies the final artifact, writes the canonical `CNAME`, and deploys through GitHub Pages.

Dynamic marketplace services are not hosted by this Pages repository. Customer Library, Publisher Studio, commerce, runtime-distribution state, enterprise/private-registry services, PostgreSQL, OIDC, and artifact storage remain subject to the separate production API decision gate documented in `Full-Stack-Assets/FullStackAssets`.
