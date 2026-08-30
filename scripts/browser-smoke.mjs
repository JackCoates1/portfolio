import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";
import { createPreviewServer } from "./preview-server.mjs";

const waitFor = async (callback, message, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await callback();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ""}`);
};

const findChromium = async () => {
  const candidates = [process.env.CHROMIUM_BIN, "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
    .filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known local browser path.
    }
  }
  throw new Error("Chromium was not found; set CHROMIUM_BIN to run the browser smoke test");
};

class DevToolsClient {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(webSocketUrl);
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    });
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await once(this.socket, "open");
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  close() {
    this.socket.close();
  }
}

const instrumentation = String.raw`
  (() => {
    const observed = [];
    const violations = [];
    Object.defineProperty(globalThis, "__smokeExternalRequests", { value: observed });
    Object.defineProperty(globalThis, "__smokeCspViolations", { value: violations });
    addEventListener("securitypolicyviolation", (event) => {
      violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
    });

    const realFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.url, location.href);
      if (url.origin === location.origin && url.pathname === "/security-stats.json") {
        return Promise.resolve(new Response(JSON.stringify({
          generated_at: new Date().toISOString(), window: "7d", total_blocked: 0, alert_count: 0,
          by_scenario: [], by_country: [], timeline: [], notable_replay: null,
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      if (url.origin === location.origin && url.pathname === "/verified-status.json") {
        return Promise.resolve(new Response(JSON.stringify({
          generated_at: new Date().toISOString(), repo_url: "https://example.invalid/repository", repo_public: true,
          dependency_alerts: { open_total: 0, by_severity: { critical: 0, high: 0, medium: 0, low: 0 } },
          latest_commit: { sha: "0000000", gpg_verified: true, verification_reason: "smoke fixture" },
          latest_build: { run_url: "https://example.invalid/build", conclusion: "success", has_attestation: true },
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      const externalHosts = new Set(["ipapi.co", "ipwho.is", "api4.ipify.org", "api6.ipify.org"]);
      if (!externalHosts.has(url.hostname)) return realFetch(input, init);
      observed.push({ kind: "fetch", url: url.href });

      let body;
      if (url.hostname === "ipapi.co") {
        body = { ip: "203.0.113.10", city: "Test City", region: "Test Region", country_name: "Test Country", org: "Test ISP", timezone: "Etc/UTC" };
      } else {
        body = { ip: url.hostname.startsWith("api6") ? "2001:db8::10" : "203.0.113.10" };
      }
      return Promise.resolve(new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    };

    class InstrumentedPeerConnection {
      constructor(configuration) {
        const urls = (configuration?.iceServers ?? []).flatMap((server) => Array.isArray(server.urls) ? server.urls : [server.urls]);
        observed.push({ kind: "webrtc", urls });
        this.onicecandidate = null;
      }
      createDataChannel() { return {}; }
      createOffer() { return Promise.resolve({ type: "offer", sdp: "" }); }
      setLocalDescription() {
        queueMicrotask(() => this.onicecandidate?.({ candidate: null }));
        return Promise.resolve();
      }
      close() {}
    }
    Object.defineProperty(globalThis, "RTCPeerConnection", { configurable: true, value: InstrumentedPeerConnection });
  })();
`;

const previewServer = await createPreviewServer();
previewServer.listen(0, "127.0.0.1");
await once(previewServer, "listening");
const previewAddress = previewServer.address();
assert.ok(previewAddress && typeof previewAddress === "object");
const baseUrl = `http://127.0.0.1:${previewAddress.port}`;

const chromium = await findChromium();
const profilePath = await mkdtemp(join(tmpdir(), "portfolio-browser-smoke-"));
const browser = spawn(chromium, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-sync",
  "--metrics-recording-only",
  "--no-first-run",
  "--remote-debugging-port=0",
  `--user-data-dir=${profilePath}`,
  "--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE 127.0.0.1, EXCLUDE localhost",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let client;
try {
  const devToolsFile = join(profilePath, "DevToolsActivePort");
  const devToolsPort = await waitFor(async () => {
    const contents = await readFile(devToolsFile, "utf8");
    return Number.parseInt(contents.split("\n", 1)[0], 10);
  }, "Chromium did not expose a DevTools port");

  const targets = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${devToolsPort}/json/list`);
    const list = await response.json();
    return list.find((target) => target.type === "page") ? list : undefined;
  }, "Chromium did not create a page target");
  const page = targets.find((target) => target.type === "page");
  client = new DevToolsClient(page.webSocketDebuggerUrl);
  await client.open();

  const errors = [];
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => errors.push(`exception: ${exceptionDetails.text}`));
  client.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type === "error" || type === "assert") errors.push(`console.${type}: ${args.map((arg) => arg.value ?? arg.description).join(" ")}`);
  });
  client.on("Log.entryAdded", ({ entry }) => {
    if (entry.level === "error") errors.push(`log: ${entry.text}`);
  });

  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Log.enable"),
    client.send("Network.enable"),
  ]);
  await client.send("Network.setBlockedURLs", {
    urls: ["https://ipapi.co/*", "https://ipwho.is/*", "https://api4.ipify.org/*", "https://api6.ipify.org/*"],
  });
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: instrumentation });
  await client.send("Page.navigate", { url: `${baseUrl}/cyberlab` });

  await waitFor(
    () => client.evaluate("document.querySelector('h1')?.textContent?.trim() === 'Cyber Lab'"),
    "Cyber Lab did not render",
  );
  await new Promise((resolve) => setTimeout(resolve, 500));

  assert.deepEqual(await client.evaluate("globalThis.__smokeExternalRequests"), [], "external tests ran before consent");
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth"), true, "Cyber Lab overflows a 390px viewport");

  const clickedConsent = await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent.includes("I consent"));
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  assert.equal(clickedConsent, true, "consent control is missing");

  const observed = await waitFor(async () => {
    const requests = await client.evaluate("globalThis.__smokeExternalRequests");
    return requests.length === 4 ? requests : undefined;
  }, "external tests did not start after consent");
  assert.deepEqual(
    observed.map(({ kind }) => kind).sort(),
    ["fetch", "fetch", "fetch", "webrtc"],
  );
  assert.equal(observed.some(({ url = "" }) => url.startsWith("https://ipwho.is/")), false, "fallback provider should not run after a successful primary lookup");
  assert.equal(observed.some(({ urls = [] }) => urls.includes("stun:stun.l.google.com:19302")), true, "configured STUN request was not observed");

  await waitFor(
    () => client.evaluate("document.body.textContent.includes('Test City')"),
    "consented network results did not render",
  );
  assert.deepEqual(await client.evaluate("globalThis.__smokeCspViolations"), [], "browser reported CSP violations");

  const clickedHome = await client.evaluate(`
    (() => {
      const link = [...document.querySelectorAll("a")].find((candidate) => candidate.textContent.includes("Back home"));
      if (!link) return false;
      link.click();
      return true;
    })()
  `);
  assert.equal(clickedHome, true, "Back home navigation is missing");
  await waitFor(() => client.evaluate("location.pathname === '/' && document.querySelector('main#main-content') !== null"), "home navigation failed");
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth"), true, "home page overflows a 390px viewport");

  const clickedCyberLab = await client.evaluate(`
    (() => {
      const link = document.querySelector('a[href="/cyberlab"]');
      if (!link) return false;
      link.click();
      return true;
    })()
  `);
  assert.equal(clickedCyberLab, true, "Cyber Lab navigation link is missing");
  await waitFor(() => client.evaluate("location.pathname === '/cyberlab' && document.querySelector('h1')?.textContent?.trim() === 'Cyber Lab'"), "Cyber Lab navigation failed");
  assert.deepEqual(await client.evaluate("globalThis.__smokeExternalRequests"), observed, "return navigation started external tests without new consent");
  assert.equal(await client.evaluate("[...document.querySelectorAll('button')].some((button) => button.textContent.includes('I consent'))"), true, "return navigation did not restore the consent control");
  assert.deepEqual(errors, [], "browser console/runtime errors were reported");

  console.log("Chromium smoke passed: CSP, consent network gating, navigation, console, and mobile overflow.");
} finally {
  client?.close();
  browser.kill("SIGTERM");
  await Promise.race([once(browser, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  previewServer.close();
  await once(previewServer, "close");
  await rm(profilePath, { recursive: true, force: true });
}
