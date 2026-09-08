# Cyber globe portfolio — running log

Current status: approved redesign deployed successfully as main 1d57bf1; authorized motion-preference and CI improvements follow. See the latest dated entry below. Main release worktree `/root/portfolio-release`; improvement worktree `/root/portfolio-cyber-globe`.

## 2026-09-08 — discovery
- Full brief recovered; fresh bare clone `/root/portfolio-redesign.git`, worktree `/root/portfolio-cyber-globe`, branch `redesign/cyber-globe-2026-09-07`, base `fac0f4e` (current remote main).
- Earlier unfinished branch `/root/jackcoates-portfolio-astra` preserved untouched. This is a new exploration.
- Current app: React/Vite (Supabase no longer in active dependency list), six projects in Projects.tsx. Deploy workflow only runs on main. No push/deploy performed.
- Actual OPNsense CrowdSec queried read-only through existing trusted Pi/Tailscale SSH route. 31 stored alerts, all private source addresses (mostly internal SSH automation), therefore **none qualify as external attack origins**. Community decisions must not substitute for local events.
- Suricata EVE snapshot collected read-only into private cache, classification under investigation. No raw logs or private addresses enter public assets.
- Existing security/browser/static-route/bundle contracts inventoried. Preserve Cyber Lab consent behavior and security headers.
- Next: finish source validation and real asset inventory; render three design directions, choose and document system, then implement.

## State
IN FLIGHT: discovery/design/data. BLOCKED: none; real homelab external detections not yet established. DONE: isolated branch and authenticated read-only telemetry access.

## Design and first implementation
- Three rendered design directions in `docs/design/directions.html` and `docs/design/direction-{1,2,3}.png`. Chose Signal Observatory; rationale and tokens in DESIGN.md.
- Five actual public site/repository captures are locally hosted WebP previews. Homelab will use explicitly labelled documented architecture, not an invented dashboard or unrelated client screenshot.
- Sanitized historical dataset captured 2026-09-08: 200 VPS local CrowdSec alerts / 45 geographic groups / 21 countries; 4 public-source homelab firewall blocks / 2 geographic groups. Actual homelab CrowdSec had 31 private-source alerts; sampled Suricata had zero alerts. Both excluded from attack claims. IPs/logs kept outside git.
- Implemented lazy Three.js globe, local Natural Earth land geometry, selectable sources/origins, rotation/zoom/reset, motion pause and reduced-motion support. New editorial homepage uses all six actual projects, data provenance and existing security panel/Cyber Lab.
- First production build and ESLint pass. Python collector tests: 6 passed. Browser review now underway; not claiming visually complete or fully validated.
- Found brief’s deploy description is outdated: current main workflow deploys to VPS, retired IONOS path forbidden by existing contracts. Workflow remains untouched.

IN FLIGHT: browser critique, homelab architecture preview, stronger telemetry validation, bundle accounting for lazy WebGL, regression suite. BLOCKED: no live feed is deployed; intentional snapshot scope is explicit throughout.

## Final critique and validation — 2026-09-08
- Tablet overflow isolated to ~3px from globe negative margins at 768px; fixed with tablet-specific margins. Tablet buttons stacked where needed; mobile capture timestamps get their own line.
- Viewed final actual desktop, tablet, mobile hero/globe and full-page screenshots. Detailed critique and acknowledged limitations: docs/VISUAL-REVIEW.md.
- All final checks pass: production build, ESLint, TypeScript, static/hardening/security tooling contracts, 7 JavaScript + 9 Python data tests, explicit bundle budget, preview routes/MIME, original Chromium smoke, independent redesign browser suite, git diff --check. Exact output in docs/validation-2026-09-08.txt.
- New browser suite verifies real WebGL rotation, source switching/counts, origin access, GPU idle paused/offscreen, six loaded previews, filters, 320/390/768/1024 overflow, collapsed menu visibility/Escape focus, desktop/mobile axe zero violations, CSP/no third-party calls, no-WebGL/context-loss fallback, malformed/empty snapshots.
- Scope remains an isolated, reviewable historical-data design exploration. No main edits, remote push, deploy, service or tmux changes. Public VPS and homelab data remain explicitly separate.

