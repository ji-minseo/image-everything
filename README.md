# Image Everything

Free browser-based image and PDF utilities.

Site: https://image.everytinytool.com/

## PDF Compressor

URL: https://image.everytinytool.com/pdf-compressor/

- Choose a **percentage reduction goal** (10%–90%; quick presets for 20%, 40%, 60% and 80%).
- Or choose **under 100 MB, 50 MB, 10 MB, 5 MB, 1 MB** or enter a custom size limit.
- Strict limit comparisons use decimal megabytes: 10 MB = 10,000,000 bytes.
- The tool reports the original and result sizes and explicitly warns when a target is not reached.
- For files already under the chosen size threshold, the unchanged original is returned.
- To shrink larger PDFs, the tool uses browser-only **PDF.js 3.11.174 + pdf-lib 1.17.1**, rendering PDF pages to JPEG and rebuilding a PDF. The process **does not preserve searchable text, vector fidelity, annotations, links, bookmarks or forms**. This is not a lossless PDF optimizer.
- Browser-oriented guardrails: 180 MB input limit, 120 page limit, capped canvas pixel dimensions, a cancel button and per-page progress.
- No PDF bytes are uploaded to our server. Third-party JavaScript libraries are downloaded to the browser.
- Very large, complex or encrypted PDFs may fail due to browser limitations. Review downloaded output for readability and completeness.

### Testing

```sh
node --check assets/pdf-compressor.js
node --test tests/pdf-compressor.test.js
```

GitHub Actions runs the tests for changes to the PDF compressor. Tests mock PDF.js and pdf-lib to validate logic and workflow controls; they are **not** a substitute for browser testing with real PDFs on mobile and desktop.

Other image utilities also run locally in the browser where stated.
