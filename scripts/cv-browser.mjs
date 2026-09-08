import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createPreviewServer } from "./preview-server.mjs";
const server = process.env.LIVE_URL ? null : await createPreviewServer();
if (server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
}
const url = process.env.LIVE_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await page.goto(`${url}/cv.html`);
  assert.equal(response.status(), 200);
  await page
    .getByRole("heading", { name: "Jack Coates", exact: true })
    .waitFor();
  assert.equal(await page.locator(".cv-project").count(), 6);
  assert.equal(
    await page.locator("link[rel=canonical]").getAttribute("href"),
    "https://jackcoates.co.uk/cv.html",
  );
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    [],
  );
  await mkdir("docs/evidence", { recursive: true });
  await page.screenshot({
    path: "docs/evidence/cv-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    window.__printed = false;
    window.print = () => {
      window.__printed = true;
    };
  });
  await page.getByRole("button", { name: "Print / Save PDF" }).click();
  assert.equal(await page.evaluate(() => window.__printed), true);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    [],
  );
  await page.screenshot({
    path: "docs/evidence/cv-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".cv-toolbar").isVisible(), false);
  const pdf = await page.pdf({ format: "A4", printBackground: false });
  await writeFile("docs/evidence/cv-print.pdf", pdf);
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || [])
    .length;
  assert.ok(
    pages >= 1 && pages <= 2,
    `CV must print within two A4 pages, got ${pages}`,
  );
  await page.screenshot({
    path: "docs/evidence/cv-print-preview.png",
    fullPage: true,
  });
  const plain = await browser.newContext({ javaScriptEnabled: false });
  const p = await plain.newPage();
  await p.goto(`${url}/cv.html`);
  assert.equal(await p.locator(".cv-project").count(), 6);
  assert.equal(
    await p.getByRole("button", { name: "Print / Save PDF" }).isVisible(),
    false,
  );
  await plain.close();
  const data = await fetch(`${url}/api/resume`).then((r) => r.json());
  assert.equal(data.name, "Jack Coates");
  assert.match(data.education, /in progress/);
  assert.deepEqual(errors, []);
  console.log(
    `CV passed: HTML route, six real projects, shared JSON, desktop/mobile axe, 390px layout, print control, ${pages}-page A4 PDF, no-JS readability.`,
  );
} finally {
  await browser.close();
  if (server) {
    server.close();
    await once(server, "close");
  }
}
