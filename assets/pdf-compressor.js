/* PDF Compressor · Image Everything
   Gentle PDF structure optimization only. No rasterization or JPEG rewriting.
   Uses pdf-lib to reserialize an existing PDF with object streams.
   Rewriting PDFs may affect signatures or advanced features. Always review.
*/
(function (root) {
  'use strict';

  const MB = 1000000;
  const MAX_BYTES = 180 * MB;
  const PRESET_MB = Object.freeze([100, 50, 10]);

  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    if (bytes < 1000) return Math.round(bytes) + ' B';
    if (bytes < MB) return (bytes / 1000).toFixed(1) + ' KB';
    if (bytes < 1000 * MB) return (bytes / MB).toFixed(2) + ' MB';
    return (bytes / (1000 * MB)).toFixed(2) + ' GB';
  }
  function targetBytes(sizeMb) {
    const value = Number(sizeMb);
    if (sizeMb === '' || sizeMb === null || !Number.isFinite(value) ||
        value < .1 || value > 1000) return null;
    // "Under 10 MB" means strictly below 10,000,000 bytes.
    return Math.max(1, Math.ceil(value * MB) - 1);
  }
  function reductionPercent(input, output) {
    if (!(input > 0) || !Number.isFinite(output) || output < 0) return 0;
    return Math.max(0, Math.round((1 - output / input) * 1000) / 10);
  }
  function outputName(filename) {
    const base = String(filename || 'document').replace(/\.pdf$/i, '').trim() || 'document';
    return base + '-optimized.pdf';
  }
  function assessResult(originalBytes, resultBytes, limitBytes) {
    return {
      smaller: resultBytes < originalBytes,
      reached: resultBytes <= limitBytes,
      saving: reductionPercent(originalBytes, resultBytes)
    };
  }
  async function validateFile(file) {
    if (!file) throw new Error('Choose a PDF file first.');
    if (file.size <= 0) throw new Error('This PDF file is empty.');
    if (file.size > MAX_BYTES) throw new Error('This browser tool accepts PDFs up to 180 MB.');
    const headerBytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const header = new TextDecoder('ascii').decode(headerBytes);
    if (!header.includes('%PDF-')) throw new Error('This does not look like a PDF file.');
  }

  async function optimizePdf(file, sizeMb, onStatus) {
    await validateFile(file);
    const limit = targetBytes(sizeMb);
    if (limit === null) throw new Error('Enter a size limit between 0.1 and 1000 MB.');

    // When already below the limit, return the untouched PDF. This also
    // preserves signatures/forms/annotations exactly, unlike reserialization.
    if (file.size <= limit) {
      return { blob: file, bytes: file.size, original: true,
        reached: true, saving: 0, reason: 'already-small' };
    }
    if (!root.PDFLib || !root.PDFLib.PDFDocument) {
      throw new Error('The PDF optimizer did not load. Check your connection and try again.');
    }
    const announce = typeof onStatus === 'function' ? onStatus : () => {};
    let pdf;
    try {
      announce('Reading PDF structure…');
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Never ignore encryption or update metadata while merely optimizing.
      pdf = await root.PDFLib.PDFDocument.load(bytes, {
        ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true
      });
      announce('Repacking PDF objects without converting pages to images…');
      const saved = await pdf.save({
        useObjectStreams: true,
        updateFieldAppearances: false,
        addDefaultPage: false,
        objectsPerTick: 50
      });
      if (!saved || !saved.length) throw new Error('The PDF optimizer returned an empty file.');
      if (saved.length >= file.size) {
        // Never replace an input with a bigger or differently encoded file
        // when no size reduction is achieved.
        return { blob: file, bytes: file.size, original: true,
          reached: false, saving: 0, reason: 'not-smaller' };
      }
      const stats = assessResult(file.size, saved.length, limit);
      return {
        blob: new Blob([saved], { type: 'application/pdf' }),
        bytes: saved.length, original: false, reached: stats.reached,
        saving: stats.saving, reason: stats.reached ? 'optimized' : 'partial'
      };
    } catch (error) {
      if (error && (error.name === 'EncryptedPDFError' || /encrypt|password/i.test(error.message || ''))) {
        throw new Error('Password-protected or encrypted PDFs are not supported.');
      }
      throw error;
    }
  }

  function init() {
    const $ = id => document.getElementById(id);
    if (!$('pdf-compressor')) return;
    const dropzone = $('pdf-dropzone');
    const input = $('pdf-file');
    const choose = $('pdf-choose');
    const selected = $('pdf-file-selected');
    const filename = $('pdf-filename');
    const fileSize = $('pdf-original-label');
    const remove = $('pdf-remove');
    const presets = [...document.querySelectorAll('[data-pdf-size]')];
    const limitField = $('pdf-limit');
    const runButton = $('pdf-compress');
    const status = $('pdf-status');
    const progress = $('pdf-progress');
    const result = $('pdf-result');
    const originalLabel = $('pdf-input-size');
    const outputLabel = $('pdf-output-size');
    const savedLabel = $('pdf-saved');
    const outputCaption = $('pdf-result-caption');
    const resultTitle = $('pdf-result-title');
    const resultNote = $('pdf-outcome');
    const bar = $('pdf-result-bar');
    const download = $('pdf-download');
    let file = null;
    let busy = false;
    let downloadUrl = null;

    function message(text, error = false) {
      status.textContent = text;
      status.dataset.error = String(error);
    }
    function clearResult() {
      result.hidden = true;
      download.hidden = true;
      download.removeAttribute('href');
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = null;
    }
    function updateControls() {
      runButton.disabled = !file || busy;
      choose.disabled = busy;
      remove.disabled = busy;
      input.disabled = busy;
      limitField.disabled = busy;
      presets.forEach(button => { button.disabled = busy; });
    }
    function setFile(next) {
      if (busy) return;
      clearResult();
      file = next || null;
      input.value = '';
      selected.hidden = !file;
      if (file) {
        filename.textContent = file.name || 'document.pdf';
        fileSize.textContent = formatSize(file.size);
        message('Your file is ready. Choose a size goal and optimize.');
      } else {
        message('Files are processed locally in your browser. Nothing is uploaded.');
      }
      updateControls();
    }
    function selectLimit(value) {
      if (busy) return;
      limitField.value = String(value);
      presets.forEach(button => button.classList.toggle('active', Number(button.dataset.pdfSize) === Number(value)));
      clearResult();
    }

    choose.addEventListener('click', () => input.click());
    input.addEventListener('change', () => setFile(input.files && input.files[0]));
    remove.addEventListener('click', () => setFile(null));
    ['dragover', 'dragenter'].forEach(eventName => dropzone.addEventListener(eventName, event => {
      event.preventDefault();
      if (!busy) dropzone.classList.add('dragover');
    }));
    ['drop', 'dragleave'].forEach(eventName => dropzone.addEventListener(eventName, event => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
      if (eventName === 'drop' && !busy && event.dataTransfer && event.dataTransfer.files.length) {
        setFile(event.dataTransfer.files[0]);
      }
    }));
    presets.forEach(button => button.addEventListener('click', () => selectLimit(button.dataset.pdfSize)));
    limitField.addEventListener('input', () => selectLimit(limitField.value));

    runButton.addEventListener('click', async () => {
      if (!file || busy) return;
      const limit = targetBytes(limitField.value);
      if (limit === null) {
        message('Enter a size limit between 0.1 and 1000 MB.', true);
        return;
      }
      busy = true;
      updateControls();
      clearResult();
      progress.hidden = false;
      message('Optimizing PDF…');
      // Yield a frame so the busy state is visible before heavy PDF parsing.
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      try {
        const outcome = await optimizePdf(file, limitField.value, text => message(text));
        result.hidden = false;
        originalLabel.textContent = formatSize(file.size);
        outputLabel.textContent = formatSize(outcome.bytes);
        savedLabel.textContent = outcome.saving.toFixed(1) + '%';
        outputCaption.textContent = outcome.original ? 'Original file' : 'Optimized PDF';
        bar.style.width = Math.min(100, outcome.bytes / file.size * 100) + '%';
        if (outcome.reason === 'already-small') {
          resultTitle.textContent = 'Already under your limit';
          resultNote.textContent = 'The original PDF meets your target, so it was left unchanged.';
        } else if (outcome.reason === 'not-smaller') {
          resultTitle.textContent = 'No smaller PDF available';
          resultNote.textContent = 'The PDF is already compact enough that structure optimization did not help. Your original file was kept.';
        } else if (outcome.reached) {
          resultTitle.textContent = 'Target reached';
          resultNote.textContent = 'The PDF was repacked without turning pages into images. Please verify forms, links and any digital signatures before use.';
        } else {
          resultTitle.textContent = 'PDF optimized · target not reached';
          resultNote.textContent = 'We saved some space, but did not reach your requested limit. No images were downsampled and no pages were rasterized.';
        }
        downloadUrl = URL.createObjectURL(outcome.blob);
        download.href = downloadUrl;
        download.download = outcome.original ? file.name : outputName(file.name);
        download.hidden = false;
        message(outcome.reached ? 'Ready — the selected limit is met.' :
          'Finished — the selected limit was not reached.');
      } catch (error) {
        message(error && error.message ? error.message : 'This PDF could not be optimized.', true);
      } finally {
        progress.hidden = true;
        busy = false;
        updateControls();
      }
    });
    selectLimit(10);
    updateControls();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MB, MAX_BYTES, PRESET_MB, formatSize, targetBytes,
      reductionPercent, outputName, assessResult, validateFile, optimizePdf };
  }
})(typeof window !== 'undefined' ? window : {});
