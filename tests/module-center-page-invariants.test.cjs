const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const source = fs.readFileSync('menu-modules/dashboard.html', 'utf8');

const COST_ROUTE = '/modules/cost-management/costdashboard.html';
const ACCOUNT_ROUTE = '/modules/cost-management/settings.html';

test('Module Center mempertahankan route modul dan Account Center lama', () => {
  assert.ok(source.split(`href="${COST_ROUTE}"`).length >= 3, 'Route Cost Management harus dipertahankan');
  assert.ok(source.split(`href="${ACCOUNT_ROUTE}"`).length >= 4, 'Route settings lama harus tetap menjadi target Account Center');
  assert.match(source, /Open Cost Management/);
  assert.match(source, /Open Account Center/);
  assert.match(source, /href="\/modules\/cost-management\/exportcenter\.html"/);
  assert.doesNotMatch(source, />Open Settings</);
  assert.doesNotMatch(source, /<h3 class="module-name">Settings<\/h3>/);
});

test('Account summary memiliki fallback dan sumber data dinamis Supabase', () => {
  assert.match(source, /id="userName">User<\/span>/);
  assert.match(source, /id="businessName">Nama Usaha Belum Diatur<\/p>/);
  assert.match(source, /id="planName">Free Plan<\/strong>/);
  assert.match(source, /Cost Management Available/);
  assert.match(source, /supabaseClient\.auth\.getUser\(\)/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /from\("cost_settings"\)/);
  assert.match(source, /maybeSingle\("subscriptions", user\.id\)/);
  assert.match(source, /metadata\.full_name/);
  assert.match(source, /Lengkapi Account Center/);
});

test('Daftar modul sesuai status dan Coming Soon bukan link', () => {
  assert.match(source, /<a class="module-card available"[^>]*>[\s\S]*?<h3 class="module-name">Cost Management<\/h3>/);
  for (const moduleName of ['Inventory', 'Finance', 'POS', 'Reservation']) {
    assert.match(source, new RegExp(`<article class="module-card coming-soon"[^>]*>[\\s\\S]*?<h3 class="module-name">${moduleName}<\\/h3>`));
  }
  assert.equal((source.match(/<article class="module-card coming-soon"/g) || []).length, 4);
  assert.equal((source.match(/>Coming Soon<\/span>/g) || []).length, 4);
});

test('CSS mobile-first mencegah overflow dan menyediakan breakpoint grid', () => {
  assert.match(source, /body \{[\s\S]*?overflow-x: hidden;/);
  assert.match(source, /\.page-shell \{[\s\S]*?padding: 20px 20px 40px;/);
  assert.match(source, /\.module-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(source, /@media \(min-width: 560px\)[\s\S]*?\.module-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(source, /@media \(min-width: 900px\)[\s\S]*?\.module-grid \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(source, /width: min\(100%, 1200px\)/);
});

test('Semua inline script valid secara sintaks JavaScript', () => {
  const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .filter((script) => script.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((script) => assert.doesNotThrow(() => new Function(script)));
});
