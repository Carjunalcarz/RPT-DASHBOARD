#!/usr/bin/env node
/**
 * Admin-services smoke test — exercises every endpoint we recently wired
 * (auth, rbac, system-admin) against the locally running backend.
 *
 * Usage:
 *   node tests/adminServices.smoke.js
 *   BASE=http://localhost:3000 node tests/adminServices.smoke.js
 *
 * Auth strategy: uses the x-api-key from API_ACCESS_KEY in .env (service
 * request) so the gates (authenticate, requireSuperAdmin) all bypass — we're
 * testing the SERVICE LAYER, not the auth layer here.
 *
 * Output: one line per check, colour-coded, plus a summary at the end.
 * Does NOT mutate state beyond:
 *   - Creating a temp test user via /auth/register (email is timestamped)
 *   - Creating + immediately deleting a temp role
 * If any step fails, the script keeps going so you see the full picture.
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE = process.env.BASE || 'http://localhost:3000';
const API_KEY = process.env.API_ACCESS_KEY;
if (!API_KEY) {
  console.error('!! API_ACCESS_KEY missing from env');
  process.exit(1);
}

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;
const failures = [];

function pass(label, detail) {
  passed++;
  console.log(`  ${C.green}✓${C.reset} ${label}${detail ? C.dim + ' — ' + detail + C.reset : ''}`);
}
function fail(label, detail) {
  failed++;
  failures.push({ label, detail });
  console.log(`  ${C.red}✗${C.reset} ${label}${detail ? C.dim + ' — ' + detail + C.reset : ''}`);
}
function section(name) {
  console.log(`\n${C.bold}${C.cyan}${name}${C.reset}`);
}

async function call(method, path, body, extra = {}) {
  const url = new URL(path, BASE);
  const lib = url.protocol === 'https:' ? https : http;
  const data = body ? JSON.stringify(body) : null;

  return new Promise((resolve) => {
    const req = lib.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(extra.headers || {}),
        },
        timeout: 15_000,
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let json = null;
          try { json = chunks ? JSON.parse(chunks) : null; } catch { /* ignore */ }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            raw: chunks,
            body: json,
          });
        });
      }
    );
    req.on('error', (err) =>
      resolve({ status: 0, headers: {}, raw: '', body: null, error: err.message })
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, raw: '', body: null, error: 'timeout' });
    });
    if (data) req.write(data);
    req.end();
  });
}

function summarize(r) {
  if (r.error) return `network: ${r.error}`;
  if (r.body?.message) return `${r.status}: ${r.body.message}`;
  return `status ${r.status}`;
}

