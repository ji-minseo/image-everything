'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
const api = require('../assets/pdf-compressor.js');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pdf-compressor/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/pdf-compressor.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/pdf-compressor.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');

function fakePdf(size = 25000000) {
  return {
    name: 'presentation.pdf', size,
    slice: () => new Blob(['%PDF-1.7\n']),
    arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7\n').buffer
  };
}
function mockedPdfLib(size, error = null) {
  const details = { loads: 0, saves: 0, loadOptions: null, saveOptions: null };
  global.window.PDFLib = { PDFDocument: { async load(bytes, options) {
    details.loads++;
    details.loadOptions = options;
    if (error) throw error;
    assert.ok(bytes instanceof Uint8Array);
    return { async save(saveOptions) {
      details.saves++;
      details.saveOptions = saveOptions;
      return new Uint8Array(size);
    }};
  }}};
  return details;
}

test('supports only 100, 50 and 10 MB quick goals', () => {
  assert.deepEqual(api.PRESET_MB, [100, 50, 10]);
  for (const goal of api.PRESET_MB) {
    assert.match(html, new RegExp('data-pdf-size="' + goal + '"'));
  }
  assert.equal(api.targetBytes(100), 99999999);
  assert.equal(api.targetBytes(50), 49999999);
  assert.equal(api.targetBytes(10), 9999999);
  assert.equal(api.targetBytes(0.5), 499999);
  assert.equal(api.targetBytes(10), api.targetBytes('10'));
});
test('invalid or blank targets never get silently interpreted as zero', () => {
  for (const invalid of ['', null, NaN, Infinity, 0, -1, .05, 1001]) {
    assert.equal(api.targetBytes(invalid), null);
  }
});
test('calculates actual size and never presents an unachieved target as success', () => {
  assert.deepEqual(api.assessResult(25000000, 8100000, api.targetBytes(10)),
    { smaller: true, reached: true, saving: 67.6 });
  assert.deepEqual(api.assessResult(25000000, 11000000, api.targetBytes(10)),
    { smaller: true, reached: false, saving: 56 });
  assert.equal(api.reductionPercent(1000, 1000), 0);
});
test('uses PDF-only output name and actual decimal MB units', () => {
  assert.equal(api.outputName('report.PDF'), 'report-optimized.pdf');
  assert.equal(api.outputName(''), 'document-optimized.pdf');
  assert.equal(api.formatSize(10000000), '10.00 MB');
});
test('validates PDFs and restricts very large documents', async () => {
  await assert.rejects(() => api.validateFile(fakePdf(0)), /empty/);
  await assert.rejects(() => api.validateFile(fakePdf(181000000)), /180 MB/);
  await assert.rejects(() => api.validateFile({
    ...fakePdf(), slice: () => new Blob(['this is plain text'])
  }), /look like a PDF/);
});
test('already-under-target PDFs remain byte-for-byte unchanged', async () => {
  global.window.PDFLib = null;
  const file = fakePdf(7000000);
  const result = await api.optimizePdf(file, 10);
  assert.equal(result.blob, file);
  assert.equal(result.bytes, file.size);
  assert.equal(result.original, true);
  assert.equal(result.reached, true);
  assert.equal(result.reason, 'already-small');
});
test('pdf-lib reparses and repacks without converting pages to images', async () => {
  const mocks = mockedPdfLib(8600000);
  const events = [];
  const result = await api.optimizePdf(fakePdf(25000000), 10, message => events.push(message));
  assert.equal(result.original, false);
  assert.equal(result.reached, true);
  assert.equal(result.bytes, 8600000);
  assert.ok(result.blob instanceof Blob);
  assert.equal(mocks.loads, 1);
  assert.equal(mocks.saves, 1);
  assert.equal(mocks.loadOptions.ignoreEncryption, false);
  assert.equal(mocks.loadOptions.updateMetadata, false);
  assert.equal(mocks.saveOptions.updateFieldAppearances, false);
  assert.equal(mocks.saveOptions.useObjectStreams, true);
  assert.equal(mocks.saveOptions.addDefaultPage, false);
  assert.ok(events.some(text => /Repacking PDF objects/.test(text)));
  assert.doesNotMatch(js, /pdfjsLib|page\.render|canvas\.toBlob|embedJpg|rasterAttempt/);
});
test('gentle optimizer keeps output honest when target is missed', async () => {
  const mocks = mockedPdfLib(19300000);
  const result = await api.optimizePdf(fakePdf(25000000), 10);
  assert.equal(result.original, false);
  assert.equal(result.reached, false);
  assert.equal(result.reason, 'partial');
  assert.equal(mocks.saves, 1);
});
test('never replaces the input with a larger optimized output', async () => {
  mockedPdfLib(29000000);
  const input = fakePdf(25000000);
  const result = await api.optimizePdf(input, 10);
  assert.equal(result.blob, input);
  assert.equal(result.original, true);
  assert.equal(result.reached, false);
  assert.equal(result.saving, 0);
  assert.equal(result.reason, 'not-smaller');
});
test('encrypted or password-protected PDFs give actionable error', async () => {
  const encrypted = new Error('encrypted document');
  encrypted.name = 'EncryptedPDFError';
  mockedPdfLib(100, encrypted);
  await assert.rejects(() => api.optimizePdf(fakePdf(), 10), /Password-protected or encrypted/);
});
test('dependencies are checked only when the original is above goal', async () => {
  global.window.PDFLib = null;
  await assert.rejects(() => api.optimizePdf(fakePdf(25000000), 10), /optimizer did not load/);
  const unchanged = await api.optimizePdf(fakePdf(4000000), 10);
  assert.equal(unchanged.original, true);
});
test('uses full-width shared Image Everything components, not the narrow unique PDF layout', () => {
  assert.match(styles, /\.shell\{width:min\(1080px/);
  assert.match(styles, /\.tool-layout\{padding:38px 0 72px\}/);
  assert.match(html, /class="tool-layout pdfc-page"/);
  assert.match(html, /class="tool-head"/);
  assert.match(html, /class="panel pdfc-panel"/);
  assert.match(html, /class="dropzone pdfc-dropzone"/);
  assert.match(html, /class="info info-grid"/);
  assert.match(html, /class="network"/);
  assert.match(css, /\.pdfc-page \.pdfc-panel\{width:100%;max-width:none\}/);
  assert.doesNotMatch(css, /930px/);
  assert.doesNotMatch(css, /clamp\(44px/);
  assert.match(html, /href="\.\.\/png-compressor\/"/);
  assert.match(html, /href="https:\/\/everytinytool.com\/privacy\/"/);
});
test('no aggressive compression mode, 1MB or 5MB presets, PDF.js or raster warning remains', () => {
  assert.doesNotMatch(html, /data-pdf-percent|data-pdf-mode|pdf-percent-panel/);
  assert.doesNotMatch(html, /data-pdf-size="1"[^0]|data-pdf-size="5"/);
  assert.doesNotMatch(html, /pdf\.js\/3\.11/);
  assert.doesNotMatch(html, /pages into JPEG|turns pages into JPEG/);
  assert.match(html, /Gentle optimization only/);
  assert.match(html, /digitally signed PDF/);
  assert.match(js, /useObjectStreams: true/);
  assert.doesNotMatch(js, /pdfjsLib/);
});
test('each dynamic element used by the script exists once in markup', () => {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of js.matchAll(/\$\('([^']+)'\)/g)) {
    assert.ok(ids.includes(match[1]), 'missing id ' + match[1]);
  }
  assert.match(css, /\.pdfc-page \[hidden\]\{display:none!important\}/);
});
