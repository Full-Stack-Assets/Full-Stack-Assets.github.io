# GitHub Pages Portfolio Migration Manifest

Date: 2026-08-07
Owner: Full-Stack-Assets
Status: Task 1 inventory baseline, corrected after runtime-route inspection

This is the authoritative portfolio migration table for the GitHub Pages rollout. Only rows classified `STATIC`, `STATIC_EXPORT`, or `HYBRID_DYNAMIC` are eligible for implementation. `WireandLogic.com` is explicitly excluded.

## Hard exclusion

| Repository | Classification | Canonical domain | Status | Notes |
|---|---|---|---|---|
| Full-Stack-Assets/WireandLogic | EXCLUDED | wireandlogic.com | HOLD | Do not modify GitHub, Vercel, DNS, domains, aliases, environment variables, or repository files until explicitly re-authorized. |

## Verified domain/web portfolio

| Repository | Visibility | Default branch | Classification | Canonical domain / Pages URL | Vercel mapping | Migration status |
|---|---|---:|---|---|---|---|
| Full-Stack-Assets/Full-Stack-Assets.github.io | public | main | STATIC | productweld.tech | account-level Pages repo; current `CNAME` is `productweld.tech` | INVENTORIED |
| Full-Stack-Assets/BeyondMythos.com | private | main | HYBRID_DYNAMIC | beyondmythos.com | no matching project returned in connected Vercel project inventories | INVENTORIED |
| Full-Stack-Assets/Nextgengear.cc | private | main | HYBRID_DYNAMIC | nextgengear.cc | `prj_jaGHQ39OrYJJ7dWNWNwP4pn1Uz1t` / `nextgengear-cc`; live=false; latest deployment ERROR; Vercel Git aliases remain | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/moviesrule.com | private | main | HYBRID_DYNAMIC | moviesrule.com | `prj_mNhX5lzSDRgIcC1HpBwsnKihVdbe` / `movies-rule-com`; live=false; apex + www still attached; latest deployment READY | INVENTORIED |
| Full-Stack-Assets/-MoviesRule.com | private | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/-MoviesRule.com/ | duplicate/legacy candidate for `moviesrule.com`; do not claim apex while canonical repo remains `moviesrule.com` | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/TheTunerDepot.com | private | main | HYBRID_DYNAMIC | thetunerdepot.com | `prj_OnAy8u4i1lcm3EngqdDkR3SMAO6q` / `the-tuner-depot-com`; live=false; latest production deployment READY; Vercel Git aliases remain | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/-Astrokobi.com | private | main | HYBRID_DYNAMIC | astrokobi.com | `prj_GU6RO2JZEbibzZnlrQfqArBI9s36` / `astrokobi-com`; live=false; apex + www attached; latest deployment READY | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/astrokobi.online | public | main | HYBRID_DYNAMIC | astrokobi.online | `prj_BLcGIy8MQkYjwOGxTScc3ZqFoiiG` / `astrokobi-online`; live=false; apex + www attached; latest production deployment READY | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/astrokobi.site | public | main | HYBRID_DYNAMIC | astrokobi.site | `prj_WWwlb4vjwYmvFIh0BLQ5ax0XfBuD` / `astrokobi-site`; live=false; apex + www attached; latest production deployment READY | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/astrokobi.space | public | main | HYBRID_DYNAMIC | astrokobi.space | `prj_UM6JplFvfoLcwIYQyAabqEAd5kNi` / `astrokobi-space`; live=false; apex + www attached; latest production deployment READY | RUNTIME_SEPARATION_REQUIRED |
| Full-Stack-Assets/Dropfable.com | private | main | HYBRID_DYNAMIC | dropfable.com | no exact matching project returned in connected Vercel inventories; Vite frontend + Express server build | INVENTORIED |
| Full-Stack-Assets/vibecoderz-app | private | main | HYBRID_DYNAMIC | vibecoderz.app | `prj_y8NXnCPK2lCZJeq1fYTSU37UhLg5` / `vibecoderz.app` | INVENTORIED |
| Full-Stack-Assets/portfolio-hub | public | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/portfolio-hub/ | `prj_M3u771hc2XLGL55xqsN81XO3Rrbn` / `portfolio-hub`; Next.js + next-auth | INVENTORIED |
| Full-Stack-Assets/hostgraph-website-mvp | private | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/hostgraph-website-mvp/ | `prj_4QryKq2jCUMZ0tM1aa5TdL54guoR` / `hostgraph-website-mvp` | INVENTORIED |
| Full-Stack-Assets/SelfLLM | public | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/SelfLLM/ | `prj_nKd7uidcL29dQMBdg0yVM9I7BZjZ` / `self-llm` | INVENTORIED |
| Full-Stack-Assets/Autonomous-Store | private | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/Autonomous-Store/ | `prj_J7gZjh90Vs1IWWdumo3XvFwcB1lR` / `autonomous-store` | INVENTORIED |
| Full-Stack-Assets/ANCESTOR-SIMULATOR- | private | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/ANCESTOR-SIMULATOR-/ | `prj_rvo5LPN7TvFx4wSmDnzUPcLJxDAK` / `ancestor-simulator` | INVENTORIED |
| Full-Stack-Assets/Independence250 | private | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/Independence250/ | `prj_xZj3tiHxWWG8rJ2TRTLGLs82uTGh` / `independence250` | INVENTORIED |
| Full-Stack-Assets/DealFlow | public | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/DealFlow/ | `prj_ItmL7YVfszCMYLYPWsTKS2sMWmkK` / `deal-flow` | INVENTORIED |
| Full-Stack-Assets/Photobeam | public | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/Photobeam/ | `prj_UgzXn5kP6UeFjUzBdvHdvTbdv4fv` / `photobeam` | INVENTORIED |
| Full-Stack-Assets/TradeQuotePro | public | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/TradeQuotePro/ | `prj_dQRxzuV3tXzQbYubrnX1EHvoW9s3` / `trade-quote-pro` | INVENTORIED |
| Full-Stack-Assets/overhead-ar-flight-tracker | private | main | HYBRID_DYNAMIC | https://full-stack-assets.github.io/overhead-ar-flight-tracker/ | `prj_SzXBklk7wdC2kO1LeK7hs7FiVZ8r` / `overhead-ar-flight-tracker` | INVENTORIED |

