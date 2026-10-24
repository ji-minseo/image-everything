'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'assets/background-remover.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets/background-remover.css'), 'utf8');
const page = fs.readFileSync(path.join(root, 'remove-background/index.html'), 'utf8');
const files = ['compress-image','jpg-compressor','png-compressor','resize-image','crop-image',
  'convert-image','png-to-jpg','jpg-to-png','image-to-webp','webp-to-jpg',
  'heic-to-jpg','rotate-image','metadata-inspector','metadata-cleaner','pdf-compressor'];

function instantiate(win = {}) {
  const api = { exports: {} };
  vm.runInNewContext(code, { window: win, module: api, Blob, Uint8Array, Number, TextDecoder });
  return api.exports;
}

const valid = (overrides = {}) => ({
  name: 'photo.jpg',
  type: 'image/jpeg',
  size: 18000,
  ...overrides
});

test('accepts standard image formats with safe file size limits', () => {
  const core = instantiate();
  for (const type of ['image/jpeg','image/png','image/webp']) {
    assert.equal(core.validImage(valid({ type })), '');
  }
  assert.match(core.validImage(null), /Choose an image/);
  assert.match(core.validImage(valid({type:'image/svg+xml'})), /JPG, PNG or WebP/);
  assert.match(core.validImage(valid({size:0})), /empty/);
  assert.match(core.validImage(valid({size:13*1024*1024})), /under 12 MB/);
});

test('output naming, transparent and solid backgrounds', () => {
  const core = instantiate();
  assert.equal(core.outputFileName('product.photo.jpg','png'), 'product.photo-no-background.png');
  assert.equal(core.outputFileName('portrait.webp','jpg'), 'portrait-no-background.jpg');
  assert.equal(core.outputFileName('','png'), 'image-no-background.png');
  assert.equal(core.backgroundColor('transparent','#123456'), null);
  assert.equal(core.backgroundColor('white'), '#ffffff');
  assert.equal(core.backgroundColor('black'), '#000000');
  assert.equal(core.backgroundColor('custom','#efaabb'), '#efaabb');
  assert.equal(core.backgroundColor('custom','javascript:foo'), '#f1e6ff');
});

test('limits oversized decoded images to a browser-friendly area', () => {
  const core = instantiate();
  assert.equal(core.isValidImageSize(2000,4000), true);
  assert.equal(core.isValidImageSize(4032,3024), true); // standard 12MP smartphone photo
  assert.equal(core.isValidImageSize(6000,4000), false);
  assert.equal(core.isValidImageSize(0,500), false);
  assert.equal(core.isValidImageSize(NaN,500), false);
});

test('model progress explains downloaded weights without claiming file upload', () => {
  const core = instantiate();
  assert.match(core.progressMessage({status:'progress',progress:47.6}), /48%/);
  assert.match(core.progressMessage({status:'download'}), /first use/);
  assert.match(core.progressMessage({status:'ready'}), /Removing/);
  assert.equal(core.MODEL_ID,'onnx-community/ormbg-ONNX');
  assert.match(core.MODULE_URL, /@huggingface\/transformers@3\.8\.1/);
  assert.doesNotMatch(code, /@imgly\/background-removal/);
});

function fakeLibrary(options = {}) {
  const state = { builds: 0, inferences: 0, requested: null, rawRead: 0 };
  const raw = { width: options.width ?? 320, height: options.height ?? 200 };
  const foreground = {
    width: raw.width, height: raw.height, channels: options.channels ?? 4,
    async toBlob() { return new Blob([new Uint8Array([137,80,78,71])], {type:'image/png'}); }
  };
  return {
    state,
    lib: {
      RawImage: {
        async fromBlob(blob) {
          state.rawRead++;
          assert.ok(blob);
          return raw;
        }
      },
      async pipeline(task, id, config) {
        state.builds++;
        state.requested = { task, id, config };
        config.progress_callback({status:'progress',progress:42});
        return async () => {
          state.inferences++;
          return [foreground];
        };
      }
    }
  };
}

