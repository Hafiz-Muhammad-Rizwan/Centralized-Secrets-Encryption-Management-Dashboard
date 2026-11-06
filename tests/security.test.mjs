import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { hardenHtml } from '../scripts/harden-export.mjs';

function store(storage) {
  const source = readFileSync('src/components/secretsStore.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, localStorage: storage };
  vm.runInNewContext(code, context);
  return context.exports;
}

test('legacy payload is never read; cleanup removes only app-owned key', () => {
  const removed = [];
  const api = store({ getItem() { throw Error('must not read'); }, setItem() { throw Error('must not write'); }, removeItem(key) { removed.push(key); } });
  assert.ok(api.loadSecrets().every(s => s.plainValue === 'DEMO_ONLY_NOT_A_CREDENTIAL'));
  assert.equal(api.clearLegacySecrets(), true);
  assert.deepEqual(removed, ['vaultline_secrets_records_v1']);
});
test('blocked storage does not break samples; cleanup failure is signaled', () => {
  const api = store({ removeItem() { throw Error('denied'); } });
  assert.equal(api.clearLegacySecrets(), false);
  const records = api.loadSecrets();
  records[0].name = 'tampered';
  assert.notEqual(api.loadSecrets()[0].name, 'tampered');
});
test('export policy hashes exact hydration bytes and precedes resources', () => {
  const body = 'self.__next_f.push([1,"sample"]);';
  const result = hardenHtml(`<html><head><script src="/app.js"></script></head><body><script>${body}</script></body></html>`);
  const hash = createHash('sha256').update(body).digest('base64');
  assert.ok(result.includes(`'sha256-${hash}'`));
  assert.ok(result.indexOf('Content-Security-Policy') < result.indexOf('<script'));
  assert.ok(result.includes("form-action 'none'"));
  const scriptPolicy = result.match(/script-src ([^;]+)/)[1];
  assert.ok(!scriptPolicy.includes('unsafe-inline') && !scriptPolicy.includes('unsafe-eval'));
  assert.throws(() => hardenHtml(result));
  assert.throws(() => hardenHtml('<html></html>'));
});
