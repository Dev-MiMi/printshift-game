import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const game = resolve(root, 'game');
const files = [];
let entries = 0;
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    entries++;
    if (Buffer.byteLength(relative(game, path)) > 1000) throw new Error('Path exceeds the game cap.');
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) throw new Error('Non-plain path: ' + path);
    if (entry.isDirectory()) walk(path); else files.push(path);
  }
}
walk(game);
let bytes = 0;
for (const path of files) {
  const size = statSync(path).size; bytes += size;
  if (Buffer.byteLength(relative(game, path)) > 1000) throw new Error('Path exceeds the game cap.');
  if (path.endsWith('.js') || path.endsWith('.mjs')) {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
  }
}
if (bytes > 50331648 || entries > 993) throw new Error('Game exceeds the bounty cap.');
const vendorHash = createHash('sha256').update(readFileSync(resolve(root, 'vendor/makefun-game.ts'))).digest('hex');
if (vendorHash !== 'dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129') throw new Error('The make.fun vendor file changed.');
console.log(JSON.stringify({ syntax: 'pass', files: files.length, entries, bytes, unchangedVendor: true }));
