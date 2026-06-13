const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('menu-modules/dashboard.html', 'utf8');
const config = fs.readFileSync('menu-modules/config.js', 'utf8');

const COST_ROUTE = '/modules/cost-management/costdashboard.html';
const LEGACY_SETTINGS_ROUTE = '/modules/cost-management/settings.html';
const ACCOUNT_CENTER_FALLBACK = 'https://biya-account-center.vercel.app';

test('Module Center memisahkan URL Portal dari Cost Management Settings', () => {
  assert.match(source, /<script src="\/menu-modules\/config\.js"><\/script>/);
  assert.match(config, /COST_MANAGEMENT_URL/);
  assert.match(config, new RegExp(COST_ROUTE.replaceAll('/', '\\/')));
  assert.match(config, /ACCOUNT_CENTER_URL/);
  assert.match(config, new RegExp(ACCOUNT_CENTER_FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(config, /window\.BIYA_ACCOUNT_CENTER_URL/);
  assert.match(source, /Open Cost Management/);
  assert.match(source, /Open Account Center/);
  assert.equal((source.match(/data-portal-link="cost-management"/g) || []).length, 3);
  assert.equal((source.match(/<a\b[^>]*data-portal-link="account-center"[^>]*>/g) || []).length, 3);
  assert.match(
    source,
    /document\.querySelectorAll\('\[data-portal-link="account-center"\]'\)\.forEach\(\(link\) => \{\s*link\.href = ACCOUNT_CENTER_URL;/
  );
  assert.doesNotMatch(source, new RegExp(`href="${LEGACY_SETTINGS_ROUTE}"`));
  assert.match(source, /href="\/modules\/cost-management\/exportcenter\.html"/);
  assert.doesNotMatch(source, />Open Settings</);
  assert.doesNotMatch(source, /<h3 class="module-name">Settings<\/h3>/);
});

test('Config Portal menyediakan fallback dan mendukung override deployment', () => {
  const fallbackContext = { window: {} };
  vm.runInNewContext(config, fallbackContext);
  assert.equal(fallbackContext.window.BIYA_PORTAL_CONFIG.COST_MANAGEMENT_URL, COST_ROUTE);
  assert.equal(fallbackContext.window.BIYA_PORTAL_CONFIG.ACCOUNT_CENTER_URL, ACCOUNT_CENTER_FALLBACK);

  const overrideContext = {
    window: {
      BIYA_COST_MANAGEMENT_URL: 'https://cost.example.test',
      BIYA_ACCOUNT_CENTER_URL: 'https://account.example.test'
    }
  };
  vm.runInNewContext(config, overrideContext);
  assert.equal(overrideContext.window.BIYA_PORTAL_CONFIG.COST_MANAGEMENT_URL, 'https://cost.example.test');
  assert.equal(overrideContext.window.BIYA_PORTAL_CONFIG.ACCOUNT_CENTER_URL, 'https://account.example.test');
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

test('Semua inline script dan config valid secara sintaks JavaScript', () => {
  const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .filter((script) => script.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((script) => assert.doesNotThrow(() => new Function(script)));
  assert.doesNotThrow(() => new Function(config));
});
