'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/tools.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
const pages = [
  'compress-image', 'jpg-compressor', 'png-compressor',
  'resize-image', 'crop-image', 'convert-image',
  'png-to-jpg', 'jpg-to-png', 'image-to-webp', 'webp-to-jpg',
  'heic-to-jpg', 'rotate-image', 'image-info',
  'metadata-checker', 'remove-exif'
];

test('all 15 image tools make their dropzone focusable with descriptive instructions', () => {
  for (const dir of pages) {
    const html = fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8');
    assert.match(html, /<div class="dropzone" id="dropzone" role="group" tabindex="0" aria-label="Image upload area\. Click or press Enter or Space to choose image files, or drag and drop files\.">/, dir);
    assert.match(html, /<input class="file-input" id="fileInput" type="file"/, dir);
    assert.match(html, /<button class="btn chooseBtn" type="button">/, dir);
    assert.match(html, /assets\/styles\.css\?v=20261013-image-dropzone-a11y-1/, dir);
    assert.match(html, /assets\/tools\.js\?v=20261013-image-dropzone-a11y-1/, dir);
  }
});

test('shared CSS exposes mouse pointer and focus-visible ring on every dropzone', () => {
  assert.match(css, /\.dropzone\{[^}]*cursor:pointer\}/);
  assert.match(css, /\.dropzone:focus-visible\{outline:3px solid var\(--accent\);outline-offset:4px\}/);
});

function setupUploadInteractions() {
  // Evaluate just the common dropzone helper with controlled DOM stubs:
  // avoids executing unrelated image processing on these UI interaction tests.
  const start = script.indexOf('function initDropzone(');
  const end = script.indexOf('\nfunction addBottomTabs()', start);
  assert.ok(start >= 0 && end > start, 'shared initDropzone exists');
  const extracted = script.slice(start, end);
  const registered = el => ({
    ...el, events: {},
    addEventListener(type, callback) { this.events[type] = callback; }
  });
  const zone = registered({
    id: 'dropzone',
    classList: { add() {}, remove() {} }
  });
  const input = registered({
    id: 'fileInput', multiple: false, accept: '', files: [], value: '',
    clicks: 0,
    click() {
      this.clicks++;
      // Input click is a synthetic click that can bubble to the parent.
      zone.events.click({ target: input });
    }
  });
  const button = registered({
    id: 'chooseBtn',
    closest(selector) { return selector.includes('button') ? this : null; }
  });
  const summary = {
    classList: { add() {}, remove() {} },
    innerHTML: '',
    append() {}
  };
  const elements = {
    '#dropzone': zone, '#fileInput': input,
    '.chooseBtn': button, '#fileSummary': summary
  };
  const $ = key => elements[key] || null;
  const doc = { createElement() { throw new Error('Rendering unnecessary for event interaction test'); } };
  const init = new Function('$', 'document', 'URL', 'resetResults',
    extracted + '\nreturn initDropzone;')($, doc, { revokeObjectURL() {} }, () => {});
  init({ multiple: true, accept: 'image/*', onFiles() {} });
  return { zone, input, button };
}

test('clicking any non-control area opens the chooser exactly once', () => {
  const { zone, input } = setupUploadInteractions();
  const content = { closest() { return null; } };
  zone.events.click({ target: zone });
  assert.equal(input.clicks, 1);
  zone.events.click({ target: content });
  assert.equal(input.clicks, 2);
  assert.equal(input.multiple, true);
  assert.equal(input.accept, 'image/*');
});

test('Choose button opens chooser once, never again from bubbling or file input click', () => {
  const { zone, input, button } = setupUploadInteractions();
  button.events.click();
  // Simulate the user-initiated Choose button click bubbling into dropzone.
  zone.events.click({ target: button });
  assert.equal(input.clicks, 1);
  zone.events.click({ target: input });
  assert.equal(input.clicks, 1);
});

test('pressing Enter or Space on focused dropzone opens file picker', () => {
  const { zone, input } = setupUploadInteractions();
  let prevented = 0;
  for (const key of ['Enter', ' ']) {
    zone.events.keydown({
      key, target: zone,
      preventDefault() { prevented++; }
    });
  }
  assert.equal(input.clicks, 2);
  assert.equal(prevented, 2);
});

test('nested keyboard interaction and irrelevant keys do not launch chooser', () => {
  const { zone, input, button } = setupUploadInteractions();
  zone.events.keydown({
    key: 'Enter', target: button,
    preventDefault() { throw new Error('Nested button must own Enter'); }
  });
  zone.events.keydown({
    key: 'ArrowDown', target: zone,
    preventDefault() { throw new Error('Unrelated key must not be consumed'); }
  });
  assert.equal(input.clicks, 0);
});

test('native image drag-and-drop and file input event listeners stay connected', () => {
  const { zone, input } = setupUploadInteractions();
  for (const eventName of ['click', 'keydown', 'dragenter', 'dragover', 'dragleave', 'drop']) {
    assert.equal(typeof zone.events[eventName], 'function', eventName);
  }
  assert.equal(typeof input.events.change, 'function');
});
