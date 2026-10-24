"""SEO contracts and defect injection tests, independent of live services."""
import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('seo', ROOT / 'scripts/seo_audit.py')
seo = importlib.util.module_from_spec(spec); spec.loader.exec_module(seo)


class SeoTest(unittest.TestCase):
    def test_repository_contracts(self):
        result = seo.audit()
        self.assertEqual(result['errors'], [])
        self.assertEqual(result['warnings'], [])

    def mutate(self, path, transform):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for source in ROOT.rglob('*'):
                rel = source.relative_to(ROOT)
                if any(p in ('work', '.git', 'node_modules', '__pycache__') for p in rel.parts): continue
                if source.is_file():
                    target = root / rel; target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(source, target)
            file = root / path; file.write_text(transform(file.read_text()))
            return [e['issue'] for e in seo.audit(root)['errors']]

    def test_detects_missing_canonical_tool(self):
        self.assertIn('canonical page missing from sitemap', self.mutate('sitemap.xml', lambda s:s.replace('  <url><loc>https://image.everytinytool.com/metadata-inspector/</loc></url>\n','')))

    def test_detects_redirect_in_sitemap(self):
        self.assertIn('redirect in sitemap', self.mutate('sitemap.xml', lambda s:s.replace('</urlset>','<url><loc>https://image.everytinytool.com/image-info/</loc></url></urlset>')))

    def test_detects_missing_hreflang_return(self):
        self.assertIn('nonreciprocal hreflang', self.mutate('pdf-compressor/index.html', lambda s:s.replace('<link rel="alternate" hreflang="ko" href="https://image.everytinytool.com/ko/pdf-compressor/">','')))

    def test_detects_reverse_canonical_conflict(self):
        self.assertIn('expected self-canonical', self.mutate('remove-background/index.html', lambda s:s.replace('rel="canonical" href="https://image.', 'rel="canonical" href="https://')))

    def test_detects_schema_identity_conflict(self):
        self.assertIn('schema canonical mismatch', self.mutate('pdf-compressor/index.html', lambda s:s.replace('"url":"https://image.', '"url":"https://')))

    def test_detects_indexing_blocks(self):
        self.assertIn('noindex page', self.mutate('pdf-compressor/index.html', lambda s:s.replace('</head>','<meta name="robots" content="noindex"></head>')))
        self.assertIn('robots blocks page', self.mutate('robots.txt', lambda s:s.replace('Allow: /','Disallow: /')))


if __name__ == '__main__': unittest.main()
