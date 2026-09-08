import { readdir, stat } from "node:fs/promises";

const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const budgets = Object.freeze({
  javascriptFile: 220 * 1024,
  javascriptTotal: 400 * 1024,
  stylesheetFile: 28 * 1024,
  stylesheetTotal: 40 * 1024,
  // Explicit allowance for the independently lazy-loaded WebGL engine.
  globeFile: 550 * 1024,
});

const files = (await readdir(assetsDirectory)).sort();
const measured = await Promise.all(files.map(async (file) => ({
  file,
  bytes: (await stat(new URL(file, assetsDirectory))).size,
})));
const javascript = measured.filter(({ file }) => file.endsWith(".js"));
const stylesheets = measured.filter(({ file }) => file.endsWith(".css"));

if (javascript.length === 0 || stylesheets.length === 0) {
  throw new Error("bundle budget requires built JavaScript and CSS assets");
}

const total = (assets) => assets.reduce((sum, { bytes }) => sum + bytes, 0);
const violations = [];

for (const { file, bytes } of javascript) {
  const limit = /^AttackGlobe-/.test(file) ? budgets.globeFile : budgets.javascriptFile;
  if (bytes > limit) {
    violations.push(`${file} is ${bytes} bytes (limit ${limit})`);
  }
}
for (const { file, bytes } of stylesheets) {
  if (bytes > budgets.stylesheetFile) {
    violations.push(`${file} is ${bytes} bytes (limit ${budgets.stylesheetFile})`);
  }
}

if (javascript.filter(({file}) => /^AttackGlobe-/.test(file)).length !== 1) {
  violations.push("Expected exactly one independently lazy-loaded globe chunk");
}
const javascriptBytes = total(javascript);
const stylesheetBytes = total(stylesheets);
const coreJavascriptBytes = total(javascript.filter(({file}) => !/^AttackGlobe-/.test(file)));
if (coreJavascriptBytes > budgets.javascriptTotal) {
  violations.push(`Non-globe JavaScript total is ${coreJavascriptBytes} bytes (limit ${budgets.javascriptTotal})`);
}
if (stylesheetBytes > budgets.stylesheetTotal) {
  violations.push(`CSS total is ${stylesheetBytes} bytes (limit ${budgets.stylesheetTotal})`);
}

if (violations.length > 0) {
  throw new Error(`Bundle budget exceeded:\n- ${violations.join("\n- ")}`);
}

console.log(
  `Bundle budget passed: ${javascript.length} JavaScript assets / ${javascriptBytes} bytes; `
    + `${stylesheets.length} CSS assets / ${stylesheetBytes} bytes.`,
);
