# Image Everything

Free browser-based image and PDF utilities.

Site: https://image.everytinytool.com/

## PDF Compressor

URL: https://image.everytinytool.com/pdf-compressor/

The PDF tool uses **gentle, structure-only optimization** rather than aggressive photo compression or turning document pages into images.

- Target presets: **under 100 MB, 50 MB or 10 MB**, plus a custom limit (0.1–1000 MB).
- The target is **best effort** and is never advertised as met unless the generated PDF is actually below it. Decimal megabytes: 10 MB = 10,000,000 bytes.
- Uses browser-based **pdf-lib 1.17.1** to reserialize an existing PDF with object streams. Does not run PDF.js, rasterize pages, downsample images or change JPEG quality.
- Most normal PDF text and images remain as PDF objects. Rewriting can affect specialized annotations, forms and **digital signatures**; do not use rewritten files for signed official documents without independent validation.
- If the original already meets a size goal, or rewriting increases or fails to decrease size, the tool returns the **original** unchanged.
- Cannot handle encrypted/password-protected PDFs; browser input size guardrail: **180 MB**.
- PDF files remain on the visitor's device; only the browser script itself is loaded from a third-party CDN.
- The page shares the exact **1080px Image Everything shell and full-width panel** with the other image utilities, using the global styles for typography and page layout.

### Testing

```sh
node --check assets/pdf-compressor.js
node --test tests/pdf-compressor.test.js
```

GitHub Actions is configured to run the tests when the PDF optimizer changes. The tests verify the engine and UI contract using pdf-lib mocks; **browser testing with real PDFs on desktop and mobile is still required**.

Other image utilities also process files locally where stated.
