import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  update(response) {
    let setCookies = [];
    if (typeof response.headers.getSetCookie === 'function') {
      setCookies = response.headers.getSetCookie();
    } else {
      const raw = response.headers.get('set-cookie');
      if (raw) {
        setCookies = [raw];
      }
    }

    for (const cookieStr of setCookies) {
      const parts = cookieStr.split(';');
      const first = parts[0].trim();
      const eqIdx = first.indexOf('=');
      if (eqIdx !== -1) {
        const name = first.substring(0, eqIdx).trim();
        const value = first.substring(eqIdx + 1).trim();
        this.cookies.set(name, value);
      }
    }
  }

  get(name) {
    return this.cookies.get(name) || null;
  }

  getDecodedXsrf() {
    const raw = this.get('XSRF-TOKEN');
    return raw ? decodeURIComponent(raw) : null;
  }

  toHeader() {
    const pairs = [];
    for (const [name, val] of this.cookies.entries()) {
      pairs.push(`${name}=${val}`);
    }
    return pairs.join('; ');
  }
}

function getFilesRecursively(dir, filterExtensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, filterExtensions));
    } else {
      const ext = path.extname(file);
      if (filterExtensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

test('1. Static RTL Logical CSS Compliance', () => {
  const sourceFiles = getFilesRecursively(srcDir, ['.ts', '.tsx', '.css']);
  assert.ok(sourceFiles.length > 0, 'Source files must be discovered in frontend/src');

  const physicalPattern = /\b(ml|mr|pl|pr|left|right|rounded-l|rounded-r|border-l|border-r)-|\btext-(left|right)\b/;
  const violations = [];

  for (const filePath of sourceFiles) {
    const relativePath = path.relative(srcDir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Ignore comments
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }
      if (physicalPattern.test(line)) {
        violations.push(`${relativePath}:${index + 1} -> ${line.trim()}`);
      }
    });
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Found physical directional CSS utilities in frontend/src:\n${violations.join('\n')}`
  );
});

test('2. Live Health Endpoint, Database Probe & CORS Headers', async () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${backendUrl}/api/v1/health`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: 'http://localhost:3000',
    },
  });

  assert.strictEqual(res.status, 200, `Expected HTTP 200 from health endpoint, got ${res.status}`);

  const allowOrigin = res.headers.get('access-control-allow-origin');
  assert.strictEqual(
    allowOrigin,
    'http://localhost:3000',
    `Expected Access-Control-Allow-Origin: http://localhost:3000, got ${allowOrigin}`
  );

  const allowCredentials = res.headers.get('access-control-allow-credentials');
  assert.strictEqual(
    allowCredentials,
    'true',
    `Expected Access-Control-Allow-Credentials: true, got ${allowCredentials}`
  );

  const body = await res.json();
  assert.strictEqual(body.success, true, 'Health check envelope success must be true');
  assert.strictEqual(body.data.status, 'ok', 'Health check status must be ok');
  assert.strictEqual(body.data.database, 'connected', 'Database status must be connected');
});

test('3. Realistic Cookie-Jar Stateful Sanctum & CSRF Lifecycle', async () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const cookieJar = new CookieJar();

  // Step 3a: CSRF Handshake
  const csrfRes = await fetch(`${backendUrl}/sanctum/csrf-cookie`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: 'http://localhost:3000',
    },
  });
  assert.strictEqual(csrfRes.status, 204, `CSRF handshake must return HTTP 204, got ${csrfRes.status}`);
  cookieJar.update(csrfRes);

  const rawXsrf = cookieJar.get('XSRF-TOKEN');
  assert.ok(rawXsrf, 'XSRF-TOKEN cookie must be set in response headers');
  const decodedXsrf = cookieJar.getDecodedXsrf();
  assert.ok(decodedXsrf && decodedXsrf.length > 0, 'Decoded XSRF token must be non-empty string');

  // Step 3b: CSRF Gate Enforcement (omitting X-XSRF-TOKEN must fail with 419)
  const forbiddenRes = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: cookieJar.toHeader(),
    },
    body: JSON.stringify({
      email: 'admin@residenza.eg',
      password: process.env.TEST_ADMIN_PASSWORD || 'ResidenzaAdmin2026!',
    }),
  });
  assert.strictEqual(
    forbiddenRes.status,
    419,
    `Omitting X-XSRF-TOKEN must trigger HTTP 419 CSRF mismatch, got ${forbiddenRes.status}`
  );
  const forbiddenBody = await forbiddenRes.json();
  assert.strictEqual(forbiddenBody.error_code, 'CSRF_TOKEN_MISMATCH');

  // Step 3c: Stateful Login with Decoded X-XSRF-TOKEN and Cookie Jar
  const loginRes = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: cookieJar.toHeader(),
      'X-XSRF-TOKEN': decodedXsrf,
    },
    body: JSON.stringify({
      email: 'admin@residenza.eg',
      password: process.env.TEST_ADMIN_PASSWORD || 'ResidenzaAdmin2026!',
    }),
  });
  assert.strictEqual(loginRes.status, 200, `Stateful login must succeed with HTTP 200, got ${loginRes.status}`);
  cookieJar.update(loginRes);

  const loginBody = await loginRes.json();
  assert.strictEqual(loginBody.success, true);
  assert.strictEqual(loginBody.data.email, 'admin@residenza.eg');

  // Authenticated /me request using only cookie jar (stateful session)
  const meRes = await fetch(`${backendUrl}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: cookieJar.toHeader(),
    },
  });
  assert.strictEqual(meRes.status, 200, `Authenticated /me must succeed with HTTP 200, got ${meRes.status}`);
  const meBody = await meRes.json();
  assert.strictEqual(meBody.success, true);
  assert.strictEqual(meBody.data.email, 'admin@residenza.eg');

  // Stateful logout
  const logoutRes = await fetch(`${backendUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: cookieJar.toHeader(),
      'X-XSRF-TOKEN': cookieJar.getDecodedXsrf(),
    },
  });
  assert.strictEqual(logoutRes.status, 200, `Stateful logout must succeed with HTTP 200, got ${logoutRes.status}`);
  cookieJar.update(logoutRes);

  // Post-logout /me must return 401 UNAUTHENTICATED
  const postLogoutRes = await fetch(`${backendUrl}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: cookieJar.toHeader(),
    },
  });
  assert.strictEqual(
    postLogoutRes.status,
    401,
    `Post-logout /me must return HTTP 401, got ${postLogoutRes.status}`
  );
  const postLogoutBody = await postLogoutRes.json();
  assert.strictEqual(postLogoutBody.error_code, 'UNAUTHENTICATED');
});
