# Social preview

The homepage Open Graph and Twitter cards use `/og-signal-observatory-2026-09.jpg`
(1200 × 630 JPEG, approximately 106 KiB). This replaces the generic shield graphic
at `/og-image.png`; that old URL remains available for existing cached consumers.

The image is a browser render of the production `AttackGlobe` component, using
its unchanged committed VPS historical snapshot and geographic data. The card
uses the site's local Outfit and IBM Plex Mono fonts, palette and homepage copy.
No synthetic records or live status claims are added. The snapshot is labelled.

To regenerate: `npm run build && node scripts/render-social-image.mjs`.
Chromium defaults to `/usr/bin/chromium`; override with `CHROMIUM_BIN`.
The script applies composition styles only inside its temporary browser page;
it does not change the homepage UI. Review the resulting JPEG before committing.
Run `npm run build` again to include the new image in dist.

Metadata is in `index.html` (also the SPA shell for client routes). The generated
CV defines no separate social image. Tags specify the absolute HTTPS image URL,
JPEG MIME type, dimensions and descriptive Open Graph/Twitter alternative text.
Existing messages may retain a platform-cached preview until refreshed.
