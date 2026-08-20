# Full-Stack-Assets.github.io

Canonical GitHub Pages host for [fullstackassets.com](https://fullstackassets.com/).

## Hosting

- Production host: GitHub Pages
- Source branch: `main`
- Custom domain: `fullstackassets.com`
- Canonical Agentic Capability Library route: `/library/`
- Customer Library route: `/my-library/`
- Publisher Studio route: `/publisher/`
- Enterprise Registry route: `/enterprise/`
- BuildGraph route: `/buildgraph/`
- Aetheria route: `/aetheria/`
- Vercel runtime dependency: none

The deployment workflow builds the public artifact from `Full-Stack-Assets/FullStackAssets` and preserves the existing apex-host architecture. Before the host artifact is assembled, it verifies the source repository, materializes the hash-checked Canon-derived Library catalog, injects the Library discovery and sitemap entries, generates the static `/library/` tree, verifies the dynamic marketplace browser source, and re-verifies the assembled source.

The host artifact builder then requires and copies the generated Library, `/my-library/`, `/publisher/`, `/enterprise/`, and `assets/marketplace-auth.js`; preserves the BuildGraph and Aetheria routes; strips Vercel Analytics references; rejects symbolic links and missing required paths; verifies the final artifact; writes the canonical `CNAME`; and deploys through GitHub Pages.

Dynamic marketplace compute and data services are not hosted by this Pages repository. They run in the approved `Full-Stack-Assets` Supabase project through the `marketplace-api` Edge Function, PostgreSQL, Supabase Auth, and private Supabase Storage. The Pages-hosted dynamic shells authenticate through the shared browser Supabase Auth adapter and send bearer sessions to that API. Authorization remains server-side; browser users do not receive direct marketplace table access or Human Authority.

Paid commerce remains disabled until separately approved.