test('browser-local segmentation yields transparent PNG without remote image requests', async () => {
  const { state, lib } = fakeLibrary();
  const core = instantiate();
  const input = valid();
  const progress = [];
  const result = await core.removeBackground(input, text => progress.push(text), async url => {
    assert.equal(url, core.MODULE_URL);
    return lib;
  });
  assert.equal(result.width, 320);
  assert.equal(result.height, 200);
  assert.equal(result.blob.type, 'image/png');
  assert.equal(state.inferences, 1);
  assert.equal(state.rawRead, 1);
  assert.deepEqual([state.requested.task, state.requested.id],
    ['background-removal','onnx-community/ormbg-ONNX']);
  assert.equal(state.requested.config.dtype, 'q8');
  assert.equal(state.requested.config.device, 'wasm');
  assert.ok(progress.some(text => text.includes('42%')));
});

test('AI model is downloaded and loaded once per page', async () => {
  const { state, lib } = fakeLibrary();
  const core = instantiate();
  const load = async () => lib;
  await core.removeBackground(valid(), null, load);
  await core.removeBackground(valid(), null, load);
  assert.equal(state.builds, 1);
  assert.equal(state.inferences, 2);
});

test('AI failures reset the model loader so visitors can retry', async () => {
  const core = instantiate();
  let tries = 0;
  const {lib} = fakeLibrary();
  await assert.rejects(() => core.loadModel(null, async () => {
    tries++;
    throw new Error('network unavailable');
  }), /network unavailable/);
  await core.loadModel(null, async () => { tries++; return lib; });
  assert.equal(tries, 2);
});

test('invalid AI output is rejected rather than downloading a nontransparent image', async () => {
  const {lib} = fakeLibrary({channels:3});
  const core = instantiate();
  await assert.rejects(
    () => core.removeBackground(valid(), null, async () => lib),
    /compatible transparent image/
  );
});

test('HTML has all expected interactive fields without duplicates', () => {
  const ids = [...page.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const x of code.matchAll(/\$\('([^']+)'\)/g)) {
    assert.ok(ids.includes(x[1]), 'Missing element '+x[1]);
  }
  for (const mode of ['transparent','white','black','custom']) {
    assert.match(page, new RegExp('data-bg-mode="' + mode + '"'));
  }
  assert.match(page, /id="bg-dropzone" role="group" tabindex="0"/);
  assert.match(page, /id="bg-download"[^>]*>Download transparent PNG/);
  assert.match(page, /id="bg-progress"[^>]*hidden/);
});

test('UI styling follows the Image Everything 1080px shell and works on phones', () => {
  const globalCss = fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
  assert.match(globalCss, /\.shell\{width:min\(1080px/);
  assert.match(page, /class="tool-layout" id="bg-remover"/);
  assert.match(page, /class="panel bg-panel"/);
  assert.match(styles, /\.bg-dropzone:focus-visible/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /\.bg-compare \{ grid-template-columns:1fr;/);
  assert.match(styles, /\.bg-preview-frame\.checker/);
  assert.match(page, /href="https:\/\/everytinytool.com\/privacy\/"/);
});

test('new page is linked from existing utility navigation and XML sitemap', () => {
  for (const dir of files) {
    const html = fs.readFileSync(path.join(root,dir,'index.html'),'utf8');
    assert.match(html, /href="\.\.\/remove-background\/"/, dir);
  }
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(home, /href="\.\/remove-background\/"/);
  const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.match(sitemap, /https:\/\/image\.everytinytool\.com\/remove-background\//);
});


function interactivePageFixture() {
  const elements = new Map();
  const listenerRegistry = {};
  const outputs = [];
  const madeLinks = [];
  const removedUrls = [];
  let uploadPickerOpens = 0;
  let urlCount = 0;
  const createEl = id => {
    const e = {
      id, hidden: false, disabled: false, checked: false,
      style: {}, attributes: {}, dataset: {}, textContent: '', value: '',
      listeners: {},
      classList: {toggle() {},add() {},remove() {}},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute(name,value) { this.attributes[name] = String(value); },
      removeAttribute(name) { delete this[name]; },
      closest() { return null; }
    };
    e.click = function () {
      if (id === 'bg-file') {
        uploadPickerOpens++;
        elements.get('bg-dropzone').listeners.click({target:this});
      } else if (this.listeners.click) return this.listeners.click();
    };
    return e;
  };
  for (const [, id] of page.matchAll(/id="([^"]+)"/g)) {
    elements.set(id,createEl(id));
  }
  const colorModes = ['transparent','white','black','custom'].map(mode => {
    const e = createEl(mode);
    e.dataset.bgMode = mode;
    return e;
  });
  const document = {
    readyState: 'loading',
    getElementById(id) { return elements.get(id); },
    querySelectorAll(selector) {
      return selector === '[data-bg-mode]' ? colorModes : [];
    },
    addEventListener(type, listener) { listenerRegistry[type] = listener; },
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width:0,height:0,
          getContext() {
            return {fillRect() {}, drawImage() {}, fillStyle: ''};
          },
          toBlob(cb) { cb(new Blob(['jpeg-output'],{type:'image/jpeg'})); }
        };
      }
      const a = createEl('download-link');
      a.remove = () => {};
      a.click = () => { madeLinks.push({href:a.href,download:a.download}); };
      return a;
    },
    body: {appendChild() {}}
  };
  const win = {
    URL: {
      createObjectURL() {return 'blob:test-' + (++urlCount);},
      revokeObjectURL(url) {removedUrls.push(url);}
    },
    requestAnimationFrame(callback) {callback();},
    async createImageBitmap() {return {width:120,height:80,close() {}};},
    setTimeout(callback) {callback();}
  };
  const model = {calls:0,async removeBackground() {
    this.calls++;
    return {blob:new Blob(['transparent-png'], {type:'image/png'}),width:120,height:80};
  }};
  const api = {exports:{}};
  vm.runInNewContext(code,{
    document,window:win,module:api,Blob,Uint8Array,Number,TextDecoder
  });
  api.exports.init({removeBackground: (...args) => model.removeBackground(...args)});
  return {elements,colorModes,outputs,madeLinks,removedUrls,model,
    pickerCount:()=>uploadPickerOpens};
}

