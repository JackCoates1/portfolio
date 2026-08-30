import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const nav = await read("src/components/Nav.tsx");
const verifiedStatus = await read("src/components/VerifiedStatus.tsx");
const indexHtml = await read("index.html");
const sitemap = await read("public/sitemap.xml");
const rootSecurityTxt = await read("public/security.txt");
const wellKnownSecurityTxt = await read("public/.well-known/security.txt");
const notFound = await read("public/404.html");
const robots = await read("public/robots.txt");
const manifest = JSON.parse(await read("public/site.webmanifest"));
const operations = await read("docs/operations.md");

assert.match(nav, /aria-label=\{open \? "Close navigation menu" : "Open navigation menu"\}/);
assert.match(nav, /aria-expanded=\{open\}/);
assert.match(nav, /aria-controls="mobile-navigation"/);
assert.match(nav, /id="mobile-navigation"/);

assert.match(
  verifiedStatus,
  /const REPOSITORY_SECURITY_URL = "https:\/\/github\.com\/JackCoates1\/portfolio\/security"/,
);
assert.doesNotMatch(verifiedStatus, /\/security\/dependabot/);

assert.match(sitemap, /<loc>https:\/\/jackcoates\.co\.uk\/<\/loc>/);
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location);
assert.deepEqual(sitemapLocations, ["https://jackcoates.co.uk/", "https://jackcoates.co.uk/cyberlab"]);
for (const location of sitemapLocations) {
  const url = new URL(location);
  assert.equal(url.protocol, "https:", `sitemap URL must use HTTPS: ${location}`);
  assert.equal(url.hostname, "jackcoates.co.uk", `sitemap URL must use the canonical host: ${location}`);
}
assert.match(robots, /Sitemap: https:\/\/jackcoates\.co\.uk\/sitemap\.xml/);
assert.match(rootSecurityTxt, /Canonical: https:\/\/jackcoates\.co\.uk\/\.well-known\/security\.txt/);
assert.equal(rootSecurityTxt, wellKnownSecurityTxt, "security.txt endpoints must publish the same policy");
assert.match(rootSecurityTxt, /^Contact: mailto:/m);
const expiry = rootSecurityTxt.match(/^Expires: (.+)$/m)?.[1];
assert.ok(expiry && Number.isFinite(Date.parse(expiry)), "security.txt must provide a valid Expires timestamp");
assert.ok(Date.parse(expiry) > Date.now(), "security.txt must not be expired");
assert.match(notFound, /<title>Page not found \| Jack Coates<\/title>/);
assert.match(notFound, /href="\/"/);
assert.doesNotMatch(notFound, /<script/i, "the static 404 document must be independently safe to serve");

assert.equal(manifest.name, "Jack Coates — Developer & Cyber Security");
assert.equal(manifest.short_name, "Jack Coates");
assert.equal(manifest.id, "/");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.ok(manifest.description);
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "manifest must reference at least one icon");

assert.match(indexHtml, /<link rel="canonical" href="https:\/\/jackcoates\.co\.uk\/" \/>/);
assert.match(indexHtml, /<meta property="og:url" content="https:\/\/jackcoates\.co\.uk\/" \/>/);
assert.match(indexHtml, /<link rel="manifest" href="\/site\.webmanifest" \/>/);

const cspMatch = indexHtml.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
assert.ok(cspMatch, "index.html must declare the fallback CSP");
const csp = Object.fromEntries(cspMatch[1].split(";").map((directive) => {
  const [name, ...sources] = directive.trim().split(/\s+/);
  return [name, sources];
}));
assert.deepEqual(csp["default-src"], ["'self'"]);
assert.deepEqual(csp["script-src"], ["'self'"]);
assert.ok(!csp["script-src"].includes("'unsafe-inline'"));
assert.deepEqual(csp["style-src"], ["'self'", "'unsafe-inline'"]);
assert.deepEqual(csp["connect-src"], ["'self'", "https://ipapi.co", "https://ipwho.is", "https://api4.ipify.org", "https://api6.ipify.org", "stun:"]);
assert.deepEqual(csp["object-src"], ["'none'"]);
assert.deepEqual(csp["base-uri"], ["'self'"]);
assert.deepEqual(csp["form-action"], ["'self'"]);
assert.match(operations, /frame-ancestors 'none'/);
assert.match(operations, /upgrade-insecure-requests/);
assert.match(operations, /location = \/cyberlab/);
assert.match(operations, /try_files \$uri \$uri\/ =404/);

const indexPage = await read("src/pages/Index.tsx");
assert.match(indexPage, /<main id="main-content">/);
assert.match(indexPage, /href="#main-content"/);

const cyberLab = await read("src/pages/CyberLab.tsx");
assert.match(cyberLab, /stun:stun\.l\.google\.com:19302/);
assert.match(cyberLab, /const \[externalTestsConsented, setExternalTestsConsented\] = useState\(false\)/);
assert.match(cyberLab, /onClick=\{startExternalTests\}/);
assert.match(cyberLab, /External network test consent/);
assert.match(cyberLab, /ipapi\.co,\s+ipwho\.is, and ipify\.org/);
assert.match(cyberLab, /Google's public STUN/);
assert.match(cyberLab, /if \(!externalTestsConsented\) return;/);

const deployWorkflow = await read(".github/workflows/deploy.yml");
const retiredProviderPattern = new RegExp(["io", "nos"].join(""), "i");
assert.doesNotMatch(deployWorkflow, retiredProviderPattern, "retired deployment leg must not be reintroduced");
assert.doesNotMatch(deployWorkflow, /lftp/i, "lftp deployment leg must not be reintroduced");
assert.doesNotMatch(deployWorkflow, /always\(\)/, "deploy steps must not hide failures with always()");
assert.doesNotMatch(deployWorkflow, /continue-on-error/, "deploy steps must not hide failures with continue-on-error");
assert.match(deployWorkflow, /VPS_HOST/);
assert.match(deployWorkflow, /npm audit --omit=dev/);
assert.match(deployWorkflow, /trap '\\?rm -f/);
assert.match(deployWorkflow, /StrictHostKeyChecking=yes/);
assert.match(deployWorkflow, /BatchMode=yes/);
assert.match(deployWorkflow, /IdentitiesOnly=yes/);
assert.match(deployWorkflow, /test -s dist\/index\.html/);
assert.match(deployWorkflow, /test -s dist\/404\.html/);
assert.match(deployWorkflow, /--delay-updates/);

const actionReferences = [...deployWorkflow.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)];
assert.ok(actionReferences.length > 0, "workflow must use pinned actions");
for (const [, action] of actionReferences) {
  assert.match(action, /^[\w.-]+\/[\w.-]+@[a-f0-9]{40}$/, `action must be pinned to a full commit SHA: ${action}`);
}

console.log("Static site contract checks passed.");
