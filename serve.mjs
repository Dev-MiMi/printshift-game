import { createServer } from 'node:http';
import { createReadStream, lstatSync, realpathSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./game', import.meta.url));
const portOption = process.argv.indexOf('--port');
const port = portOption === -1 ? 8088 : Number(process.argv[portOption + 1]);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid preview port.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.wav': 'audio/wav' };
const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
  let path;
  try { path = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(root, '.' + path);
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  let stat;
  try { stat = lstatSync(file); if (!stat.isFile() || stat.isSymbolicLink() || !realpathSync(file).startsWith(root + sep)) throw new Error(); } catch { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'content-length': stat.size, 'cache-control': 'no-store' });
  if (request.method === 'HEAD') response.end(); else createReadStream(file).on('error', () => response.destroy()).pipe(response);
});
server.listen(port, '127.0.0.1', () => console.log('PRINTSHIFT is ready: http://localhost:' + server.address().port));
