import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function hardenHtml(html) {
  if (!html.includes('<head>')) throw new Error('Export has no head');
  // Hash exact inline bytes, including Next's hydration data, after final rendering.
  const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs]) => !/\bsrc\s*=/i.test(attrs))
    .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  const policy = [
    "default-src 'none'",
    `script-src 'self' ${[...new Set(hashes)].join(' ')}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'", // Existing React style props and motion animations.
    "img-src 'self' data:", "font-src 'self'", "connect-src 'self'",
    "base-uri 'none'", "form-action 'none'", "object-src 'none'", "frame-src 'none'",
  ].join('; ');
  if (/http-equiv="Content-Security-Policy"/i.test(html)) throw new Error('Export already hardened; rebuild first');
  return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`);
}

async function hardenDirectory(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += await hardenDirectory(path);
    else if (entry.name.endsWith('.html')) {
      await writeFile(path, hardenHtml(await readFile(path, 'utf8')));
      count++;
    }
  }
  return count;
}

if (process.argv[1]?.endsWith('/harden-export.mjs')) {
  const count = await hardenDirectory('out');
  if (!count) throw new Error('No exported HTML found');
  console.log(`Hardened ${count} exported HTML files.`);
}
