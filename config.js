/**
 * config.js — 가톨릭 앱 API 키 설정
 *
 * ⚠️  보안 주의사항
 *  1. 이 파일은 Git에 커밋하지 마세요.
 *     프로젝트 루트의 .gitignore 에 아래 줄을 추가하세요:
 *       config.js
 *
 *  2. Kakao Developers 콘솔에서 반드시 도메인 제한을 설정하세요.
 *     https://developers.kakao.com
 *     → 내 애플리케이션 → 앱 설정 → 플랫폼 → Web
 *     → 사이트 도메인에 실제 서비스 도메인만 등록
 *
 *  3. REST 키(내비게이션용)는 서버에서 호출하는 것이 이상적입니다.
 *     현재는 클라이언트 전용 앱이므로, 도메인 제한이 핵심 방어선입니다.
 *
 * 설정 방법:
 *  이 파일을 복사해 config.js 로 저장한 뒤 아래 빈 문자열에 실제 키를 입력하세요.
 *  (config.sample.js 는 키 없이 Git에 보관하는 템플릿입니다.)
 */
window.APP_CONFIG = {
  /** Kakao JavaScript Key — 지도(kakao.maps) 초기화에 사용 */
  KAKAO_JS_KEY:   '07f7989e29fdfb425fff924f36fb3ec0',

  /** Kakao REST API Key — 내비게이션 경로 계산(Mobility API)에 사용 */
  KAKAO_REST_KEY: '86a3b86e6c1b0210b8e4aba5f6c83b00',
};
