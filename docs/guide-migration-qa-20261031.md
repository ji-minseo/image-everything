# Image Everything — 가이드 이전 검수 보고서 (2026-10-31)

상태: **Draft PR · 구현 완료/배포 미실시**

## 확인된 결과
- 원본 Every Tiny Tool의 상세 가이드 20개 중 **이미지·PDF·영상·메타데이터 관련 18개**를 `Image Everything/guides/<slug>/index.html`로 이관.
- 가이드 내용(제목, 본문, 소제목, 표, 그림, FAQ)을 보존: 원본 및 이관본 18개에서 `h2/h3/table/img/figure/section/details` 개수 일치 점검 완료.
- 화면 자 정확도 가이드와 관련 기능도 **이전 대상에서 제외**했다. 화면 자는 Every Tiny Tool에 그대로 둔다.
- Every Tiny Tool 전용 일반 텍스트/목록 관련 `compare-two-lists-differences`는 원 사이트에 남김.
- 이전한 가이드에는 기존 영문 발행일, JSON-LD Article/FAQ(원본에 존재하는 경우), title/meta description 및 자체 canonical을 유지/수정.
- 새 `/guides/` 허브 신설: 18개 카드, 원본 가이드 설명 사용, 비디오/이미지/PDF/개인정보 가이드 포함.
- 기존 영문 **도구 17개 독립 경로**를 그대로 보존하고 각 도구 본문에 관련 가이드 2개씩(총 34개 링크) 추가.
- 영문/한국어 도구 URL 36개를 보존하고, 가이드 19개 URL(허브 1 + 상세 18)과 독립 정보 페이지 4개를 추가해 사이트맵 총 **59개**로 확장.
- 영문·한국어 메인 리브랜딩: 화이트/블랙/연보라 **가독성 중심 SaaS** 스타일, 도구 17개를 4개 카테고리로 그룹화하되 개별 링크/URL 유지. 명조체·검정 배경·10~11px 아이브로우 지양.
- 영문·한국어 도구 **각 17개**에 새 브랜드 헤더·푸터, About·Privacy·Terms·Contact 내부 링크 적용. 기존 파일 처리 스크립트와 `data-tool`/`data-mode` 속성은 유지.
- 가이드 허브와 상세 **18개**에 통일된 새 브랜드 내비게이션과 정보 페이지 링크 적용.
- 독립 About, Privacy, Terms, Contact **4개 페이지** 신설. 사이트맵 내 59 URL 중 중복 0건, 가이드 상대 링크 누락 0건, 영문 도구 17개 연결 점검 통과.
- Cloudflare 프리뷰 및 도메인 컷오버 가이드: `docs/cloudflare-cutover-runbook-20261031.md`.
- 정적 HTML 크롤링 QA: `scripts/check-site-structure.mjs`, GitHub Actions 워크플로 `site-structure-audit.yml`. 사이트맵 전체 URL/자체 canonical/영문·한국어 URL/내부 링크·자원 존재 여부 검사.
- 리브랜딩으로 변경된 독립 Privacy URL을 반영하여 배경 제거 테스트를 업데이트. 최신 GitHub Actions의 SEO·PDF·배경 제거·드롭존 접근성·사이트 구조 검사 **모두 통과**(테스트는 실제 브라우저 QA의 대체가 아님).
- 신규 가이드 내 다른 가이드로 향하는 상대 링크는 전부 18개 경로에서 해석됨(정적 경로 검사).
- 기존 `/quick-image-studio/`, `/video-studio/` 링크는 Image Everything의 개별 작업 URL로 매핑.

## 미완료: 공개 전 반드시 해결
1. **이미지 호스팅**: 원문 가이드에 CloudFront에 호스팅된 일러스트 URL을 그대로 유지했으므로 시각 콘텐츠는 연결되어 있지만 Image Everything 저장소에서 직접 호스팅하지 않는다. 장기 독립 운영을 위해 원본 이미지 권리·접근성 확인 후 별도 미디어 파일로 이관해야 함. `assets/guide-images/compression-measured-example.svg`는 로컬 복제 완료.
2. **사이트 도메인**: 아직 신규 도메인이 확정되지 않아 `canonical`, JSON-LD `mainEntityOfPage`, sitemap은 기존 `image.everytinytool.com` 호스트 사용. 실제 독립 도메인 배포 직전에 전체 치환/검증 필요.
3. **이전 소스 중복 해소**: Every Tiny Tool의 관련 가이드와 이미지/영상/PDF/메타데이터 도구는 **아직 삭제/리디렉션되지 않았다**. Image Everything 새 URL 검수 및 컷오버 후, 원 페이지별 301/308 리디렉션, 메인 허브 정리, 원 사이트맵 정리를 별도 PR에서 수행.
4. **실제 렌더링/실기기 테스트**: 검수는 GitHub 코드 기준의 문서 구조/링크 정적 검사다. **CSS 시각적 QA와 자바스크립트 실행 검수는 아직 하지 않았다.** 브라우저에서 CSS 레이아웃, 이미지 요청 성공, 모바일 보기, 도구 본 기능, Search Console 색인 상태는 미검증. 한국어 도구/홈의 UI 코드 변경은 반영되었으나 **실제 모바일 화면 QA는 여전히 필요**.
5. **SEO**: 현재는 이전을 위한 콘텐츠 기반 준비 단계다. 호스팅 교체나 도메인 신규 구매는 색인 보장을 뜻하지 않으며 구글 색인 요청 전 Google 선택 canonical/응답 코드 점검 필요.

## 안전한 실행 순서
1. 프리뷰에서 모든 18편의 렌더링 및 17개 도구 페이지 CTA 확인
2. 외부 이미지 호스팅 의존성과 모든 도구별 내부 링크 검증
3. 새 Cloudflare Pages + 도메인에 배포, 사이트 canonical/robots/sitemap 재설정
4. 이전 도메인별 URL 대응표 작성·기존 Every Tiny Tool 관련 페이지 정리·301 처리
5. Search Console 등록, sitemap 제출, 개별 대표 URL 색인 검사, 1/2/4/8주 추적

**운영 사이트 main 브랜치, DNS, Cloudflare Pages, 결제 연동, 픽어카드는 이번 PR에서 전혀 수정하지 않음.**
