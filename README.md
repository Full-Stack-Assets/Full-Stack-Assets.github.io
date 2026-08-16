# Full-Stack-Assets.github.io

Canonical GitHub Pages host for [fullstackassets.com](https://fullstackassets.com/).

## Hosting

- Production host: GitHub Pages
- Source branch: `main`
- Custom domain: `fullstackassets.com`
- BuildGraph route: `/buildgraph/`
- Vercel runtime dependency: none

The deployment workflow builds the public artifact from
`Full-Stack-Assets/FullStackAssets`, preserves the BuildGraph and Aetheria
routes, strips Vercel Analytics references, verifies the artifact, and deploys
through GitHub Pages.
