import { strict as assert } from "node:assert";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createPreviewServer } from "./preview-server.mjs";
const server = await createPreviewServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const evidence = new URL("../docs/evidence/", import.meta.url);
await mkdir(evidence, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const runtimeErrors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    window.__draws = 0;
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__csp.push(e.violatedDirective),
    );
    for (const name of ["drawElements", "drawArrays"]) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) {
        window.__draws++;
        return original.apply(this, args);
      };
    }
  });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => runtimeErrors.push(e.message));
  await page.goto(url);
  await page.waitForSelector(".globe-stage canvas");
  await page.waitForFunction(() => window.__draws > 0);
  await page.waitForTimeout(1000);
  assert.equal(
    await page.locator(".portfolio").getAttribute("data-paused"),
    "true",
  );
  const count = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => window.__draws),
    count,
    "paused globe must stop GPU draw calls",
  );
  assert.equal(await page.locator("#origin option").count(), 46);
  assert.match(await page.locator(".telemetry-readout").innerText(), /200/);
  const before = hash(await page.locator(".globe-stage canvas").screenshot());
  await page.getByRole("button", { name: "Rotate globe right" }).click();
  await page.waitForTimeout(120);
  assert.notEqual(
    hash(await page.locator(".globe-stage canvas").screenshot()),
    before,
    "keyboard-accessible rotate must change the actual render",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .getByRole("button", { name: "Homelab / OPNsense", exact: true })
    .click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#origin option").count(), 3);
  assert.match(
    await page.locator(".telemetry-readout").innerText(),
    /4\s*firewall blocks/,
  );
  await page.getByLabel("Inspect an origin").selectOption({ index: 1 });
  assert.match(
    await page.locator(".origin-detail").innerText(),
    /not classified as an attack/,
  );
  await page
    .getByRole("button", { name: "VPS / CrowdSec", exact: true })
    .click();
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator(".origin-detail").count(),
    0,
    "source switch clears stale selection",
  );
  await page.getByRole("button", { name: "Resume motion" }).click();
  const active = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(200);
  assert.ok((await page.evaluate(() => window.__draws)) > active);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const offscreen = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(200);
  assert.equal(
    await page.evaluate(() => window.__draws),
    offscreen,
    "offscreen globe must stop drawing",
  );
  await page.getByRole("button", { name: "Pause motion" }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(200);
  for (let y = 0; y < 10000; y += 700) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(250);
  assert.equal(
    await page
      .locator(".project img")
      .evaluateAll((images) =>
        images.every((i) => i.complete && i.naturalWidth > 0),
      ),
    true,
    "every project preview must load",
  );
  assert.equal(await page.locator(".project").count(), 6);
  await page
    .getByRole("button", { name: "Security & infrastructure", exact: true })
    .click();
  assert.equal(await page.locator(".project").count(), 3);
  await page.getByRole("button", { name: "All work", exact: true }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({
    path: new URL("final-desktop.png", evidence).pathname,
  });
  await page.screenshot({
    path: new URL("final-full.png", evidence).pathname,
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
    "desktop accessibility violations",
  );
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `overflow at ${width}`,
    );
    if (width === 768)
      await page.screenshot({
        path: new URL("final-tablet.png", evidence).pathname,
      });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.locator("#mobile-navigation").isVisible(),
    false,
    "collapsed menu must actually be invisible",
  );
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  assert.equal(await page.locator("#mobile-navigation").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#mobile-navigation").isVisible(), false);
  assert.equal(
    await page
      .getByRole("button", { name: "Open navigation menu" })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page
    .getByRole("button", { name: "Open navigation menu" })
    .evaluate((e) => e.blur());
  await page.screenshot({
    path: new URL("final-mobile.png", evidence).pathname,
    fullPage: true,
  });
  await page.screenshot({
    path: new URL("final-mobile-hero.png", evidence).pathname,
  });
  await page.locator(".observatory").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: new URL("final-mobile-globe.png", evidence).pathname,
  });
  const mobileAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    mobileAxe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
    [],
    "mobile accessibility violations",
  );
  assert.deepEqual(await page.evaluate(() => window.__csp), []);
  assert.deepEqual(
    requests.filter((r) => !r.startsWith(url)),
    [],
    "homepage must not make third-party requests",
  );
  await page
    .locator(".globe-stage canvas")
    .evaluate((c) =>
      c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext(),
    );
  await page.waitForSelector(".globe-fallback");
  assert.equal(
    await page.locator("#origin option").count(),
    46,
    "context loss must preserve accessible data",
  );
  await context.close();
  const noGl = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await noGl.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.includes("webgl") ? null : original.call(this, type, ...args);
    };
  });
  const fallback = await noGl.newPage();
  await fallback.goto(url);
  await fallback.waitForSelector(".globe-fallback");
  assert.equal(await fallback.locator("#origin option").count(), 46);
  await fallback.getByLabel("Inspect an origin").selectOption({ index: 1 });
  assert.equal(await fallback.locator(".origin-detail").isVisible(), true);
  await noGl.close();
  const invalid = await browser.newContext();
  await invalid.route("**/data/security-snapshot.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: '{"mode":"live","count":99999}',
    }),
  );
  const bad = await invalid.newPage();
  await bad.goto(url);
  await bad
    .getByText("Snapshot unavailable. No data has been substituted.")
    .waitFor();
  assert.equal(await bad.locator(".globe-stage canvas").count(), 0);
  assert.equal(await bad.locator(".telemetry-readout").count(), 0);
  await invalid.close();
  const empty = await browser.newContext();
  const data = JSON.parse(
    await readFile(
      new URL("../public/data/security-snapshot.json", import.meta.url),
    ),
  );
  data.feeds[1].nodes = [];
  data.feeds[1].count = 0;
  await empty.route("**/data/security-snapshot.json", (route) =>
    route.fulfill({ json: data }),
  );
  const zero = await empty.newPage();
  await zero.goto(url);
  await zero
    .getByRole("button", { name: "Homelab / OPNsense", exact: true })
    .click();
  await zero.getByText("No qualifying observations").waitFor();
  assert.equal(await zero.locator("#origin option").count(), 1);
  await empty.close();
  const preference = await browser.newContext({
    reducedMotion: "no-preference",
  });
  const pref = await preference.newPage();
  await pref.goto(url);
  await pref.getByRole("button", { name: "Pause motion" }).click();
  await pref.goto(`${url}/cyberlab`);
  await pref.getByRole("link", { name: /Back home/i }).click();
  await pref.locator('.portfolio[data-paused="true"]').waitFor();
  await pref.reload();
  await pref.locator('.portfolio[data-paused="true"]').waitFor();
  await pref.getByRole("button", { name: "Resume motion" }).click();
  await pref.reload();
  await pref.locator('.portfolio[data-paused="false"]').waitFor();
  await pref.emulateMedia({ reducedMotion: "reduce" });
  await pref.locator('.portfolio[data-paused="true"]').waitFor();
  await preference.close();
  const blockedStorage = await browser.newContext({
    reducedMotion: "no-preference",
  });
  await blockedStorage.addInitScript(() => {
    for (const method of ["getItem", "setItem"])
      Storage.prototype[method] = () => {
        throw new DOMException("Storage blocked", "SecurityError");
      };
  });
  const noStorage = await blockedStorage.newPage();
  await noStorage.goto(url);
  await noStorage.getByRole("button", { name: "Pause motion" }).click();
  await noStorage.locator('.portfolio[data-paused="true"]').waitFor();
  await blockedStorage.close();
  assert.deepEqual(runtimeErrors, []);
  console.log(
    "Redesign browser checks passed: real WebGL render/rotation, source/count/selection, pause and offscreen GPU idle, six previews/filtering, 320–1024px overflow, actual menu visibility/Escape focus, desktop/mobile axe (zero violations), CSP/network isolation, WebGL/context-loss fallback, invalid/empty data, persisted motion preference and blocked-storage fallback.",
  );
} finally {
  await browser.close();
  server.close();
  await once(server, "close");
}
