/* sw-update.js — 서비스워커 등록
   ★ 버전 업그레이드 시: APP_VERSION, SW_BUILD_VERSION 수정
      sw.js의 CACHE_VERSION과 SW_BUILD_VERSION을 동일하게 맞출 것 */
(function(){
  'use strict';
  if (window.__APP_CACHE_LIFECYCLE_GUARD__) return;
  window.__APP_CACHE_LIFECYCLE_GUARD__ = true;

  var APP_VERSION      = 'V1';            /* 화면 표시용 */
  var SW_BUILD_VERSION = 'V1';            /* sw.js CACHE_VERSION의 suffix 와 매칭 */
  window.APP_VERSION = APP_VERSION;

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(
      './sw.js?v=' + encodeURIComponent(SW_BUILD_VERSION),
      { updateViaCache: 'none' }
    )
    .then(function(reg) {
      try { reg.update(); } catch(e) {}
    })
    .catch(function() {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW, { once: true });
  } else {
    registerSW();
  }
})();
