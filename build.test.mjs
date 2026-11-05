import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { build } from './build.mjs';

test('public build reduces text assets and includes only public runtime files', async () => {
  const sizes = await build();
  const root = new URL('_site/', import.meta.url);
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter(file => file.isFile());
  assert.equal(files.length, 16);
  assert.equal(await readFile(new URL('sealed.js', root), 'utf8'),
    'window.TTB_SEALED = {"classic":[],"arcade":[]};\n');
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /demo\.js|data-local-only|demoLink|\?demo|Try the demo/i);
  const appName = (await readdir(root)).find(name => /^app\.[a-f0-9]{12}\.js$/.test(name));
  assert.ok(appName, 'main app must be present');
  const app = await readFile(new URL(appName, root), 'utf8');
  assert.doesNotMatch(app, /ttb-modes-demo|example\.com|quick question goes here|Try the demo/i);
  const scoreboard = new URL('scoreboard/', root);
  const scoreboardHtml = await readFile(new URL('index.html', scoreboard), 'utf8');
  const scoreboardCssName = (await readdir(scoreboard)).find(name => /^styles\.[a-f0-9]{12}\.css$/.test(name));
  const scoreboardCss = await readFile(new URL(scoreboardCssName, scoreboard), 'utf8');
  assert.match(scoreboardHtml, /bungee-vs-400-normal\.[a-f0-9]{12}\.woff2/);
  assert.match(scoreboardCss, /bungee-vs-400-normal\.[a-f0-9]{12}\.woff2/);
  assert.doesNotMatch(scoreboardHtml + scoreboardCss, /bungee-latin-400-normal/);
  for (const file of files) {
    assert.match(file.name, /^(?:index\.html|(?:app|styles|bungee[^.]+|favicon)\.[a-f0-9]{12}\.(?:js|css|woff2|svg)|score\.json|LICENSE|OFL\.txt|sealed\.js|\.nojekyll)$/);
  }
  for (const row of sizes.filter(row => /\.(js|css)$/.test(row.file))) {
    assert.ok(row.built < row.source, `${row.file} must get smaller`);
  }
  // Resolve HTML and CSS references from each page, including project-subpath hosting.
  for (const file of files.filter(file => /\.(html|css)$/.test(file.name))) {
    const path = new URL(`${file.parentPath}/${file.name}`, 'file:');
    const source = await readFile(path, 'utf8');
    const references = file.name.endsWith('.html')
      ? [...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
      : [...source.matchAll(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g)]
        .map(match => match[1] ?? match[2] ?? match[3]);
    for (const ref of references) {
      if (/^(?:data:|https?:|#|\?)/.test(ref)) continue;
      assert.ok(!ref.startsWith('/'), 'assets must work under a GitHub Pages project path');
      await readFile(new URL(ref, path));
    }
  }
});
