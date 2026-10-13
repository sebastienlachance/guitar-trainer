// Serves a built app the way GitHub Pages does: static files under a sub-path, nothing else.
// Usage: node e2e/support/serve-build.mjs <build folder> <port> <base path>
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const [folder, port, base] = process.argv.slice(2);
const root = resolve(folder);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = path.startsWith(base) ? path.slice(base.length) || 'index.html' : null;
  const file = relative === null ? null : resolve(join(root, relative));
  if (!file || !file.startsWith(root + sep)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(port));
