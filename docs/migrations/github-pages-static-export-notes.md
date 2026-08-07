# Static Export Compatibility Notes

These notes capture framework constraints found during implementation.

- GitHub Pages serves static files only.
- Next.js projects using `output: 'export'` can emit `GET` route handlers as static files when they do not require incoming request data.
- Request-dependent route handlers, server actions, cookies, redirects/rewrites/headers, ISR, and server-only runtime features must be removed, precomputed, or moved to an external backend before Pages deployment.
- For custom-domain sites, do not configure a repository basePath; the exported site must assume root `/`.
