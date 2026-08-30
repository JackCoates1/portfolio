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
add_header Strict-Transport-Security "max-age=31536000" always;
```

Enable HSTS only on the HTTPS server after confirming HTTP reliably redirects to HTTPS. Add `includeSubDomains` only if every subdomain is HTTPS-capable; do not infer that from this repository.

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

Static files never fall back to `index.html`. A missing script, stylesheet, image, metadata file, dotted path, or unknown application route must return the static 404 document with HTTP 404 and `text/html`; it must never return the SPA document with HTTP 200 or an executable MIME type. The preview contract checks representative static files, missing asset paths, extensionless JSON, `HEAD`, non-GET rejection, source-map absence, and repository-only paths that must not be published.

## Dependency evidence and software inventory

`npm audit --audit-level=high` checks the complete npm dependency tree and `npm run audit:osv` independently submits only package names and versions from `package-lock.json` to the public OSV batch API. Neither check uses a configured secret. `npm run --silent sbom` writes a CycloneDX SBOM to standard output; redirect it to a file when an inventory artifact is needed.

The `Repository security` workflow runs npm audit and OSV on pushes, pull requests, a weekly schedule, and manual dispatch. Pull requests also run GitHub's dependency-review gate. Its action references are full commit SHAs, it has read-only repository permission, and it uploads the generated SBOM as a short-lived workflow artifact. It does not comment on pull requests or request write permission.

Unused starter components and packages are intentionally absent. Before adding one back, import it from a reachable application entry point and retain it only if the build demonstrates a real consumer. Cyber Lab is route-lazy-loaded, and the chart-heavy security dashboard import waits until its placeholder is near the viewport. The deterministic `npm run test:bundle-budget` contract measures raw built JavaScript and CSS bytes against fixed per-file and aggregate limits; the deployment and repository-security workflows enforce it immediately after each production build. Bundle output should continue to show separate route/dashboard chunks and no source maps.

## Continuous security monitoring

The `Production security monitor` workflow runs twice weekly and on manual dispatch. It checks HTTP-to-HTTPS redirection, HSTS, HTTPS certificate validity and lifetime, TLS protocol, DNS resolution, response headers, CSP directives, route status/MIME behavior, static 404s, public Actions health (including the monitor's own latest completed run), npm audit, OSV, and a short ZAP passive baseline. During an active run, the self-check intentionally examines the previous completed run. Reports are retained as workflow artifacts. There are no notifications, issue creation, pull-request comments, or write permissions by default; repository owners can opt into alert routing separately after tuning expected findings.

The same monitor can be run without Actions:

```sh
npm run monitor:security -- --url https://jackcoates.co.uk --repository JackCoates1/portfolio
```

Origin exposure requires operator knowledge that must not be committed. From an approved monitoring host, pass an operator-managed origin hostname with `--origin-host`; the check fails if public edge DNS and origin DNS overlap. This is a useful regression signal, not proof that an origin is undiscoverable. A complete VPS/CDN review must also verify, at the firewall and provider control plane, that direct origin HTTP(S) is restricted to the intended CDN ranges. Keep that hostname and any provider account data outside the repository.

For a server-local scheduled job, use the existing service account and repository checkout rather than inventing a new path. Schedule the monitor command above with `--origin-host`, followed by the locally installed `zap-baseline.py -t https://jackcoates.co.uk -m 2 -I`, and write reports to an operator-selected protected directory. Run it twice weekly with a non-overlapping minute. The command prints a concise pass/fail summary and sends no notifications on its own.

## Deployment and rollback

The workflow runs only after a push to `main`: install, dependency audit, contracts, build, artifact validation, archive attestation, then deployment. It deliberately does not run for pull requests or forks. Action references are full commit SHAs; version comments identify the reviewed release. Checkout does not persist its token, the build job alone has the OIDC/attestation permissions required to attest its validated archive, and the deployment job can only read the uploaded artifact; it cannot modify repository contents.

The workflow transfers one compressed artifact, verifies both its workflow-provided digest and its internal checksum manifest, and then creates an SSH key file only in the runner temporary directory. It enforces host-key checking, non-interactive SSH, a constrained remote path, protected remote arguments, delayed deletion, and cleanup of temporary key material. This narrows the window for partially updated files, but it is not an atomic release mechanism.

For atomic releases, provision and document on the VPS a release directory and a `current` symlink before enabling it in automation. Upload each validated `dist/` artifact to a new immutable release directory, verify its `SHA256SUMS`, then atomically replace only the `current` symlink. Roll back by switching that symlink to the prior verified release. The repository intentionally does not assume directory names or change server paths; update the deployment workflow only after those server-side locations and retention rules are explicitly configured.
