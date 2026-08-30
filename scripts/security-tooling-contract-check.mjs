import { strict as assert } from "node:assert";
import { access, readdir, readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const packageJson = JSON.parse(await read("package.json"));
const app = await read("src/App.tsx");
const indexPage = await read("src/pages/Index.tsx");
const hardeningRegression = await read("scripts/hardening-regression-check.mjs");
const securityWorkflow = await read(".github/workflows/security.yml");
const monitoringWorkflow = await read(".github/workflows/security-monitor.yml");
const deployWorkflow = await read(".github/workflows/deploy.yml");
const securityMonitor = await read("scripts/security-monitor.mjs");
const operations = await read("docs/operations.md");

assert.equal(packageJson.scripts["audit:osv"], "node scripts/osv-audit.mjs");
assert.equal(packageJson.scripts.sbom, "npm sbom --sbom-format=cyclonedx");
assert.equal(packageJson.scripts["monitor:security"], "node scripts/security-monitor.mjs");
assert.match(securityMonitor, /"Production security monitor"/);
assert.match(securityMonitor, /--current-workflow/);
assert.match(securityMonitor, /--current-run-id/);
assert.match(securityMonitor, /recent Actions failures/);
assert.match(securityMonitor, /latest completed runs for other required workflows succeeded/);
assert.equal(packageJson.scripts["test:bundle-budget"], "node scripts/bundle-budget-check.mjs");
await assert.doesNotReject(
  access(new URL("../scripts/bundle-budget-check.mjs", import.meta.url)),
  "the deterministic built-asset budget contract must exist",
);

assert.match(app, /lazy\(\(\) => import\("\.\/pages\/CyberLab"\)\)/);
assert.match(app, /<Suspense/);
assert.match(indexPage, /lazy\(\(\) => import\("@\/components\/SecurityDashboard"\)\)/);
assert.match(indexPage, /new IntersectionObserver/);

for (const unusedDependency of [
  "@hookform/resolvers",
  "@supabase/supabase-js",
  "@tanstack/react-query",
  "cmdk",
  "date-fns",
  "embla-carousel-react",
  "input-otp",
  "next-themes",
  "react-day-picker",
  "react-hook-form",
  "react-resizable-panels",
  "sonner",
  "vaul",
  "zod",
]) {
  assert.equal(packageJson.dependencies[unusedDependency], undefined, `${unusedDependency} is not used by the application`);
}

const uiFiles = (await readdir(new URL("../src/components/ui/", import.meta.url))).sort();
assert.deepEqual(uiFiles, ["badge.tsx", "button.tsx", "card.tsx", "skeleton.tsx"]);
assert.doesNotMatch(hardeningRegression, /git", \["ls-files"/);
for (const stalePath of ["bun.lockb", "public/placeholder.svg", "src/App.css", "src/assets/hero-cyber.jpg", "supabase/config.toml"]) {
  await assert.rejects(access(new URL(`../${stalePath}`, import.meta.url)), `${stalePath} has no application consumer`);
}

assert.match(securityWorkflow, /dependency-review-action@[a-f0-9]{40}/);
assert.match(securityWorkflow, /npm audit --audit-level=high/);
assert.match(securityWorkflow, /npm run audit:osv/);
assert.match(securityWorkflow, /npm run --silent sbom > sbom\.cdx\.json/);
assert.match(securityWorkflow, /sbom\.cdx\.json/);
assert.match(securityWorkflow, /npm run build[\s\S]{0,250}npm run test:bundle-budget/);

assert.match(monitoringWorkflow, /schedule:/);
assert.match(monitoringWorkflow, /workflow_dispatch:/);
assert.match(monitoringWorkflow, /npm run monitor:security/);
assert.match(monitoringWorkflow, /--current-workflow "\$MONITOR_CURRENT_WORKFLOW"/);
assert.match(monitoringWorkflow, /--current-run-id "\$MONITOR_CURRENT_RUN_ID"/);
assert.match(monitoringWorkflow, /zap-baseline\.py/);
assert.match(monitoringWorkflow, /ghcr\.io\/zaproxy\/zaproxy:2\.16\.1@sha256:[a-f0-9]{64}/);
assert.doesNotMatch(monitoringWorkflow, /issues: write|pull-requests: write|continue-on-error/);
assert.doesNotMatch(monitoringWorkflow, /slack|webhook|send-mail|create-issue/i);

assert.match(deployWorkflow, /npm run build[\s\S]{0,250}npm run test:bundle-budget/);

for (const workflow of [securityWorkflow, monitoringWorkflow]) {
  const actionReferences = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)];
  assert.ok(actionReferences.length > 0, "workflow must use reviewed actions");
  for (const [, action] of actionReferences) {
    assert.match(action, /^[\w.-]+\/[\w.-]+@[a-f0-9]{40}$/, `action must be pinned to a full commit SHA: ${action}`);
  }
}

assert.match(operations, /SBOM/);
assert.match(operations, /OSV/);
assert.match(operations, /certificate/i);
assert.match(operations, /DNS/);
assert.match(operations, /origin exposure/i);
assert.match(operations, /ZAP passive/i);
assert.match(operations, /no notifications/i);

console.log("Security tooling, monitoring, and attack-surface contracts passed.");