## Confirmed framework/runtime evidence

- `BeyondMythos.com`: Node/Express runtime with Stripe; generated static content exists, but commerce/API behavior requires a server runtime.
- `Nextgengear.cc`: Next.js 15 + TinaCMS; POST `/api/subscribe` and POST `/api/cron/generate` require runtime separation before static export.
- `moviesrule.com`: Next.js 16 + Prisma/PostgreSQL + NextAuth.
- `-MoviesRule.com`: Next.js/Tina family and must be checked for the same runtime routes as sibling sites before export.
- `TheTunerDepot.com`: Next.js/Tina; POST `/api/subscribe` is Node-only/dynamic. Its RSS route is build-time-capable after removing ISR behavior, but currently contains incorrect WireandLogic fallback branding.
- `-Astrokobi.com`: Next.js/Tina plus request-dependent dynamic Open Graph route at `/api/og`, which is incompatible with a pure static export unchanged.
- `astrokobi.online`: Next.js/Tina plus `/api/cron/generate` and `/api/subscribe` server routes.
- `astrokobi.site` and `astrokobi.space`: Next.js/Tina siblings with newsletter/static-generation patterns requiring runtime-route review before export.
- `Dropfable.com`: Vite/React frontend plus Express server bundle and Firebase/Google GenAI dependencies.
- `portfolio-hub`: Next.js 14 + NextAuth.

## Vercel teams inventoried

| Team | ID | Notes |
|---|---|---|
| full-stack-assets-projects | `team_Ao2Jw39zz5Y6wC73uOpAiuvz` | Contains legacy/duplicate projects including `billion-dollar-brief` and `vibe-coding-platform`. |
| stacks-d75c43ca | `team_hsszzwcQbEI5QQ3ql9vRJ3rA` | Contains the majority of current website-linked Vercel projects and generated Git aliases. |

## GitHub repositories currently excluded from this website rollout

The following repositories are archived, native/game/tooling/backend/control-plane/template/content projects, or have no verified public website surface in the current inventory. They are not modified by this migration unless later evidence establishes a public website frontend:

`Spyglass-`, `evolution-engine`, `micro-store-template`, `HostGraph-Procurement-Command-Center`, `Claude-Repo`, `COO-Engine-Implementation-`, `slack-agent-template`, `vibe-coding-platform` (archived), `portfolio-publisher`, `billion-dollar-brief`, `RunwayOS`, `mickey-procurement-platform`, `microsaas-starter`, `VaporLoop` (archived), `vapor-loop`, `VibeCoderz`, `nextgengear`, `Po`, `Squeeze-Candidates-`, `LLM-MODEL`, `Veritas`, `cipherhorizon`, `v0-optimus-the-ai-platform-to-bu`, `v0-compute-the-platform-to-build`, `HTML`, `cosmo`, `Poly-Pipeline`, `FullStackAssets`, `ios-App` (archived), `The-Narrows`, `VisionPrompt`, `Voice-Generator` (archived), `Slingo-Retro`, `Alphamind` (archived), `unreal-engine-skills-for-claude-code-plugin`, `EOS-Getting-Started` (archived), `OpenMontage`, `CLONER`, `concord`, `Keel`, `WorldGen`, `Podcast-editor-`, `The-anti-tourist-guide` (archived), `ANC`, `Outfit-Generator`, `Fashion-Prompt-Architect`, `Influencers-`, `Autonomous-Browser`, `3d-browser-`, `React-browser`, `Flash-Browser`, `Alexandria`, `bbno-llmexperiment`, `ForgeCleanAI`, `RouteStory` (archived), `AI-Agentic-Musicians`, `Temporal-Drift`, `tradewind-dealflow`, and `Full-Stack-Assets`.

This exclusion list is conservative: a repository can move into scope only after a public-facing web surface is verified. That prevents blindly deploying backend/native/tooling repositories as fake Pages sites.

## Migration ordering

1. ProductWeld/account-level STATIC root validation and parent-path cleanup.
2. Trend/news HYBRID_DYNAMIC family (`Nextgengear.cc`, TheTunerDepot, Astrokobi family, legacy MoviesRule frontend): remove runtime-only frontend routes by shifting generation to GitHub Actions and replacing or isolating newsletter/OG endpoints.
3. Larger HYBRID_DYNAMIC applications (`BeyondMythos.com`, `moviesrule.com`, `Dropfable.com`, `portfolio-hub`, etc.).
4. Per-site Pages verification, DNS cutover, then Vercel frontend/domain/Git detachment.
5. Final Vercel duplicate-project/domain/Git-link audit.

## Safety gates

- No DNS or Vercel custom-domain removal before a Pages artifact is verified.
- No Vercel backend deletion where auth/database/payment/API runtime remains necessary.
- No changes of any kind to WireandLogic.com.
