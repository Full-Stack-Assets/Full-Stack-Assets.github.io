# GitHub Pages Migration Review Notes

## 2026-08-07 — pre-implementation findings

- `astrokobi.online` was initially classified as STATIC_EXPORT, but repository inspection found active Next.js API route handlers (`src/app/api/cron/generate/route.ts` and `src/app/api/subscribe/route.ts`). It must be treated as HYBRID_DYNAMIC unless those capabilities are intentionally separated.
- `-Astrokobi.com` contains a request-dependent dynamic Open Graph route at `src/app/api/og/route.tsx`; a direct static export cannot preserve that endpoint unchanged.
- `TheTunerDepot.com` contains a feed route that currently falls back to `https://wireandlogic.com` and labels the RSS channel "Wire and Logic". That is a pre-existing cross-site branding defect and must be corrected as part of domain migration.
- Next.js static export supports GET Route Handlers that can be rendered at build time, but not request-dependent handlers, ISR, or server-only runtime behavior. Static-export work must remove/replace unsupported behavior rather than merely setting `output: 'export'`.