test('whole dropzone, choose button, Enter and Space open one picker each', () => {
  const page = interactivePageFixture();
  const zone = page.elements.get('bg-dropzone');
  const input = page.elements.get('bg-file');
  const choose = page.elements.get('bg-choose');
  zone.listeners.click({target:zone});
  assert.equal(page.pickerCount(), 1);
  choose.listeners.click();
  zone.listeners.click({target:{closest:selector=>selector.includes('button') ? choose : null}});
  assert.equal(page.pickerCount(), 2);
  zone.listeners.click({target:input});
  assert.equal(page.pickerCount(), 2);
  let prevented = 0;
  zone.listeners.keydown({target:zone,key:'Enter',preventDefault() {prevented++;}});
  zone.listeners.keydown({target:zone,key:' ',preventDefault() {prevented++;}});
  assert.equal(page.pickerCount(),4);
  assert.equal(prevented,2);
});

test('upload -> remove -> preview -> transparent PNG and solid JPG export', async () => {
  const page = interactivePageFixture();
  const file = page.elements.get('bg-file');
  const validFile = valid();
  file.files = [validFile];
  file.listeners.change();
  assert.equal(page.elements.get('bg-selected').hidden, false);
  assert.equal(page.elements.get('bg-run').disabled, false);
  await page.elements.get('bg-run').listeners.click();
  assert.equal(page.model.calls,1);
  assert.equal(page.elements.get('bg-result').hidden,false);
  assert.match(page.elements.get('bg-after').src, /^blob:test-/);
  assert.equal(page.elements.get('bg-download').textContent,'Download transparent PNG ↓');

  page.elements.get('bg-after').listeners.load();
  const download = page.elements.get('bg-download');
  assert.match(download.href,/^blob:test-/);
  assert.equal(download.download,'photo-no-background.png');

  page.colorModes[1].listeners.click();
  assert.equal(page.elements.get('bg-after-frame').style.backgroundColor,'#ffffff');
  assert.equal(download.textContent,'Download JPG ↓');
  let intercepted=false;
  await download.listeners.click({preventDefault() {intercepted=true;}});
  assert.equal(intercepted,true);
  assert.equal(page.madeLinks.length,1);
  assert.equal(page.madeLinks[0].download,'photo-no-background.jpg');

  page.colorModes[3].listeners.click();
  const chooser=page.elements.get('bg-custom-color');
  chooser.value='#bada55';
  chooser.listeners.input();
  assert.equal(page.elements.get('bg-after-frame').style.backgroundColor,'#bada55');
  page.colorModes[0].listeners.click();
  assert.equal(page.elements.get('bg-download').download,'photo-no-background.png');
  assert.equal(page.elements.get('bg-after-frame').style.backgroundColor,'');
});
