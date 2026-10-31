# Image Everything 독립 리브랜딩 및 색인 재도전 계획
작성일: 2026-10-31
상태: **기획/검증 단계 — 실제 도메인 이전, 배포, 리디렉션, 색인 요청은 아직 하지 않음**

## 결정한 방향
- 독립 이미지·미디어 도구 서비스로 재출시한다. 운영용 브랜드명과 새 도메인은 확정 전까지 유지/미기재한다.
- 원본 엔진과 실제로 검증된 유틸리티는 최대한 재사용한다.
- **Image Everything의 기존 도구·내용·디자인 자산은 모두 보존한다.** 기능 삭제 또는 가이드 축소를 하지 않는다. 개선은 추가/수정으로 한다.
- **Every Tiny Tool의 겹치는 이미지·PDF·영상·메타데이터 도구와 관련 가이드는 Image Everything으로 모두 이관한다.** Image Everything이 해당 콘텐츠의 유일한 운영 중심이 된다.
- 콘텐츠 이관 완료·기능 검증·새 도메인 활성화 후 Every Tiny Tool에서 이관 대상 페이지/도구를 제거하고, URL별 적절한 301/308 연결을 적용한다. 기존 Every Tiny Tool의 범용·텍스트 도구까지 무조건 제거하지 않는다.
- Cloudflare Pages 배포를 우선 검토하되, 프로덕션 연결과 DNS 변경은 후속 검토 후 수행한다.
- 재색인 목표는 기존 이력 은폐가 아니라 기능/콘텐츠/검색 신호의 실질적 개선이다.

## 코드에서 확인한 베이스라인
- 기존 독립 저장소: `ji-minseo/image-everything`
- 기존 주소: `https://image.everytinytool.com/`
- `sitemap.xml`에는 총 **36개 URL**(영어 18개, 한국어 18개)이 있다.
- 도구별 `index.html`은 이미 초기 HTML에 제목, 설명, 링크, 본문을 담는다. 따라서 '모든 페이지의 JS 빈 화면 문제'라고 단정하지 않는다.
- `robots.txt`는 크롤링을 허용하고 현재 서브도메인 사이트맵을 참조한다.
- 확인한 메타데이터 페이지: `/metadata-inspector/`, `/metadata-cleaner/` 및 `/ko/` 대응 페이지. 별도 `assets/metadata-workspace.js`를 사용한다.
- `ji-minseo/everytinytool`에도 `/metadata-inspector/`, `/metadata-cleaner/`가 있고 **20개 가이드 상세 페이지**가 사이트맵에 있다. 독립 Image Everything 저장소의 `/guides/index.html`은 아직 없다.
- Every Tiny Tool의 관련 도구 후보: `/quick-image-studio/`, `/video-studio/`, `/metadata-inspector/`, `/metadata-cleaner/`, 메인 화면의 내장 이미지·PDF·영상·메타데이터 패널. `actual-size-ruler`는 이미지/출력 작업 관련성이 있어 이관 여부 검토.
- 일반 텍스트 유틸리티인 `/list-comparer/`, `/word-counter/`, `/workspace/`는 Image Everything으로 **무조건 옮기지 않는다**. 해당 기능의 유지/폐기 판단은 별도 범위.
- 메타데이터 클리너는 최근 모바일 관련 JS 버전을 참조한다. **실기기 성공 테스트 여부는 미확인**이며 과거 'Residual metadata indicator detected; output not offered.' 문제를 완료 처리하지 않는다.
- 저장소 확인은 코드 중심이다. 실서비스 HTTP 상태, 성능 및 Search Console 속성 데이터는 아직 직접 검증되지 않았다.

## 작업 단계 / 완료 기준

### P0 — 실측 진단
- [ ] Search Console의 실제 색인/비색인 URL과 Google 선택 canonical, 라이브 HTML, 크롤링 날짜 확인.
- [ ] 현재 36개 URL의 응답 코드, canonical, `hreflang`, 모바일 본문, 색인 가능 여부를 자동 점검.
- [ ] 기존 Every Tiny Tool과 겹치는 도구·콘텐츠를 전체 목록화한다. **이미지·PDF·영상·메타데이터 관련 콘텐츠의 최종 대표 서비스는 Image Everything으로 이미 확정**했다.
- [ ] 이미지 저장소와 허브의 코드 및 디자인에서 새 기능 누락이 없도록 콘텐츠/기능 1:1 대조표를 작성한다.
- [ ] 기능별 모바일 실기기 테스트: JPG/PNG/WebP/HEIC, 다중 파일, ZIP, 메타데이터 제거 재검증.
- [ ] 기존 유입 링크 및 조회수가 있는 URL 식별(이전 시 신호·사용자 손실 방지).

