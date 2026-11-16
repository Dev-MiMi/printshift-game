import { cpSync, mkdirSync, writeFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
function verifyPlainTree(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const info = lstatSync(path);
    if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) throw new Error('Only plain files and directories may be submitted.');
    if (info.isDirectory()) verifyPlainTree(path);
  }
}
mkdirSync(output, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  verifyPlainTree(join(repository, folder));
  cpSync(join(repository, folder), join(output, folder), { recursive: true });
}
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);
