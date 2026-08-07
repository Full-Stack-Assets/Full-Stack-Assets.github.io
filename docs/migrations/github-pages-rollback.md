# GitHub Pages Portfolio Rollback Record

Date captured: 2026-08-07

This file records rollback information before repository deployment changes begin. DNS values must be appended immediately before each custom-domain cutover because the connected tools in this session expose GitHub/Vercel state but do not expose the authoritative DNS-zone editor.

## Global state

- GitHub account Pages repository: `Full-Stack-Assets/Full-Stack-Assets.github.io`
- Current account-level CNAME: `productweld.tech`
- Vercel teams inventoried:
  - `team_Ao2Jw39zz5Y6wC73uOpAiuvz` (`full-stack-assets-projects`)
  - `team_hsszzwcQbEI5QQ3ql9vRJ3rA` (`stacks-d75c43ca`)
- `WireandLogic.com`: HOLD / excluded. No rollback-changing operation is permitted.

## Custom-domain rollback records

### moviesrule.com
- GitHub repository: `Full-Stack-Assets/moviesrule.com`
- Previous host/project: Vercel `prj_mNhX5lzSDRgIcC1HpBwsnKihVdbe` (`movies-rule-com`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_DJvq9M6xVzEr9GAJKYxzvkL88QEd` (`READY`, non-production target)
- Vercel domains/aliases at capture:
  - `moviesrule.com`
  - `www.moviesrule.com`
  - `movies-rule-com.vercel.app`
  - `movies-rule-com-stacks-d75c43ca.vercel.app`
  - `movies-rule-com-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### astrokobi.com
- GitHub repository candidate: `Full-Stack-Assets/-Astrokobi.com`
- Previous host/project: Vercel `prj_GU6RO2JZEbibzZnlrQfqArBI9s36` (`astrokobi-com`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_Ce2BXeW8tKa2csWMBTWYzFE9Hjyh` (`READY`, non-production target)
- Vercel domains/aliases at capture:
  - `astrokobi.com`
  - `www.astrokobi.com`
  - `astrokobi-com-stacks-d75c43ca.vercel.app`
  - `astrokobi-com-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### astrokobi.online
- GitHub repository: `Full-Stack-Assets/astrokobi.online`
- Previous host/project: Vercel `prj_BLcGIy8MQkYjwOGxTScc3ZqFoiiG` (`astrokobi-online`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_9DpcnrTDWSy86M5ziVDNqfzKHqAx` (`READY`, production)
- Vercel domains/aliases at capture:
  - `astrokobi.online`
  - `www.astrokobi.online`
  - `astrokobi-online.vercel.app`
  - `astrokobi-online-stacks-d75c43ca.vercel.app`
  - `astrokobi-online-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### astrokobi.site
- GitHub repository: `Full-Stack-Assets/astrokobi.site`
- Previous host/project: Vercel `prj_WWwlb4vjwYmvFIh0BLQ5ax0XfBuD` (`astrokobi-site`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_DxYZSQDZKGnJichrBWcWohWM8F54` (`READY`, production)
- Vercel domains/aliases at capture:
  - `astrokobi.site`
  - `www.astrokobi.site`
  - `astrokobi-site.vercel.app`
  - `astrokobi-site-stacks-d75c43ca.vercel.app`
  - `astrokobi-site-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### astrokobi.space
- GitHub repository: `Full-Stack-Assets/astrokobi.space`
- Previous host/project: Vercel `prj_UM6JplFvfoLcwIYQyAabqEAd5kNi` (`astrokobi-space`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_2hjwG9GWLUVEhQ4ZmxNin6Uihc2F` (`READY`, production)
- Vercel domains/aliases at capture:
  - `astrokobi.space`
  - `www.astrokobi.space`
  - `astrokobi-space.vercel.app`
  - `astrokobi-space-stacks-d75c43ca.vercel.app`
  - `astrokobi-space-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### nextgengear.cc
- GitHub repository: `Full-Stack-Assets/Nextgengear.cc`
- Previous host/project: Vercel `prj_jaGHQ39OrYJJ7dWNWNwP4pn1Uz1t` (`nextgengear-cc`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_6bPHTdG6dJ1XzqNiSofGMwJ3QgL9` (`ERROR`, non-production target)
- Vercel domains/aliases at capture:
  - `nextgengear-cc-stacks-d75c43ca.vercel.app`
  - `nextgengear-cc-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### thetunerdepot.com
- GitHub repository: `Full-Stack-Assets/TheTunerDepot.com`
- Previous host/project: Vercel `prj_OnAy8u4i1lcm3EngqdDkR3SMAO6q` (`the-tuner-depot-com`)
- Vercel project live flag at capture: `false`
- Latest observed deployment: `dpl_73z81q5RMMknokNLzrxZ4eqYbZQN` (`READY`, production)
- Vercel domains/aliases at capture:
  - `the-tuner-depot-com.vercel.app`
  - `the-tuner-depot-com-stacks-d75c43ca.vercel.app`
  - `the-tuner-depot-com-git-main-stacks-d75c43ca.vercel.app`
- DNS-zone records: capture from authoritative DNS provider immediately before cutover and append here before changing them.

### productweld.tech
- GitHub repository: `Full-Stack-Assets/Full-Stack-Assets.github.io`
- Current repository `CNAME`: `productweld.tech`
- Intended role after migration: ProductWeld/account root only; not a parent namespace for unrelated sites.
- DNS-zone records: capture before any ProductWeld DNS change.

## Rollback procedure

For each site, if the Pages replacement fails after DNS cutover:

1. restore the exact DNS values captured immediately before the cutover;
2. restore the prior Vercel domain association only if it was already removed and the Vercel project remains valid;
3. revert the migration PR or redeploy the pre-migration commit if necessary;
4. do not continue Vercel detachment until the Pages build and canonical-domain checks pass again.
