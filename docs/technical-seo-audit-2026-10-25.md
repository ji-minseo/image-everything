# Image Everything 기술 SEO 감사 (2026-10-25, 한국 시간)

## 범위와 재현 기준

- 저장소: `ji-minseo/image-everything`, 기준 `a683fdf74e64035900f830a0f6c3d129edcd54c9`. 아래 검증은 이 커밋을 기준으로 한다.
- 메인 저장소: `ji-minseo/everytinytool` main `43a00c771044aa846516903c3408546a95447cfb`, Draft [PR #3](https://github.com/ji-minseo/everytinytool/pull/3) head `37cfa429502c6ec9f39861e94a4d2dcd099c6a56`를 읽기 전용 비교했다.
- 정적 HTML/CSS/JS 사이트다. npm 빌드·SSR·SPA 라우터·서버 미들웨어는 없고 `.github/workflows/pages.yml`이 main push 또는 수동 실행에서 저장소 루트를 GitHub Pages 아티팩트로 배포한다. 이번 브랜치 push는 이 배포 조건에 해당하지 않는다. 실제 호스팅 계정 설정·배포 완료 SHA는 조회하지 못했다.
- 도구 34개 + 영문/한국어 홈 2개 = 대표 페이지 36개. 추가로 기존 도구의 이동 HTML 3개, `404.html`을 확인했다. 오류 페이지는 정상 콘텐츠 전수 검사에서 제외했다.
- 코드·로컬 브라우저와 운영 HTTP·Google 색인 결과를 구분했다. Google Search Console 및 실제 Googlebot 로그 접근은 없다.

## 확인한 결함과 수정

| 결함 | 수정 전 근거 | 변경 |
| --- | --- | --- |
| 영문 대표 도구 3개 사이트맵 누락 | `/video-compressor/`, `/metadata-inspector/`, `/metadata-cleaner/`는 실제 본문·self-canonical·내부 링크가 있으나 sitemap에 없음 | 세 대표 URL 추가 |
| 이동 URL 3개를 사이트맵에 제출 | `/image-info/`, `/metadata-checker/`, `/remove-exif/`는 meta refresh + JS `location.replace` + 새 대상 canonical인데 sitemap에는 옛 URL이 있음 | 사이트맵에서 이동 URL 항목만 제거. HTML·기존 URL·이동 동작은 유지 |
| 언어 대체 URL 반환 선언 누락 | `/ko/`의 18페이지는 en/ko hreflang 쌍을 선언하지만 영문 대응 페이지 18개에는 hreflang이 없음 | 영문 18개 `index.html` head에 동일한 en/ko 쌍 추가. 양쪽 self-canonical 유지 |

사이트맵은 수정 전후 모두 36 URL이지만, 수정 후에는 모두 실제 대표 페이지다. 사이트맵 누락 자체가 크롤링 불가능이나 미색인의 충분조건은 아니다. hreflang은 언어 매칭의 정합성 문제이며 전 사이트 미색인의 증거는 아니다.

수정 파일은 `sitemap.xml`, 영문 홈과 17개 도구의 `index.html`, `scripts/seo_audit.py`, `tests/seo_audit_test.py`, `.github/workflows/seo.yml`, 기존 테스트 2개, 본 문서다. CSS·서비스 JavaScript·화면 본문·canonical·결제 관련 기능은 변경하지 않았다.

## 접근·대표 URL·구조화 데이터·내부 링크

- 로컬 `robots.txt`는 `User-agent: *` / `Allow: /`이고 올바른 호스트의 sitemap을 선언한다. 대표 페이지와 로컬 렌더링 자원에 대한 robots 차단은 없다.
- 대표 36페이지는 단일 절대 self-canonical을 초기 HTML에 포함한다. `robots`/`googlebot` noindex가 없다. 쿼리·embed 동작을 바꾸지 않았다.
- 대표 페이지 모두 초기 HTML에 고유한 title·description과 H1 하나가 있다. 중복 title/description은 없다. 제목·설명은 JS 없이 존재한다.
- JSON-LD는 홈 FAQPage, WebP FAQPage, PDF·배경 제거 WebApplication(각 영문/한국어)이다. JSON 문법은 정상이며 WebApplication URL은 각 페이지 canonical과 일치한다. FAQ 본문과 질문/답변 의미를 확인했다. 한국어 FAQ JSON-LD 일부는 영문 답변이 남아 있어 언어 통일을 권장하지만 의미 충돌이나 색인 차단으로 분류하지 않았다. JSON 파싱과 Google 리치 결과 적격성은 다르며 FAQPage 마크업이 일반 도구 사이트의 FAQ 리치 결과 노출을 보장하지 않는다.
- 정상 36페이지 모두 홈의 정적 `a[href]` 경로로 도달한다. 이전 이동 페이지 3개는 현재 정적 탐색에서 연결되지 않지만 목적지 링크를 유지하고 있다. sitemap에 예전 URL을 다시 넣을 필요는 없다.
- `404.html`은 오류 안내다. Python 정적 서버의 404 동작을 GitHub Pages 운영 상태 코드의 증거로 사용하지 않았다. 서버 설정을 바꿀 근거는 없다.
- 코드에서 정상 페이지가 기술적으로 절대 색인될 수 없다는 근거는 발견하지 못했다. 실제 응답의 `X-Robots-Tag`, soft 404, 보안 challenge는 운영 검증이 필요하다.

## 초기 HTML과 브라우저 렌더링

로컬 Chromium에서 39 경로를 JS off/on 각각 탐색하여 초기 HTML의 제목·설명·H1·canonical·JSON-LD·본문·내부 링크와 JS 렌더링 결과를 비교했다. 외부 요청은 차단했으며 외부 라이브러리·모델의 운영 가용성은 검증하지 않았다.

- 수정 전후 각 78회, 총 156회 탐색에서 JS 예외 0, 로컬 자원 HTTP 오류 0이었다. 수정 전후 제목·description·H1·canonical·JSON-LD·가시 본문·내부 링크 변경은 0건이며, 주요 4페이지(영문 홈·한국어 홈·PDF·배경 제거)의 JS off/on 스크린샷 8쌍이 바이트 단위로 동일했다.
- 제목·description·canonical·JSON-LD는 렌더링 후에도 유지된다.
- 한국어 홈 H1은 초기 영문 `Image, PDF & video tasks, done.`에서 JS 실행 후 한국어로 번역된다. 본문 일부와 공통 UI에도 JS 번역이 사용된다. 대표 URL이나 전체 본문이 JS에만 의존하는 구조는 아니다. 번역된 초기 HTML을 더 충실히 제공하는 작업은 별도 개선 제안이다.
- 이동 HTML 3개는 JS off에서도 meta refresh로 새 메타데이터 도구로 이동하고 JS on에서는 location.replace도 동작한다. 이는 HTTP 301/308 검증 결과가 아니다.
- 도구는 파일 선택 후 브라우저에서 처리하는 구조이며 별도 API/DB 경계는 없다. 이번 head/sitemap 변경은 도구 처리 경로를 수정하지 않았다. 실 모델 추론·실 PDF 재렌더 비교·전체 도구 출력 재검증은 이번 감사 범위에서 수행하지 않았다.

## 메인 Draft PR #3과 canonical 관계

| 출발 페이지 | 메인 main 및 PR #3의 canonical | 이미지 사이트 코드 |
| --- | --- | --- |
| `https://everytinytool.com/pdf-compressor/` | `https://image.everytinytool.com/pdf-compressor/` | 대상 존재, self-canonical, sitemap 포함, robots 허용, noindex 없음, WebApplication URL 일치 |
| `https://everytinytool.com/remove-background/` | `https://image.everytinytool.com/remove-background/` | 대상 존재, self-canonical, sitemap 포함, robots 허용, noindex 없음, WebApplication URL 일치 |

**콘텐츠 동등성은 저장소 코드 기준으로 확인했으며 운영 페이지의 콘텐츠 동등성은 미검증이다.**

두 도구 모두 메인/이미지의 H1과 소개 문단, 사용 가이드·FAQ 본문이 동일하다. JS에서 UI 초기화 이전의 핵심 PDF 압축 로직과 AI 배경 제거 로직도 각각 완전히 같다. PDF는 지원 RGB JPEG 재압축, 기본 quality 80, 선택적 크기 목표, 텍스트·벡터 보존이라는 동일한 기능이다. 배경 제거는 같은 Transformers.js 3.8.1 및 `onnx-community/ormbg-ONNX` q8 모델로 투명 PNG/단색 JPG를 만드는 같은 기능이다. 양쪽 UI 초기화·배치 래퍼·선택 파일 썸네일·내비게이션 등 구현 차이는 있어 전체 파일이 동일하지는 않다. 브랜딩/배치 UI 차이만으로 별개 검색 의도라고 판단할 근거는 없다.

메인 `43a00c7`(10월 23일 23:12 KST)이 두 canonical을 메인에서 이미지로 바꾸고 메인 sitemap에서 두 URL을 제거했다. PR #3은 이를 새로 만든 것이 아니라 기존 canonical에 JSON-LD URL을 맞춘다. 이미지 사이트는 역방향 canonical을 선언하지 않아 **코드상 순환·충돌은 없다**. 이번 수정은 PR #3과 충돌하지 않으며 JSON-LD 정렬을 되돌릴 근거는 없다.

권장 사항: PR #3은 운영 대상 GET 200, 실제 콘텐츠 동등성, self-canonical, robots/meta/X-Robots-Tag, Google 선택 canonical을 확인하기 전까지 Draft 상태로 유지한다. 대상이 운영에서 404·차단·비동등하다면 JSON-LD만 되돌려 해결할 수 없다. 이미지 대상의 정상화 또는 메인 self-canonical·메인 sitemap 복원 중 실제 대표 URL 전략을 정하고 canonical·schema·sitemap을 함께 맞춰야 한다. 메인 PR/코드는 이번 작업에서 수정하지 않았다.

## 중복 콘텐츠와 검색 의도

- 메인과 이미지의 PDF·배경 제거는 코드상 동등해 의도적인 cross-domain 통합에 근거가 있다. 통합 시 메인 두 URL이 별도 색인되지 않는 것은 의도된 결과일 수 있다. canonical은 Google이 참고하는 신호이며 강제 명령이 아니다.
- 일반 이미지 압축과 JPG/PNG 전용 압축, 일반 변환과 각 형식 변환은 공통 UI/안내 템플릿을 공유하고 검색 의도가 일부 겹친다. 입력 형식·출력 형식·옵션이 달라 무조건 중복 페이지로 삭제/noindex할 근거는 없다. 장기적으로 형식별 제한·예시·출력 특성을 보강하고 GSC 검색어/선택 canonical로 경쟁 여부를 판단할 수 있다. 큰 콘텐츠 개편은 실행하지 않았다.
- 메타데이터 옛 도구 3개는 10월 18일 통합된 도구로 이동한다. 대표성을 새 URL에 모으는 것이 현재 코드의 명확한 의도다.
- 영문/한국어는 언어 변형이므로 양쪽 self-canonical과 상호 hreflang이 적절하다. 한국어 URL을 영문으로 canonical 처리하지 않았다.

## 10월 15일 전후 변경과 공통 원인

- 10월 14일: `4343a57`부터 배경 제거 엔진/페이지/내비게이션 도입, `7610930` sitemap 추가, `eceba2c` 테스트 workflow, `96fba69` 문서화. 이 범위에서 robots 또는 Pages 배포 workflow를 바꾼 내역은 없다.
- 이 저장소에 10월 15~16일 커밋은 없다. 커밋 시각과 실제 배포/크롤링 시각은 다르므로 장애 발생 시각을 확정할 수 없다.
- 10월 18일: `a668d92` 동영상 압축, `5c58fec` 메타데이터 통합, `3957c6f` 등 이동 페이지 전환, `4f0a3ab` 한국어 sitemap 추가. 영문 신규 URL과 옛 이동 URL sitemap의 불일치는 이때의 기능 확장 이후 남았다. 한국어 페이지의 단방향 hreflang도 이 시기의 코드에서 확인된다.
- 메인 저장소에도 신규 메타데이터 URL sitemap 누락이 있어 **기능 추가/URL 통합 시 SEO 자산을 수동 갱신하는 과정의 누락**이 공통 결함 유형이다. 이번 CI로 새 페이지·이동 페이지·대표성·언어쌍의 불일치를 검출한다.
- 두 저장소 모두 정적 콘텐츠가 있고 robots가 전체 허용이므로 공통 전역 noindex나 JS-only 본문이라는 가설을 코드로 뒷받침할 근거는 없다. random/calculate/pickacard의 코드/호스팅 설정은 조사하지 않았으며 공통 설정 오류를 확정하지 않는다. CDN/WAF/DNS/실제 크롤링/품질·검색 의도 문제는 별도 근거가 필요하다.

## 운영 접근 한계와 다음 검증

HTTPS GET 24건: 5개 호스트 각각 홈·robots·sitemap·존재하지 않는 경로(20건), 메인/이미지의 PDF·배경 제거(4건). 모두 환경 프록시가 `Tunnel connection failed: 403 Forbidden`으로 CONNECT를 거부했다. **원본 서버 응답 403 또는 Googlebot 차단을 관측한 것이 아니다.** 허용 정책을 우회하지 않았다.

따라서 운영 초기 HTML/JS 렌더링, HTTP 상태/리다이렉트 체인, robots, sitemap 실파일, canonical, X-Robots-Tag 및 실제 배포 버전은 전부 미검증이다. HTTP→HTTPS, www→non-www, 슬래시, `/index.html`, 추적/기능 쿼리 변형은 운영 원점 접근이 막혀 검증하지 못했다. 운영 도메인이 허용된 환경에서 다음을 확인해야 한다.

1. 홈·모든 sitemap URL은 GET 200, 없는 경로는 실제 404인지 확인. 로그인/challenge/soft 404 여부도 본문과 함께 확인.
2. canonical 두 쌍의 실제 콘텐츠·self-canonical·schema와 robots/X-Robots-Tag를 대조. source→target canonical 순환/리다이렉트 체인이 없는지 확인.
3. 대표 URL 정규화와 기능 쿼리 동작 확인. GET 전체 체인을 기록하고 HEAD만으로 판정하지 않기.
4. 배포 후 sitemap에 옛 이동 URL 대신 세 신규 영문 URL이 있고 en/ko 대체 URL이 상호 반환되는지 확인.
5. JS/CSS/CDN/AI 모델 실패 여부 및 실제 도구 출력을 브라우저에서 확인.

## 회귀 검증

```sh
python -B scripts/seo_audit.py
python -B -m unittest discover -s tests -p seo_audit_test.py -v
node --test tests/*.test.js
for file in assets/*.js; do node --check "$file" || exit 1; done
git diff --check
```

정적 감사는 39 HTML 라우트의 정상/이동 구분, sitemap, canonical, robots, meta, H1, JSON-LD identity, hreflang 반환, 로컬 링크/자원, 홈 도달성을 검사한다. 7개 Python 테스트는 정상 저장소 및 sitemap 누락·이동 URL 재삽입·hreflang 반환 누락·역방향 canonical·schema URL 충돌·noindex/robots 차단의 결함 주입을 포함한다. 미래 모든 URL 정책을 일반화한 SEO 도구가 아니라 현재 사이트 구조의 계약이다.

기존 Node 테스트는 수정 전 41개 중 2개가 실패했다. 이미 이동한 옛 페이지에서 도구 UI를 요구하고 10월 13일 캐시 문자열을 고정한 오래된 가정이었다. 현재 12개 이미지 도구의 접근성 계약과 3개 옛 URL의 이동/목적지 업로드 연결을 각각 검사하도록 고쳤다. 배경 제거 내비게이션 검사는 실제 메타데이터 대표 페이지를 검사한다. 테스트 삭제·skip·실패 무시는 없다. 수정 후 42개 모두 통과한다. Node 24.19.0 및 CI와 같은 Node 22.23.4에서도 통과했다. Python 3.12.14, JS 파일 12개 구문 검사 통과.

CI는 PR에서 SEO 전수/결함 주입 테스트와 Node 전체 테스트/구문 검사를 실행한다. 배포 workflow는 바꾸지 않았고 이번 작업에서 병합·배포하지 않는다.

## Search Console에서 사용자가 직접 확인할 항목

- 메인·이미지 도메인 소유권/속성과 sitemap 처리 성공·발견 URL 수. 제출 후 즉시 색인이 된다고 해석하지 않기.
- 두 canonical 쌍 각각 URL 검사: 사용자 선언 대표 URL, Google 선택 대표 URL, 마지막 크롤링, 크롤링 허용/가져오기/색인 허용, 렌더링 HTML·스크린샷. 메인 원본이 이미지 대상으로 통합되어 제외되는 것인지 구분.
- 신규 대표 3개와 한국어 표본의 `발견됨 - 현재 색인이 생성되지 않음`, `크롤링됨 - 현재 색인이 생성되지 않음`, `중복`, `리디렉션이 포함된 페이지`, soft 404, robots 차단, noindex 사유를 각각 확인.
- 호스트별 크롤링 통계의 DNS·서버 연결·응답 실패와 10월 15일 전후 노출/클릭·색인 변화를 비교. 서버/WAF의 검증된 Googlebot 로그와 실제 배포 완료 시각을 함께 대조.
- 페이지별 검색어/국가/언어로 노출 감소와 미색인을 구별하고 형식별 도구 간 검색어 경쟁을 검토.

이 수정은 확인된 기술 신호 불일치를 해결하며 색인 등록·검색 순위·노출 회복을 보장하지 않는다.
