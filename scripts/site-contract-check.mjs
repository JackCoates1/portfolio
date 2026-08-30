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
assert.match(robots, /Sitemap: https:\/\/jackcoates\.co\.uk\/sitemap\.xml/);
assert.match(rootSecurityTxt, /Canonical: https:\/\/jackcoates\.co\.uk\/\.well-known\/security\.txt/);
assert.equal(rootSecurityTxt, wellKnownSecurityTxt, "security.txt endpoints must publish the same policy");
assert.match(notFound, /<title>Page not found \| Jack Coates<\/title>/);
assert.match(notFound, /href="\/"/);

assert.match(indexHtml, /<link rel="canonical" href="https:\/\/jackcoates\.co\.uk\/" \/>/);
assert.match(indexHtml, /<meta property="og:url" content="https:\/\/jackcoates\.co\.uk\/" \/>/);
assert.doesNotMatch(indexHtml, /script-src[^"']*'unsafe-inline'/);
assert.match(indexHtml, /connect-src/);
assert.match(indexHtml, /stun:/);
assert.doesNotMatch(indexHtml, /stun:stun\.l\.google\.com:19302/);

const indexPage = await read("src/pages/Index.tsx");
assert.match(indexPage, /<main id="main-content">/);
assert.match(indexPage, /href="#main-content"/);

const cyberLab = await read("src/pages/CyberLab.tsx");
assert.match(cyberLab, /stun:stun\.l\.google\.com:19302/);

console.log("Static site contract checks passed.");
