import { strict as assert } from "node:assert";
import { resolve4, resolve6 } from "node:dns/promises";
import { connect } from "node:tls";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

if (args.includes("--help")) {
  console.log("Usage: npm run monitor:security -- --url https://example.test [--repository owner/repo] [--origin-host origin.example.test] [--current-workflow name] [--current-run-id id]");
  process.exit(0);
}

const target = new URL(option("--url") ?? "");
assert.equal(target.protocol, "https:", "--url must use HTTPS");
assert.equal(target.username, "", "--url must not contain user information");
assert.equal(target.password, "", "--url must not contain user information");
assert.equal(target.pathname, "/", "--url must be an origin URL without a path");

const failures = [];
const notes = [];
const record = async (name, check) => {
  try {
    const detail = await check();
    notes.push(`PASS ${name}${detail ? `: ${detail}` : ""}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
};

const fetchChecked = async (path, expectedStatus, expectedType) => {
  const response = await fetch(new URL(path, target), {
    redirect: "manual",
    headers: { "User-Agent": "portfolio-security-monitor/1" },
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, expectedStatus, `${path} returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", expectedType, `${path} returned the wrong content type`);
  return response;
};

await record("HTTP to HTTPS redirect", async () => {
  const insecureUrl = new URL(target);
  insecureUrl.protocol = "http:";
  insecureUrl.port = "";
  const response = await fetch(insecureUrl, {
    redirect: "manual",
    headers: { "User-Agent": "portfolio-security-monitor/1" },
    signal: AbortSignal.timeout(15_000),
  });
  assert.ok([301, 302, 307, 308].includes(response.status), `HTTP endpoint returned ${response.status} instead of a redirect`);
  const destination = new URL(response.headers.get("location") ?? "", insecureUrl);
  assert.equal(destination.protocol, "https:", "HTTP endpoint did not redirect to HTTPS");
  assert.equal(destination.hostname, target.hostname, "HTTP redirect changed host");
  return `HTTP ${response.status}`;
});

await record("HTTPS certificate", () => new Promise((resolve, reject) => {
  const socket = connect({ host: target.hostname, port: Number(target.port || 443), servername: target.hostname, rejectUnauthorized: true });
  const timeout = setTimeout(() => socket.destroy(new Error("TLS connection timed out")), 15_000);
  socket.once("secureConnect", () => {
    clearTimeout(timeout);
    const certificate = socket.getPeerCertificate();
    const daysRemaining = (Date.parse(certificate.valid_to) - Date.now()) / 86_400_000;
    const protocol = socket.getProtocol();
    socket.end();
    assert.ok(daysRemaining >= 14, `certificate expires in ${daysRemaining.toFixed(1)} days`);
    assert.match(protocol ?? "", /^TLSv1\.[23]$/, `unexpected TLS protocol ${protocol}`);
    resolve(`${protocol}, ${Math.floor(daysRemaining)} days remaining`);
  });
  socket.once("error", reject);
}));

let publicAddresses = [];
await record("DNS resolution", async () => {
  const results = await Promise.allSettled([resolve4(target.hostname), resolve6(target.hostname)]);
  publicAddresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  assert.ok(publicAddresses.length > 0, "host has no A or AAAA records");
  return `${publicAddresses.length} address(es)`;
});

const originHost = option("--origin-host");
if (originHost) {
  await record("origin exposure", async () => {
    assert.doesNotMatch(originHost, /[/:@]/, "--origin-host must be a hostname only");
    const results = await Promise.allSettled([resolve4(originHost), resolve6(originHost)]);
    const originAddresses = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    assert.ok(originAddresses.length > 0, "origin host has no A or AAAA records");
    const overlap = originAddresses.filter((address) => publicAddresses.includes(address));
    assert.deepEqual(overlap, [], `public DNS exposes origin address(es): ${overlap.join(", ")}`);
    return "public edge and origin addresses are distinct";
  });
} else {
  notes.push("SKIP origin exposure: pass --origin-host from operator-managed configuration");
}

await record("routes, MIME types, and headers", async () => {
  const routes = [
    ["/", 200, /^text\/html\b/],
    ["/cyberlab", 200, /^text\/html\b/],
    ["/404.html", 200, /^text\/html\b/],
    ["/monitor-definitely-missing-route", 404, /^text\/html\b/],
    ["/site.webmanifest", 200, /^application\/manifest\+json\b/],
    ["/security.txt", 200, /^text\/plain\b/],
    ["/.well-known/security.txt", 200, /^text\/plain\b/],
    ["/api/resume", 200, /^application\/json\b/],
    ["/.monitor-definitely-missing.js", 404, /^text\/html\b/],
  ];
  let rootResponse;
  for (const [path, status, type] of routes) {
    const response = await fetchChecked(path, status, type);
    if (path === "/") rootResponse = response;
  }

  const csp = rootResponse.headers.get("content-security-policy") ?? "";
  for (const directive of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "upgrade-insecure-requests"]) {
    assert.ok(csp.includes(directive), `CSP is missing ${directive}`);
  }
  assert.equal(rootResponse.headers.get("x-content-type-options"), "nosniff");
  assert.match(rootResponse.headers.get("strict-transport-security") ?? "", /max-age=\d+/i, "HSTS is missing");
  assert.ok(rootResponse.headers.get("referrer-policy"));
  assert.ok(rootResponse.headers.get("permissions-policy"));
  return `${routes.length} route contracts and required CSP directives`;
});

const repository = option("--repository");
if (repository) {
  const currentWorkflow = option("--current-workflow");
  const currentRunId = option("--current-run-id");
  if (currentRunId) assert.match(currentRunId, /^\d+$/, "--current-run-id must be numeric");

  const actionsHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-security-monitor/1",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const fetchActions = async (path, label) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
      headers: actionsHeaders,
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(response.status, 200, `${label} returned HTTP ${response.status}`);
    return response.json();
  };

  await record("Actions status", async () => {
    assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "--repository must be owner/name");
    const body = await fetchActions("/actions/workflows?per_page=100", "public Actions API");
    const requiredWorkflows = [
      "Build, attest, and deploy to VPS",
      "Repository security",
      "Production security monitor",
    ].filter((workflowName) => workflowName !== currentWorkflow);

    for (const workflowName of requiredWorkflows) {
      const workflow = body.workflows?.find((candidate) => candidate.name === workflowName);
      assert.ok(workflow, `${workflowName} workflow was not found`);
      const runs = await fetchActions(
        `/actions/workflows/${workflow.id}/runs?status=completed&per_page=10`,
        `${workflowName} runs API`,
      );
      const run = runs.workflow_runs?.find((candidate) => String(candidate.id) !== currentRunId);
      assert.ok(run, `no completed ${workflowName} run found`);
      assert.equal(run.conclusion, "success", `latest ${workflowName} run concluded ${run.conclusion}`);
      assert.ok(Date.now() - Date.parse(run.updated_at) < 15 * 86_400_000, `${workflowName} has not completed recently`);
    }
    return "latest completed runs for other required workflows succeeded";
  });

  await record("recent Actions failures", async () => {
    const recentThreshold = Date.now() - 15 * 86_400_000;
    const body = await fetchActions(
      "/actions/runs?status=completed&per_page=100",
      "recent Actions runs API",
    );
    const failedConclusions = new Set(["action_required", "failure", "startup_failure", "timed_out"]);
    const recentFailures = (body.workflow_runs ?? []).filter((run) =>
      run.name !== currentWorkflow
      && String(run.id) !== currentRunId
      && Date.parse(run.updated_at) >= recentThreshold
      && failedConclusions.has(run.conclusion));
    assert.deepEqual(
      recentFailures,
      [],
      `found ${recentFailures.length}: ${recentFailures.map((run) => `${run.name} #${run.run_number} (${run.html_url})`).join(", ")}`,
    );
    return "none in the last 15 days outside this monitor workflow";
  });
} else {
  notes.push("SKIP Actions status: pass --repository owner/name for a public repository");
}

for (const note of notes) console.log(note);
if (failures.length > 0) {
  console.error(`Security monitoring failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Security monitoring checks passed.");
}
