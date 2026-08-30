# jackcoates.co.uk

Source for my personal portfolio site — [jackcoates.co.uk](https://jackcoates.co.uk).

React + TypeScript + Vite + Tailwind, shadcn-ui components.

## What's actually in here

- A live security dashboard fed by [CrowdSec](https://www.crowdsec.net/) running on the origin server — real traffic, real blocked attacks, not a mockup (`src/components/SecurityDashboard.tsx`, `src/components/AttackReplay.tsx`)
- A public [resume endpoint](https://jackcoates.co.uk/api/resume) served as static JSON
- A hidden terminal easter egg (press `` ` ``)
- A "Verified" status strip pulling real GPG commit-signing and build-attestation status from this repo (`src/components/VerifiedStatus.tsx`)
- `/cyberlab` — a live browser/network fingerprint demo

## Running locally

```sh
git clone https://github.com/JackCoates1/portfolio.git
cd portfolio
npm i
npm run dev
```

## Deploy

Push to `main` — GitHub Actions installs dependencies, audits production dependencies,
runs contracts, builds, attests the artifact, and then deploys to the VPS. It does not
deploy pull requests or forks. See `.github/workflows/deploy.yml` and the
[security and release operations guide](docs/operations.md).

### Static-hosting notes

- `public/404.html` is deployed as a real static 404 page. Configure the host
  to rewrite only known browser routes (currently `/cyberlab`) to `index.html`;
  a catch-all SPA fallback returns 200 for missing pages and is not compatible
  with real static 404 behaviour.
- Both `/security.txt` and `/.well-known/security.txt` are static files with
  the same policy. The latter remains the canonical RFC 9116 location.
- `public/site.webmanifest` is linked from the document and must be deployed
  alongside the favicon.

### CSP and Cloudflare

The fallback CSP in `index.html` is contract-tested. The enforcing nginx CSP
header and CDN settings are deployment configuration; they must retain
`script-src 'self'` and include the additional header-only protections described
in [the operations guide](docs/operations.md). If a CDN feature injects a script
that is blocked, disable it or configure a nonce—never add `'unsafe-inline'` to
`script-src` to silence the report. Confirm final headers at both origin and edge.

### Cyber Lab privacy

Cyber Lab shows browser-derived data locally. Public IP, approximate-location,
and WebRTC/STUN tests do not start until the visitor explicitly consents after
reading which third-party providers receive the requests. Consent authorizes one
run and is consumed immediately; retries require a fresh consent action. Staying
in local-only mode makes no third-party network diagnostic request.

## Security checks

```sh
npm ci
npm audit --audit-level=high
npm run audit:osv
npm run --silent sbom > sbom.cdx.json
npm run build
npm run test:site-contract
npm run test:preview-contract
npm run smoke:browser
npm run lint
```

The OSV command contacts the public OSV API with locked package names and
versions only. Repository security and production monitoring workflows are
read-only, full-SHA pin their Actions, retain SBOM/ZAP reports as artifacts, and
do not create issues or notifications by default. Monitoring and the remaining
CDN/VPS-only checks are documented in [the operations guide](docs/operations.md).

## Stack

Vite, TypeScript, React, shadcn-ui, Tailwind CSS.
