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

Push to `main` — GitHub Actions builds and deploys to both IONOS (static hosting) and a VPS running nginx + CrowdSec. See `.github/workflows/deploy.yml`.

### Static-hosting notes

- `public/404.html` is deployed as a real static 404 page for hosts that serve
  missing files with their 404 document. Keep the SPA fallback pointed at
  `index.html` for client routes such as `/cyberlab`; the React router renders
  its own not-found view after that fallback.
- Both `/security.txt` and `/.well-known/security.txt` are static files with
  the same policy. The latter remains the canonical RFC 9116 location.

### CSP and Cloudflare

This repository only contains a fallback CSP meta tag; the enforcing nginx CSP
header and Cloudflare settings are deployment configuration and are not stored
here. If Cloudflare reports that an injected script is blocked by `script-src
'self'`, keep that directive intact and disable the feature injecting it (for
example Rocket Loader or Email Address Obfuscation) for this site, or configure
that feature to use a nonce accepted by the origin CSP. Do not add
`'unsafe-inline'` to `script-src` to silence the report. Confirm the final
response header at the edge and origin after deployment, because a Cloudflare
rule can override the origin header.

## Stack

Vite, TypeScript, React, shadcn-ui, Tailwind CSS.
