import { transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = new URL('./', import.meta.url);
const output = new URL('_site/', root);
// This allowlist is deliberate: never copy sealed.js, entries.json or the repo.
const fonts = [
  'scoreboard/fonts/bungee-latin-400-normal.woff2',
  'scoreboard/fonts/bungee-inline-latin-400-normal.woff2',
  'scoreboard/fonts/bungee-vs-400-normal.woff2',
];

export async function build() {
  await rm(output, { recursive: true, force: true });
  await mkdir(new URL('scoreboard/fonts/', output), { recursive: true });
  const names = new Map();
  const sizes = [];
  async function emit(source, data, fingerprint = false) {
    const original = await readFile(new URL(source, root));
    const content = Buffer.from(data ?? original);
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
    const name = fingerprint ? source.replace(/(\.[^.]+)$/, `.${hash}$1`) : source;
    names.set(source, name);
    await writeFile(new URL(name, output), content);
    if (!source.endsWith('OFL.txt') && source !== 'LICENSE') {
      sizes.push({ file: source, source: original.length, built: content.length,
        gzip: source.endsWith('.woff2') ? content.length : gzipSync(content).length });
    }
  }
  for (const font of fonts) await emit(font, null, true);
  for (const icon of ['favicon.svg', 'scoreboard/favicon.svg']) await emit(icon, null, true);
  for (const file of ['styles.css', 'app.js', 'scoreboard/styles.css', 'scoreboard/app.js']) {
    let source = await readFile(new URL(file, root), 'utf8');
    for (const font of fonts) {
      const relative = file.startsWith('scoreboard/') ? font.slice('scoreboard/'.length) : font;
      const hashed = file.startsWith('scoreboard/') ? names.get(font).slice('scoreboard/'.length) : names.get(font);
      source = source.replaceAll(relative, hashed);
    }
    const { code } = await transform(source, {
      loader: file.endsWith('.css') ? 'css' : 'js', minify: true, legalComments: 'none',
      target: ['es2020'],
    });
    await emit(file, code, true);
  }
  for (const file of ['index.html', 'scoreboard/index.html']) {
    let html = await readFile(new URL(file, root), 'utf8');
    html = html.replace(/^[ \t]*<script src="demo\.js" defer data-local-only><\/script>\n?/gm, '');
    for (const [source, hashed] of names) {
      const prefix = file.startsWith('scoreboard/') ? 'scoreboard/' : '';
      if (prefix && !source.startsWith(prefix)) continue;
      html = html.replaceAll(`"${source.slice(prefix.length)}"`, `"${hashed.slice(prefix.length)}"`);
    }
    // Only trim indentation. Keep text-node spaces and inline SVG intact.
    await emit(file, html.replace(/^[ \t]+/gm, '').replace(/\n+/g, '\n').trim() + '\n');
  }
  const score = JSON.parse(await readFile(new URL('scoreboard/score.json', root), 'utf8'));
  await emit('scoreboard/score.json', JSON.stringify(score) + '\n');
  for (const file of ['LICENSE', 'scoreboard/fonts/OFL.txt']) {
    await copyFile(new URL(file, root), new URL(file, output));
  }
  await writeFile(new URL('sealed.js', output), 'window.TTB_SEALED = {"classic":[],"arcade":[]};\n');
  await writeFile(new URL('.nojekyll', output), '');
  return sizes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.table(await build());
}
