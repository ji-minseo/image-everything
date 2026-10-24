#!/usr/bin/env python3
"""Repository SEO contracts; does not prove production HTTP or Google indexing."""
from collections import Counter, deque
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

ORIGIN = 'https://image.everytinytool.com'
ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.title = ''; self.h1 = []; self.meta = {}; self.canonical = []
        self.alternates = {}; self.links = []; self.assets = []; self.schemas = []
        self.text = []; self.refresh = None; self.schema_errors = []
        self._title = False; self._h1 = False; self._script = None; self._skip = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self._title = True
        if tag == 'h1': self._h1 = True; self.h1.append('')
        if tag in ('script', 'style'): self._skip += 1
        if tag == 'meta':
            self.meta.setdefault(a.get('name', '').lower(), []).append(a.get('content', ''))
            if a.get('http-equiv', '').lower() == 'refresh': self.refresh = a.get('content')
        if tag == 'link':
            rel = a.get('rel', '').lower().split()
            if 'canonical' in rel: self.canonical.append(a.get('href', ''))
            if 'alternate' in rel and a.get('hreflang'): self.alternates[a['hreflang']] = a.get('href')
            if 'stylesheet' in rel: self.assets.append(a.get('href', ''))
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag in ('script', 'img') and a.get('src'): self.assets.append(a['src'])
        if tag == 'script' and a.get('type') == 'application/ld+json': self._script = ''

    def handle_data(self, data):
        if self._title: self.title += data
        if self._h1: self.h1[-1] += data
        if self._script is not None: self._script += data
        if not self._skip and data.strip(): self.text.append(data.strip())

    def handle_endtag(self, tag):
        if tag == 'title': self._title = False
        if tag == 'h1': self._h1 = False
        if tag == 'script' and self._script is not None:
            try: self.schemas.append(json.loads(self._script))
            except ValueError as exc: self.schema_errors.append(str(exc))
            self._script = None
        if tag in ('script', 'style'): self._skip = max(0, self._skip - 1)


def nodes(value):
    if isinstance(value, list):
        for child in value: yield from nodes(child)
    elif isinstance(value, dict):
        yield value
        if '@graph' in value: yield from nodes(value['@graph'])


def audit(root=ROOT):
    pages = {}
    for file in sorted(root.rglob('index.html')):
        if any(p in ('work', '.git', 'node_modules', '__pycache__') for p in file.relative_to(root).parts): continue
        rel = file.parent.relative_to(root).as_posix()
        pages[ORIGIN + ('/' if rel == '.' else '/' + rel + '/')] = Page(file.read_text())
    sitemap = [e.text for e in ET.parse(root / 'sitemap.xml').iter() if e.tag.endswith('}loc')]
    robots_text = (root / 'robots.txt').read_text()
    robots = RobotFileParser(); robots.parse(robots_text.splitlines())
    errors = []; warnings = []
    def error(url, issue): errors.append({'url': url, 'issue': issue})
    if ORIGIN + '/sitemap.xml' not in (robots.site_maps() or []): error(ORIGIN, 'missing robots sitemap declaration')
    if len(sitemap) != len(set(sitemap)): error(ORIGIN, 'duplicate sitemap URL')
    for url, page in pages.items():
        if len(page.canonical) != 1: error(url, 'expected one canonical')
        canonical = page.canonical[0] if page.canonical else None
        if not page.title.strip(): error(url, 'missing title')
        if not robots.can_fetch('Googlebot', url): error(url, 'robots blocks page')
        if 'noindex' in ','.join(page.meta.get('robots', []) + page.meta.get('googlebot', [])).lower(): error(url, 'noindex page')
        if page.refresh is not None:
            if canonical not in pages or pages[canonical].refresh is not None: error(url, 'invalid redirect target')
            if url in sitemap: error(url, 'redirect in sitemap')
            continue
        if canonical != url: error(url, 'expected self-canonical')
        if url not in sitemap: error(url, 'canonical page missing from sitemap')
        if len(page.h1) != 1: error(url, 'expected one H1')
        if len(page.meta.get('description', [])) != 1 or not page.meta['description'][0].strip(): error(url, 'expected one description')
        for issue in page.schema_errors: error(url, 'invalid JSON-LD: ' + issue)
        for schema in page.schemas:
            for node in nodes(schema):
                if node.get('@type') in ('WebApplication', 'SoftwareApplication', 'WebPage') and node.get('url') != canonical: error(url, 'schema canonical mismatch')
        for lang, target in page.alternates.items():
            other = pages.get(target)
            if other is None or other.canonical != [target] or other.alternates != page.alternates: error(url, 'nonreciprocal hreflang')
        # Every localized page has an English equivalent in this repository.
        if '/ko/' in url:
            expected = {'en': url.replace('/ko/', '/', 1), 'ko': url}
            if page.alternates != expected: error(url, 'invalid language pair')
        for href in page.links + page.assets:
            dest = urlsplit(urljoin(url, href))
            if dest.netloc != urlsplit(ORIGIN).netloc: continue
            if not (root / dest.path.lstrip('/')).exists(): error(url, 'missing link/resource: ' + dest.path)
            if href in page.assets and not robots.can_fetch('Googlebot', dest.geturl()): error(url, 'robots blocks resource')
    for url in sitemap:
        if url not in pages: error(url, 'sitemap URL missing locally')
        elif pages[url].canonical != [url]: error(url, 'sitemap canonical mismatch')
    for field in ('title', 'description'):
        values = [p.title if field == 'title' else str(p.meta.get(field)) for p in pages.values() if p.refresh is None]
        for value, count in Counter(values).items():
            if count > 1: warnings.append({'issue': 'duplicate ' + field, 'value': value, 'count': count})
    reached = set(); queue = deque([ORIGIN + '/'])
    while queue:
        url = queue.popleft()
        if url in reached or url not in pages: continue
        reached.add(url)
        queue.extend(urljoin(url, link).split('#')[0].split('?')[0] for link in pages[url].links)
    for url, p in pages.items():
        if p.refresh is None and url not in reached: error(url, 'not reachable through static links')
    return {'scope': 'repository only', 'page_count': len(pages), 'sitemap_count': len(sitemap), 'reachable_count': len(reached), 'errors': errors, 'warnings': warnings,
            'pages': [{'url': u, 'title': p.title, 'description': p.meta.get('description'), 'h1': p.h1, 'canonical': p.canonical, 'redirect': p.refresh, 'alternates': p.alternates, 'words': len(' '.join(p.text).split()), 'schema_types': [n.get('@type') for s in p.schemas for n in nodes(s)]} for u,p in pages.items()]}


if __name__ == '__main__':
    result = audit()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(bool(result['errors']))
