'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
const api = require('../assets/pdf-compressor.js');
const repoRoot = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(repoRoot, 'pdf-compressor/index.html'), 'utf8');
const css = fs.readFileSync(path.join(repoRoot, 'assets/pdf-compressor.css'), 'utf8');
const script = fs.readFileSync(path.join(repoRoot, 'assets/pdf-compressor.js'), 'utf8');
const styles = fs.readFileSync(path.join(repoRoot, 'assets/styles.css'), 'utf8');

function sampleFile(size = 120000) {
  return {
    name: 'presentation.pdf',
    size,
    slice: () => new Blob(['%PDF-1.7\n']),
    arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7\n').buffer
  };
}
function imageDict(values = {}) {
  const props = {
    Type: '/XObject', Subtype: '/Image', Filter: '/DCTDecode',
    ColorSpace: '/DeviceRGB', BitsPerComponent: '8', Width: '200', Height: '200',
    ...values
  };
  return {
    keys() { return Object.keys(props).map(name => ({ toString: () => '/' + name })); },
    get(name) { return Object.prototype.hasOwnProperty.call(props, name.toString().slice(1))
      ? { toString: () => String(props[name.toString().slice(1)]) } : undefined; }
  };
}
function sampleJpeg(size = 32000) {
  const bytes = new Uint8Array(size);
  bytes[0] = 255; bytes[1] = 216;
  bytes[bytes.length - 2] = 255; bytes[bytes.length - 1] = 217;
  return bytes;
}
function mockDocument({ outputSize = 60000, jpegObjects = [], error = null } = {}) {
  const state = { loads: 0, saves: 0, assigns: [], streams: [], loadOptions: null, saveOptions: null };
  global.window.PDFLib = {
    PDFName: { of: name => ({ toString: () => '/' + name }) },
    PDFDocument: { async load(bytes, options) {
      state.loads++;
      state.loadOptions = options;
      if (error) throw error;
      assert.ok(bytes instanceof Uint8Array);
      return {
        context: {
          enumerateIndirectObjects: () => jpegObjects,
          stream(bytes, dict) { const s = { bytes, dict }; state.streams.push(s); return s; },
          assign(ref, obj) { state.assigns.push({ ref, obj }); }
        },
        async save(options) {
          state.saves++;
          state.saveOptions = options;
          return new Uint8Array(outputSize);
        }
      };
    }}
  };
  return state;
}

