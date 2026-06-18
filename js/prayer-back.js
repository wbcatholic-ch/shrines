(function(){
  'use strict';
  if(window.__OAI_PRAYER_BACK_SPLIT__) return;
  window.__OAI_PRAYER_BACK_SPLIT__ = true;
  function $b(id){ return document.getElementById(id); }
function prayerView(){ return $b('prayer-view'); }
function prayerDetail(){ return $b('prayer-detail'); }
function prayerPopup(){ return $b('mass-quick-modal'); }
function isPrayerOpen(){
  var pv = prayerView();
  return !!(pv && pv.classList.contains('open'));
}
function isPrayerDetailShowing(){
  var d = prayerDetail();
  return !!(isPrayerOpen() && d && d.classList.contains('show'));
}
function isPrayerQuickSource(){
  var pv = prayerView();
  var yes = false;
  try{ if(pv && pv.dataset && pv.dataset.quickSource === 'mass') yes = true; }catch(_e){}
  try{ if(window.__OAI_PRAYER_FROM_QUICK_LOCK__ === true) yes = true; }catch(_e){}
  try{ if(sessionStorage.getItem('oai_prayer_from_quick_lock') === '1') yes = true; }catch(_e){}
  try{ if(typeof window._shouldPrayerQuickReturn === 'function' && window._shouldPrayerQuickReturn()) yes = true; }catch(_e){}
  try{ if(typeof window._shouldFaithReturnToMassQuick === 'function' && window._shouldFaithReturnToMassQuick()) yes = true; }catch(_e){}
  return !!yes;
}
function keepPrayerQuickSource(on){
  try{ if(typeof window._setPrayerQuickReturn === 'function') window._setPrayerQuickReturn(!!on); }catch(_e){}
  try{ window.__OAI_PRAYER_FROM_QUICK_LOCK__ = !!on; }catch(_e){}
  try{ if(on) sessionStorage.setItem('oai_prayer_from_quick_lock','1'); else sessionStorage.removeItem('oai_prayer_from_quick_lock'); }catch(_e){}
  try{
    var pv = prayerView();
    if(pv && pv.dataset){
      if(on) pv.dataset.quickSource = 'mass';
      else delete pv.dataset.quickSource;
    }
  }catch(_e){}
}
function isPrayerReturnPopupOpen(){
  var mq = prayerPopup();
  if(!(mq && mq.classList.contains('show'))) return false;
  var yes = false;
  try{ if(mq.dataset && mq.dataset.returnSource === 'prayer') yes = true; }catch(_e){}
  try{ if(typeof window._isPrayerPopupReturnSource === 'function' && window._isPrayerPopupReturnSource()) yes = true; }catch(_e){}
  return !!yes;
}
function armPrayerBackTrap(reason){
  try{
    if(!isPrayerOpen()) return;
    if(isPrayerQuickSource() && typeof window._resetAppBackTrap === 'function'){
      window._resetAppBackTrap(reason || 'prayer-quick-state');
      return;
    }
    if(typeof window._ensureAppBackTrap === 'function'){
      window._ensureAppBackTrap(reason || 'prayer-ui-state');
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function pushPrayerDetailState(reason){ armPrayerBackTrap(reason || 'prayer-detail'); }
function replacePrayerListState(reason){ armPrayerBackTrap(reason || 'prayer-list'); }
function hidePrayerOnly(){
  try{
    var d = prayerDetail();
    if(d) d.classList.remove('show');
    var pv = prayerView();
    if(pv){
      pv.classList.remove('open');
      try{ delete pv.dataset.quickSource; }catch(_e){}
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function showCoverOnlyForPrayer(){
  try{
    document.documentElement.classList.remove('app-active','parish-mode','retreat-mode');
    if(typeof window.oaiSetMainMapLayerHidden === 'function') window.oaiSetMainMapLayerHidden(false);
    var cv = $b('cover');
    if(cv){
      cv.style.display = '';
      cv.style.opacity = '';
      cv.style.pointerEvents = '';
      try{ cv.scrollTop = 0; }catch(_e){}
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function resetPrayerFlags(){
  try{ if(typeof window._setPrayerPopupReturnSource === 'function') window._setPrayerPopupReturnSource(false); }catch(_e){}
  try{ if(typeof window._clearPrayerQuickReturn === 'function') window._clearPrayerQuickReturn(); }catch(_e){}
  try{ if(typeof window._clearMassQuickReturnForReload === 'function') window._clearMassQuickReturnForReload(); }catch(_e){}
  try{ if(typeof window._clearFaithReturnTarget === 'function') window._clearFaithReturnTarget(); }catch(_e){}
  try{ window.__OAI_PRAYER_FROM_QUICK_LOCK__ = false; }catch(_e){}
  try{ sessionStorage.removeItem('oai_prayer_from_quick_lock'); }catch(_e){}
  try{ window.__OAI_PRAYER_POPUP_COVER_GUARD_UNTIL__ = 0; }catch(_e){}
  try{ window.__OAI_PRAYER_COVER_FORCE_FIRST_TOAST_UNTIL__ = 0; }catch(_e){}
}
function ensureCoverTrapAfterPrayer(reason){
  try{
    if(typeof window._resetCoverBackTrap === 'function') window._resetCoverBackTrap(reason || 'prayer-cover-reset');
    else if(typeof window._ensureCoverBackTrap === 'function') window._ensureCoverBackTrap(reason || 'prayer-cover-reset');
    else {
      var href = location.href.split('#')[0];
      history.replaceState({_p:0, oai_cover_root:reason||'prayer-cover-reset'}, '', href);
      history.pushState({_p:1, oai_cover_trap:reason||'prayer-cover-reset'}, '', href);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function settleCoverTrapAfterPrayer(reason){
  function run(tag){
    try{
      if(document.documentElement.classList.contains('app-active')) return;
      var mq = prayerPopup();
      if(mq && mq.classList.contains('show')) return;
      if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady();
      if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed();
      if(typeof window._ensureCoverBackTrap === 'function') window._ensureCoverBackTrap((reason||'prayer-cover') + '-' + tag);
      else {
        var st = history.state;
        if(!(st && st._p === 1)) ensureCoverTrapAfterPrayer((reason||'prayer-cover') + '-' + tag);
      }
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  run('now');
  setTimeout(function(){ run('after-popstate'); }, 0);
  if(window.requestAnimationFrame) window.requestAnimationFrame(function(){ run('raf'); });
  setTimeout(function(){ run('settle-80'); }, 80);
}
function resetPrayerToCover(reason){
  try{
    var mq = prayerPopup();
    if(mq){
      mq.classList.remove('show');
      mq.setAttribute('aria-hidden','true');
      try{ delete mq.dataset.returnSource; }catch(_e){}
    }
    hidePrayerOnly();
    showCoverOnlyForPrayer();
    resetPrayerFlags();
    try{ if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady(); }catch(_e){}
    try{ if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed(); }catch(_e){}
    settleCoverTrapAfterPrayer(reason || 'prayer-cover-reset');
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
}
function prayerDetailToList(reason){
  try{
    var fromQuick = isPrayerQuickSource();
    if(typeof window.prCloseDetail === 'function') window.prCloseDetail({skipTrap:true});
    else {
      var d = prayerDetail();
      if(d) d.classList.remove('show');
    }
    if(typeof window.showPrayerListOnly === 'function') window.showPrayerListOnly();
    try{ if(typeof window.prEnsureTabsVisible === 'function') window.prEnsureTabsVisible(); }catch(_e){}
    keepPrayerQuickSource(!!fromQuick);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
}
function prayerListToPopupOrCover(reason){
  try{
    var fromQuick = isPrayerQuickSource();
    if(!fromQuick) return resetPrayerToCover(reason || 'prayer-list-cover');

    try{ keepPrayerQuickSource(true); }catch(_e){}
    try{ if(typeof window._setPrayerPopupReturnSource === 'function') window._setPrayerPopupReturnSource(true); }catch(_e){}
    try{ if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady(); }catch(_e){}
    try{ if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed(); }catch(_e){}
    if(typeof window._returnToMassQuickMenu === 'function'){
      window._returnToMassQuickMenu('prayer');
      return true;
    }

    hidePrayerOnly();
    showCoverOnlyForPrayer();
    var mq = prayerPopup();
    if(mq){
      try{ mq.dataset.returnSource = 'prayer'; }catch(_e){}
      mq.classList.add('show');
      mq.setAttribute('aria-hidden','false');
    }
    try{ history.pushState({_p:1, oai_mass_quick:1, oai_from_prayer:1}, '', location.href.split('#')[0]); }catch(_e){}
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
}
function handlePrayerBack(reason){
  try{
    if(isPrayerReturnPopupOpen()) return resetPrayerToCover(reason || 'prayer-popup-cover');
    if(isPrayerDetailShowing()) return prayerDetailToList(reason || 'prayer-detail-back');
    if(isPrayerOpen()) return prayerListToPopupOrCover(reason || 'prayer-list-back');
    return false;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
try{
  window._oaiArmPrayerBackTrap = armPrayerBackTrap;
  window._oaiPrayerPushDetailState = pushPrayerDetailState;
  window._oaiPrayerReplaceListState = replacePrayerListState;
  window._oaiPrayerBackHandle = handlePrayerBack;
  window._oaiPrayerListToPopupOrCover = prayerListToPopupOrCover;
  window._oaiPrayerResetToCover = resetPrayerToCover;
}catch(_e){}

function runPendingPrayerQuickPopup(){
  try{
    var cb = window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP__;
    var until = Number(window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP_UNTIL__ || 0);
    if(typeof cb !== 'function') return false;
    if(until && Date.now() > until){
      window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP__ = null;
      window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP_UNTIL__ = 0;
      return false;
    }
    window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP__ = null;
    window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP_UNTIL__ = 0;
    setTimeout(function(){
      try{ cb(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    }, 0);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}

function runPendingPrayerCoverReset(){
  try{
    var cb = window.__OAI_AFTER_RESTORE_PRAYER_COVER_RESET__;
    var until = Number(window.__OAI_AFTER_RESTORE_PRAYER_COVER_RESET_UNTIL__ || 0);
    if(typeof cb !== 'function') return false;
    if(until && Date.now() > until){
      window.__OAI_AFTER_RESTORE_PRAYER_COVER_RESET__ = null;
      window.__OAI_AFTER_RESTORE_PRAYER_COVER_RESET_UNTIL__ = 0;
      return false;
    }
    window.__OAI_AFTER_RESTORE_PRAYER_COVER_RESET__ = null;
    window.__OAI_AFTER_RESTORE_PRAYER_COVER_RESET_UNTIL__ = 0;
    setTimeout(function(){
      try{ cb(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    }, 0);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}

  try{
    window._oaiPrayerIsReturnPopupOpen = isPrayerReturnPopupOpen;
    window._oaiPrayerRunPendingQuickPopup = runPendingPrayerQuickPopup;
    window._oaiPrayerRunPendingCoverReset = runPendingPrayerCoverReset;
  }catch(_e){}
})();
