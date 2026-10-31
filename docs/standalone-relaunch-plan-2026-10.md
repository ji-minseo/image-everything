# Image Everything 독립 리브랜딩 및 색인 재도전 계획
작성일: 2026-10-31
상태: **기획/검증 단계 — 실제 도메인 이전, 배포, 리디렉션, 색인 요청은 아직 하지 않음**

## 결정한 방향
- 독립 이미지·미디어 도구 서비스로 재출시한다. 운영용 브랜드명과 새 도메인은 확정 전까지 유지/미기재한다.
- 원본 엔진과 실제로 검증된 유틸리티는 최대한 재사용한다.
- 기존 Every Tiny Tool 허브와 다른 고유한 작업 흐름, 예시, 도움말을 제공한다.
- Cloudflare Pages 배포를 우선 검토하되, 프로덕션 연결과 DNS 변경은 후속 검토 후 수행한다.
- 재색인 목표는 기존 이력 은폐가 아니라 기능/콘텐츠/검색 신호의 실질적 개선이다.

## 코드에서 확인한 베이스라인
- 기존 독립 저장소: `ji-minseo/image-everything`
- 기존 주소: `https://image.everytinytool.com/`
- `sitemap.xml`에는 총 **36개 URL**(영어 18개, 한국어 18개)이 있다.
- 도구별 `index.html`은 이미 초기 HTML에 제목, 설명, 링크, 본문을 담는다. 따라서 '모든 페이지의 JS 빈 화면 문제'라고 단정하지 않는다.
- `robots.txt`는 크롤링을 허용하고 현재 서브도메인 사이트맵을 참조한다.
- 확인한 메타데이터 페이지: `/metadata-inspector/`, `/metadata-cleaner/` 및 `/ko/` 대응 페이지. 별도 `assets/metadata-workspace.js`를 사용한다.
- `ji-minseo/everytinytool`에도 `/metadata-inspector/`, `/metadata-cleaner/`가 있고 20개 가까운 가이드 경로가 사이트맵에 있다. 독립 Image Everything 저장소의 `/guides/index.html`은 아직 없다.
- 메타데이터 클리너는 최근 모바일 관련 JS 버전을 참조한다. **실기기 성공 테스트 여부는 미확인**이며 과거 'Residual metadata indicator detected; output not offered.' 문제를 완료 처리하지 않는다.
- 저장소 확인은 코드 중심이다. 실서비스 HTTP 상태, 성능 및 Search Console 속성 데이터는 아직 직접 검증되지 않았다.

## 작업 단계 / 완료 기준

### P0 — 실측 진단
- [ ] Search Console의 실제 색인/비색인 URL과 Google 선택 canonical, 라이브 HTML, 크롤링 날짜 확인.
- [ ] 현재 36개 URL의 응답 코드, canonical, `hreflang`, 모바일 본문, 색인 가능 여부를 자동 점검.
- [ ] 기존 Every Tiny Tool과 겹치는 도구·콘텐츠를 목록화하고 어느 쪽을 대표 URL로 삼을지 확정.
- [ ] 기능별 모바일 실기기 테스트: JPG/PNG/WebP/HEIC, 다중 파일, ZIP, 메타데이터 제거 재검증.
- [ ] 기존 유입 링크 및 조회수가 있는 URL 식별(이전 시 신호·사용자 손실 방지).

### P1 — 제품/브랜드 및 고유 콘텐츠
- [ ] 독립 브랜드 네비게이션, 통일된 파일 드롭존/파일 목록/결과 다운로드 UI.
- [ ] 제품 우선순위: Compress, Convert, Resize, Remove Background, Metadata Inspector/Cleaner.
- [ ] 각 도구에 실제 입력·출력 예시, 포맷 한계, 처리 방식, 보안 주의점, 자주 발생하는 오류 해결을 **서로 다르게** 작성.
- [ ] 가이드 허브를 이미지·메타데이터·파일 공유 중심으로 새로 구성. 본사이트 기존 글의 기계적 복제 금지.
- [ ] 메타데이터 제거 결과를 감지 실패 시에도 안전하고 정직하게 안내하고, 처리 성공이 검증되지 않은 파일은 '완전히 깨끗함'이라고 표시하지 않기.

### P2 — 새 도메인/Cloudflare Pages 미리보기
- [ ] 기존 저장소에서 별도 프리뷰 프로젝트를 만들고 메인 서비스와 결제 서비스의 운영설정을 건드리지 않기.
- [ ] 새 도메인 확정 이후 canonical, `hreflang`, sitemap, robots, OG, 내부 링크 등을 새 URL 기준으로 일괄 수정.
- [ ] 배포 결과의 초기 HTML, 모바일 UI, 파일 기능, 접근성, 오류 콘솔과 캐시 확인.
- [ ] 프리뷰 URL의 중복 색인 방지. 프로덕션에서는 모든 테스트용 `noindex`/차단 규칙 해제 확인.

### P3 — 이전 및 재색인
- [ ] 기존 `image.everytinytool.com` URL과 새 사이트 URL의 1:1 이전표를 만든다.
- [ ] **실제로 이동한 URL에 한해서** 관련성이 있는 새 URL로 301/308 영구 리디렉션을 적용한다. 폐기 또는 성격이 다른 URL은 무조건 새 홈으로 보내지 않는다.
- [ ] `everytinytool.com` **전체**에 대한 Search Console 주소 변경 요청은 하지 않는다. 이 프로젝트는 서브도메인 일부 서비스만의 재출시다.
- [ ] 기존 허브의 겹치는 도구·가이드의 링크와 canonical 등 중복 신호를 정리한다.
- [ ] 새 도메인 Search Console 소유권 확인, 사이트맵 제출, 대표 페이지별 URL 검사 요청.
- [ ] 1/2/4/8주에 실제 색인 수·노출·클릭·Google 선택 canonical·오류율 측정. 색인은 보장되지 않는다.

## 차단 조건 / 하지 않을 일
- 새 도메인 구매, DNS 연결, 운영 배포, 301 리디렉션, 구 사이트 삭제는 승인된 컷오버 계획 이전에 하지 않는다.
- 기존 Every Tiny Tool이나 Pick a Card의 운영 코드를 이번 브랜치에서 수정하지 않는다.
- 과거 사이트와의 관계를 숨기려고 로봇·canonical·리디렉션을 조작하지 않는다.
- '로컬 처리', '메타데이터 완전 제거', '모든 모바일 지원' 등의 문구는 실제 테스트한 범위 내에서만 사용한다.

## 참고
- Google Search Central: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Google canonicalization: https://developers.google.com/search/docs/crawling-indexing/canonicalization
- Google JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
