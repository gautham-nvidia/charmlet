import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStudioHandler, studioConfigFromEnvironment } from './studio/studio-service.mjs';
import { securityHeaders } from './security-headers.mjs';

const root = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.webp', 'image/webp'], ['.vsix', 'application/vsix'],
  ['.ttf', 'font/ttf'], ['.woff2', 'font/woff2'],
]);

export function createGalleryServer({
  staticRoot = root,
  studioConfig = studioConfigFromEnvironment(process.env),
  verifyLicense,
  clock,
  designPreview = false,
} = {}) {
  const handleStudio = createStudioHandler(studioConfig, { verify: verifyLicense, now: clock });
  let apiOrigin = null;
  try { apiOrigin = JSON.parse(readFileSync(join(staticRoot, 'commerce-public.json'), 'utf8')).apiOrigin; }
  catch { /* An unconfigured local preview permits only its own origin. */ }
  const secured = securityHeaders(apiOrigin);
  return createServer({ requestTimeout: 15000, headersTimeout: 15000 }, async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://localhost');
      const pathname = designPreview && url.pathname === '/' ? '/next.html' : decodeURIComponent(url.pathname);
      if (await handleStudio(request, response, pathname)) return;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
      }
      let target = resolve(staticRoot, `.${pathname}`);
      if (target !== staticRoot && !target.startsWith(`${staticRoot}${sep}`)) throw new Error('Traversal rejected');
      let info = await stat(target);
      if (info.isDirectory()) { target = join(target, 'index.html'); info = await stat(target); }
      if (!info.isFile()) throw new Error('Not a file');
      const headers = { ...secured, 'Content-Type': mime.get(extname(target).toLowerCase()) || 'application/octet-stream', 'Content-Length': String(info.size), 'Cache-Control': 'no-store' };
      if (target.endsWith('.charmlet.json') || target.endsWith('.vsix')) headers['Content-Disposition'] = `attachment; filename="${basename(target)}"`;
      response.writeHead(200, headers);
      if (request.method === 'HEAD') response.end(); else {
        const stream = createReadStream(target);
        stream.on('error', () => response.destroy());
        stream.pipe(response);
      }
    } catch {
      if (response.headersSent) response.destroy(); else {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end('Not found');
      }
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PORT || 4173);
  const server = createGalleryServer({ designPreview: process.argv.includes('--design-preview') });
  server.listen(port, '127.0.0.1', () => console.log(`Charmlet gallery: http://127.0.0.1:${port}`));
}
