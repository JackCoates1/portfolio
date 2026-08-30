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
    globalThis.__domInjectionExecuted = false;
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
          generated_at: new Date().toISOString(), repo_url: "javascript:globalThis.__domInjectionExecuted=true", repo_public: true,
          dependency_alerts: { open_total: 0, by_severity: { critical: 0, high: 0, medium: 0, low: 0 } },
          latest_commit: { sha: '\"><img data-injection-probe src=x onerror="globalThis.__domInjectionExecuted=true">', gpg_verified: true, verification_reason: "smoke fixture" },
          latest_build: { run_url: "javascript:globalThis.__domInjectionExecuted=true", conclusion: "success", has_attestation: true },
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      const externalHosts = new Set(["ipapi.co", "ipwho.is", "api4.ipify.org", "api6.ipify.org"]);
      if (!externalHosts.has(url.hostname)) return realFetch(input, init);
      observed.push({
        kind: "fetch",
        url: url.href,
        referrerPolicy: init?.referrerPolicy ?? (input instanceof Request ? input.referrerPolicy : undefined),
      });

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
  const networkRequests = [];
  const responses = [];
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => errors.push(`exception: ${exceptionDetails.text}`));
  client.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type === "error" || type === "assert") errors.push(`console.${type}: ${args.map((arg) => arg.value ?? arg.description).join(" ")}`);
  });
  client.on("Log.entryAdded", ({ entry }) => {
    if (entry.level === "error") errors.push(`log: ${entry.text}`);
  });
  client.on("Network.requestWillBeSent", ({ request }) => networkRequests.push(request.url));
  client.on("Network.responseReceived", ({ response }) => responses.push({ url: response.url, status: response.status }));

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
  assert.equal(await client.evaluate("document.body.textContent.includes('Local-only mode')"), true, "local-only mode is not explained");
  assert.equal(await client.evaluate("document.querySelector('input[type=checkbox]') !== null"), true, "per-run consent checkbox is missing");
  assert.equal(await client.evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('run external network tests'))?.disabled"), true, "external tests must be disabled until consent is checked");
  assert.deepEqual(networkRequests.filter((url) => !url.startsWith(baseUrl)), [], "unexpected network request before consent");

  await client.evaluate("document.querySelector('input[type=checkbox]').click()");

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
  assert.equal(
    observed.filter(({ kind }) => kind === "fetch").every(({ referrerPolicy }) => referrerPolicy === "no-referrer"),
    true,
    "consented third-party fetches must suppress the referrer",
  );
  assert.equal(observed.some(({ urls = [] }) => urls.includes("stun:stun.l.google.com:19302")), true, "configured STUN request was not observed");

  await waitFor(
    () => client.evaluate("document.body.textContent.includes('Test City')"),
    "consented network results did not render",
  );
  assert.deepEqual(await client.evaluate("globalThis.__smokeCspViolations"), [], "browser reported CSP violations");
  assert.equal(await client.evaluate("document.querySelector('input[type=checkbox]').checked"), false, "consent must be consumed after one run");
  assert.equal(await client.evaluate("[...document.querySelectorAll('button')].find((button) => button.textContent.includes('run external network tests'))?.disabled"), true, "another run must require fresh consent");

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
  assert.equal(await client.evaluate("document.querySelector('nav')?.getAttribute('aria-label')"), "Primary navigation", "primary navigation needs an accessible name");
  assert.equal(await client.evaluate("document.querySelector('[aria-controls=mobile-navigation]')?.getAttribute('aria-expanded')"), "false", "mobile navigation must start collapsed");
  await client.evaluate("document.querySelector('[aria-controls=mobile-navigation]').click()");
  assert.equal(await client.evaluate("document.querySelector('[aria-controls=mobile-navigation]')?.getAttribute('aria-expanded')"), "true", "mobile navigation did not expose its expanded state");
  assert.equal(await client.evaluate("document.querySelector('#mobile-navigation')?.hidden"), false, "expanded mobile navigation remained hidden");
  await client.evaluate("document.querySelector('[aria-controls=mobile-navigation]').click()");
  assert.equal(await client.evaluate("document.querySelector('#mobile-navigation')?.hidden"), true, "collapsed mobile navigation remained visible");
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(
    networkRequests.some((url) => /\/assets\/SecurityDashboard-[^/]+\.js(?:$|\?)/.test(url)),
    false,
    "security dashboard chunk loaded before it was near the viewport",
  );
  assert.equal(await client.evaluate("document.body.textContent.includes('Verified')"), false, "security dashboard rendered before viewport proximity");
  await client.evaluate("document.querySelector('#security').scrollIntoView({ block: 'center' })");
  await waitFor(() => client.evaluate("document.body.textContent.includes('Verified')"), "viewport-proximate security dashboard did not render");
  assert.equal(
    networkRequests.some((url) => /\/assets\/SecurityDashboard-[^/]+\.js(?:$|\?)/.test(url)),
    true,
    "security dashboard chunk did not load near the viewport",
  );
  assert.equal(await client.evaluate("[...document.querySelectorAll('a[target=_blank]')].every((link) => link.relList.contains('noopener') && link.relList.contains('noreferrer'))"), true, "external links must isolate their opener and referrer");
  assert.equal(await client.evaluate("document.querySelector('[href^=\"javascript:\"]') === null"), true, "untrusted data created an executable link");
  assert.equal(await client.evaluate("document.querySelector('[data-injection-probe]') === null"), true, "untrusted data created DOM nodes");
  assert.equal(await client.evaluate("globalThis.__domInjectionExecuted"), false, "untrusted data executed script");

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
  assert.equal(await client.evaluate("document.querySelector('input[type=checkbox]:not(:checked)') !== null"), true, "return navigation did not restore fresh consent");

  await client.evaluate(`
    history.pushState({}, "", "/client-not-found-%3Cimg%20data-injection-probe%20src=x%20onerror=globalThis.__domInjectionExecuted=true%3E");
    dispatchEvent(new PopStateEvent("popstate"));
  `);
  await waitFor(() => client.evaluate("document.body.textContent.includes('Nothing here')"), "client-side 404 did not render");
  assert.equal(await client.evaluate("document.querySelector('[data-injection-probe]') === null"), true, "client-side path content was interpreted as markup");
  assert.equal(await client.evaluate("globalThis.__domInjectionExecuted"), false, "client-side path content executed script");
  assert.deepEqual(errors, [], "browser console/runtime errors were reported");

  const injectionPath = "/not-found-%3Cimg%20data-injection-probe%20src=x%20onerror=globalThis.__domInjectionExecuted=true%3E";
  await client.send("Page.navigate", { url: `${baseUrl}${injectionPath}` });
  await waitFor(() => client.evaluate("document.title === 'Page not found | Jack Coates'"), "static 404 did not render in Chromium");
  assert.equal(responses.some(({ url, status }) => url === `${baseUrl}${injectionPath}` && status === 404), true, "browser did not receive an HTTP 404");
  assert.equal(await client.evaluate("document.querySelector('[data-injection-probe]') === null"), true, "404 path content was interpreted as markup");
  assert.equal(await client.evaluate("globalThis.__domInjectionExecuted"), false, "404 path content executed script");
  assert.deepEqual(await client.evaluate("globalThis.__smokeCspViolations"), [], "static 404 reported CSP violations");
  assert.deepEqual(networkRequests.filter((url) => !url.startsWith(baseUrl)), [], "unexpected real network request escaped the browser harness");

  console.log("Chromium smoke passed: CSP, consent/referrer privacy, deferred dashboard loading, network isolation, 404, DOM injection, links, ARIA/navigation, console, and mobile overflow.");
} finally {
  client?.close();
  browser.kill("SIGTERM");
  const browserExited = await Promise.race([
    once(browser, "exit").then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!browserExited) {
    browser.kill("SIGKILL");
    await once(browser, "exit").catch(() => {});
  }
  previewServer.close();
  await once(previewServer, "close");
  await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
