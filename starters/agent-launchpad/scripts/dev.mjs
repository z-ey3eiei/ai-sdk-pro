import { createServer } from "node:http";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(resolve(fileURLToPath(new URL("../public", import.meta.url))));
const port = Number(process.env.PORT || 3000);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function safeFile(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const candidate = resolve(root, `.${normalize(requested)}`);
  return candidate === root || candidate.startsWith(`${root}/`) ? candidate : null;
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const file = safeFile(decodeURIComponent(url.pathname));
  if (!file || !existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end();
    return;
  }
  const body = readFileSync(file);
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentTypes[extname(file)] || "application/octet-stream",
  });
  if (request.method === "HEAD") response.end();
  else response.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Agent Launchpad dev server listening on http://localhost:${port}`);
});
