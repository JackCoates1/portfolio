# Final rendered critique — 2026-09-08

Reviewed actual Chromium production renders, not just source code. Evidence: `docs/evidence/final-desktop.png`, `final-tablet.png`, `final-mobile-hero.png`, `final-mobile-globe.png`, `final-full.png` and `final-mobile.png`.

## What works

- The identity and a real interactive Earth share the first desktop screen. The quiet cyan typography and warm observed-origin traces distinguish content from telemetry without a purple gradient hero or a grid of decorative cards.
- The globe is real WebGL: rounded GeoIP groups, selectable origins, drag/keyboard rotation, zoom, reset and motion pause. Country/observation counts derive from the actual selected source. All underlying observations remain accessible without WebGL.
- Client work leads the gallery. Actual Olive/Maxs previews give the page visual variety and credible evidence of work. The other four real projects are clearly identified; no invented client logos, outcomes or metrics.
- The lower sections are deliberately quieter. Data provenance is written in plain language, and contact stays obvious.

## Problems found and corrected

1. Collapsed mobile navigation was visible because Tailwind's flex display overrode the native hidden state. Added an explicit hidden selector; verified computed visibility, Escape and focus return.
2. At 768px, the globe's negative side margins exceeded the viewport by ~3px. Reduced those margins only in the tablet range. Checked 320, 390, 768 and 1024px for actual document overflow.
3. Tablet action links felt crowded across the two columns. Stacked those controls at 768–900px.
4. The initial mobile heading pushed the globe too far down. Reduced the heading scale while keeping the full identity readable.
5. The first globe rim looked too thick, and arcs crowded the top edge. Pulled the camera back and reduced atmosphere opacity.
6. Mobile capture dates wrapped into tiny fragments beside the counters. Gave date/freshness their own readable line.
7. The initial Insecurity screenshot captured a loading shell. Waited for actual public product content and replaced the preview.
8. The old server dashboard claimed LIVE before data arrived, including an offline branch preview. Replaced the unconditional claim with connecting/recent/stale/unavailable/unverified source states. It is explicitly separate from the historical globe.
9. Pause initially stopped visual motion but still rendered GPU frames. Paused and offscreen GPU draw counts now remain unchanged in browser instrumentation.
10. Accessibility scan found the skip link outside a landmark. Gave it a named navigation landmark; desktop and mobile axe scans now report zero violations.

## Honest remaining limitations

- This is a reviewed design exploration, not a deployed site. The globe is a **historical snapshot**, not a working live exporter. Its default VPS source is clearly separate from the much smaller homelab firewall sample; firewall blocks are not labelled proven attacks.
- The homelab preview is an explicitly labelled diagram of documented real systems, not a hardware photo. A real photograph would improve that project’s presentation. Private tools/repositories use their actual public page previews rather than fabricated product interfaces.
- The existing production security/build endpoints are unavailable in a local branch preview. Their empty states are honest. Production data was not copied into mock live responses.
- The retained server-security panel is denser than the rest of the page; keeping real replay and build provenance is a deliberate tradeoff. It loads only near the viewport.
- Three.js costs ~133 KiB gzip in an independent lazy chunk. That cost is explicit in the budget; the ordinary app chunks retain their previous limits.
- Browser evidence is Chromium with software WebGL in this environment. Actual Safari/iOS and low-end physical-device GPU testing remain useful pre-release checks. No claim of cross-device field testing is made.

## Validation

All commands and exit codes are preserved in `docs/validation-2026-09-08.txt`: production build, lint, TypeScript, existing static/hardening/security contracts, 7 JavaScript + 9 Python telemetry tests, bundle budget, preview routes/MIME, original Chromium smoke and the new redesign browser suite. New browser tests cover actual rendering/rotation, source counts and selection, GPU idle on pause/offscreen, six loaded previews/filtering, responsive layout, navigation focus, accessibility, CSP/network isolation, context loss, no WebGL, malformed data and valid empty data.