DONE: implemented and visually reviewed exploration, tablet fix, validation evidence and handoff. IN FLIGHT: awaiting Jack’s visual feedback, not background implementation. BLOCKED: none for reviewing this branch; a live exporter and real hardware photo are future work, not claimed delivered.

## Approved production release and follow-up — 2026-09-08
- Jack explicitly approved replacing production and continuing improvements; earlier no-deploy restriction superseded.
- Premerge verified remote main was still fac0f4e. Byte-equality checks preserved index metadata, sitemap, robots, 404, security policies, web manifest, resume endpoint, App routes, Cyber Lab, NotFound and operations/redirect configuration. Existing contracts and production dependency audit passed.
- Merged approved redesign with a real merge commit 1d57bf1 and pushed main. Existing `Build, attest, and deploy to VPS` run 34196912231 completed successfully, both build and deployment. Repository-security run 34196912213 also passed. The retired IONOS deployment was not reintroduced.
- HTTPS fetched the new Index-QnmugvtY.js bundle containing “Make it better.” and “Network observatory”; SHA256 1966147b5d6a542775d7276262d24c59f1e6c48670217494794540f372efe4b8. The published historical dataset matched committed bytes exactly. Live Chromium rendered globe with zero runtime errors, and existing server-security endpoint provided RECENT genuine data. Cyber Lab, sitemap, robots, policy, resume, previews and globe geography returned HTTP200.
- Follow-up branch improve/portfolio-motion-ci-2026-09-08: remember explicit pause across reload/navigation; OS reduced motion remains respected; blocked storage never breaks controls. Added browser regressions for persistence, OS changes and denied storage.
- Added telemetry and actual WebGL/accessibility regressions to the existing deployment build job. Updated old exploration wording for production. No transport, deployment credentials, permissions or production services changed.
- Follow-up local production build, lint, TypeScript, data tests, bundle budget and extended browser suite passed. Existing security smoke rerun before publishing.

## Phone feedback — mobile globe fix
- Reproduced Jack’s mobile issue using real Chromium touch input: `touch-action: pan-y` lets vertical/diagonal gestures become browser scrolling and cancels the pointer stream. Existing desktop-only drag tests had missed it.
- Canvas now owns touch gestures, rotates in both axes without the former vertical clamp, tracks the active pointer, and clears drag on lost capture. The surrounding page remains scrollable; an inline hint explains the boundary.
- New real-touch regression fails before the fix and passes afterward for horizontal, vertical and diagonal drags; asserts no scroll/cancel and changed WebGL output. Added to deployment CI. Local build/lint and existing globe/accessibility checks pass.
- CV investigation: homepage links directly to raw JSON; no human-readable resume component exists. Next release will add a proper printable presentation while retaining the machine-readable endpoint.

## Readable CV release
- Mobile globe fix d50878a is deployed; Actions34198473409 successful. Real touch regression also passed against the live site.
- Replaced the raw-JSON primary CV link with /cv.html: a pre-rendered, responsive document with readable contact details, profile, technical skills and six real projects. Print / Save PDF uses browser printing and has a reviewed two-page A4 layout. Content remains readable without JavaScript.
- Profile/CV/API now derive from shared src/data/resume.json; project gallery and CV share src/data/projects.mjs. Education explicitly says studies in progress rather than implying a completed bachelor's degree. No invented dates, institution or employment.
- Retained /api/resume, all old routes and metadata; added CV to sitemap and route tests. Desktop/mobile axe, no overflow, print control, no-JS and actual PDF pagination checks pass; screenshots and print evidence inspected.
