import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];
const checks = [];

const check = (name, callback) => {
  checks.push(Promise.resolve().then(callback).catch((error) => {
    failures.push(`${name}: ${error.message}`);
  }));
};

const cyberLab = await read("src/pages/CyberLab.tsx");
const deployWorkflow = await read(".github/workflows/deploy.yml");
const notFound = await read("public/404.html");
const manifest = JSON.parse(await read("public/site.webmanifest"));
const operations = await read("docs/operations.md");
const packageJson = JSON.parse(await read("package.json"));
const resume = JSON.parse(await read("public/api/resume"));
const browserSmoke = await read("scripts/browser-smoke.mjs");
const indexPage = await read("src/pages/Index.tsx");

check("explicit consent gates every external Cyber Lab test", () => {
  assert.match(cyberLab, /const \[consentChecked, setConsentChecked\] = useState\(false\)/);
  assert.match(cyberLab, /if \(externalTestRun === 0\) return;[\s\S]{0,700}fetchGeo\(\)/);
  assert.match(cyberLab, /if \(externalTestRun === 0\) return;[\s\S]{0,350}getWebRTCLeak\(\)/);
  assert.match(cyberLab, /I consent[^<]*run external network tests/i);
  assert.match(cyberLab, /Google(?:'s)? public STUN\s+service/);
  assert.match(cyberLab, /setConsentChecked\(false\)/);
});

check("consented third-party Cyber Lab fetches suppress the referrer", () => {
  assert.equal([...cyberLab.matchAll(/\bfetch\(/g)].length, 1, "third-party fetches must share the hardened helper");
  assert.match(cyberLab, /fetch\(url, \{[\s\S]{0,120}referrerPolicy: "no-referrer"/);
  for (const provider of ["ipapi.co", "ipwho.is"]) {
    assert.match(cyberLab, new RegExp(`fetchWithTimeout\\([^\\n]*${provider}`));
  }
  assert.match(cyberLab, /fetchStackIp = async \(version: 4 \| 6\)/);
  assert.match(cyberLab, /fetchWithTimeout\(`https:\/\/api\$\{version\}\.ipify\.org/);
});

check("the heavy security dashboard import waits for viewport proximity", () => {
  assert.match(indexPage, /new IntersectionObserver/);
  assert.match(indexPage, /rootMargin: "600px 0px"/);
  assert.match(indexPage, /if \(!\("IntersectionObserver" in window\)\)/);
  assert.match(indexPage, /observer\.disconnect\(\)/);
  assert.match(indexPage, /shouldLoad[\s\S]{0,300}<SecurityDashboard/);
});

check("artifact checksums exclude and verify the checksum manifest", () => {
  assert.match(deployWorkflow, /find \. -type f ! -name SHA256SUMS/);
  assert.match(deployWorkflow, /sha256sum (?:--check|-c) SHA256SUMS/);
});

check("deployment runs without attestation token permissions", () => {
  assert.match(deployWorkflow, /\n  build:\n[\s\S]*?\n    permissions:\n      contents: read\n/);
  assert.match(deployWorkflow, /\n  build:\n[\s\S]*?\n    permissions:\n      contents: read\n      id-token: write\n      attestations: write/);
  assert.match(deployWorkflow, /\n  deploy:\n    needs: build\n    permissions:\n      actions: read/);
  assert.match(deployWorkflow, /persist-credentials: false/);
});

check("deployment transfers one verified archive including hidden artifacts", () => {
  assert.match(deployWorkflow, /tar -czf portfolio-dist\.tar\.gz/);
  assert.doesNotMatch(deployWorkflow, /steps\.artifact-upload\.outputs\.artifact-digest/);
  assert.match(deployWorkflow, /artifact-digest: \$\{\{ steps\.archive-digest\.outputs\.sha256 \}\}/);
  assert.match(deployWorkflow, /sha256sum portfolio-dist\.tar\.gz > portfolio-dist\.tar\.gz\.sha256/);
  assert.match(deployWorkflow, /sha256sum (?:--check|-c) portfolio-dist\.tar\.gz\.sha256/);
  assert.match(deployWorkflow, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(deployWorkflow, /actions\/download-artifact@[a-f0-9]{40}/);
  assert.match(deployWorkflow, /sha256sum (?:--check|-c)/);
});

check("deployment is gated by the complete repository test surface", () => {
  const commands = [
    "npm run lint",
    "npm run test:site-contract",
    "npm run build",
    "npm run test:bundle-budget",
    "npm run test:preview-contract",
    "npm run smoke:browser",
  ];
  let previousIndex = -1;
  for (const command of commands) {
    const index = deployWorkflow.indexOf(command);
    assert.ok(index > previousIndex, `${command} must run in gate order before packaging`);
    previousIndex = index;
  }
  assert.ok(previousIndex < deployWorkflow.indexOf("Validate and package deployment artifact"));
  assert.match(deployWorkflow, /find dist -type f -name '\*\.map'/);
  assert.match(deployWorkflow, /test ! -e dist\/\.env/);
});

check("rsync deletion and remote arguments are constrained", () => {
  assert.match(deployWorkflow, /--delete-delay/);
  assert.match(deployWorkflow, /--protect-args/);
  assert.doesNotMatch(deployWorkflow, /--delete(?:\s|$)/m);
  assert.match(deployWorkflow, /VPS_DEPLOY_PATH[^\n]*unsafe/);
});

check("action pins and comments identify reviewed releases", () => {
  const expected = new Map([
    ["actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683", "v4.2.2"],
    ["actions/setup-node@0a44ba7841725637a19e28fa30b79a866c81b0a6", "v4.0.4"],
    ["actions/attest-build-provenance@1d7d81b81e4f81c111e59801041513b205b4d6c5", "v1.4.0"],
    ["actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02", "v4.6.2"],
    ["actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093", "v4.3.0"],
  ]);
  const references = [...deployWorkflow.matchAll(/^\s*# (v\d+\.\d+\.\d+)\n\s*- name:.*\n\s*uses:\s*([^\s#]+)$/gm)];
  const seen = new Set();
  for (const [, version, action] of references) {
    assert.equal(version, expected.get(action), `unreviewed action pin or incorrect version comment: ${action}`);
    seen.add(action);
  }
  assert.deepEqual(seen, new Set(expected.keys()));
});

check("static 404 has a restrictive fallback policy", () => {
  assert.match(notFound, /http-equiv="Content-Security-Policy"/);
  assert.match(notFound, /default-src 'none'/);
  assert.match(notFound, /base-uri 'none'/);
});

check("manifest declares stable identity and navigation scope", () => {
  assert.equal(manifest.id, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(typeof manifest.description, "string");
  assert.ok(manifest.description.length > 0);
});

check("local preview mirrors route status and MIME contracts", () => {
  assert.equal(packageJson.scripts.preview, "node scripts/preview-server.mjs");
  assert.equal(packageJson.scripts["test:preview-contract"], "node scripts/preview-contract-check.mjs");
  assert.match(operations, /location = \/api\/resume/);
  assert.match(operations, /default_type application\/json/);
  assert.equal(typeof resume, "object");
});

check("browser smoke harness supports the workflow Node runtime", () => {
  assert.equal(packageJson.devDependencies.ws, "8.21.3");
  assert.match(browserSmoke, /import WebSocket from "ws"/);
});

await Promise.all(checks);

if (failures.length > 0) {
  console.error(`Hardening regression checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Hardening regression checks passed.");
}
