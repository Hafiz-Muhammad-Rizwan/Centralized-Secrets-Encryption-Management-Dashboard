import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadTs(path) {
  const source = readFileSync(path, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, require() { return {}; } };
  vm.runInNewContext(code, context);
  return context.exports;
}

const secureCoding = loadTs('src/lib/security/secure-coding.ts');

function loadProvidedPasswordHelper() {
  const code = readFileSync('public/password_strength_helper.js', 'utf8');
  const context = { exports: {}, globalThis: {} };
  vm.runInNewContext(code, context);
  return context.globalThis.checkPasswordStrength;
}

const checkPasswordStrength = loadProvidedPasswordHelper();

/* ═══════════════════════════════════════════════════════════════
   TASK 1: SECURE INPUT VALIDATION TESTS
   ═══════════════════════════════════════════════════════════════ */

test('Task 1: Mandatory fields prevent empty submission', () => {
  const result = secureCoding.validateInputField('Secret Identifier', '   ', { required: true });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /mandatory and cannot be empty/i);
});

test('Task 1: Leading and trailing spaces are automatically trimmed', () => {
  const result = secureCoding.validateInputField('Service Name', '  Payment Gateway  ', {
    required: true,
    minLength: 3,
    maxLength: 50,
  });
  assert.equal(result.valid, true);
  assert.equal(result.sanitized, 'Payment Gateway');
});

test('Task 1: Character limits (minimum and maximum) are strictly enforced', () => {
  // Too short (< 3 chars)
  const tooShort = secureCoding.validateInputField('Secret Identifier', 'ab', {
    required: true,
    minLength: 3,
    maxLength: 50,
  });
  assert.equal(tooShort.valid, false);
  assert.match(tooShort.errors[0], /at least 3 characters/i);

  // Too long (> 50 chars)
  const tooLong = secureCoding.validateInputField('Secret Identifier', 'a'.repeat(55), {
    required: true,
    minLength: 3,
    maxLength: 50,
  });
  assert.equal(tooLong.valid, false);
  assert.match(tooLong.errors[0], /cannot exceed 50 characters/i);
});

test('Task 1: Input pattern and expected format validation', () => {
  const nameRegex = /^[a-z0-9-_]{3,50}$/;

  // Invalid: capital letters and spaces
  const invalidFormat = secureCoding.validateInputField('Secret Identifier', 'Payment API Key!', {
    pattern: nameRegex,
    patternMessage: 'Use lowercase alphanumeric, hyphens, and underscores only.',
  });
  assert.equal(invalidFormat.valid, false);
  assert.match(invalidFormat.errors[0], /Use lowercase alphanumeric/i);

  // Valid format
  const validFormat = secureCoding.validateInputField('Secret Identifier', 'payment-api-key_v2', {
    pattern: nameRegex,
  });
  assert.equal(validFormat.valid, true);
  assert.equal(validFormat.sanitized, 'payment-api-key_v2');
});

/* ═══════════════════════════════════════════════════════════════
   TASK 2: CROSS-SITE SCRIPTING (XSS) PREVENTION TESTS
   ═══════════════════════════════════════════════════════════════ */

test('Task 2: XSS test vectors are sanitized into inert textual data', () => {
  const vectors = [
    { input: "<script>alert('XSS')</script>", expected: "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;" },
    { input: '<img src=x onerror=alert("XSS")>', expected: '&lt;img src=x onerror=alert(&quot;XSS&quot;)&gt;' },
    { input: '<svg/onload=alert(1)>', expected: '&lt;svg&#x2F;onload=alert(1)&gt;' },
    { input: '"><script>alert(document.cookie)</script>', expected: '&quot;&gt;&lt;script&gt;alert(document.cookie)&lt;&#x2F;script&gt;' },
  ];

  for (const { input, expected } of vectors) {
    const sanitized = secureCoding.sanitizeText(input);
    assert.equal(sanitized, expected);
    // Verify none of the raw executable tags survive unencoded
    assert.equal(sanitized.includes('<script>'), false);
    assert.equal(sanitized.includes('<img'), false);
    assert.equal(sanitized.includes('<svg'), false);
  }
});

/* ═══════════════════════════════════════════════════════════════
   TASK 3: SECURE FILE SELECTION AND VALIDATION TESTS
   ═══════════════════════════════════════════════════════════════ */

test('Task 3: Permitted file extensions are accepted', () => {
  for (const ext of ['.json', '.env', '.pem', '.key', '.txt']) {
    const mockFile = { name: `config${ext}`, size: 1024, type: 'text/plain' };
    const result = secureCoding.validateFileSelection(mockFile);
    assert.equal(result.valid, true);
    assert.equal(result.fileDetails.extension, ext);
  }
});

