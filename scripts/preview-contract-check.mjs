import { strict as assert } from "node:assert";
import { once } from "node:events";
import { createPreviewServer } from "./preview-server.mjs";

const server = await createPreviewServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const checks = [
    ["/", 200, /^text\/html\b/],
    ["/cyberlab", 200, /^text\/html\b/],
    ["/definitely-missing", 404, /^text\/html\b/],
    ["/404.html", 404, /^text\/html\b/],
    ["/site.webmanifest", 200, /^application\/manifest\+json\b/],
    ["/security.txt", 200, /^text\/plain\b/],
    ["/.well-known/security.txt", 200, /^text\/plain\b/],
    ["/api/resume", 200, /^application\/json\b/],
  ];

  for (const [path, expectedStatus, expectedType] of checks) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, expectedStatus, `${path} status`);
    assert.match(response.headers.get("content-type") ?? "", expectedType, `${path} content type`);
    assert.match(response.headers.get("content-security-policy") ?? "", /script-src 'self'/, `${path} CSP header`);
  }

  const notFoundResponse = await fetch(`${baseUrl}/definitely-missing`);
  assert.match(await notFoundResponse.text(), /<title>Page not found \| Jack Coates<\/title>/);

  const resumeResponse = await fetch(`${baseUrl}/api/resume`);
  await assert.doesNotReject(() => resumeResponse.json());

  const methodResponse = await fetch(`${baseUrl}/`, { method: "POST" });
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get("allow"), "GET, HEAD");

  console.log("Preview route and MIME contract checks passed.");
} finally {
  server.close();
  await once(server, "close");
}
