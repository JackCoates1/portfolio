# Security and release operations

## CSP and browser-security headers

`index.html` carries this fallback CSP for static previews:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://ipapi.co https://ipwho.is https://api4.ipify.org https://api6.ipify.org stun:; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'
```

The origin and CDN must return a `Content-Security-Policy` HTTP header with every directive above and the same source lists, plus `frame-ancestors 'none'` and `upgrade-insecure-requests`. Those two directives cannot be enforced by a CSP meta tag. Do not add `'unsafe-inline'` to `script-src`; Vite's production bundle does not need it. `style-src 'unsafe-inline'` is intentionally retained for the current component styling and is not permission for scripts.

`connect-src` names every external network destination used by Cyber Lab. `stun:` documents the WebRTC transport used by the diagnostic; browser enforcement of CSP for ICE traffic varies, so the application-level consent gate must remain in place and must be browser-tested. Merely loading `/cyberlab` must not contact any external provider.

Within the existing TLS nginx server block, configure headers along these lines (adapt only to the already-configured server block; this repository does not prescribe a server path):

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://ipapi.co https://ipwho.is https://api4.ipify.org https://api6.ipify.org stun:; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
```

At the CDN, preserve the origin headers or set exactly equivalent headers. Disable any feature that injects inline scripts unless it is configured with a CSP nonce. Verify the final response at both origin and CDN after every header change.

## Routes and static artifacts

The built artifact must publish `index.html`, `404.html`, `site.webmanifest`, `sitemap.xml`, `security.txt`, `.well-known/security.txt`, and the extensionless JSON file `api/resume`. `security.txt` endpoints must be served over HTTPS as `text/plain`; the `/.well-known/` version is canonical. Because the resume artifact has no filename extension, its exact route must set `application/json` explicitly.

The only browser-router route requiring a static-host rewrite is `/cyberlab`. Do not use a catch-all rewrite to `index.html`: it turns unknown URLs into HTTP 200 responses and prevents a real 404. A compatible nginx arrangement is:

```nginx
location = /cyberlab { try_files /index.html =404; }
location = /api/resume {
    default_type application/json;
    try_files /api/resume =404;
}
location / { try_files $uri $uri/ =404; }
error_page 404 /404.html;
location = /404.html { internal; }
```

Configure the CDN equivalently: rewrite only the known client route to `index.html`, preserve `application/json` for `/api/resume`, and serve `404.html` with status 404 for missing paths. When adding a browser route, add it to the rewrite allow-list and sitemap deliberately. `npm run preview` uses a production-like local server and `npm run test:preview-contract` checks these status and MIME semantics against `dist/`.

## Deployment and rollback

The workflow runs only after a push to `main`: install, dependency audit, contracts, build, artifact validation, archive attestation, then deployment. It deliberately does not run for pull requests or forks. Action references are full commit SHAs; version comments identify the reviewed release. Checkout does not persist its token, attestation permissions exist only on the isolated attestation job, and the deployment job has an empty `GITHUB_TOKEN` permission set.

The workflow transfers one compressed artifact, verifies both its workflow-provided digest and its internal checksum manifest, and then creates an SSH key file only in the runner temporary directory. It enforces host-key checking, non-interactive SSH, a constrained remote path, protected remote arguments, delayed deletion, and cleanup of temporary key material. This narrows the window for partially updated files, but it is not an atomic release mechanism.

For atomic releases, provision and document on the VPS a release directory and a `current` symlink before enabling it in automation. Upload each validated `dist/` artifact to a new immutable release directory, verify its `SHA256SUMS`, then atomically replace only the `current` symlink. Roll back by switching that symlink to the prior verified release. The repository intentionally does not assume directory names or change server paths; update the deployment workflow only after those server-side locations and retention rules are explicitly configured.
