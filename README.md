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

## Stack

Vite, TypeScript, React, shadcn-ui, Tailwind CSS.
