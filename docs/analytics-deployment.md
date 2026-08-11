# ProductWeld analytics and Pages routing

`productweld.tech` is currently served by Cloudflare, not by the files in this repository. This repository contains only the GitHub Pages `CNAME`, so adding analytics code here would not instrument the live ProductWeld application.

The portfolio GA4 property should use a `productweld.tech` web stream with a stable `portfolio_site=productweld` parameter. Create and verify the `productweld.tech` Search Console domain property, then add the real measurement ID to the repository that builds the Cloudflare-hosted application.

GitHub project Pages URLs such as `/COO-Engine-Implementation-/` and `/evolution-engine/` inherit this custom domain. Cloudflare currently has no matching routes, so repository artifact repairs alone cannot make those paths live. Choose one of these options before launch:

1. Add explicit Cloudflare routes for those path prefixes to their static artifacts.
2. Give each project a dedicated custom subdomain and DNS record.
3. Remove the organization Pages custom domain only as a coordinated migration, because doing so changes every inherited project URL.

Keep all origins and redirects on HTTPS. Do not claim GA4, AdSense linkage, Search Console verification, or CMP coverage until provider dashboards confirm each activation.
