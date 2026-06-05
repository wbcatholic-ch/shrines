/* sw-update.js — 서비스워커 캐시 버전 관리
   앱 버전 변경 감지 → 서비스워커 갱신 처리
   원본 index.html Block F 에서 분리 */

(function(){
  'use strict';
  if(window.__APP_CACHE_LIFECYCLE_GUARD__) return;
  window.__APP_CACHE_LIFECYCLE_GUARD__ = true;
  // APP_VERSION:      화면 표시용 단축 버전 (build marker, data-target-version)
  // SW_BUILD_VERSION: SW 등록·캐시 키용 전체 버전 (sw.js CACHE_VERSION과 일치해야 함)
  // ★ 버전 업그레이드 시 두 값 모두 수정, sw.js CACHE_VERSION과 SW_BUILD_VERSION을 동일하게 맞출 것
  var APP_VERSION = 'V-2';
  var SW_BUILD_VERSION = 'V2-115';
  window.APP_VERSION = APP_VERSION;

  /* V2-115 정리:
     백그라운드 복귀 화면 정책은 app.js의 장시간 복귀 컨트롤러가 전담한다.
     이 파일에서는 더 이상 visibilitychange/pageshow로 커버 이동, 자동 새로고침,
     조용한 안정화를 중복 실행하지 않는다.
     이렇게 해야 홈 버튼/비정상 종료 후 복귀 때 인트로와 soft-return이 겹쳐
     화면이 두 번 로딩되는 느낌을 막을 수 있다. */

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)) return;
    try{
      navigator.serviceWorker.register('./sw.js?v=' + encodeURIComponent(SW_BUILD_VERSION || APP_VERSION), { updateViaCache: 'none' })
        .then(function(reg){ try{ reg.update(); }catch(e){ console.warn("[가톨릭길동무]", e); } })
        .catch(function(){});
    }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', registerServiceWorker, {once:true});
  else registerServiceWorker();
})();