test('default quality is 80 and only expected range is accepted', () => {
  assert.equal(api.DEFAULT_QUALITY, 80);
  assert.equal(api.MIN_QUALITY, 65);
  assert.equal(api.parseQuality(80), 80);
  assert.equal(api.parseQuality('100'), 100);
  assert.equal(api.parseQuality(65), 65);
  for (const invalid of ['', null, NaN, Infinity, 20, 64, 101]) {
    assert.equal(api.parseQuality(invalid), null);
  }
});
test('100, 50 and 10 MB preset target calculations stay strictly under threshold', () => {
  assert.deepEqual(api.PRESET_MB, [100, 50, 10]);
  for (const num of api.PRESET_MB) assert.match(page, new RegExp('data-pdf-size="' + num + '"'));
  assert.equal(api.targetBytes(100), 99999999);
  assert.equal(api.targetBytes(50), 49999999);
  assert.equal(api.targetBytes(10), 9999999);
  for (const invalid of ['', null, NaN, Infinity, 0, -1, 1001]) {
    assert.equal(api.targetBytes(invalid), null);
  }
});
test('optional target is independent from quality, and goal status may be null', () => {
  assert.deepEqual(api.assessResult(100000, 70000, null),
    { smaller: true, reached: null, saving: 30 });
  assert.deepEqual(api.assessResult(20000000, 8000000, api.targetBytes(10)),
    { smaller: true, reached: true, saving: 60 });
  assert.deepEqual(api.assessResult(20000000, 13000000, api.targetBytes(10)),
    { smaller: true, reached: false, saving: 35 });
});
test('PDF file name and units match existing compressor display', () => {
  assert.equal(api.outputName('report.PDF'), 'report-compressed.pdf');
  assert.equal(api.outputName(''), 'document-compressed.pdf');
  assert.equal(api.formatSize(10000000), '10.00 MB');
});
test('empty, oversized and non-PDF files are rejected', async () => {
  await assert.rejects(() => api.validateFile(sampleFile(0)), /empty/);
  await assert.rejects(() => api.validateFile(sampleFile(181000000)), /180 MB/);
  await assert.rejects(() => api.validateFile({
    ...sampleFile(), slice: () => new Blob(['Hello world'])
  }), /look like a PDF/);
});
test('quality slider applies only to compatible unmasked RGB JPEG XObjects', () => {
  const lib = { PDFName: { of: name => ({ toString: () => '/' + name }) } };
  assert.ok(api.jpegCandidate({ dict: imageDict(), getContents: () => sampleJpeg() }, lib));
  for (const value of [
    { Filter: '/FlateDecode' }, { ColorSpace: '/DeviceCMYK' },
    { Decode: '[1 0 1 0 1 0]' }, { SMask: '13 0 R' },
    { Mask: '9 0 R' }, { Interpolate: 'true' }, { BitsPerComponent: '1' },
    { Width: '70000' }, { Height: '70000' }
  ]) {
    assert.equal(api.jpegCandidate({ dict: imageDict(value), getContents: () => sampleJpeg() }, lib), null);
  }
});
test('Quality 100 skips JPEG recompression and only repacks PDF structure', async () => {
  const source = sampleFile();
  const state = mockDocument({ outputSize: 90000 });
  const result = await api.optimizePdf(source, { quality: 100, targetEnabled: false });
  assert.equal(result.original, false);
  assert.equal(result.reached, null);
  assert.equal(result.jpegImages, 0);
  assert.equal(state.assigns.length, 0);
  assert.equal(state.saves, 1);
  assert.equal(state.loadOptions.updateMetadata, false);
  assert.equal(state.saveOptions.updateFieldAppearances, false);
  assert.equal(state.saveOptions.useObjectStreams, true);
});
test('Quality 80 recompresses eligible JPEG bytes in place, preserving PDF page text objects', async () => {
  const sourceBytes = sampleJpeg();
  const ref = { objectNumber: 21 };
  const state = mockDocument({
    outputSize: 72000,
    jpegObjects: [[ref, { dict: imageDict(), getContents: () => sourceBytes }]]
  });
  let receivedQuality = null;
  let bitmapClosed = false;
  global.window.createImageBitmap = async () => ({
    width: 200, height: 200, close() { bitmapClosed = true; }
  });
  global.document = {
    createElement() {
      return {
        width: 0, height: 0,
        getContext: () => ({ drawImage() {} }),
        toBlob(cb, type, quality) {
          receivedQuality = quality;
          cb(new Blob([sampleJpeg(20000)], { type: 'image/jpeg' }));
        }
      };
    }
  };
  const messages = [];
  const result = await api.optimizePdf(sampleFile(), {
    quality: 80, targetEnabled: false
  }, message => messages.push(message));
  assert.equal(receivedQuality, 0.8);
  assert.equal(bitmapClosed, true);
  assert.equal(result.jpegImages, 1);
  assert.equal(result.eligibleImages, 1);
  assert.equal(result.saving, 40);
  assert.equal(result.reached, null);
  assert.equal(state.assigns.length, 1);
  assert.equal(state.assigns[0].ref, ref);
  assert.equal(state.streams[0].dict.Filter, 'DCTDecode');
  assert.equal(state.streams[0].dict.ColorSpace, 'DeviceRGB');
  assert.equal(state.streams[0].dict.Width, 200);
  assert.ok(messages.some(text => /Checking image/.test(text)));
  delete global.document;
  delete global.window.createImageBitmap;
});
test('if JPEG output does not shrink at quality 80, original image object stays intact', async () => {
  const ref = { objectNumber: 22 };
  const state = mockDocument({
    outputSize: 100000, jpegObjects: [[ref, {
      dict: imageDict(), getContents: () => sampleJpeg(32000)
    }]]
  });
  global.window.createImageBitmap = async () => ({
    width: 200, height: 200, close() {}
  });
  global.document = {
    createElement: () => ({
      width: 0, height: 0, getContext: () => ({ drawImage() {} }),
      toBlob: cb => cb(new Blob([sampleJpeg(31800)], { type: 'image/jpeg' }))
    })
  };
  const result = await api.optimizePdf(sampleFile(), { quality: 80, targetEnabled: false });
  assert.equal(result.jpegImages, 0);
  assert.equal(result.eligibleImages, 1);
  assert.equal(state.assigns.length, 0);
  delete global.document;
  delete global.window.createImageBitmap;
});
test('an already-met optional target does not override chosen Quality 80% processing', async () => {
  const state = mockDocument({ outputSize: 4000000 });
  const input = sampleFile(5000000);
  const result = await api.optimizePdf(input, { quality: 80, targetEnabled: true, limit: 10 });
  assert.equal(state.loads, 1);
  assert.equal(state.saves, 1);
  assert.equal(result.original, false);
  assert.equal(result.reached, true);
  assert.equal(result.saving, 20);
});
test('with size option off, original-size test never skips quality compression', async () => {
  const state = mockDocument({ outputSize: 70000 });
  const result = await api.optimizePdf(sampleFile(120000), { quality: 80, targetEnabled: false, limit: 100 });
  assert.equal(result.reached, null);
  assert.equal(state.loads, 1);
});
test('when optional size target is missed, it reports the miss instead of degrading quality again', async () => {
  const state = mockDocument({ outputSize: 15000000 });
  const result = await api.optimizePdf(sampleFile(20000000), {
    quality: 80, targetEnabled: true, limit: 10
  });
  assert.equal(result.reached, false);
  assert.equal(result.reason, 'partial');
  assert.equal(state.saves, 1);
});
test('original PDF wins if optimized output is bigger', async () => {
  mockDocument({ outputSize: 140000 });
  const original = sampleFile(120000);
  const result = await api.optimizePdf(original, { quality: 80, targetEnabled: false });
  assert.equal(result.blob, original);
  assert.equal(result.reached, null);
  assert.equal(result.reason, 'not-smaller');
});
test('original still satisfies an optional goal even if compression produces no savings', async () => {
  mockDocument({ outputSize: 140000 });
  const original = sampleFile(120000);
  const result = await api.optimizePdf(original, { quality: 80, targetEnabled: true, limit: 10 });
  assert.equal(result.original, true);
  assert.equal(result.reached, true);
});
test('encrypted PDFs still report a specific error', async () => {
  const err = new Error('encrypted');
  err.name = 'EncryptedPDFError';
  mockDocument({ error: err });
  await assert.rejects(() => api.optimizePdf(sampleFile(), {
    quality: 80, targetEnabled: false
  }), /Password-protected or encrypted/);
});
test('HTML shows default quality 80 bar and opt-in size target controls', () => {
  assert.match(page, /<label for="pdf-quality">Quality <span id="pdf-quality-value">80%<\/span>/);
  assert.match(page, /id="pdf-quality" type="range" min="65" max="100" step="5" value="80"/);
  assert.match(page, /id="pdf-target-toggle" type="checkbox"/);
  assert.match(page, /id="pdf-target-options" hidden/);
  assert.match(page, /id="pdf-limit"[^>]*disabled/);
  assert.match(script, /targetEnabled: toggle\.checked/);
  assert.match(script, /quality: quality\.value/);
  assert.match(script, /targetOptions\.hidden = !toggle\.checked/);
  assert.doesNotMatch(page, /data-pdf-mode|data-pdf-percent|pdf-percent-panel/);
});
test('PDF page inherits standard Image Everything width, buttons and navigation', () => {
  assert.match(styles, /\.shell\{width:min\(1080px/);
  assert.match(page, /class="tool-layout pdfc-page"/);
  assert.match(page, /class="panel pdfc-panel"/);
  assert.match(page, /class="row pdfc-settings-row"/);
  assert.match(page, /class="info info-grid"/);
  assert.match(page, /href="\.\.\/png-compressor\/"/);
  assert.match(css, /\.pdfc-page \.pdfc-panel\{width:100%;max-width:none\}/);
  assert.doesNotMatch(css, /930px/);
});
test('no PDF rasterization, and quality only affects compatible image streams', () => {
  assert.doesNotMatch(script, /pdfjsLib|rasterAttempt|page\.render\(|embedJpg\(/);
  assert.match(script, /jpegCandidate/);
  assert.match(script, /pdf\.context\.assign\(ref, stream\)/);
  assert.match(page, /Text and vector content won't be rasterized/);
  assert.match(page, /Quality applies to compatible JPEG images only/);
});
test('all dynamic UI lookup IDs exist exactly once, including target checkbox', () => {
  const ids = [...page.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of script.matchAll(/\$\('([^']+)'\)/g)) {
    assert.ok(ids.includes(match[1]), 'Missing ID: ' + match[1]);
  }
  assert.match(css, /\.pdfc-page \[hidden\]\{display:none!important\}/);
});

test('the full PDF dropzone is clickable and keyboard focusable', () => {
  assert.match(page, /id="pdf-dropzone" role="group" tabindex="0"/);
  assert.match(page, /Press Enter or Space to choose a PDF/);
  assert.match(css, /\.pdfc-page \.pdfc-dropzone\{min-height:240px;cursor:pointer\}/);
  assert.match(css, /\.pdfc-page \.pdfc-dropzone:focus-visible/);
});

test('clicking the dropzone opens the picker exactly once without duplicate bubbling', () => {
  const vm = require('node:vm');
  const nodes = new Map();
  let pickerOpens = 0;
  const listeners = {};
  const makeElement = id => ({
    id, listeners: {},
    hidden: false, disabled: false, checked: false, value: '',
    style: {}, dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeAttribute() {},
    setAttribute() {},
    click() {
      if (this.id === 'pdf-file') {
        pickerOpens++;
        // Native input.click() also bubbles a synthetic click to its parent.
        nodes.get('pdf-dropzone').listeners.click({ target: this });
      }
    },
    closest() { return null; }
  });
  for (const [, id] of page.matchAll(/id="([^"]+)"/g)) {
    nodes.set(id, makeElement(id));
  }
  const sizePresets = [100, 50, 10].map(n => {
    const button = makeElement('preset-' + n);
    button.dataset.pdfSize = String(n);
    return button;
  });
  const fakeDoc = {
    readyState: 'loading',
    getElementById(id) { return nodes.get(id); },
    querySelectorAll(query) {
      return query === '[data-pdf-size]' ? sizePresets : [];
    },
    addEventListener(type, fn) { listeners[type] = fn; }
  };
  const fakeWindow = {};
  vm.runInNewContext(script, {
    window: fakeWindow, document: fakeDoc,
    Blob, Uint8Array, TextDecoder, Number, Math, Set,
    console
  });
  assert.equal(typeof listeners.DOMContentLoaded, 'function');
  listeners.DOMContentLoaded();

  const zone = nodes.get('pdf-dropzone');
  const input = nodes.get('pdf-file');
  const button = nodes.get('pdf-choose');

  zone.listeners.click({ target: zone });
  assert.equal(pickerOpens, 1, 'clicking dropzone whitespace must open once');

  button.listeners.click();
  zone.listeners.click({ target: { closest: () => button } });
  assert.equal(pickerOpens, 2, 'Choose PDF must open only once');

  zone.listeners.click({ target: input });
  assert.equal(pickerOpens, 2, 'input click bubbling must not reopen picker');

  let prevented = 0;
  for (const key of ['Enter', ' ']) {
    zone.listeners.keydown({
      target: zone, key,
      preventDefault() { prevented++; }
    });
  }
  assert.equal(pickerOpens, 4, 'Enter and Space open the picker');
  assert.equal(prevented, 2);

  zone.listeners.keydown({
    target: button, key: 'Enter',
    preventDefault() { throw new Error('Button owns its keyboard event'); }
  });
  assert.equal(pickerOpens, 4, 'nested button keydown must not duplicate');

  input.disabled = true;
  // Busy status should prevent file picker interaction. Clicking elsewhere
  // still works for a valid selected file in other test cases.
});
