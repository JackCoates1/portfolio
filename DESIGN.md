# Jack Coates — Signal Observatory

## Intent
A developer’s portfolio with a window into the systems he operates. Dark, futuristic and tactile, grounded in actual engineering work. The interactive Earth is the defining visual; the rest of the page stays calm enough to read.

## Directions explored before implementation
See docs/design/directions.html and direction-1/2/3.png.
1. Signal Observatory: asymmetric identity + large globe; project photography below. Chosen: identity is immediate, globe has room, telemetry provenance sits beside it.
2. Full-screen Network Atlas: globe dominates, navigation becomes a control surface. Rejected for this portfolio because it buries Jack’s work behind an impressive toy.
3. Engineering Field Notes: case-study-first, muted charcoal and small globe. Strong for client services but under-delivers the requested centerpiece.

## System
- Base #080d16 (deep blue-black), raised surface #101b26, text #edf3f5, secondary #a6b8c4, quiet borders #283c4a.
- Accent #a3edf0 (ice cyan) for primary action/focus; #f4b889 (warm signal) for observed security events. Neither implies a confirmed intrusion. Status is always also text.
- Self-hosted Outfit variable: interface and expressive headings. IBM Plex Mono: actual metadata, data coordinates and timestamps only. Licenses in public/fonts.
- Headings use restrained weights 400–500, compact tracking, large deliberate line breaks. Body line-height 1.65 and readable widths; no gradient words, emoji headings or decoration posing as metrics.
- Desktop content max-width 1320px, 64px edge at large widths. Hero 43/57 composition. Projects use real site captures and larger featured images, with asymmetric editorial spacing rather than six interchangeable tiles.
- Mobile: content first, globe follows; 20px minimum edge, 44px control targets, no scrolling capture by globe unless deliberate drag. No information accessible only via hover.
- Square image frames and controls; restrained radii only in retained legacy components. One-pixel dividers group actual content, not ornamental frames around every sentence.

## Motion
- Planet rotates slowly; real recorded-event arcs are static paths with subtle moving tracers clearly described as snapshot playback, not live attacks.
- Ambient background drift is constant but low-contrast and slow. A global pause control stops decorative motion and globe rotation. OS reduced motion starts paused. Stop WebGL rendering offscreen and in hidden tabs. Cap DPR and frame rate.
- No scroll hijacking, parallax text, flashing alerts or fake incoming data. Interaction transitions 160–240ms. Keep content readable at every frame.

## Data and trust
- Local CrowdSec alerts, community decisions and firewall blocks are different evidence categories.
- Captured historical/snapshot data is labelled with source, coverage and capture time. IP geolocation describes network infrastructure, not attacker identity or nationality. Arcs are schematic, not traced packet routes.
- Raw source/destination IPs, private addresses, logs and credentials never enter the new globe dataset or project assets. Aggregate public source geolocation; include exclusions and uncertainty in accessible provenance.
- A missing feed stays unavailable. No fallback demo attack coordinates, fabricated counts or invented projects.

## Review gates
Render and inspect desktop/mobile. Test keyboard access, globe interaction/pause/selection, reduced motion, WebGL failure, malformed/missing/stale data, no horizontal overflow, project links/images, metadata/routes/CSP and existing Cyber Lab consent. Preserve existing tests; document an explicit isolated lazy-globe bundle allowance only if required.

## Implementation review decisions

- Browser critique caught and fixed the inherited collapsed-menu display bug. Mobile text is smaller than the first pass to bring the globe into view sooner.
- The first atmosphere ring was too thick and flight arcs crowded the viewport. The camera is pulled back and rim opacity reduced. Routes remain explicitly schematic.
- Homelab preview is a labelled diagram of documented real systems because no real hardware photo was supplied; it does not pretend to be a dashboard screenshot. The five public web/repository previews are actual captures.
- The existing server security panel is retained for replay/build provenance, with its unsupported unconditional “live” claim removed. Missing/stale source data is explicitly named. It remains separate from the globe snapshot.
- Performance budget: preserve 220 KiB per non-globe JS chunk and 400 KiB total non-globe JS. Add one explicit 550 KiB uncompressed lazy Three.js globe allowance (~133 KiB gzip measured). Combined CSS allowance increases from 32 to 40 KiB to support the new system while retaining Cyber Lab styles (36.5 KiB measured). Each CSS file still has a 28 KiB limit. These are deliberate costs, not silent blanket budget inflation. Geography ~240 KiB uncompressed, loaded only with the globe. Project imagery is lazy. Globe renders at most 30fps with DPR capped at 1.65; paused, hidden and offscreen views do not continuously render.
