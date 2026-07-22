import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

export function createStaticHandler(publicDirectory) {
  const root = resolve(publicDirectory);
  return async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) return false;
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = resolve(root, relative);
    if (!filePath.startsWith(`${root}${sep}`)) return false;
    try {
      if (!(await stat(filePath)).isFile()) return false;
      const content = await readFile(filePath);
      response.writeHead(200, { "content-type": contentTypes[extname(filePath)] || "application/octet-stream", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", "cache-control": "no-cache" });
      response.end(request.method === "HEAD" ? undefined : content);
      return true;
    } catch { return false; }
  };
}
