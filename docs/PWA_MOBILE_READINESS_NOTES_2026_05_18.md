# Rentrix PWA / Mobile Readiness Notes — 2026-05-18

## Audit findings

- `index.html` already had a correct mobile viewport using `width=device-width`, `initial-scale=1.0`, and `viewport-fit=cover`.
- A manifest file existed in `public/manifest.json`, but it was not linked from `index.html`, so browser installability checks could not discover it.
- `public/icon-rentrix.png` existed as the reusable app icon source. Dedicated 192px and 512px install icon files are still not added to keep this PR text/code-only.
- No active service worker registration or Vite PWA plugin configuration existed in the current app build.
- Protected routes use the shared app shell. The desktop sidebar is hidden below `lg`, and the header/main wrapper needed safer small-screen spacing and overflow containment.
- High-risk tables already had horizontal scroll wrappers in most inspected feature areas. Shared table primitives now enforce a minimum intrinsic width so dense tables scroll instead of compressing or breaking narrow layouts.

## Minimal implementation added

- Re-enabled the manifest link and aligned app metadata/theme color in `index.html`.
- Replaced data-URI manifest icons with static PNG install icons referenced from `public/manifest.json`.
- Reused the existing `icon-rentrix.png` asset for 192px and 512px manifest entries; no new binary image assets were added.
- Added `vite-plugin-pwa` to the Rentrix package and configured it to generate PWA service worker assets during production builds while preserving the existing static manifest.
- Added small responsive app-shell/header/main-content tweaks for protected routes on narrow screens.
- Updated shared table primitives to keep dense tables horizontally scrollable on mobile.

## Mobile smoke checklist still recommended

- Run the production build in a browser and verify `/manifest.json`, `/sw.js`, and `/workbox-*.js` return 200.
- In Chrome DevTools Lighthouse/Application, confirm installability passes for the deployed beta URL.
- Manually check the protected shell at 360px, 390px, and 430px widths after logging in.
- Spot-check dashboard, properties, units, contracts, financials, reports, and settings for horizontal page overflow. Dense tables may scroll horizontally inside their containers by design.

## Follow-up icon note

- For stricter store-quality PWA polish, design/export dedicated 192px and 512px PNG icons in a separate asset-only task. This PR intentionally reuses the existing app icon and does not add binary files.