### P1 — 제품/브랜드 및 고유 콘텐츠
- [ ] 독립 브랜드 네비게이션, 통일된 파일 드롭존/파일 목록/결과 다운로드 UI.
- [ ] 제품 우선순위: Compress, Convert, Resize, Remove Background, Metadata Inspector/Cleaner.
- [ ] 각 도구에 실제 입력·출력 예시, 포맷 한계, 처리 방식, 보안 주의점, 자주 발생하는 오류 해결을 **서로 다르게** 작성.
- [ ] **Every Tiny Tool의 기존 이미지·PDF·영상·메타데이터 관련 가이드 전문·이미지·예시·표·FAQ를 Image Everything으로 이관한다.** 기존 자료를 삭제/요약하지 않고 필요 시 출처·문맥을 정리하며 보강한다.
- [ ] 기존 Image Everything의 영어·한국어 페이지 및 모든 도구를 유지하고 통일된 디자인으로 개선한다.
- [ ] 이미지 처리·미디어 관련 가이드 허브를 신규 제작하고 이미 존재하는 글을 누락 없이 연결한다.
- [ ] 예외: `/guides/compare-two-lists-differences/`는 순수 텍스트 도구 가이드로 분류하여 기존 사이트에 남기는 것이 기본; `/guides/screen-ruler-accuracy-calibration/`는 실제 기능 대응 여부 확인 후 정한다.
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
- [ ] **Image Everything으로 이관된 모든 콘텐츠가 새 사이트에서 실제 작동하는지 검증한 다음** Every Tiny Tool의 해당 본문·도구·가이드 페이지를 제거한다. 해당 이전 URL은 가급적 관련 새 상세 URL로 301/308 처리한다.
- [ ] Every Tiny Tool 허브의 이관 대상 링크/도구 탭, 사이트맵, 내비게이션, 내부 링크 및 canonical을 정리한다.
- [ ] 존재하지 않는 대응 페이지로 리디렉션하지 않으며, 동일한 기능/가이드는 운영 사이트 2개에 장기간 중복 노출하지 않는다.
- [ ] 새 도메인 Search Console 소유권 확인, 사이트맵 제출, 대표 페이지별 URL 검사 요청.
- [ ] 1/2/4/8주에 실제 색인 수·노출·클릭·Google 선택 canonical·오류율 측정. 색인은 보장되지 않는다.

## 콘텐츠 소유권 및 이관 목록 (2026-10-31 코드의 사이트맵 기준)

**절대원칙**: 현재 Image Everything의 36개 URL(영문 18개·한국어 18개)과 모든 기능은 보존. 모든 중복 콘텐츠는 Image Everything이 최종 소유. 기존 자료는 누락/삭제하지 않고 이관 및 보강한다.

### Every Tiny Tool → Image Everything : 도구
- `/quick-image-studio/` 및 메인에 내장된 이미지 도구 (압축/리사이즈/자르기/회전/변환 등) → 기존 Image Everything의 대응 기능에 **빠진 기능과 개선된 UI를 병합**; 동작/텍스트/설정 검증
- `/video-studio/` 및 영상 패널 → 독립 비디오 도구에 기능 병합
- 메인 PDF 패널 → 독립 PDF 도구에 기능 병합
- `/metadata-inspector/`, `/metadata-cleaner/` 및 메인 패널 → 독립 검사/제거 도구에 기존 기능과 UI 합침; 모바일 오류 반드시 재테스트
- `/actual-size-ruler/` → 이미지 인쇄/크기 작업과 연관되므로 제품 적합성 검토 후 이관 여부 결정

### Every Tiny Tool → Image Everything : 기존 가이드 20개 전수 체크
다음 각 가이드는 원문·삽화·표·FAQ·내부 링크·검색 메타데이터를 확인해 **관련 글은 전부 이관**한다.

| 기존 가이드 경로 | 분류 |
| --- | --- |
| resize-image-without-losing-quality | 이관 |
| jpg-png-webp-which-format | 이관 |
| reduce-image-size-for-email | 이관 |
| why-pdf-wont-compress | 이관 |
| heic-iphone-to-jpg | 이관 |
| browser-tools-file-privacy | 이관 |
| remove-background-transparent-png | 이관 |
| mp4-vs-webm-browser-video | 이관 |
| compare-two-lists-differences | 범용 텍스트 가이드, 잔류 후보 |
| compress-pdf-for-email | 이관 |
| remove-location-exif-before-sharing | 이관 |
| check-hidden-metadata-photos-pdfs | 이관 |
| screen-ruler-accuracy-calibration | 이미지/인쇄 적합성 검토 |
| batch-resize-images-without-stretching | 이관 |
| shrink-video-for-email-messaging | 이관 |
| lossy-vs-lossless-compression-explained | 이관 |
| png-to-jpg-transparent-background | 이관 |
| what-300-dpi-means-print-size | 이관 |
| convert-webp-to-jpg-png | 이관 |
| safe-upload-id-passport-photos-online | 이관 |

※ 사이트맵 이외의 카드·메인 탭·스크립트에 내장된 설명과 작업 가이드는 별도 코드 감사로 누락 여부를 파악한다. 이 표는 현재 **이관 계획**이지 완료 목록이 아니다.

### 안전한 제거 순서
1. 기존 Every Tiny Tool 관련 콘텐츠와 기능의 **원본 백업**.
2. Image Everything에서 1:1 기능·가이드 이관 및 QA 완료.
3. 새 독립 도메인의 Cloudflare 프로덕션 연결과 canonical/sitemap/links 정상 확인.
4. Every Tiny Tool의 관련 도구·가이드·내장 UI/링크를 제거하고 의미가 같은 URL을 새 상세페이지로 영구 리디렉션.
5. 남는 Every Tiny Tool의 범용 도구를 유지/종료할지는 별도로 결정; Pick a Card 등 다른 서비스에 영향 금지.

## 차단 조건 / 하지 않을 일
- 새 도메인 구매, DNS 연결, 운영 배포, 301 리디렉션, 구 사이트 삭제는 승인된 컷오버 계획 이전에 하지 않는다.
- 이번 Image Everything 브랜치에서는 기존 Every Tiny Tool이나 Pick a Card의 운영 코드를 수정하지 않는다. Every Tiny Tool의 이관 후 정리는 **별도 브랜치/PR**로 수행한다.
- 과거 사이트와의 관계를 숨기려고 로봇·canonical·리디렉션을 조작하지 않는다.
- '로컬 처리', '메타데이터 완전 제거', '모든 모바일 지원' 등의 문구는 실제 테스트한 범위 내에서만 사용한다.

## 참고
- Google Search Central: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Google canonicalization: https://developers.google.com/search/docs/crawling-indexing/canonicalization
- Google JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
