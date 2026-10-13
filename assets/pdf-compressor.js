/* Image Everything · PDF Compressor
   Browser-only rasterization compressor. PDF.js renders the source; pdf-lib
   packages JPEG pages. The source PDF is never uploaded to our servers.
   A rasterized output does not retain selectable text, links or form fields.
*/
(function (root) {
  'use strict';

  const MB = 1000000;
  const MAX_BYTES = 180 * MB;
  const MAX_PAGES = 120;
  const PROFILES = Object.freeze([
    { dpi: 165, jpeg: .87, maxPixels: 3300000 },
    { dpi: 140, jpeg: .76, maxPixels: 2650000 },
    { dpi: 115, jpeg: .65, maxPixels: 2100000 },
    { dpi: 94, jpeg: .53, maxPixels: 1500000 },
    { dpi: 76, jpeg: .41, maxPixels: 1100000 },
    { dpi: 62, jpeg: .32, maxPixels: 760000 }
  ]);

  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    if (bytes < 1000) return Math.round(bytes) + ' B';
    if (bytes < MB) return (bytes / 1000).toFixed(1) + ' KB';
    if (bytes < 1000 * MB) return (bytes / MB).toFixed(2) + ' MB';
    return (bytes / (1000 * MB)).toFixed(2) + ' GB';
  }
  function targetBytes(mode, number, originalBytes) {
    const amount = Number(number);
    if (!(Number.isFinite(originalBytes) && originalBytes > 0) || !Number.isFinite(amount)) return null;
    if (mode === 'percent') {
      if (amount < 1 || amount > 95) return null;
      return Math.max(1, Math.floor(originalBytes * (100 - amount) / 100));
    }
    if (mode === 'size') {
      if (amount < .1 || amount > 1000) return null;
      return Math.max(1, Math.ceil(amount * MB) - 1); // strictly UNDER the chosen MB size
    }
    return null;
  }
  function reductionPercent(originalBytes, outputBytes) {
    if (!(originalBytes > 0 && outputBytes >= 0)) return 0;
    return Math.round((1 - outputBytes / originalBytes) * 1000) / 10;
  }
  function chooseStartingProfile(mode, reduction) {
    if (mode === 'size') return 0; // meet size with the highest available fidelity first
    if (reduction >= 80) return 2;
    if (reduction >= 60) return 1;
    return 0;
  }
  function makeOutputName(name) {
    const base = String(name || 'document').replace(/\.pdf$/i, '').trim() || 'document';
    return base + '-compressed.pdf';
  }
  function canvasDimensions(width, height, profile) {
    if (!(width > 0 && height > 0)) throw new Error('This PDF page has an invalid size.');
    const scale = Math.min(
      profile.dpi / 72,
      3200 / Math.max(width, height),
      Math.sqrt(profile.maxPixels / (width * height))
    );
    return {
      scale,
      width: Math.max(1, Math.floor(width * scale)),
      height: Math.max(1, Math.floor(height * scale))
    };
  }
  function outcome(originalSize, compressedSize, limit) {
    return {
      reached: compressedSize <= limit,
      smaller: compressedSize < originalSize,
      saving: reductionPercent(originalSize, compressedSize)
    };
  }

  async function checkPdf(file) {
    if (!file) throw new Error('Choose a PDF file first.');
    if (file.size <= 0) throw new Error('This PDF file appears to be empty.');
    if (file.size > MAX_BYTES) {
      throw new Error('This browser tool supports PDFs up to 180 MB. Very large PDFs need a desktop-grade compressor.');
    }
    const firstBytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const header = new TextDecoder('ascii').decode(firstBytes);
    if (!header.includes('%PDF-')) throw new Error('That file does not look like a valid PDF.');
    return true;
  }

  async function canvasJpeg(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob && blob.size > 0
        ? resolve(blob)
        : reject(new Error('The browser could not encode the PDF page as an image.')),
      'image/jpeg', quality);
    });
  }

  async function rasterAttempt(source, profile, report, shouldCancel) {
    const output = await root.PDFLib.PDFDocument.create();
    for (let index = 1; index <= source.numPages; index++) {
      if (shouldCancel()) throw new Error('Compression cancelled.');
      const page = await source.getPage(index);
      const base = page.getViewport({ scale: 1 });
      const dimensions = canvasDimensions(base.width, base.height, profile);
      const viewport = page.getViewport({ scale: dimensions.scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas is not supported in this browser.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      try {
        const rendering = page.render({ canvasContext: context, viewport, background: 'rgb(255,255,255)' });
        await rendering.promise;
        if (shouldCancel()) throw new Error('Compression cancelled.');
        const blob = await canvasJpeg(canvas, profile.jpeg);
        const image = await output.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const nextPage = output.addPage([base.width, base.height]);
        nextPage.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
      report(index, source.numPages);
    }
    if (shouldCancel()) throw new Error('Compression cancelled.');
    return output.save({ useObjectStreams: true });
  }

  async function compressPdf(file, settings, onProgress, shouldCancel) {
    await checkPdf(file);
    const limit = targetBytes(settings.mode, settings.amount, file.size);
    if (limit === null) throw new Error('Choose a valid compression percentage or file size limit.');
    if (settings.mode === 'size' && file.size <= limit) {
      return { blob: file, bytes: file.size, original: true, reached: true, saving: 0, attempts: 0, pageCount: null };
    }
    if (!root.pdfjsLib || !root.PDFLib) {
      throw new Error('The PDF processing libraries did not load. Check your connection and try again.');
    }

    root.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    let task = null;
    let source = null;
    let best = null;
    let used = 0;
    try {
      // pdf.js moves this byte array to a web worker; no source is transmitted.
      const data = new Uint8Array(await file.arrayBuffer());
      task = root.pdfjsLib.getDocument({ data, isEvalSupported: false, useSystemFonts: true });
      source = await task.promise;
      if (!source.numPages) throw new Error('This PDF has no pages.');
      if (source.numPages > MAX_PAGES) {
        throw new Error('This browser tool supports up to 120 PDF pages per file. Try splitting a longer PDF.');
      }
      const start = chooseStartingProfile(settings.mode, Number(settings.amount));
      for (let i = start; i < PROFILES.length; i++) {
        if (shouldCancel()) throw new Error('Compression cancelled.');
        used++;
        const p = PROFILES[i];
        onProgress({ attempt: used, totalAttempts: PROFILES.length - start, page: 0, pages: source.numPages });
        const candidate = await rasterAttempt(source, p, (page, pages) =>
          onProgress({ attempt: used, totalAttempts: PROFILES.length - start, page, pages }), shouldCancel);
        const stats = outcome(file.size, candidate.byteLength, limit);
        if (!best || candidate.byteLength < best.length) best = candidate;
        if (stats.reached && stats.smaller) {
          return {
            blob: new Blob([candidate], { type: 'application/pdf' }),
            bytes: candidate.byteLength, original: false, reached: true,
            saving: stats.saving, attempts: used, pageCount: source.numPages
          };
        }
      }
      if (!best || best.length >= file.size) {
        return {
          blob: null, bytes: file.size, original: true, reached: false,
          saving: 0, attempts: used, pageCount: source.numPages
        };
      }
      return {
        blob: new Blob([best], { type: 'application/pdf' }),
        bytes: best.length, original: false, reached: best.length <= limit,
        saving: reductionPercent(file.size, best.length), attempts: used,
        pageCount: source.numPages
      };
    } catch (error) {
      if (error && (error.name === 'PasswordException' || /password/i.test(error.message || ''))) {
        throw new Error('Password-protected PDFs cannot be compressed here. Unlock the PDF first.');
      }
      throw error;
    } finally {
      if (source) await source.destroy().catch(() => {});
      else if (task) await task.destroy().catch(() => {});
    }
  }

  function init() {
    const $ = id => document.getElementById(id);
    if (!$('pdf-compressor')) return;
    const input = $('pdf-file');
    const drop = $('pdf-dropzone');
    const choose = $('pdf-choose');
    const selected = $('pdf-file-selected');
    const name = $('pdf-filename');
    const originalLabel = $('pdf-original-label');
    const remove = $('pdf-remove');
    const modeBtns = [...document.querySelectorAll('[data-pdf-mode]')];
    const presetBtns = [...document.querySelectorAll('[data-pdf-size]')];
    const percent = $('pdf-percent');
    const percentPresets = [...document.querySelectorAll('[data-pdf-percent]')];
    const percentValue = $('pdf-percent-value');
    const sizeField = $('pdf-size');
    const percentPanel = $('pdf-percent-panel');
    const sizePanel = $('pdf-size-panel');
    const compress = $('pdf-compress');
    const cancel = $('pdf-cancel');
    const progress = $('pdf-progress');
    const meter = $('pdf-meter');
    const progressText = $('pdf-progress-text');
    const result = $('pdf-result');
    const resultTitle = $('pdf-result-title');
    const outputSize = $('pdf-output-size');
    const originalSize = $('pdf-input-size');
    const saved = $('pdf-saved');
    const outcomeText = $('pdf-outcome');
    const bar = $('pdf-result-bar');
    const download = $('pdf-download');
    const status = $('pdf-status');
    let file = null;
    let blobUrl = null;
    let mode = 'size';
    let busy = false;
    let runId = 0;

    function say(message, isError = false) {
      status.textContent = message;
      status.dataset.error = String(isError);
    }
    function clearOutput() {
      result.hidden = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = null;
      download.removeAttribute('href');
    }
    function updateReady() {
      compress.disabled = !file || busy;
      choose.disabled = busy;
      remove.disabled = busy;
      input.disabled = busy;
      sizeField.disabled = busy;
      percent.disabled = busy;
      modeBtns.forEach(button => { button.disabled = busy; });
      presetBtns.forEach(button => { button.disabled = busy; });
      percentPresets.forEach(button => { button.disabled = busy; });
    }
    function setFile(next) {
      if (busy) return;
      clearOutput();
      file = next || null;
      input.value = '';
      selected.hidden = !file;
      if (file) {
        name.textContent = file.name;
        originalLabel.textContent = formatSize(file.size);
        say('PDF selected. Choose a target and start compression.');
      } else {
        say('Your PDF stays on your device. Nothing is uploaded.');
      }
      updateReady();
    }
    function setMode(next) {
      if (busy) return;
      mode = next;
      percentPanel.hidden = mode !== 'percent';
      sizePanel.hidden = mode !== 'size';
      modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pdfMode === mode)));
      clearOutput();
    }
    function setTarget(number) {
      sizeField.value = String(number);
      presetBtns.forEach(b => b.classList.toggle('active', Number(b.dataset.pdfSize) === Number(number)));
      clearOutput();
    }
    function updatePercent() {
      percentValue.textContent = percent.value + '% smaller';
      percentPresets.forEach(button => button.classList.toggle('active', Number(button.dataset.pdfPercent) === Number(percent.value)));
      clearOutput();
    }

    choose.addEventListener('click', () => input.click());
    input.addEventListener('change', () => setFile(input.files && input.files[0]));
    remove.addEventListener('click', () => setFile(null));
    ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, event => {
      event.preventDefault();
      drop.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, event => {
      event.preventDefault();
      drop.classList.remove('dragover');
      if (type === 'drop' && event.dataTransfer && event.dataTransfer.files[0]) {
        setFile(event.dataTransfer.files[0]);
      }
    }));
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.pdfMode)));
    presetBtns.forEach(b => b.addEventListener('click', () => setTarget(b.dataset.pdfSize)));
    sizeField.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.toggle('active', Number(b.dataset.pdfSize) === Number(sizeField.value)));
      clearOutput();
    });
    percent.addEventListener('input', updatePercent);
    percentPresets.forEach(button => button.addEventListener('click', () => {
      if (busy) return;
      percent.value = button.dataset.pdfPercent;
      updatePercent();
    }));
    cancel.addEventListener('click', () => {
      runId++;
      say('Cancelling after the current PDF page finishes.');
      cancel.disabled = true;
    });

    compress.addEventListener('click', async () => {
      if (!file || busy) return;
      const activeFile = file;
      const settings = { mode, amount: mode === 'size' ? sizeField.value : percent.value };
      const target = targetBytes(settings.mode, settings.amount, activeFile.size);
      if (target === null) {
        say('Choose a valid size between 0.1 and 1000 MB or a reduction from 1% to 95%.', true);
        return;
      }
      if (busy) return;
      busy = true;
      const thisRun = ++runId;
      updateReady();
      clearOutput();
      progress.hidden = false;
      cancel.hidden = false;
      cancel.disabled = false;
      meter.value = 0;
      say('Reading PDF pages…');
      try {
        const resultData = await compressPdf(activeFile, settings, info => {
          if (thisRun !== runId) return;
          const fraction = (info.attempt - 1 + info.page / info.pages) / info.totalAttempts;
          meter.value = Math.max(0, Math.min(100, Math.round(fraction * 100)));
          progressText.textContent = 'Pass ' + info.attempt + '/' + info.totalAttempts +
            ' · page ' + info.page + '/' + info.pages;
        }, () => thisRun !== runId);
        if (thisRun !== runId) return;
        meter.value = 100;
        progress.hidden = true;
        result.hidden = false;
        resultTitle.textContent = resultData.reached
          ? 'Your PDF is ready'
          : resultData.blob ? 'Smaller PDF ready · target not reached' : 'Could not reduce this PDF';
        originalSize.textContent = formatSize(activeFile.size);
        outputSize.textContent = formatSize(resultData.bytes);
        saved.textContent = resultData.saving.toFixed(1) + '%';
        bar.style.width = Math.min(100, resultData.bytes / activeFile.size * 100) + '%';
        if (resultData.original) {
          outcomeText.textContent = resultData.reached
            ? 'Already under your limit. Your original PDF is unchanged; text, links and forms are preserved.'
            : 'No smaller file was produced. Try a desktop compression tool or a less strict target.';
        } else {
          outcomeText.textContent = resultData.reached
            ? 'Target met. Pages were re-encoded as images, so text selection, links and forms are not retained.'
            : 'The smallest result is still above the requested target. Pages were re-encoded as images; text selection, links and forms are not retained.';
        }
        if (resultData.blob) {
          blobUrl = URL.createObjectURL(resultData.blob);
          download.href = blobUrl;
          download.download = resultData.original ? activeFile.name : makeOutputName(activeFile.name);
          download.hidden = false;
        } else {
          download.hidden = true;
        }
        say(resultData.reached ? 'Finished — the target was met.' : 'Finished — the target could not be guaranteed.');
      } catch (error) {
        if (thisRun === runId) say(error && error.message ? error.message : 'Could not compress this PDF.', true);
        progress.hidden = true;
      } finally {
        if (thisRun !== runId) say('Compression cancelled.');
        busy = false;
        cancel.hidden = true;
        updateReady();
      }
    });
    setMode('size');
    setTarget(10);
    updatePercent();
    updateReady();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MB, MAX_BYTES, MAX_PAGES, PROFILES, formatSize, targetBytes,
      reductionPercent, chooseStartingProfile, makeOutputName, canvasDimensions, outcome, checkPdf, compressPdf };
  }
})(typeof window !== 'undefined' ? window : {});
