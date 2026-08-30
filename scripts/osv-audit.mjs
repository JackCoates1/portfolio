import { readFile } from "node:fs/promises";

const lockfile = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const packages = Object.entries(lockfile.packages ?? {})
  .filter(([path, metadata]) => path && metadata.version)
  .map(([path, metadata]) => ({
    name: metadata.name ?? path.split("node_modules/").at(-1),
    version: metadata.version,
  }))
  .filter(({ name, version }) => name && version);

if (packages.length === 0) throw new Error("package-lock.json did not contain auditable packages");

const findings = [];
const batchSize = 500;
for (let offset = 0; offset < packages.length; offset += batchSize) {
  const batch = packages.slice(offset, offset + batchSize);
  const response = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "portfolio-osv-audit/1" },
    body: JSON.stringify({
      queries: batch.map(({ name, version }) => ({
        package: { ecosystem: "npm", name },
        version,
      })),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`OSV query failed with HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.results) || body.results.length !== batch.length) {
    throw new Error("OSV returned an incomplete query batch");
  }

  body.results.forEach((result, index) => {
    for (const vulnerability of result.vulns ?? []) {
      if (!vulnerability.withdrawn) {
        findings.push({ ...batch[index], id: vulnerability.id });
      }
    }
  });
}

if (findings.length > 0) {
  console.error(`OSV reported ${findings.length} active finding(s):`);
  for (const finding of findings) console.error(`- ${finding.id}: ${finding.name}@${finding.version}`);
  process.exitCode = 1;
} else {
  console.log(`OSV audit passed for ${packages.length} locked npm packages.`);
}