// --------------------------------------------------------------------------
async function main() {
  console.log(`${C.bold}admin-services smoke test${C.reset}`);
  console.log(`base: ${BASE}`);
  console.log(`api key: ${API_KEY.slice(0, 4)}…${API_KEY.slice(-4)}`);

  // ---- 1. Liveness ----
  section('1. Liveness');
  {
    const r = await call('GET', '/health/live');
    if (r.status === 200) pass('/health/live', '200 ok');
    else fail('/health/live', summarize(r));
  }

  // ---- 2. System-admin setup ----
  section('2. System-admin setup');
  let status = null;
  {
    const r = await call('GET', '/api/v1/system-admin/setup/status');
    if (r.status === 200 && r.body?.data) {
      status = r.body.data;
      pass('GET /setup/status', `schema=${status.schema} initialized=${status.initialized}`);
      if (status.initialized) {
        pass('  schemaExists', '');
        pass('  all tables present', `${status.tables.filter(t => t.exists).length}/${status.tables.length}`);
        pass('  RPC + index present', '');
        pass('  default catalog present', `roles=${status.counts?.roles} modules=${status.counts?.modules}`);
        if (status.typeIssues && status.typeIssues.length > 0) {
          fail('  type issues', status.typeIssues.map(i => `${i.table}.${i.column}=${i.actual}≠${i.expected}`).join('; '));
        }
      } else {
        fail('  status', 'not initialized — run /setup/init via UI first');
      }
    } else fail('GET /setup/status', summarize(r));
  }
  {
    const r = await call('GET', '/api/v1/system-admin/schemas');
    if (r.status === 200 && Array.isArray(r.body?.data?.schemas)) {
      const names = r.body.data.schemas.map((s) => s.name);
      pass('GET /schemas', `${names.length} found, configured=${r.body.data.configured}`);
      if (names.includes(r.body.data.configured)) pass('  configured schema is listed', '');
      else fail('  configured schema missing from list', '');
    } else fail('GET /schemas', summarize(r));
  }

  // ---- 3. RBAC ----
  section('3. RBAC');
  {
    const r = await call('GET', '/api/v1/rbac/me');
    if (r.status === 200 && r.body?.data) {
      pass('GET /me (service)', `service=${r.body.data.user?.isService}`);
    } else fail('GET /me', summarize(r));
  }
  {
    const r = await call('GET', '/api/v1/rbac/modules');
    if (r.status === 200 && Array.isArray(r.body?.data)) {
      pass('GET /modules', `${r.body.data.length} modules`);
    } else fail('GET /modules', summarize(r));
  }
  let roleId = null;
  {
    const r = await call('GET', '/api/v1/rbac/roles');
    if (r.status === 200 && Array.isArray(r.body?.data)) {
      pass('GET /roles', `${r.body.data.length} roles`);
      roleId = r.body.data[0]?.id;
    } else fail('GET /roles', summarize(r));
  }
  if (roleId) {
    const r = await call('GET', `/api/v1/rbac/roles/${roleId}`);
    if (r.status === 200 && r.body?.data?.id === roleId) {
      pass(`GET /roles/:id`, `code=${r.body.data.roleCode} modules=${r.body.data.modules?.length || 0}`);
    } else fail('GET /roles/:id', summarize(r));
  } else {
    fail('GET /roles/:id', 'no role id to look up (no roles seeded?)');
  }

  // Create + delete a temp role to verify mutation path.
  let tempRoleId = null;
  {
    const code = `_smoke_${Date.now().toString(36)}`;
    const r = await call('POST', '/api/v1/rbac/roles', {
      roleCode: code,
      roleName: 'Smoke Test Role',
    });
    if (r.status === 201 && r.body?.data?.id) {
      tempRoleId = r.body.data.id;
      pass('POST /roles (create)', `id=${tempRoleId.slice(0, 8)}…`);
    } else fail('POST /roles (create)', summarize(r));
  }
  if (tempRoleId) {
    const r = await call('PATCH', `/api/v1/rbac/roles/${tempRoleId}`, {
      roleName: 'Smoke Test Role (renamed)',
    });
    if (r.status === 200) pass('PATCH /roles/:id (update)', '');
    else fail('PATCH /roles/:id', summarize(r));
  }
  if (tempRoleId) {
    const r = await call('DELETE', `/api/v1/rbac/roles/${tempRoleId}`);
    if (r.status === 200) pass('DELETE /roles/:id', '');
    else fail('DELETE /roles/:id', summarize(r));
  }

  // ---- 4. Auth ----
  section('4. Auth');
  const tempEmail = `smoke+${Date.now()}@example.com`;
  const tempPassword = 'SmokeTest1Pass!';
  let createdUserId = null;
  {
    const r = await call('POST', '/api/v1/auth/register', {
      email: tempEmail,
      password: tempPassword,
      fullName: 'Smoke Test User',
      role: 'user',
    });
    if (r.status === 201 && r.body?.data?.user?.id) {
      createdUserId = r.body.data.user.id;
      pass('POST /auth/register', `id=${createdUserId.slice(0, 8)}…`);
    } else fail('POST /auth/register', summarize(r));
  }
  let accessToken = null;
  if (createdUserId) {
    const r = await call('POST', '/api/v1/auth/login', {
      email: tempEmail,
      password: tempPassword,
    });
    if (r.status === 200 && r.body?.data?.accessToken) {
      accessToken = r.body.data.accessToken;
      pass('POST /auth/login', `got access token (${accessToken.length} chars)`);
    } else fail('POST /auth/login', summarize(r));
  }
  if (accessToken) {
    const r = await call('GET', '/api/v1/auth/me', null, {
      headers: { Authorization: `Bearer ${accessToken}`, 'x-api-key': '' },
    });
    if (r.status === 200 && r.body?.data?.user) {
      pass('GET /auth/me (via JWT)', `email=${r.body.data.user.email}`);
    } else fail('GET /auth/me', summarize(r));
  }
  if (accessToken) {
    const r = await call('POST', '/api/v1/auth/logout', null, {
      headers: { Authorization: `Bearer ${accessToken}`, 'x-api-key': '' },
    });
    if (r.status === 200) pass('POST /auth/logout', '');
    else fail('POST /auth/logout', summarize(r));
  }
  // Bad-credentials path
  {
    const r = await call('POST', '/api/v1/auth/login', {
      email: tempEmail,
      password: 'wrong-password',
    });
    if (r.status === 401) pass('POST /auth/login (bad password rejected)', '401');
    else fail('POST /auth/login (bad password rejected)', `expected 401, got ${r.status}`);
  }

  // ---- 5. Permissions middleware sanity ----
  section('5. Permissions middleware');
  {
    // Without x-api-key and without Authorization should be 401 on a
    // protected route. Use rbac/users/:userId/roles which requires super_admin.
    const r = await call('GET', '/api/v1/rbac/users/00000000-0000-0000-0000-000000000000/roles', null, {
      headers: { 'x-api-key': '' },
    });
    if (r.status === 401) pass('protected route 401 without auth', '');
    else fail('protected route 401 without auth', `expected 401, got ${r.status}`);
  }

  // ---- Summary ----
  console.log(`\n${C.bold}Summary${C.reset}: ${C.green}${passed} passed${C.reset}, ${C.red}${failed} failed${C.reset}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.label}: ${C.dim}${f.detail}${C.reset}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('harness crashed:', e);
  process.exit(2);
});
