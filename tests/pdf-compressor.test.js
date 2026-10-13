'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
// The browser bundles are injected by the page, so we mock only their public API
// to regression-test workflow control flow. This is not visual/real-PDF validation.
global.window = {};
const api = require('../assets/pdf-compressor.js');
const html = fs.readFileSync(path.join(root, 'pdf-compressor/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/pdf-compressor.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/pdf-compressor.js'), 'utf8');

test('correct and strict under-MB targets', () => {
  assert.equal(api.targetBytes('size', 100, 145000000), 99999999);
  assert.equal(api.targetBytes('size', 50, 145000000), 49999999);
  assert.equal(api.targetBytes('size', 10, 145000000), 9999999);
  assert.equal(api.targetBytes('size', 5, 145000000), 4999999);
  assert.equal(api.targetBytes('size', 1, 145000000), 999999);
  assert.equal(api.targetBytes('size', 0.5, 15000000), 499999);
});
test('compression percentage targets refer to reduction in bytes, not image fidelity', () => {
  assert.equal(api.targetBytes('percent', 20, 50000000), 40000000);
  assert.equal(api.targetBytes('percent', 40, 50000000), 30000000);
  assert.equal(api.targetBytes('percent', 60, 50000000), 20000000);
  assert.equal(api.targetBytes('percent', 80, 50000000), 10000000);
});
test('invalid settings are rejected', () => {
  for (const v of [0, -1, NaN, Infinity, 1001]) assert.equal(api.targetBytes('size', v, 5000), null);
  for (const v of [0, -1, 96, 100]) assert.equal(api.targetBytes('percent', v, 5000), null);
  assert.equal(api.targetBytes('something', 1, 5000), null);
});
test('compression result never claims a target was met unless actual output matches it', () => {
  assert.deepEqual(api.outcome(50000000, 9000000, 9999999), { reached: true, smaller: true, saving: 82 });
  const bad = api.outcome(50000000, 11000000, 9999999);
  assert.equal(bad.reached, false);
  assert.equal(bad.smaller, true);
  assert.equal(bad.saving, 78);
});
test('file size and output names are formatted safely', () => {
  assert.equal(api.formatSize(0), '0 B');
  assert.equal(api.formatSize(10000000), '10.00 MB');
  assert.equal(api.makeOutputName('report.PDF'), 'report-compressed.pdf');
  assert.equal(api.makeOutputName(''), 'document-compressed.pdf');
});
test('pixel caps avoid allocating huge canvases for large PDF pages', () => {
  for (const profile of api.PROFILES) {
    const dimensions = api.canvasDimensions(4320, 6120, profile);
    assert.ok(dimensions.width <= 3200 && dimensions.height <= 3200);
    assert.ok(dimensions.width * dimensions.height <= profile.maxPixels);
  }
});
test('page HTML connects every visible control to the compressor source', () => {
  const required = ['pdf-compressor','pdf-file','pdf-dropzone','pdf-choose','pdf-file-selected',
    'pdf-filename','pdf-original-label','pdf-remove','pdf-percent','pdf-percent-value',
    'pdf-size','pdf-percent-panel','pdf-size-panel','pdf-compress','pdf-cancel','pdf-progress',
    'pdf-meter','pdf-progress-text','pdf-result','pdf-result-title','pdf-output-size',
    'pdf-input-size','pdf-saved','pdf-outcome','pdf-result-bar','pdf-download','pdf-status'];
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of required) assert.ok(ids.includes(id), id + ' absent from markup');
  for (const match of js.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.match(css, /\.pdfc-page \[hidden\]\{display:none!important\}/);
});
test('HTML describes the real PDF processing limits and preservation trade-offs', () => {
  assert.match(html, /Under <strong>100 MB<\/strong>/);
  assert.match(html, /Under <strong>50 MB<\/strong>/);
  assert.match(html, /Under <strong>10 MB<\/strong>/);
  assert.match(html, /reduction in file size/i);
  assert.match(html, /selectable\/searchable text/);
  assert.match(html, /No file uploads/);
  assert.match(html, /pdf\.js\/3\.11\.174\/pdf\.min\.js/);
  assert.match(html, /pdf-lib\/1\.17\.1\/pdf-lib\.min\.js/);
});
const fakeFile = (size = 15000000) => ({
  size, name: 'sample.pdf',
  slice: () => new Blob(['%PDF-1.7\n']),
  arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7\n').buffer
});
function mockLibraries(outputLength, pages = 2) {
  global.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return {
        width: 0, height: 0,
        getContext: () => ({ fillRect() {}, fillStyle: '' }),
        toBlob: cb => cb(new Blob([new Uint8Array(128)], { type: 'image/jpeg' }))
      };
    }
  };
  let renderCount = 0;
  let destroyCount = 0;
  global.window.pdfjsLib = {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument() {
      return { promise: Promise.resolve({
        numPages: pages,
        getPage: async () => ({
          getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
          render: () => { renderCount++; return { promise: Promise.resolve() }; },
          cleanup() {}
        }),
        destroy: async () => { destroyCount++; }
      }), destroy: async () => { destroyCount++; } };
    }
  };
  global.window.PDFLib = { PDFDocument: { create: async () => ({
    embedJpg: async () => ({}),
    addPage: () => ({ drawImage() {} }),
    save: async () => new Uint8Array(outputLength)
  }) } };
  return { get renders() { return renderCount; }, get destroys() { return destroyCount; } };
}
test('an already-small PDF is returned unchanged with its original text and links', async () => {
  global.window.pdfjsLib = undefined;
  global.window.PDFLib = undefined;
  const file = fakeFile(8000000);
  const result = await api.compressPdf(file, { mode: 'size', amount: 10 }, () => {}, () => false);
  assert.equal(result.original, true);
  assert.equal(result.blob, file);
  assert.equal(result.reached, true);
  assert.equal(result.attempts, 0);
});
test('mocked PDF canvas rendering completes and reports the actual smaller size', async () => {
  const mocks = mockLibraries(6200000);
  const progress = [];
  const result = await api.compressPdf(fakeFile(30000000), { mode: 'size', amount: 10 },
    event => progress.push(event), () => false);
  assert.equal(result.reached, true);
  assert.equal(result.original, false);
  assert.equal(result.bytes, 6200000);
  assert.equal(result.pageCount, 2);
  assert.ok(progress.length > 0);
  assert.equal(mocks.renders, 2);
  assert.equal(mocks.destroys, 1);
});
test('a missed PDF size goal is honestly reported after stronger compression passes', async () => {
  const mocks = mockLibraries(11000000);
  const result = await api.compressPdf(fakeFile(30000000), { mode: 'size', amount: 10 },
    () => {}, () => false);
  assert.equal(result.reached, false);
  assert.equal(result.bytes, 11000000);
  assert.equal(result.original, false);
  assert.equal(mocks.renders, 12);
});
test('pages beyond browser-friendly cap are rejected before rendering', async () => {
  const mocks = mockLibraries(1000000, 121);
  await assert.rejects(() => api.compressPdf(fakeFile(30000000),
    { mode: 'size', amount: 10 }, () => {}, () => false), /up to 120 PDF pages/);
  assert.equal(mocks.renders, 0);
});
test('cancel stops a compression pass before processing another page', async () => {
  mockLibraries(1000000);
  await assert.rejects(() => api.compressPdf(fakeFile(30000000),
    { mode: 'size', amount: 10 }, () => {}, () => true), /cancelled/);
});
test('empty, oversized and non-PDF files are declined', async () => {
  await assert.rejects(() => api.checkPdf(fakeFile(0)), /empty/);
  await assert.rejects(() => api.checkPdf(fakeFile(181000000)), /180 MB/);
  const textFile = {...fakeFile(), slice: () => new Blob(['Hello world'])};
  await assert.rejects(() => api.checkPdf(textFile), /valid PDF/);
});
