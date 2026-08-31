import { createServer } from "node:http";
import { realpath, readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = new URL("../dist/", import.meta.url);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://ipapi.co https://ipwho.is https://api4.ipify.org https://api6.ipify.org stun:; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const securityHeaders = {
  "Content-Security-Policy": CSP,
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

const isInside = (root, candidate) => {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot));
};

const contentTypeFor = (requestPath, filePath) => {
  if (requestPath === "/api/resume") return "application/json; charset=utf-8";
  return MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "application/octet-stream";
};

export const createPreviewServer = async ({ root = DEFAULT_ROOT } = {}) => {
  const rootPath = await realpath(root);
  const notFoundPath = join(rootPath, "404.html");

  return createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { ...securityHeaders, Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
        response.end(request.method === "HEAD" ? undefined : "Method not allowed\n");
        return;
      }

      let requestPath;
      try {
        requestPath = decodeURIComponent(new URL(request.url ?? "/", "http://preview.invalid").pathname);
      } catch {
        response.writeHead(400, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
        response.end(request.method === "HEAD" ? undefined : "Bad request\n");
        return;
      }

      const isBrowserRoute = requestPath === "/" || requestPath === "/cyberlab";
      const requestedRelativePath = isBrowserRoute ? "index.html" : requestPath.replace(/^\/+/, "");
      const candidatePath = resolve(rootPath, requestedRelativePath);
      let filePath;
      let statusCode = 200; // /404.html is a real static file -- a direct hit returns 200, matching production nginx (error_page only fires on an actual unknown route)

      if (requestedRelativePath && isInside(rootPath, candidatePath)) {
        try {
          const resolvedPath = await realpath(candidatePath);
          const fileStats = await stat(resolvedPath);
          if (fileStats.isFile() && isInside(rootPath, resolvedPath)) filePath = resolvedPath;
        } catch {
          filePath = undefined;
        }
      }

      if (!filePath) {
        filePath = notFoundPath;
        statusCode = 404;
      }

      const body = await readFile(filePath);
      const contentType = statusCode === 404
        ? "text/html; charset=utf-8"
        : contentTypeFor(requestPath, filePath);
      response.writeHead(statusCode, {
        ...securityHeaders,
        "Cache-Control": "no-store",
        "Content-Length": body.byteLength,
        "Content-Type": contentType,
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(500, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Internal preview error\n");
    }
  });
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const hostIndex = process.argv.indexOf("--host");
  const portIndex = process.argv.indexOf("--port");
  const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : "127.0.0.1";
  const port = portIndex >= 0 ? Number.parseInt(process.argv[portIndex + 1], 10) : 4173;
  if (!host || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Usage: npm run preview -- --host 127.0.0.1 --port 4173");
  }

  const server = await createPreviewServer();
  server.listen(port, host, () => {
    const address = server.address();
    const listeningPort = typeof address === "object" && address ? address.port : port;
    console.log(`Production-like preview: http://${host}:${listeningPort}/`);
  });

  const close = () => server.close(() => process.exit(0));
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
