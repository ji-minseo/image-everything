# Image Everything — Cloudflare Pages 독립 사이트 컷오버 런북
작성일: 2026-10-31
상태: **준비 문서** — 도메인/DNS/실제 배포/리디렉션/Search Console 변경 미실시

## 확정 제품 범위
- 이미지 편집, 이미지 압축, 이미지 형식 변환, PDF/영상, 사진 메타데이터.
- 개별 도구의 독립 URL과 한·영 대응 페이지 **전부 유지**.
- Every Tiny Tool의 이미지·미디어 관련 **기존 가이드 18편을 이관**.
- 화면 자(actual-size-ruler), 화면 자 정확도 가이드, 순수 목록 비교 도구/가이드는 **제외**. 구 사이트에 남긴다.
- 신규 브랜드가 자리를 잡을 때까지 구 사이트는 삭제하지 않는다.

## GitHub 작업 브랜치의 현재 사이트맵
- 영문 도구/홈 18 + 한국어 도구/홈 18 = 36 URL
- 이관 가이드 허브 1 + 가이드 상세 18 = 19 URL
- About / Privacy / Terms / Contact 4 URL
- **합계 59 URL**
- 신규 주소가 확정되기 전에는 `canonical`, `hreflang`, 사이트맵, 구조화 데이터에 기존 `image.everytinytool.com`이 그대로 나타난다. 컷오버 전 전체 재작성 필요.

## Cloudflare Pages 준비
> 기준: Cloudflare 공식 Static HTML / Pages Git integration 안내(2026년 10월 확인).

1. Cloudflare 대시보드 **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. `ji-minseo/image-everything` 저장소 연결. 운영 브랜치 `main`, 프리뷰는 작업 브랜치/PR 사용.
3. 이 저장소는 최상위 `index.html`과 각 `<slug>/index.html`을 직접 제공하는 **정적 HTML 프로젝트**. Framework preset 없음 / Root directory는 저장소 루트 / Build command는 `exit 0` (또는 빈 설정) / Build output은 루트 `.` 사용을 우선 확인. 실제 UI/빌드 설정에서 루트 경로 허용 여부를 프리뷰로 검증한다.
4. 프리뷰 URL을 생성한 뒤 `/`, `/compress-image/`, `/metadata-cleaner/`, `/guides/`, `/privacy/`의 **HTTP 상태 200**과 정적 asset 로드를 확인.
5. Cloudflare Pages는 PR **preview deployment**에 `X-Robots-Tag: noindex` 응답 헤더를 기본 부여하므로 응답 헤더에서 실제 확인한다. **프로덕션**에는 `noindex`가 없어야 한다. Pages 프로덕션 `*.pages.dev`가 공개 중복 사이트가 되지 않도록 새 독립 도메인과 canonical/리디렉션 전략을 검토한다.
6. 이미지·비디오·PDF·메타데이터 처리 기능과 압축 전후 비교, 다중 다운로드, 한국어 도구 동작을 모바일/데스크톱 브라우저에서 검증한다.
7. 외부 일러스트는 현재 CloudFront URL 사용. 이미지의 장기 접근성과 자체 호스팅 여부 확인 후 이관한다.

## 신규 도메인 확정 후 검색 메타데이터 치환
- [ ] 대상 도메인 예: `https://<새도메인>/` (아직 미선정)
- [ ] 59개 URL의 <link rel="canonical"> 새 도메인 기준 변경
- [ ] 기존 `hreflang` en/ko 대응 URL 및 JSON-LD `mainEntityOfPage` / 브랜드 정보 업데이트
- [ ] `robots.txt`의 Sitemap 주소, `sitemap.xml` 내 loc **59개 전부** 변경
- [ ] 내부 링크에 `everytinytool.com`을 잘못 참조한 곳이 없는지 확인(기존 다른 독립 서비스 링크는 목적에 따라 별도 검토)
- [ ] `noindex`, X-Robots-Tag, HTTP 코드, 리디렉션 체인, 모바일 도구 렌더링 확인
- [ ] 별도 Google Search Console 속성에서 새 도메인 검증 및 사이트맵 제출

## 이전 소스 URL별 301/308 계획
**주의:** 리디렉션 규칙은 해당 URL을 제공하는 *기존 호스트*에서 설정해야 한다. 새 Cloudflare Pages의 `_redirects`에 오래된 **다른 도메인**의 요청을 가로채는 규칙을 적는 것만으로는 기존 호스트 요청을 이전할 수 없다.

- `image.everytinytool.com/<slug>/` → `<새도메인>/<slug>/` (기능당 1:1, 한·영 모두)
- `everytinytool.com/metadata-inspector/` → `<새도메인>/metadata-inspector/`
- `everytinytool.com/metadata-cleaner/` → `<새도메인>/metadata-cleaner/`
- `everytinytool.com/quick-image-studio/` → 새 사이트에서 실제로 기능 대응하는 대표 상세 URL을 검토한 뒤 결정(무조건 홈으로 보내지 않음)
- `everytinytool.com/video-studio/` → `<새도메인>/video-compressor/` (동일한 기능인지 최종 검증 후)
- `everytinytool.com/guides/<이관 18 slug>/` → `<새도메인>/guides/<same slug>/` 1:1
- `everytinytool.com/actual-size-ruler/`와 목록 비교 도구/가이드는 **이전 없음**. 구 사이트에 남긴다.
- `everytinytool.com` **전체**에 Change of Address 요청하지 않는다. `image.everytinytool.com` 속성을 통째로 새 도메인으로 옮긴다면 해당 **서브도메인 속성**의 Change of Address 적용 가능 여부를 Google 안내에 따라 검토한다.
- 이전 대상 원본에 대해 기능, 콘텐츠 및 링크 확인 후 301/308을 적용하고 최소 1년 유지 계획을 세운다. 원본 제거와 리디렉션은 **새 도메인 정상 동작 검증 이후**.

## Search Console 후속 점검
- 1주: 200/404/301 상태, robots, live URL 검사, Google 선택 canonical
- 2주: 새 사이트맵 발견/색인된 URL 추이, 중복 canonical, 모바일 크롤링
- 4주: 개별 도구별 노출·클릭·검색어/가이드별 검색 유입, 외부 이미지 오류
- 8주: 여전히 제외된 페이지의 HTML/콘텐츠 중복·실제 사용성 재검토
- **새 도메인이나 Cloudflare 호스팅 자체로 색인 생성이 보장되지는 않는다.**

## 서비스 오픈 전 추가 차단점
- 메타데이터 제거 모바일 보고 오류(`Residual metadata indicator detected; output not offered.`)는 아직 실기기 해결 확인 전.
- 가이드 외부 CloudFront 이미지 16개가 18개 가이드에 포함되어 있음. 실제 HTTP 접근 및 원본 권리/이관 검증 전까지 자체 호스팅 완료라고 표시하지 않는다.
- 광고 동의/쿠키 동작(특히 GDPR/UK), 정책 페이지 문구와 실제 광고/분석 구성, 사용자 문의 이메일 도달 확인.
- 프리뷰/라이브 브라우저 QA를 하지 않은 상태에서 '사이트 배포 완료' 또는 '색인 완료'라고 발표하지 않는다.

### 참고
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
