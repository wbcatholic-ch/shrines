/**
 * config.sample.js — API 키 설정 템플릿 (Git 보관용)
 *
 * 사용법:
 *   1. 이 파일을 config.js 로 복사합니다.
 *      $ cp config.sample.js config.js
 *   2. config.js 를 열고 아래 빈 문자열에 실제 키를 입력합니다.
 *   3. .gitignore 에 `config.js` 가 포함되어 있는지 확인합니다.
 *
 * 키 발급 위치:
 *   https://developers.kakao.com → 내 애플리케이션 → 앱 키
 *   - JavaScript 키  → KAKAO_JS_KEY
 *   - REST API 키    → KAKAO_REST_KEY
 *
 * ⚠️  Kakao Developers 콘솔 → 플랫폼 → Web 에서 서비스 도메인을 등록해야
 *     허가되지 않은 도메인에서의 키 사용이 차단됩니다.
 */
window.APP_CONFIG = {
  KAKAO_JS_KEY:   '',   // Kakao JavaScript Key
  KAKAO_REST_KEY: '',   // Kakao REST API Key
};
