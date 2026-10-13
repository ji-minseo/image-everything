# Image Everything

Free browser-based image and PDF utilities.

Site: https://image.everytinytool.com/

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
- If the original already meets an enabled size target, or if reserialization doesn't save any bytes, the original PDF is kept.

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
