import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.vsix', 'application/vsix'],
]);
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const decoded = decodeURIComponent(url.pathname);
    let target = resolve(root, `.${decoded}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error('Traversal rejected');
    let info = await stat(target);
    if (info.isDirectory()) { target = join(target, 'index.html'); info = await stat(target); }
    if (!info.isFile()) throw new Error('Not a file');
    const headers = { 'Content-Type': mime.get(extname(target).toLowerCase()) || 'application/octet-stream', 'Content-Length': String(info.size), 'Cache-Control': 'no-store' };
    if (target.endsWith('.charmlet.json') || target.endsWith('.vsix')) headers['Content-Disposition'] = `attachment; filename="${basename(target)}"`;
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end(); else {
      const stream = createReadStream(target);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Charmlet gallery: http://127.0.0.1:${port}`));
