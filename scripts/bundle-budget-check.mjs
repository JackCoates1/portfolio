import { readdir, stat } from "node:fs/promises";

const assetsDirectory = new URL("../dist/assets/", import.meta.url);
const budgets = Object.freeze({
  javascriptFile: 220 * 1024,
  javascriptTotal: 400 * 1024,
  stylesheetFile: 28 * 1024,
  stylesheetTotal: 32 * 1024,
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
  if (bytes > budgets.javascriptFile) {
    violations.push(`${file} is ${bytes} bytes (limit ${budgets.javascriptFile})`);
  }
}
for (const { file, bytes } of stylesheets) {
  if (bytes > budgets.stylesheetFile) {
    violations.push(`${file} is ${bytes} bytes (limit ${budgets.stylesheetFile})`);
  }
}

const javascriptBytes = total(javascript);
const stylesheetBytes = total(stylesheets);
if (javascriptBytes > budgets.javascriptTotal) {
  violations.push(`JavaScript total is ${javascriptBytes} bytes (limit ${budgets.javascriptTotal})`);
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