test('Task 3: Dangerous and unsupported file extensions are rejected', () => {
  const blockedExtensions = ['payload.exe', 'script.sh', 'backdoor.php', 'virus.bat', 'page.html', 'doc.pdf'];
  for (const fileName of blockedExtensions) {
    const mockFile = { name: fileName, size: 1024, type: 'application/octet-stream' };
    const result = secureCoding.validateFileSelection(mockFile);
    assert.equal(result.valid, false);
    assert.match(result.error, /Unsupported file extension/i);
  }
});

test('Task 3: Files exceeding maximum size (50 KB) are strictly rejected', () => {
  // 60 KB file (> 50 KB limit)
  const oversizedFile = { name: 'secrets.env', size: 60 * 1024, type: 'text/plain' };
  const result = secureCoding.validateFileSelection(oversizedFile);
  assert.equal(result.valid, false);
  assert.match(result.error, /exceeds the maximum allowed limit/i);
});

/* ═══════════════════════════════════════════════════════════════
   TASK 4: SENSITIVE INFORMATION HANDLING TESTS
   ═══════════════════════════════════════════════════════════════ */

test('Task 4: Browser storage audit cleans every sensitive key in one pass', () => {
  const localMap = new Map([
    ['theme', 'dark'],
    ['user_password', 'PlainTextSecret123'],
    ['private_key_pem', '-----BEGIN PRIVATE KEY-----'],
  ]);
  const sessionMap = new Map([
    ['selected_tab', 'overview'],
    ['session_password', 'TemporarySecret123'],
    ['secret_plain_value', 'raw-secret'],
  ]);

  const mockStorage = (map) => ({
    get length() { return map.size; },
    key(i) { return Array.from(map.keys())[i]; },
    getItem(k) { return map.get(k); },
    removeItem(k) { map.delete(k); },
  });

  const context = {
    window: {},
    localStorage: mockStorage(localMap),
    sessionStorage: mockStorage(sessionMap),
    exports: {},
    require() { return {}; },
  };

  const code = ts.transpileModule(readFileSync('src/lib/security/secure-coding.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, context);

  const auditResult = context.exports.auditAndCleanBrowserStorage();
  assert.equal(auditResult.sensitiveFound, true);
  assert.equal(auditResult.cleanedKeys.length, 4);
  assert.equal(localMap.has('user_password'), false);
  assert.equal(localMap.has('private_key_pem'), false);
  assert.equal(sessionMap.has('session_password'), false);
  assert.equal(sessionMap.has('secret_plain_value'), false);
  assert.equal(localMap.has('theme'), true); // Non-sensitive preferences preserved
  assert.equal(sessionMap.has('selected_tab'), true);
});

test('Task 4: Blocked browser storage never breaks the storage audit', () => {
  const context = {
    window: {},
    exports: {},
    require() { return {}; },
  };
  Object.defineProperty(context, 'localStorage', {
    get() { throw new Error('blocked by browser policy'); },
  });
  Object.defineProperty(context, 'sessionStorage', {
    get() { throw new Error('blocked by browser policy'); },
  });

  const code = ts.transpileModule(readFileSync('src/lib/security/secure-coding.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, context);

  const result = context.exports.auditAndCleanBrowserStorage();
  assert.equal(result.sensitiveFound, false);
  assert.equal(result.cleanedKeys.length, 0);
});

/* ═══════════════════════════════════════════════════════════════
   TASK 5: PASSWORD STRENGTH CHECKER TESTS
   ═══════════════════════════════════════════════════════════════ */

test('Task 5: Evaluates Weak passwords and returns actionable feedback', () => {
  const result = checkPasswordStrength('pass');
  assert.equal(result.strength, 'Weak');
  assert.ok(result.score <= 1);
  assert.match(result.feedback, /at least 8 characters/i);
});

test('Task 5: Evaluates Moderate passwords and returns guidance', () => {
  const result = checkPasswordStrength('Password12');
  assert.equal(result.strength, 'Moderate');
  assert.ok(result.score >= 2);
  assert.match(result.feedback, /special symbol/i);
});

test('Task 5: Evaluates Strong passwords with high entropy and complexity', () => {
  const result = checkPasswordStrength('Vault#2026!SecureKey');
  assert.equal(result.strength, 'Strong');
  assert.ok(result.score >= 4);
  assert.match(result.feedback, /Strong password! Meets complexity/i);
});

test('Task 5: Handles empty or invalid password inputs gracefully', () => {
  const result = checkPasswordStrength('');
  assert.equal(result.strength, 'Weak');
  assert.match(result.feedback, /cannot be empty/i);
});

test('Task 5: The typed wrapper delegates to the provided browser helper', () => {
  const fakeWindow = { checkPasswordStrength: (password) => checkPasswordStrength(password) };
  const code = readFileSync('src/lib/security/password_strength_helper.ts', 'utf8');
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, window: fakeWindow, require() { return {}; } };
  vm.runInNewContext(compiled, context);
  assert.equal(context.exports.checkPasswordStrength('Vault#2026!SecureKey').strength, 'Strong');
});
