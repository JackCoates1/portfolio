import { readFile, writeFile } from "node:fs/promises";
import { projects } from "../src/data/projects.mjs";
const data = JSON.parse(
  await readFile(new URL("../src/data/resume.json", import.meta.url)),
);
const e = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const list = (items) => items.map(e).join(" · ");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jack Coates — CV</title><meta name="description" content="Jack Coates: developer and cyber security student in Bradford, UK. Project work, technical skills and contact details."><link rel="canonical" href="https://jackcoates.co.uk/cv.html"><link rel="stylesheet" href="/cv.css"><script src="/cv.js" defer></script></head><body>
<nav class="cv-toolbar" aria-label="CV navigation"><a href="/">← Portfolio</a><button id="print-cv" hidden>Print / Save PDF</button></nav>
<main class="cv-paper"><header class="cv-header"><p class="cv-eyebrow">Curriculum vitae</p><h1>${e(data.name)}</h1><p class="cv-role">Developer &amp; cyber security student</p><div class="cv-contacts"><span>${e(data.location)}</span><a href="mailto:${e(data.contact.email)}">${e(data.contact.email)}</a><a href="${e(data.links.github)}">GitHub / JackCoates1</a><a href="${e(data.links.linkedin)}">LinkedIn</a></div></header>
<div class="cv-layout"><aside aria-label="Technical background"><section><h2>Technical skills</h2>${Object.entries(
  data.skills,
)
  .map(
    ([name, items]) =>
      `<div class="cv-skill"><h3>${e({ security: "Security", development: "Development", infrastructure: "Infrastructure", tools: "Tools & services" }[name] || name)}</h3><p>${list(items)}</p></div>`,
  )
  .join(
    "",
  )}</section><section><h2>Education</h2><p>${e(data.education)}</p></section><section class="cv-links"><h2>Portfolio</h2><a href="${e(data.links.portfolio)}">jackcoates.co.uk</a><p>See project previews and the network observatory online.</p></section></aside>
<div class="cv-main"><section><h2>Profile</h2>${data.bio
  .split("\n\n")
  .map((p) => `<p>${e(p)}</p>`)
  .join(
    "",
  )}</section><section><h2>Project work</h2>${projects.map((p) => `<article class="cv-project"><h3>${e(p.name)}</h3><p class="cv-project-type">${e(p.type)}</p><p>${e(p.description.replace(" The preview shows the original design.", ""))}</p><p class="cv-stack">${e(p.stack)}</p>${p.url.startsWith("https:") ? `<a class="cv-project-link" href="${e(p.url)}">${e(p.action)} ↗</a>` : ""}</article>`).join("")}</section></div></div>
<footer class="cv-footer"><span>${e(data.name)} · ${e(data.contact.email)}</span><a href="${e(data.links.portfolio)}">jackcoates.co.uk</a></footer></main></body></html>`;
await writeFile(new URL("../public/cv.html", import.meta.url), html + "\n");
await writeFile(
  new URL("../public/api/resume", import.meta.url),
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  "Generated human-readable CV and JSON endpoint from the shared profile and projects.",
);
