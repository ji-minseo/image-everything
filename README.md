# Image Everything

Free browser-based image and PDF utilities.

Site: https://image.everytinytool.com/

## Remove Background (AI)

URL: https://image.everytinytool.com/remove-background/

Free browser-based automatic foreground extraction for single JPG, PNG or WebP photos. Uses the Apache-2.0 licensed onnx-community/ormbg-ONNX model and Transformers.js 3.8.1 (Apache-2.0). No AGPL background-removal library is included.

- The selected photo is processed locally with RawImage.fromBlob(file) and a WASM AI model. The app does not upload image contents to a server.
- On first use, a ~44 MB quantized AI model and JavaScript libraries are downloaded from third-party hosts; loading can be slow and browsers may cache the files.
- Model: onnx-community/ormbg-ONNX; dtype q8; CPU/WASM inference. Library CDN: https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1.
- JPG/PNG/WebP; maximum file size 12 MB; maximum decoded dimensions 16 megapixels. Some phones and older browsers may run out of memory.
- Output: before/after previews, transparent PNG download or white/black/custom color JPG export. Automatic hair and translucent object edges may be imperfect.
- Accessible mouse/keyboard dropzone, progress messages, and one-inference-at-a-time controls.

References:
- https://huggingface.co/onnx-community/ormbg-ONNX
- https://huggingface.co/docs/transformers.js/v3.8.1/en/index

Testing commands:
    node --check assets/background-remover.js
    node --test tests/background-remover.test.js

GitHub Actions runs the regression tests on changes. Tests simulate the AI model and UI events; they do NOT measure real background removal quality or guarantee that model downloads work on every browser. Real browser smoke tests are still needed.

## PDF Compressor

URL: https://image.everytinytool.com/pdf-compressor/

### Quality first

- **Quality 80%** is the default slider, like the other image compressors. The browser JPEG encoder accepts the selected quality between **65% and 100%**.
- The slider selectively recompresses *supported RGB JPEG images embedded in the PDF*. It does not rasterize PDF pages, change page dimensions, downscale pixels, re-encode PNGs or convert selectable text and vector graphics into images.
- JPEG objects with soft masks, special color management, unusual decoding or extra metadata are skipped to avoid breaking the document. **Quality does not affect every PDF**; when there are no compatible JPEGs, the tool only tries internal PDF-structure optimization.
- Only image objects that actually become smaller by at least ~2% are replaced. Quality 100% does not recompress any JPEG images.
- Existing text remains as text objects, but rewriting PDFs can affect annotations, forms, security settings and **digital signatures**. Verify every exported PDF before sharing.

### Optional size goals

- **Target file size is disabled by default.** Toggle it on to choose **under 100 MB / 50 MB / 10 MB** or enter a custom MB limit.
- The target is best effort: no additional image downsampling or automatic quality degradation is applied to force the goal. The output reports measured bytes and whether the optional target was met.
- Under means strictly below a decimal MB threshold (10 MB = 10,000,000 bytes).
- The Quality setting always runs even when the original PDF is already below an enabled size goal. If processing doesn't save bytes, the original is returned unchanged; an already-met size goal is still correctly reported.

### Technical notes

- Processes files locally in the browser with **pdf-lib 1.17.1** and browser JPEG encoding; PDF.js and full-page rasterization are not used.
- Password-protected/encrypted PDFs are unsupported.
- Input limit: 180 MB. Complex PDFs or large images can exceed device memory.
- The page uses the same **1080px shell**, standard utility panel and responsive form components as the other Image Everything pages.
- Third-party CDN resources are loaded for JavaScript, but no selected PDF bytes are uploaded.

### Tests

```sh
node --check assets/pdf-compressor.js
node --test tests/pdf-compressor.test.js
```

GitHub Actions is configured to run tests on relevant source changes. Tests cover the optional goal, safe JPEG filters, image quality encoding settings and failure handling using mocks. **A real browser and real-PDF render comparison are still necessary before treating all document types as verified.**
