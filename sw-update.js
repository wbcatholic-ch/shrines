
(function(){
  'use strict';
  if(window.__APP_CACHE_LIFECYCLE_GUARD__) return;
  window.__APP_CACHE_LIFECYCLE_GUARD__ = true;
  var APP_VERSION = 'V2';
  var SW_BUILD_VERSION = 'V8-1-13-6-SHRINE-BOUNDARY-GUARD';
  window.APP_VERSION = APP_VERSION;

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function isTypingTarget(el){
    if(!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }
  function isTransientOpen(){
    try{
      if(document.getElementById('srch-modal') && document.getElementById('srch-modal').classList.contains('open')) return true;
      if(document.getElementById('sheet-route') && document.getElementById('sheet-route').classList.contains('open')) return true;
      if(document.getElementById('missa-view') && document.getElementById('missa-view').classList.contains('open')) return true;
      if(document.getElementById('mass-quick-modal') && document.getElementById('mass-quick-modal').classList.contains('show')) return true;
      if(document.querySelector && document.querySelector('.guide-modal.show')) return true;
    }catch(e){ console.warn("[가톨릭길동무]", e); }
    return false;
  }
  function canBackgroundRefresh(){
    try{ if(isTypingTarget(document.activeElement) || isTransientOpen()) return false; }catch(e){ console.warn("[가톨릭길동무]", e); }
    return true;
  }
  function stableReload(reason){
    if(!canBackgroundRefresh()) return false;
    try{ sessionStorage.setItem('oai_stable_auto_reload_reason', reason || 'maintenance'); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ if(typeof window.oaiPrepareRefreshVeil === 'function') window.oaiPrepareRefreshVeil(reason || 'background-reload', 1000, 12000); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ if(typeof window.oaiMarkRefreshHistoryCompact === 'function') window.oaiMarkRefreshHistoryCompact(reason || 'background-reload'); }catch(e){ console.warn("[가톨릭길동무]", e); }
    setTimeout(function(){ try{ location.reload(); }catch(e){ location.href = location.href; } }, 120);
    return true;
  }
  function clearReturnFlagsForBackground(){
    try{
      sessionStorage.removeItem('oai_mass_quick_return');
      sessionStorage.removeItem('oai_mass_quick_return_ts');
      sessionStorage.removeItem('oai_prayer_quick_return');
      sessionStorage.removeItem('oai_prayer_quick_return_ts');
      sessionStorage.removeItem('oai_prayer_from_quick_lock');
      sessionStorage.removeItem('oai_external_return_stabilize');
      sessionStorage.removeItem('oai_external_nav_pending');
      sessionStorage.removeItem('oai_external_nav_started_at');
      sessionStorage.removeItem('oai_external_nav_pagehide');
      localStorage.removeItem('oai_mass_quick_return');
      localStorage.removeItem('oai_mass_quick_return_ts');
      window.__MASS_QUICK_RETURN__ = false;
      window.__MASS_QUICK_FROM_PRAYER__ = false;
      window.__OAI_PRAYER_FROM_QUICK_LOCK__ = false;
    }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
  function resetToCoverForBackground(){
    if(!canBackgroundRefresh()) return false;
    try{ if(typeof window.oaiHoldStabilityVeil === 'function') window.oaiHoldStabilityVeil('background-cover-reset', 520); }catch(e){ console.warn("[가톨릭길동무]", e); }
    clearReturnFlagsForBackground();
    try{ if(typeof window.closeMassQuickMenu === 'function') window.closeMassQuickMenu(); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ if(typeof window.goToCover === 'function') window.goToCover(); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady(); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed(); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ if(typeof window._resetCoverBackTrap === 'function') window._resetCoverBackTrap('background-cover-reset'); }catch(e){ console.warn("[가톨릭길동무]", e); }
    try{ sessionStorage.setItem('oai_background_cover_reset_requested', String(now())); }catch(e){ console.warn("[가톨릭길동무]", e); }
    setTimeout(function(){ stableReload('background-cover-reset'); }, 220);
    return true;
  }

  var hiddenAt = 0;
  var BACKGROUND_SOFT_RELOAD_AFTER = 15 * 60 * 1000;
  var BACKGROUND_COVER_RESET_AFTER = 30 * 60 * 1000;
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden'){
      hiddenAt = now();
      try{ sessionStorage.setItem('oai_hidden_at', String(hiddenAt)); }catch(e){ console.warn("[가톨릭길동무]", e); }
      return;
    }
    if(document.visibilityState === 'visible'){
      var last = hiddenAt;
      try{ last = Math.max(last, parseInt(sessionStorage.getItem('oai_hidden_at') || '0', 10) || 0); }catch(e){ console.warn("[가톨릭길동무]", e); }
      if(!last) return;
      var elapsed = now() - last;
      if(elapsed >= BACKGROUND_COVER_RESET_AFTER){
        setTimeout(function(){ resetToCoverForBackground(); }, 350);
      }else if(elapsed >= BACKGROUND_SOFT_RELOAD_AFTER){
        setTimeout(function(){ stableReload('background-soft-return'); }, 350);
      }
    }
  }, true);

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
