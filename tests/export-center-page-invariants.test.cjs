const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pagePath = path.join(__dirname, "..", "modules", "cost-management", "exportcenter.html");
const page = fs.readFileSync(pagePath, "utf8");

test("Export Center memakai viewport yang mengizinkan zoom in dan mencegah skala di bawah ukuran normal", () => {
  const viewport = page.match(/<meta\s+name="viewport"\s+content="([^"]+)"\s*\/?>/i);

  assert.ok(viewport, "meta viewport harus tersedia");
  assert.match(viewport[1], /width=device-width/);
  assert.match(viewport[1], /initial-scale=1/);
  assert.match(viewport[1], /minimum-scale=1/);
  assert.match(viewport[1], /viewport-fit=cover/);
  assert.doesNotMatch(viewport[1], /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(viewport[1], /maximum-scale\s*=\s*1/i);
});

test("Export Center membatasi container dan media ke lebar viewport", () => {
  assert.match(page, /html,\s*\nbody\{width:100%;max-width:100%;overflow-x:hidden\}/);
  assert.match(page, /\.export-page\{width:100%;max-width:1180px;margin:0 auto;overflow-x:hidden\}/);
  assert.match(page, /\.export-grid,\s*\n\.export-card,\s*\n\.snapshot-mobile-list,\s*\n\.snapshot-card\{max-width:100%;min-width:0\}/);
  assert.match(page, /img,\s*\nsvg,\s*\ncanvas,\s*\nvideo\{max-width:100%;height:auto\}/);
});

test("layout mobile memakai track grid yang dapat menyusut dan snapshot tidak memaksa overflow", () => {
  assert.match(page, /\.export-page \.grid,\.export-page \.export-grid\{grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(page, /\.snapshot-table-wrap table\{width:100%;min-width:0;table-layout:fixed\}/);
  assert.match(page, /\.snapshot-table-wrap\{display:none!important\}/);
  assert.match(page, /\.snapshot-name\{white-space:normal;overflow-wrap:anywhere;word-break:break-word\}/);
});

test("kontrol utama Export Center dan integrasi data tetap tersedia", () => {
  for (const expected of [
    'onclick="downloadBackup()"',
    'id="restoreFile"',
    'onclick="restoreBackup()"',
    "exportPrintable('cost')",
    "exportPrintable('recipe')",
    "downloadCSV('rawmaterials')",
    'id="snapshotBody"',
    'id="snapshotCards"',
    'src="/assets/js/auth-guard.js"',
    'src="export-service-center.js"',
  ]) {
    assert.ok(page.includes(expected), `markup/script penting hilang: ${expected}`);
  }
});
