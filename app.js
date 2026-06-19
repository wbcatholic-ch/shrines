
'use strict';

function hideCoverAndRun(callback) {
  try{
    document.querySelectorAll('.module-view.open,#prayer-view.open,#diocese-view.open,#missa-view.open').forEach(function(v){v.classList.remove('open');});
    var pd=document.getElementById('prayer-detail'); if(pd) pd.classList.remove('show');
    if(typeof closeAllTabs==='function') closeAllTabs();
    if(typeof closeInfoCard==='function') closeInfoCard();
    window.__OAI_PRAYER_COVER_NEEDS_FIRST_TOAST__ = false;
    sessionStorage.removeItem('oai_prayer_cover_needs_first_toast');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  window._noAutoNearby = false;
  var cv = document.getElementById('cover');
  if (cv) cv.style.display = 'none';
  document.documentElement.classList.add('app-active');
  if (callback) requestAnimationFrame(function(){ setTimeout(callback, 0); });
}

var OAI_EXTERNAL_LEAVE_HOLD_MS = 6000;
var OAI_EXTERNAL_LEAVE_HARD_MS = 6500;
var OAI_EXTERNAL_RETURN_MIN_MS = 650;
var OAI_EXTERNAL_RETURN_MAX_MS = 1800;
var OAI_EXTERNAL_RETURN_STABLE_TICKS = 2;
var OAI_REFRESH_VEIL_MS = 2200; // refresh veil must remain visible for at least 2.2s
var OAI_REFRESH_CARRY_MS = 15000;
var OAI_REFRESH_PROGRESS_HOLD_MS = 15000;
var OAI_REFRESH_PRE_NAV_HOLD_MS = 8000;

function markExternalReturnStabilize(kind){
  try{
    var now = Date.now ? Date.now() : new Date().getTime();
    var stamp = String(now);
    sessionStorage.setItem('oai_external_nav_started_at', stamp);
    sessionStorage.setItem('oai_external_nav_kind', kind || 'external');
    sessionStorage.setItem('oai_external_nav_pending', '1');
    sessionStorage.setItem('oai_external_nav_hold_until', String(now + OAI_EXTERNAL_LEAVE_HOLD_MS));
    sessionStorage.setItem('oai_external_nav_force_release_at', String(now + OAI_EXTERNAL_LEAVE_HARD_MS));
    document.documentElement.classList.add('oai-external-leaving');
    if(typeof oaiHoldStabilityVeil === 'function') oaiHoldStabilityVeil('external-leave', OAI_EXTERNAL_LEAVE_HOLD_MS);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

try{ window.markExternalReturnStabilize = markExternalReturnStabilize; }catch(e){ console.warn("[가톨릭길동무]", e); }

function oaiIsRefreshVeilReason(reason){
  return /refresh|reload|background/i.test(String(reason || ''));
}
function oaiRefreshVeilVisibleUntil(){
  try{
    var stored = parseInt(sessionStorage.getItem('oai_refresh_veil_visible_until') || '0', 10) || 0;
    var local = parseInt(window.__oaiRefreshVeilLocalVisibleUntil || '0', 10) || 0;
    return Math.max(stored, local);
  }catch(_e){ return parseInt(window.__oaiRefreshVeilLocalVisibleUntil || '0', 10) || 0; }
}
function oaiReleaseStabilityVeil(){
  try{
    var root = document.documentElement;
    var reason = root.getAttribute('data-oai-stability-reason') || '';
    if(oaiIsRefreshVeilReason(reason)){
      var minUntil = oaiRefreshVeilVisibleUntil();
      var now = Date.now ? Date.now() : new Date().getTime();
      if(minUntil && now < minUntil){
        clearTimeout(window.__oaiStabilityVeilTimer);
        window.__oaiStabilityVeilTimer = setTimeout(oaiReleaseStabilityVeil, Math.max(80, Math.min(900, minUntil - now)));
        return;
      }
    }
    if(reason === 'external-leave'){
      var pending = false, pageHidden = false, forceAt = 0;
      try{
        pending = sessionStorage.getItem('oai_external_nav_pending') === '1';
        pageHidden = sessionStorage.getItem('oai_external_nav_pagehide') === '1' || document.visibilityState === 'hidden';
        forceAt = parseInt(sessionStorage.getItem('oai_external_nav_force_release_at') || '0', 10) || 0;
      }catch(_e){}
      if(pending && pageHidden){
        clearTimeout(window.__oaiStabilityVeilTimer);
        window.__oaiStabilityVeilTimer = setTimeout(oaiReleaseStabilityVeil, 900);
        return;
      }
      if(pending && !pageHidden && forceAt && Date.now && Date.now() < forceAt){
        clearTimeout(window.__oaiStabilityVeilTimer);
        window.__oaiStabilityVeilTimer = setTimeout(oaiReleaseStabilityVeil, Math.min(900, Math.max(120, forceAt - Date.now())));
        return;
      }
      if(pending && !pageHidden && forceAt && Date.now && Date.now() >= forceAt){
        try{
          sessionStorage.removeItem('oai_external_nav_pending');
          sessionStorage.removeItem('oai_external_nav_hold_until');
          sessionStorage.removeItem('oai_external_nav_force_release_at');
        }catch(_e){}
      }
    }
    clearTimeout(window.__oaiStabilityVeilTimer);
    if(root.classList.contains('oai-stability-veil') && !root.classList.contains('oai-stability-veil-releasing')){
      root.classList.add('oai-stability-veil-releasing');
      setTimeout(function(){
        try{
          root.classList.remove('oai-stability-veil','oai-external-return-freeze','oai-external-leaving','oai-stability-veil-releasing');
          root.removeAttribute('data-oai-stability-reason');
          try{ sessionStorage.removeItem('oai_refresh_veil_visible_until'); window.__oaiRefreshVeilLocalVisibleUntil = 0; }catch(_e){}
        }catch(_e){}
      }, 180);
    }else{
      root.classList.remove('oai-stability-veil','oai-external-return-freeze','oai-external-leaving','oai-stability-veil-releasing');
      root.removeAttribute('data-oai-stability-reason');
      try{ sessionStorage.removeItem('oai_refresh_veil_visible_until'); window.__oaiRefreshVeilLocalVisibleUntil = 0; }catch(_e){}
    }
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function oaiHoldStabilityVeil(reason, duration){
  try{
    var root = document.documentElement;
    var d = duration || 420;
    root.classList.remove('oai-stability-veil-releasing');
    root.classList.add('oai-stability-veil');
    root.setAttribute('data-oai-stability-reason', reason || 'stabilize');
    clearTimeout(window.__oaiStabilityVeilTimer);
    window.__oaiStabilityVeilTimer = setTimeout(oaiReleaseStabilityVeil, d);
    clearTimeout(window.__oaiStabilityVeilHardTimer);
    var hard = (reason === 'external-leave') ? OAI_EXTERNAL_LEAVE_HARD_MS : Math.max(d + 650, 2200);
    window.__oaiStabilityVeilHardTimer = setTimeout(oaiReleaseStabilityVeil, hard);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
window.oaiHoldStabilityVeil = oaiHoldStabilityVeil;
window.oaiReleaseStabilityVeil = oaiReleaseStabilityVeil;

function oaiMarkRefreshHistoryCompact(reason){
  try{
    var now = Date.now ? Date.now() : new Date().getTime();
    sessionStorage.setItem('oai_refresh_history_compact_until', String(now + 10 * 60 * 1000));
    sessionStorage.setItem('oai_refresh_history_compact_reason', reason || 'refresh');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function oaiPrepareRefreshVeil(reason, duration, carryDuration, showBeforeNavigation, beforeNavigationHold, carryToNextDocument){
  try{
    var d = Math.max(260, duration || OAI_REFRESH_VEIL_MS);
    var carry = Math.max(d + 1200, carryDuration || OAI_REFRESH_CARRY_MS || d);
    var now = Date.now ? Date.now() : new Date().getTime();
    var carryToNext = (carryToNextDocument !== false);
    if(carryToNext){
      sessionStorage.setItem('oai_refresh_veil_until', String(now + carry));
      sessionStorage.setItem('oai_refresh_veil_hold_ms', String(d));
      sessionStorage.removeItem('oai_refresh_veil_visible_until');
      sessionStorage.setItem('oai_refresh_veil_reason', reason || 'refresh');
    }else{
      sessionStorage.removeItem('oai_refresh_veil_until');
      sessionStorage.removeItem('oai_refresh_veil_hold_ms');
      sessionStorage.removeItem('oai_refresh_veil_reason');
      sessionStorage.removeItem('oai_refresh_veil_visible_until');
    }
    oaiMarkRefreshHistoryCompact(reason || 'refresh');
    if(showBeforeNavigation === true){
      var preHold = Math.max(d, beforeNavigationHold || d);
      window.__oaiRefreshVeilLocalVisibleUntil = now + d;
      if(carryToNext) sessionStorage.setItem('oai_refresh_veil_visible_until', String(now + d));
      oaiHoldStabilityVeil(reason || 'refresh', preHold);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function oaiAfterRefreshVeilPaint(callback){
  try{
    var run=function(){ setTimeout(function(){ try{ callback(); }catch(e){ console.warn('[가톨릭길동무]', e); } }, 90); };
    if(window.requestAnimationFrame){ requestAnimationFrame(function(){ requestAnimationFrame(run); }); }
    else setTimeout(run, 32);
  }catch(e){ try{ callback(); }catch(_e){} }
}
function oaiApplyPendingRefreshVeil(){
  try{
    var root = document.documentElement;
    var now = Date.now ? Date.now() : new Date().getTime();
    var until = parseInt(sessionStorage.getItem('oai_refresh_veil_until') || '0', 10) || 0;
    var holdMs = parseInt(sessionStorage.getItem('oai_refresh_veil_hold_ms') || '0', 10) || 0;
    var reason = sessionStorage.getItem('oai_refresh_veil_reason') || 'refresh-return';
    if(until > now){
      var showFor = Math.max(260, holdMs || Math.min(1200, Math.max(260, until - now)));
      var visibleUntil = parseInt(sessionStorage.getItem('oai_refresh_veil_visible_until') || '0', 10) || 0;
      var minVisibleUntil = now + showFor;
      if(!visibleUntil || visibleUntil < minVisibleUntil) visibleUntil = minVisibleUntil;
      try{ sessionStorage.setItem('oai_refresh_veil_visible_until', String(visibleUntil)); }catch(_e){}

      if(root.classList.contains('oai-stability-veil') && oaiIsRefreshVeilReason(root.getAttribute('data-oai-stability-reason') || reason)){
        root.classList.remove('oai-stability-veil-releasing');
        root.setAttribute('data-oai-stability-reason', reason || 'refresh-return');
        root.removeAttribute('data-oai-refresh-early-veil');
        clearTimeout(window.__oaiStabilityVeilTimer);
        window.__oaiStabilityVeilTimer = setTimeout(oaiReleaseStabilityVeil, Math.max(0, visibleUntil - now));
        clearTimeout(window.__oaiStabilityVeilHardTimer);
        window.__oaiStabilityVeilHardTimer = setTimeout(oaiReleaseStabilityVeil, Math.max(1600, visibleUntil - now + 900));
      }else{
        try{ sessionStorage.setItem('oai_refresh_veil_visible_until', String(now + showFor)); }catch(_e){}
        oaiHoldStabilityVeil(reason || 'refresh-return', showFor);
      }
      setTimeout(function(){
        try{
          sessionStorage.removeItem('oai_refresh_veil_until');
          sessionStorage.removeItem('oai_refresh_veil_hold_ms');
          sessionStorage.removeItem('oai_refresh_veil_reason');
        }catch(_e){}
      }, Math.max(300, Math.max(visibleUntil - now, showFor) + 320));
    }else if(until){
      sessionStorage.removeItem('oai_refresh_veil_until');
      sessionStorage.removeItem('oai_refresh_veil_hold_ms');
      sessionStorage.removeItem('oai_refresh_veil_reason');
      sessionStorage.removeItem('oai_refresh_veil_visible_until');
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
window.oaiPrepareRefreshVeil = oaiPrepareRefreshVeil;
window.oaiMarkRefreshHistoryCompact = oaiMarkRefreshHistoryCompact;
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', oaiApplyPendingRefreshVeil, {once:true});
else oaiApplyPendingRefreshVeil();

function oaiClearExternalNavigationState(opts){
  opts = opts || {};
  try{
    var html = document.documentElement;
    html.classList.remove('oai-navigating-out','oai-external-return-prepaint','oai-external-return-stabilize','oai-missa-return-stabilize','oai-external-leaving');
    html.removeAttribute('data-oai-external-return-early');
    if(!opts.keepVeil){
      html.classList.remove('oai-external-return-freeze');
      var reason = html.getAttribute('data-oai-stability-reason') || '';
      if(!oaiIsRefreshVeilReason(reason)){
        html.classList.remove('oai-stability-veil','oai-stability-veil-releasing');
        html.removeAttribute('data-oai-stability-reason');
      }
    }
    sessionStorage.removeItem('oai_external_nav_started_at');
    sessionStorage.removeItem('oai_external_nav_pagehide');
    sessionStorage.removeItem('oai_external_nav_kind');
    sessionStorage.removeItem('oai_external_nav_pending');
    sessionStorage.removeItem('oai_external_nav_hold_until');
    sessionStorage.removeItem('oai_external_nav_force_release_at');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{
    var v = document.getElementById('oai-nav-veil');
    if(v && v.parentNode) v.parentNode.removeChild(v);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

(function(){
  'use strict';
  if(window.__OAI_IDLE_RESTART_GUARD__) return;
  window.__OAI_IDLE_RESTART_GUARD__ = true;
  var HIDDEN_AT_KEY = 'oai_pwa_backgrounded_at_v356';
  var RESTART_LOCK_KEY = 'oai_pwa_idle_restart_lock_v356';
  var LIMIT_MS = 10 * 60 * 1000;
  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function markHidden(reason){
    try{
      localStorage.setItem(HIDDEN_AT_KEY, String(now()));
      localStorage.setItem(HIDDEN_AT_KEY + '_reason', reason || 'hidden');
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function clearHidden(){
    try{
      localStorage.removeItem(HIDDEN_AT_KEY);
      localStorage.removeItem(HIDDEN_AT_KEY + '_reason');
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function clearRestartLockIfNeeded(){
    try{
      var lockUntil = parseInt(sessionStorage.getItem(RESTART_LOCK_KEY) || '0', 10) || 0;
      if(lockUntil && now() < lockUntil){
        clearHidden();
        return true;
      }
      if(lockUntil) sessionStorage.removeItem(RESTART_LOCK_KEY);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    return false;
  }
  function prepareFreshStart(){
    try{ sessionStorage.setItem(RESTART_LOCK_KEY, String(now() + 15000)); }catch(e){ console.warn('[가톨릭길동무]', e); }
    clearHidden();
    try{ oaiClearExternalNavigationState({keepVeil:false}); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{
      sessionStorage.removeItem('oai_internal_return_no_effect_once');
      sessionStorage.removeItem('oai_internal_return_no_effect_until');
      sessionStorage.removeItem('oai_refresh_veil_until');
      sessionStorage.removeItem('oai_refresh_veil_hold_ms');
      sessionStorage.removeItem('oai_refresh_veil_reason');
      sessionStorage.removeItem('oai_refresh_veil_visible_until');
      sessionStorage.removeItem('oai_soft_refresh_requested');
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function restartFromBeginning(reason){
    try{
      if(window.__OAI_IDLE_RESTARTING__) return;
      window.__OAI_IDLE_RESTARTING__ = true;
      prepareFreshStart();
      location.reload();
    }catch(e){
      console.warn('[가톨릭길동무]', e);
      try{ location.href = location.href.split('#')[0]; }catch(_e){}
    }
  }
  function checkReturn(reason){
    if(document.visibilityState === 'hidden') return;
    if(clearRestartLockIfNeeded()) return;
    try{
      var hiddenAt = parseInt(localStorage.getItem(HIDDEN_AT_KEY) || '0', 10) || 0;
      if(!hiddenAt) return;
      var elapsed = now() - hiddenAt;
      if(elapsed >= LIMIT_MS){
        restartFromBeginning(reason || 'return');
      }else{
        clearHidden();
      }
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) markHidden('visibility-hidden');
    else checkReturn('visibility-visible');
  }, {passive:true});
  window.addEventListener('pagehide', function(){ markHidden('pagehide'); }, {passive:true});
  window.addEventListener('pageshow', function(){ setTimeout(function(){ checkReturn('pageshow'); }, 0); }, {passive:true});
  window.addEventListener('focus', function(){ setTimeout(function(){ checkReturn('focus'); }, 0); }, {passive:true});
  checkReturn('boot');
})();

function oaiNormalizeExternalSiteUrl(url){
  try{
    if(typeof normalizeCatholicExternalUrl === 'function') return normalizeCatholicExternalUrl(url);
  }catch(_e){}
  return String(url || '').trim();
}

function oaiOpenExternalSite(url, options){
  options = options || {};
  if(typeof options === 'string') options = {kind:options};
  url = oaiNormalizeExternalSiteUrl(url);
  if(!url) return false;
  try{
    if(/^(tel:|mailto:|sms:|javascript:)/i.test(url)) return false;
  }catch(_e){}
  var kind = options.kind || options.source || 'external-site';
  var delay = typeof options.delay === 'number' ? options.delay : 70;
  try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof _resetCoverExitReady === 'function') _resetCoverExitReady(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof _clearCoverExitArmed === 'function') _clearCoverExitArmed(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ markExternalReturnStabilize(kind); }catch(e){ console.warn("[가톨릭길동무]", e); }
  setTimeout(function(){
    try{ location.assign(url); }
    catch(e){ try{ location.href = url; }catch(_e){ console.warn('[가톨릭길동무]', _e); } }
  }, Math.max(0, delay));
  return true;
}

function oaiSmoothNavigate(url, kind){
  return oaiOpenExternalSite(url, {kind: kind || 'external'});
}

try{ window.oaiOpenExternalSite = oaiOpenExternalSite; window.oaiSmoothNavigate = oaiSmoothNavigate; }catch(e){ console.warn("[가톨릭길동무]", e); }

function oaiMeasureExternalViewport(){
  try{
    var vv = window.visualViewport || null;
    return [
      Math.round(window.innerWidth || 0),
      Math.round(window.innerHeight || 0),
      Math.round(vv && vv.height ? vv.height : 0),
      Math.round(vv && vv.offsetTop ? vv.offsetTop : 0),
      Math.round(window.scrollY || document.documentElement.scrollTop || 0)
    ].join('|');
  }catch(_e){ return '0'; }
}
function oaiReleasePassiveVeil(){
  try{
    var reason = document.documentElement.getAttribute('data-oai-stability-reason') || '';
    if(/external-leave|external-return/i.test(reason)) return;
    oaiReleaseStabilityVeil();
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function oaiGetExternalNavInfo(){
  try{
    var now = Date.now ? Date.now() : new Date().getTime();
    var ts = parseInt(sessionStorage.getItem('oai_external_nav_started_at') || '0', 10) || 0;
    var pending = sessionStorage.getItem('oai_external_nav_pending') === '1';
    var pageHidden = sessionStorage.getItem('oai_external_nav_pagehide') === '1';
    var forceAt = parseInt(sessionStorage.getItem('oai_external_nav_force_release_at') || '0', 10) || 0;
    return {now:now, ts:ts, pending:pending, pageHidden:pageHidden, forceAt:forceAt};
  }catch(_e){ return {now:0, ts:0, pending:false, pageHidden:false, forceAt:0}; }
}
function oaiHasExternalReturnPending(){
  try{
    var info = oaiGetExternalNavInfo();
    return !!(info.ts && info.pageHidden && info.now && info.now - info.ts < 10 * 60 * 1000);
  }catch(_e){ return false; }
}
function oaiExternalReturnKind(){
  try{ return String(sessionStorage.getItem('oai_external_nav_kind') || ''); }catch(_e){ return ''; }
}
function oaiIsExternalLeaveStillOpening(){
  try{
    var info = oaiGetExternalNavInfo();
    return !!(info.pending && !info.pageHidden && info.forceAt && info.now && info.now < info.forceAt);
  }catch(_e){ return false; }
}
function oaiStartExternalReturnStabilize(){
  try{
    var root = document.documentElement;
    if(window.__oaiExternalReturnStabilizing) return true;
    window.__oaiExternalReturnStabilizing = true;
    root.classList.remove('oai-stability-veil-releasing');
    root.classList.add('oai-external-return-freeze');
    root.removeAttribute('data-oai-external-return-early');
    oaiHoldStabilityVeil('external-return', OAI_EXTERNAL_RETURN_MAX_MS);

    var started = Date.now ? Date.now() : new Date().getTime();
    var minUntil = started + OAI_EXTERNAL_RETURN_MIN_MS;
    var maxUntil = started + OAI_EXTERNAL_RETURN_MAX_MS;
    var last = oaiMeasureExternalViewport();
    var stableCount = 0;
    clearInterval(window.__oaiExternalReturnStableTimer);

    function finish(){
      try{
        clearInterval(window.__oaiExternalReturnStableTimer);
        window.__oaiExternalReturnStabilizing = false;
        oaiClearExternalNavigationState({keepVeil:true});
        oaiReleaseStabilityVeil();
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    window.__oaiExternalReturnStableTimer = setInterval(function(){
      try{
        var now = Date.now ? Date.now() : new Date().getTime();
        var cur = oaiMeasureExternalViewport();
        if(cur === last) stableCount++;
        else { stableCount = 0; last = cur; }
        if(now >= minUntil && stableCount >= OAI_EXTERNAL_RETURN_STABLE_TICKS){ finish(); return; }
        if(now >= maxUntil){ finish(); return; }
      }catch(e){ console.warn('[가톨릭길동무]', e); finish(); }
    }, 120);
    setTimeout(function(){
      try{ if(window.__oaiExternalReturnStabilizing) finish(); }catch(_e){}
    }, OAI_EXTERNAL_RETURN_MAX_MS + 260);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function applyExternalReturnStabilize(){
  try{
    if(oaiHasExternalReturnPending()){
      oaiStartExternalReturnStabilize();
      return;
    }
    if(oaiIsExternalLeaveStillOpening()){
      return;
    }
    oaiClearExternalNavigationState();
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
window.addEventListener('pageshow', applyExternalReturnStabilize, true);
window.addEventListener('pageshow', function(){ setTimeout(oaiReleasePassiveVeil, 2600); }, true);
window.addEventListener('focus', function(){ setTimeout(applyExternalReturnStabilize, 40); setTimeout(oaiReleasePassiveVeil, 2600); }, true);
window.addEventListener('pagehide', function(){
  try{ if(sessionStorage.getItem('oai_external_nav_pending') === '1') sessionStorage.setItem('oai_external_nav_pagehide','1'); }catch(e){ console.warn("[가톨릭길동무]", e); }
}, true);
document.addEventListener('visibilitychange', function(){
  try{
    if(document.visibilityState === 'hidden' && sessionStorage.getItem('oai_external_nav_pending') === '1') sessionStorage.setItem('oai_external_nav_pagehide','1');
    if(document.visibilityState === 'visible') setTimeout(applyExternalReturnStabilize, 60);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}, true);

document.addEventListener('click', function(e){
  try{
    if(e.defaultPrevented) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if(!a) return;
    if(a.hasAttribute('download')) return;
    var raw = a.getAttribute('href') || '';
    if(!raw || raw.charAt(0)==='#' || /^(tel:|mailto:|sms:|javascript:)/i.test(raw)) return;
    var u = new URL(raw, location.href);
    if(u.origin === location.origin) return;
    try{
      var inMyFaithExternal = false;
      if(a.getAttribute && a.getAttribute('data-myfaith-external-link') === '1') inMyFaithExternal = true;
      if(!inMyFaithExternal && a.closest && a.closest('#my-diocese-modal')) inMyFaithExternal = true;
      if(inMyFaithExternal){
        if(typeof window.oaiMarkMyFaithExternalLink === 'function') window.oaiMarkMyFaithExternalLink();
      }
    }catch(_e){}
    if(typeof a.onclick === 'function') return;
    e.preventDefault();
    e.stopPropagation();
    oaiSmoothNavigate(u.toString(), 'anchor-external');
  }catch(err){ console.warn('[가톨릭길동무]', err); }
}, true);

function oaiSetMainMapLayerHidden(hidden){
  try{
    document.documentElement.classList.toggle('oai-hide-main-map-layer', !!hidden);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
window.oaiSetMainMapLayerHidden = oaiSetMainMapLayerHidden;

const OAI_FAITH_PORTAL_ORDER = ['bible','hymn','prayer','missa'];
const OAI_FAITH_PORTAL_ITEMS = {
  bible:  { label:'성경', cls:'faith-bible',  url:'https://maria.catholic.or.kr/mobile/bible/read/bible_list.asp' },
  hymn:   { label:'성가', cls:'faith-hymn',   url:'https://maria.catholic.or.kr/mobile/sungga/sungga.asp' },
  prayer: { label:'기도문', cls:'faith-prayer' },
  missa:  { label:'매일미사', cls:'faith-missa' }
};
function _getTodayMissaUrl(){
  const today=new Date();
  const yyyy=today.getFullYear();
  const mm=String(today.getMonth()+1).padStart(2,'0');
  const dd=String(today.getDate()).padStart(2,'0');
  return 'https://missa.cbck.or.kr/DailyMissa/'+yyyy+mm+dd;
}
function _getFaithPortalInfo(kind){
  const info=OAI_FAITH_PORTAL_ITEMS[kind];
  if(!info) return null;
  if(kind==='missa') return Object.assign({}, info, {url:_getTodayMissaUrl()});
  return info;
}
function _bindFaithFrameLoad(frame){
  try{
    if(!frame || frame.__oaiFaithLoadBound) return frame;
    frame.__oaiFaithLoadBound = true;
    frame.addEventListener('load', function(){ try{ if(typeof missaLoaded === 'function') missaLoaded(); }catch(e){ console.warn('[가톨릭길동무]', e); } });
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return frame;
}
function _replaceFaithFrameWith(url){
  try{
    var old=document.getElementById('missa-frame');
    if(!old) return null;
    var fresh=old.cloneNode(false);
    try{ fresh.removeAttribute('src'); }catch(_e){}
    fresh.__oaiFaithLoadBound = false;
    _bindFaithFrameLoad(fresh);
    if(old.parentNode) old.parentNode.replaceChild(fresh, old);
    if(url){
      setTimeout(function(){
        try{
          if(fresh.contentWindow && fresh.contentWindow.location && typeof fresh.contentWindow.location.replace === 'function') fresh.contentWindow.location.replace(url);
          else fresh.src = url;
        }catch(e){ fresh.src = url; }
      }, 0);
    }
    return fresh;
  }catch(e){ console.warn('[가톨릭길동무]', e); return null; }
}
function _clearFaithFrame(){
  try{ _replaceFaithFrameWith('about:blank'); }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _renderFaithBottomNav(current){
  const ids=['missa-faith-nav','prayer-faith-nav'];
  ids.forEach(function(id){
    const nav=$(id);
    if(!nav) return;
    try{ nav.style.display=''; }catch(_e){}
    nav.dataset.current=current||'';
    nav.innerHTML='';
    OAI_FAITH_PORTAL_ORDER.filter(function(kind){ return kind!==current; }).forEach(function(kind){
      const info=_getFaithPortalInfo(kind);
      if(!info) return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='faith-bottom-btn '+info.cls;
      btn.dataset.faithTarget=kind;
      btn.innerHTML='<strong>'+info.label+'</strong>';
      btn.addEventListener('click', function(e){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        _goFaithPortal(kind);
      });
      nav.appendChild(btn);
    });
  });
}
function _closePrayerSurfaceOnly(){
  try{
    const pv=$('prayer-view');
    const pd=$('prayer-detail');
    if(pd) pd.classList.remove('show');
    if(pv){
      pv.classList.remove('open');
      try{ delete pv.dataset.quickSource; }catch(_e){}
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _isFaithQuickBannerReturnActive(){
  try{
    return !!(typeof _shouldFaithReturnToMassQuick === 'function' && _shouldFaithReturnToMassQuick());
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _preserveFaithQuickBannerReturn(){
  try{
    if(_isFaithQuickBannerReturnActive()){
      if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick');
      if(typeof _setMassQuickReturn === 'function') _setMassQuickReturn(true);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _goFaithPortal(kind){
  try{
    if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick');
    if(typeof _setMassQuickReturn === 'function') _setMassQuickReturn(true);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(kind==='prayer'){
    const mv=$('missa-view');
    if(mv) mv.classList.remove('open');
    if(typeof _clearFaithFrame === 'function') _clearFaithFrame();
    else { const frame=$('missa-frame'); if(frame) frame.src='about:blank'; }
    _preserveFaithQuickBannerReturn();
    if(typeof openPrayerBook==='function') openPrayerBook({fromMassQuick:true, instant:true});
    return;
  }
  openFaithPortal(kind);
}
function openFaithPortal(kind, opts){
  const info=_getFaithPortalInfo(kind);
  if(!info || kind==='prayer') return _goFaithPortal('prayer');
  try{
    if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick');
    if(typeof _setMassQuickReturn === 'function') _setMassQuickReturn(true);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof oaiClearMapInfoSelection === 'function') oaiClearMapInfoSelection('faith-portal-'+kind); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof _resetCoverExitReady==='function') _resetCoverExitReady(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof _clearCoverExitArmed==='function') _clearCoverExitArmed(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ localStorage.setItem('oai_last_'+kind+'_url', info.url); }catch(e){ console.warn("[가톨릭길동무]", e); }
  const view=$('missa-view');
  const frame=$('missa-frame');
  const title=$('missa-bar-title');
  const fromBanner=_isFaithQuickBannerReturnActive();
  if(fromBanner) _preserveFaithQuickBannerReturn();
  if(!view || !frame){
    oaiSmoothNavigate(info.url, kind);
    return;
  }
  _closePrayerSurfaceOnly();
  document.querySelectorAll('.module-view.open,#diocese-view.open').forEach(function(v){ v.classList.remove('open'); });
  const cv=$('cover');
  if(cv){ cv.style.opacity='0'; cv.style.display='none'; }
  document.documentElement.classList.add('app-active');
  if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(true);
  try{
    if(fromBanner && typeof _resetAppBackTrap==='function') _resetAppBackTrap('faith-quick-'+kind);
    else if(typeof _ensureAppBackTrap==='function') _ensureAppBackTrap('faith-portal-'+kind);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  view.dataset.faithCurrent=kind;
  try{ if(fromBanner) view.dataset.quickSource='massQuick'; else delete view.dataset.quickSource; }catch(_e){}
  if(title) title.textContent=info.label;
  _renderFaithBottomNav(kind);
  view.classList.add('open');
  try{ if(typeof oaiEnterView==='function') oaiEnterView(view); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if((opts && opts.forceReload) || frame.getAttribute('src')!==info.url){
    _replaceFaithFrameWith(info.url);
  }else{
    _bindFaithFrameLoad(frame);
  }
}
function openMissa(){ openFaithPortal('missa', {forceReload:true}); }

const OAI_SHRINE_VISITS_KEY = 'oai_shrine_visits_v1';
const OAI_SHRINE_AUTO_VISIT_PROMPT_KEY = 'oai_shrine_auto_visit_prompt_v1';
const OAI_SHRINE_AUTO_VISIT_RADIUS_M = 200;
let _shrineVisitMapFilter = 'all';
let _shrineVisitCardsTab = 'visited';
let _shrineVisitCardsDiocese = 'all';
function _visitHtmlEsc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
function _todayISODate(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function _formatVisitDate(v){
  const s=String(v||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g,'.');
  return s;
}
function _getShrineVisitKey(item){
  if(!item) return '';
  if(item.seq) return 'seq:'+String(item.seq);
  const lat = item.lat != null ? Number(item.lat).toFixed(6) : '';
  const lng = item.lng != null ? Number(item.lng).toFixed(6) : '';
  return 'name:'+String(item.name||'')+'|'+lat+'|'+lng;
}
function _loadShrineVisits(){
  try{
    const raw=localStorage.getItem(OAI_SHRINE_VISITS_KEY);
    const data=raw?JSON.parse(raw):{};
    return data && typeof data==='object' ? data : {};
  }catch(e){ console.warn('[가톨릭길동무]', e); return {}; }
}
function _saveShrineVisits(data){
  try{ localStorage.setItem(OAI_SHRINE_VISITS_KEY, JSON.stringify(data||{})); }
  catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _getShrineVisitRecord(item){
  const key=_getShrineVisitKey(item);
  if(!key) return null;
  const data=_loadShrineVisits();
  const rec=data[key];
  if(!rec || typeof rec!=='object') return {visits:[]};
  if(!Array.isArray(rec.visits)) rec.visits=[];
  return rec;
}
function _getShrineVisitDates(item){
  const rec=_getShrineVisitRecord(item);
  const arr=(rec&&Array.isArray(rec.visits)?rec.visits:[]).map(function(v){ return typeof v==='string'?{date:v,method:'manual'}:v; }).filter(function(v){ return v&&v.date; });
  arr.sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
  return arr;
}
function _getShrineVisitCount(item){ return _getShrineVisitDates(item).length; }
function _isVisitedShrine(item){ return _getShrineVisitCount(item)>0; }
function _hasShrineVisitOnDate(item,date){
  return _getShrineVisitDates(item).some(function(v){ return String(v.date||'')===String(date||''); });
}
function _addShrineVisit(item,date,method){
  const key=_getShrineVisitKey(item);
  if(!key) return false;
  date=String(date||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const data=_loadShrineVisits();
  const rec=data[key]&&typeof data[key]==='object'?data[key]:{name:item.name||'',diocese:item.diocese||'',seq:item.seq||'',visits:[]};
  if(!Array.isArray(rec.visits)) rec.visits=[];
  rec.name=item.name||rec.name||'';
  rec.diocese=item.diocese||rec.diocese||'';
  rec.seq=item.seq||rec.seq||'';
  if(rec.visits.some(function(v){ return String((typeof v==='string'?v:(v&&v.date))||'')===String(date); })) return false;
  rec.visits.push({date:date,method:method||'manual',savedAt:new Date().toISOString()});
  rec.visits.sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
  data[key]=rec;
  _saveShrineVisits(data);
  try{ document.documentElement.classList.add('has-shrine-visits'); }catch(_e){}
  return true;
}
function _deleteShrineVisitAt(item,idx){
  const key=_getShrineVisitKey(item);
  if(!key) return false;
  const data=_loadShrineVisits();
  const rec=data[key];
  if(!rec||!Array.isArray(rec.visits)) return false;
  if(idx<0||idx>=rec.visits.length) return false;
  var target=rec.visits[idx];
  if(target && typeof target==='object' && String(target.method||'').toLowerCase()==='gps') return false;
  rec.visits.splice(idx,1);
  if(rec.visits.length) data[key]=rec;
  else delete data[key];
  _saveShrineVisits(data);
  return true;
}

function _shrineMarkerColor(item){
  return (_mode==='shrine' && item && _isVisitedShrine(item)) ? '#111111' : _typeColor(item && item.type);
}
function _isShrineVisibleByVisitFilter(item){
  if(_mode!=='shrine') return true;
  if(_shrineVisitMapFilter==='visited') return _isVisitedShrine(item);
  if(_shrineVisitMapFilter==='unvisited') return !_isVisitedShrine(item);
  return true;
}
function _ensureShrineVisitMapFilter(){
  let bar=document.getElementById('shrine-visit-map-filter');
  if(bar) return bar;
  const wrap=document.getElementById('map-wrap') || document.body;
  bar=document.createElement('div');
  bar.id='shrine-visit-map-filter';
  bar.className='shrine-visit-map-filter';
  bar.setAttribute('aria-label','순례한 성지 지도 필터');
  const buttons=[['all','전체'],['visited','순례한 성지'],['unvisited','미방문 성지']];
  bar.innerHTML=buttons.map(function(b){ return '<button type="button" data-shrine-visit-filter="'+b[0]+'">'+b[1]+'</button>'; }).join('');
  wrap.appendChild(bar);
  bar.querySelectorAll('[data-shrine-visit-filter]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      try{ closeInfoCard({keepMap:true}); }catch(_e){}
      _shrineVisitMapFilter = btn.getAttribute('data-shrine-visit-filter') || 'all';
      _applyShrineVisitMapFilter();
    });
  });
  return bar;
}
function _updateShrineVisitMapFilterUI(){
  const bar=_ensureShrineVisitMapFilter();
  if(!bar) return;
  const show=(_mode==='shrine' && _screen==='map');
  bar.classList.toggle('show', !!show);
  bar.querySelectorAll('[data-shrine-visit-filter]').forEach(function(btn){
    const val=btn.getAttribute('data-shrine-visit-filter') || 'all';
    btn.classList.toggle('active', val===_shrineVisitMapFilter);
  });
}
function _fitShrineVisitMapFilterBounds(){
  if(_mode!=='shrine'||!_map||typeof _LB==='undefined'||typeof _LL==='undefined'||!Array.isArray(SHRINES)) return false;
  try{
    if(_shrineVisitMapFilter==='all') return false;
    const bounds=new _LB();
    let count=0, single=null;
    SHRINES.forEach(function(s){
      if(!s||!s.lat||!s.lng) return;
      const baseOk=(_filterDio==='all'||s.diocese===_filterDio)&&
        (!_listSrch||_itemSearchBlob(s).includes(_listSrch)||_itemSearchNorm(s).includes(String(_listSrch).replace(/\s+/g,'')));
      if(!baseOk) return;
      const useForBounds=_isVisitedShrine(s);
      if(!useForBounds) return;
      single=s;
      bounds.extend(new _LL(s.lat,s.lng));
      count++;
    });
    if(count>1){
      if(typeof _setBoundsByInfoCardStandard==='function') _setBoundsByInfoCardStandard(bounds, 164, 64, 118, 64);
      else _map.setBounds(bounds, 164, 64, 118, 64);
      return true;
    }
    if(count===1 && single){
      const pos=new _LL(single.lat,single.lng);
      if(typeof _map.setLevel==='function') _map.setLevel(7);
      if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(pos);
      else _map.setCenter(pos);
      return true;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return false;
}
function _applyShrineVisitMapFilter(){
  _updateShrineVisitMapFilterUI();
  if(_mode==='shrine' && _map){
    try{ _restoreMapMarkers(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
}
function _refreshShrineVisitMapState(){
  try{ _applyShrineVisitMapFilter(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ _updateShrineVisitCardsButtonUI(); }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _getShrineVisitEntries(){
  const data=_loadShrineVisits();
  const entries=[];
  SHRINES.forEach(function(item,idx){
    const visits=_getShrineVisitDates(item);
    if(!visits.length) return;
    entries.push({item:item,idx:idx,visits:visits,count:visits.length,recent:visits[0].date});
  });
  entries.sort(function(a,b){
    const d=String(b.recent||'').localeCompare(String(a.recent||''));
    if(d) return d;
    return String(a.item.diocese||'').localeCompare(String(b.item.diocese||'')) || String(a.item.name||'').localeCompare(String(b.item.name||''));
  });
  return entries;
}

function _getShrineUnvisitedEntries(){
  const entries=[];
  SHRINES.forEach(function(item,idx){
    if(_isVisitedShrine(item)) return;
    entries.push({item:item,idx:idx,visits:[],count:0,recent:''});
  });
  entries.sort(function(a,b){
    return String(a.item.diocese||'').localeCompare(String(b.item.diocese||'')) || String(a.item.name||'').localeCompare(String(b.item.name||''));
  });
  return entries;
}

function _getShrineNewEntries(){
  const entries=[];
  SHRINES.forEach(function(item,idx){
    if(!item || !(item.isNew === true || item.addedGroup)) return;
    const visits=_getShrineVisitDates(item);
    entries.push({item:item,idx:idx,visits:visits,count:visits.length,recent:visits.length?visits[0].date:''});
  });
  entries.sort(function(a,b){
    return String(a.item.diocese||'').localeCompare(String(b.item.diocese||'')) || String(a.item.name||'').localeCompare(String(b.item.name||''));
  });
  return entries;
}

function _getShrineVisitDioceseEntries(){
  if(typeof _getDioFilterEntries==='function') return _getDioFilterEntries();
  return [['all','전체']].concat(_DIOS ? _DIOS.slice(1) : []);
}
const _SHRINE_VISIT_FULL_DIOCESE_LABELS={
  '서울대교구':'서울대교구','인천교구':'인천교구','수원교구':'수원교구','의정부교구':'의정부교구',
  '춘천교구':'춘천교구','원주교구':'원주교구','대전교구':'대전교구','청주교구':'청주교구',
  '대구대교구':'대구대교구','안동교구':'안동교구','부산교구':'부산교구','마산교구':'마산교구',
  '광주대교구':'광주대교구','전주교구':'전주교구','제주교구':'제주교구','군종교구':'군종교구'
};
function _getShrineVisitFullDioceseLabel(value,label){
  const v=String(value||'');
  if(v==='all') return '전체';
  if(_SHRINE_VISIT_FULL_DIOCESE_LABELS[v]) return _SHRINE_VISIT_FULL_DIOCESE_LABELS[v];
  const l=String(label||'');
  if(/(대교구|교구)$/.test(l)) return l;
  return v || l || '전체';
}
function _getShrineVisitStatsDioceseEntries(){
  return _getShrineVisitDioceseEntries().map(function(pair){
    return [pair[0], _getShrineVisitFullDioceseLabel(pair[0], pair[1])];
  });
}
function _resetShrineVisitStatsExpansion(){
  try{ window.__OAI_SHRINE_VISIT_STATS_EXPANDED_DIO__=''; }catch(_e){}
}
function _getShrineVisitDioceseLabel(value){
  const entries=_getShrineVisitDioceseEntries();
  const found=entries.find(function(x){ return x&&String(x[0])===String(value); });
  return found ? found[1] : '전체';
}
function _filterShrineVisitEntriesByDiocese(entries){
  if(!_shrineVisitCardsDiocese || _shrineVisitCardsDiocese==='all') return entries;
  return entries.filter(function(entry){ return String(entry.item&&entry.item.diocese||'')===String(_shrineVisitCardsDiocese); });
}
function _renderShrineVisitDioceseTabs(visitedCount,totalCount){
  const wrap=document.getElementById('shrine-visit-cards-diocese');
  if(!wrap) return;
  const rawEntries=_getShrineVisitDioceseEntries();
  const visitedEntries=_getShrineVisitEntries();
  function isMy(pair){
    const v=pair&&pair[0], l=pair&&pair[1];
    return !!(typeof _isMyDioceseName==='function' && (_isMyDioceseName(v)||_isMyDioceseName(l)));
  }
  function statOf(pair){
    const key=pair&&pair[0];
    if(key==='all') return {visited:visitedEntries.length,total:Array.isArray(SHRINES)?SHRINES.length:0,pct:0};
    const total=Array.isArray(SHRINES)?SHRINES.filter(function(item){ return String(item&&item.diocese||'')===String(key); }).length:0;
    const visited=visitedEntries.filter(function(entry){ return String(entry.item&&entry.item.diocese||'')===String(key); }).length;
    return {visited:visited,total:total,pct:total?Math.round((visited/total)*100):0};
  }
  const all=rawEntries.filter(function(pair){ return pair&&pair[0]==='all'; });
  const my=rawEntries.filter(function(pair){ return pair&&pair[0]!=='all'&&isMy(pair); });
  const rest=rawEntries.filter(function(pair){ return pair&&pair[0]!=='all'&&!isMy(pair); }).sort(function(a,b){
    const sa=statOf(a), sb=statOf(b);
    return (sb.pct-sa.pct) || (sb.visited-sa.visited) || (sb.total-sa.total) || String(a[1]||'').localeCompare(String(b[1]||''),'ko');
  });
  const entries=all.concat(my,rest);
  wrap.innerHTML=entries.map(function(pair){
    const v=pair[0], l=pair[1];
    const selected=String(v)===String(_shrineVisitCardsDiocese||'all');
    const myFlag=isMy(pair);
    const myCls=myFlag?' my-diocese-filter':'';
    const myBadge=myFlag?'<span class="filter-my-dio-badge">나의 교구</span>':'';
    return '<button type="button" class="filter-btn'+(selected?' active':'')+myCls+'" data-shrine-visit-diocese="'+_visitHtmlEsc(v)+'">'+_visitHtmlEsc(l)+myBadge+'</button>';
  }).join('');
}

function _shrineVisitTypeClass(item){
  const t=String(item&&item.type||'');
  if(t==='성지') return 'type-shrine';
  if(t==='순례지') return 'type-pilgrim';
  return 'type-martyr';
}
function _shrineVisitTypeLabel(item){
  const t=String(item&&item.type||'');
  return t||'성지';
}

function _ensureShrineVisitCardsButton(){
  let btn=document.getElementById('shrine-visit-cards-btn');
  if(btn) return btn;
  const wrap=document.getElementById('map-wrap') || document.body;
  btn=document.createElement('button');
  btn.id='shrine-visit-cards-btn';
  btn.className='shrine-visit-cards-btn';
  btn.type='button';
  btn.textContent='순례기록';
  wrap.appendChild(btn);
  btn.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    _openShrineVisitCardsModal();
  });
  return btn;
}

function _ensureShrineVisitSheetButtons(){
  const configs=[['nearby','nearby-close-btn'],['list','list-close-btn'],['region','region-close-btn']];
  configs.forEach(function(pair){
    const name=pair[0], closeId=pair[1];
    const close=document.getElementById(closeId);
    if(!close) return;
    const hd=close.closest&&close.closest('.sheet-hd');
    if(!hd) return;
    const id='shrine-visit-sheet-btn-'+name;
    let btn=document.getElementById(id);
    if(!btn){
      btn=document.createElement('button');
      btn.id=id;
      btn.type='button';
      btn.className='shrine-visit-sheet-btn';
      btn.textContent='나의순례';
      btn.setAttribute('aria-label','나의 순례기록 열기');
      close.parentNode.insertBefore(btn, close);
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        _openShrineVisitCardsModal();
      });
    }
  });
}
function _updateShrineVisitSheetButtonsUI(){
  _ensureShrineVisitSheetButtons();
  ['nearby','list','region'].forEach(function(name){
    const btn=document.getElementById('shrine-visit-sheet-btn-'+name);
    if(btn) btn.classList.remove('show');
  });
  _updateShrineVisitFloatingListButtonUI();
}


function _ensureShrineVisitFloatingListButton(){
  let btn=document.getElementById('shrine-visit-floating-list-btn');
  if(btn) return btn;
  const app=document.getElementById('app') || document.body;
  btn=document.createElement('button');
  btn.id='shrine-visit-floating-list-btn';
  btn.type='button';
  btn.className='shrine-visit-floating-list-btn';
  btn.textContent='나의순례현황';
  btn.setAttribute('aria-label','나의 순례현황 열기');
  app.appendChild(btn);
  btn.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    _openShrineVisitCardsModal();
  });
  return btn;
}
function _isShrineVisitFloatingListSurfaceOpen(){
  try{
    return ['nearby','list','region'].some(function(name){
      const sheet=document.getElementById('sheet-'+name);
      return !!(sheet&&sheet.classList.contains('open'));
    });
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _updateShrineVisitFloatingListButtonUI(){
  const btn=_ensureShrineVisitFloatingListButton();
  if(!btn) return;
  const srch=document.getElementById('srch-modal');
  const searchOpen=!!(srch&&srch.classList.contains('open'));
  const info=document.getElementById('info-card');
  const infoOpen=!!(info&&info.classList.contains('open'));
  const route=document.getElementById('sheet-route');
  const routeOpen=(_activeTab==='route') || !!(route&&route.classList.contains('open'));
  const ae=document.activeElement;
  const inputFocused=!!(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA') && (ae.id==='list-srch-inp'||ae.id==='sm-inp'));
  const keyboardOpen=inputFocused && document.documentElement.classList.contains('kb-open');
  const visitOpen=(typeof _isAnyVisitModalOpen==='function'&&_isAnyVisitModalOpen()) || (typeof _isShrineVisitDetailOpen==='function'&&_isShrineVisitDetailOpen()) || (typeof _isShrineVisitCardsModalOpen==='function'&&_isShrineVisitCardsModalOpen());
  const allowedTabs=['nearby','list','region'];
  const sheetOpen=_isShrineVisitFloatingListSurfaceOpen();
  const activeAllowed=allowedTabs.indexOf(_activeTab)>=0;
  const nearbyOpen=(_activeTab==='nearby') || !!(document.getElementById('sheet-nearby')&&document.getElementById('sheet-nearby').classList.contains('open'));
  const nearbyLoading=nearbyOpen && _mode==='shrine' && window.__OAI_SHRINE_NEARBY_LOADING__ === true;
  const nearbyReady=!nearbyOpen || (!!window.__OAI_SHRINE_NEARBY_DISTANCE_DONE__ && !nearbyLoading);
  const mapOpen=(_screen==='map' && !sheetOpen);
  const show=(_mode==='shrine' && (sheetOpen||activeAllowed||mapOpen) && nearbyReady && !searchOpen && !keyboardOpen && !infoOpen && !routeOpen && !visitOpen);
  btn.classList.toggle('show', !!show);
  btn.textContent='나의순례현황';
}
function _bindShrineVisitFloatingListButtonWatchers(){
  if(window.__OAI_SHRINE_VISIT_FLOATING_WATCH_BOUND__) return;
  window.__OAI_SHRINE_VISIT_FLOATING_WATCH_BOUND__=true;
  const refresh=function(){ setTimeout(function(){ try{ _updateShrineVisitFloatingListButtonUI(); }catch(_e){} }, 40); };
  ['focusin','focusout','click','keyup','touchend'].forEach(function(ev){ document.addEventListener(ev, refresh, true); });
  ['resize','orientationchange','pageshow'].forEach(function(ev){ window.addEventListener(ev, refresh, {passive:true}); });
  try{ if(window.visualViewport) window.visualViewport.addEventListener('resize', refresh, {passive:true}); }catch(_e){}
  try{
    const mo=new MutationObserver(refresh);
    ['sheet-nearby','sheet-list','sheet-region','sheet-route','info-card','srch-modal','shrine-visit-cards-modal','shrine-visit-detail-view','shrine-visit-modal'].forEach(function(id){
      const el=document.getElementById(id); if(el) mo.observe(el,{attributes:true,attributeFilter:['class','style']});
    });
    window.__OAI_SHRINE_VISIT_FLOATING_MO__=mo;
  }catch(_e){}
  setInterval(function(){ try{ if(_mode==='shrine') _updateShrineVisitFloatingListButtonUI(); }catch(_e){} }, 900);
}
try{ _bindShrineVisitFloatingListButtonWatchers(); }catch(_e){}

function _updateShrineVisitCardsButtonUI(){
  const btn=_ensureShrineVisitCardsButton();
  const count=_getShrineVisitEntries().length;
  if(btn){
    btn.classList.remove('show');
    btn.textContent=count ? '순례기록 '+count : '순례기록';
  }
  _updateShrineVisitSheetButtonsUI();
}
function _ensureShrineVisitCardsModal(){
  let modal=document.getElementById('shrine-visit-cards-modal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='shrine-visit-cards-modal';
  modal.className='shrine-visit-cards-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="shrine-visit-cards-backdrop" data-shrine-cards-close="1"></div><div class="shrine-visit-cards-panel" role="dialog" aria-modal="true" aria-label="나의 순례기록"><div class="module-bar shrine-visit-cards-head"><div class="module-bar-main"><div class="module-bar-ico">✝</div><div class="module-bar-txt"><div class="module-bar-title">순례 스탬프북</div><div class="module-bar-sub">나의 성지순례 기록</div></div></div><button type="button" id="shrine-visit-cards-x" class="module-close" aria-label="닫기">×</button></div><div class="shrine-visit-cards-tabs" role="tablist" aria-label="순례기록 분류"><button type="button" data-shrine-visit-cards-tab="visited">순례한 성지</button><button type="button" data-shrine-visit-cards-tab="unvisited">미방문 성지</button><button type="button" data-shrine-visit-cards-tab="new">신규 성지</button><button type="button" data-shrine-visit-cards-tab="stats">통계</button></div><div id="shrine-visit-cards-diocese" class="shrine-visit-cards-diocese" aria-label="교구 선택"></div><div id="shrine-visit-cards-stats" class="shrine-visit-cards-stats"></div><div id="shrine-visit-cards-body" class="shrine-visit-cards-body"></div></div>';
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-shrine-cards-close],#shrine-visit-cards-x,#shrine-visit-cards-back').forEach(function(el){
    el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); _oaiCloseShrineTopOrDirect('stampbook', function(){ _closeShrineVisitCardsModal(); }); });
  });
  modal.addEventListener('click', function(e){
    const tab=e.target&&e.target.closest&&e.target.closest('[data-shrine-visit-cards-tab]');
    if(tab){
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      const nextTab=tab.getAttribute('data-shrine-visit-cards-tab')||'visited';
      if(nextTab==='stats') _resetShrineVisitStatsExpansion();
      else _resetShrineVisitStatsExpansion();
      _shrineVisitCardsTab=nextTab;
      _renderShrineVisitCardsModal();
      setTimeout(_resetShrineVisitCardsTopStable, 0);
      return;
    }
    const dio=e.target&&e.target.closest&&e.target.closest('[data-shrine-visit-diocese]');
    if(dio){
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      _shrineVisitCardsDiocese=dio.getAttribute('data-shrine-visit-diocese')||'all';
      _renderShrineVisitCardsModal();
      setTimeout(function(){ _scrollShrineVisitDioceseTabIntoView(_shrineVisitCardsDiocese,'smooth'); }, 60);
      return;
    }
    const statRow=e.target&&e.target.closest&&e.target.closest('[data-shrine-stat-diocese]');
    if(statRow){
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      const dioVal=statRow.getAttribute('data-shrine-stat-diocese')||'all';
      const body=document.getElementById('shrine-visit-cards-body');
      const keepTop=body?body.scrollTop:0;
      const prev=String(window.__OAI_SHRINE_VISIT_STATS_EXPANDED_DIO__||'');
      window.__OAI_SHRINE_VISIT_STATS_EXPANDED_DIO__=(prev===String(dioVal))?'':dioVal;
      _shrineVisitCardsTab='stats';
      _renderShrineVisitCardsModal();
      if(body) body.scrollTop=keepTop;
      if(window.__OAI_SHRINE_VISIT_STATS_EXPANDED_DIO__){
        setTimeout(function(){ _scrollShrineVisitExpandedStatsIntoView(dioVal); }, 70);
      }
      return;
    }
    const card=e.target&&e.target.closest&&e.target.closest('[data-shrine-visit-card]');
    if(!card) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    const idx=parseInt(card.getAttribute('data-shrine-visit-card'),10);
    window.__OAI_SHRINE_VISIT_DETAIL_FROM_CARDS__=true;
    _openShrineVisitDetail(idx);
  }, true);
  _bindShrineVisitCardsSwipe(modal);
  return modal;
}
function _scrollShrineVisitCardsBodyTop(){
  try{
    const body=document.getElementById('shrine-visit-cards-body');
    const panel=document.querySelector('.shrine-visit-cards-panel');
    if(panel){
      if(typeof panel.scrollTo==='function') panel.scrollTo({top:0,behavior:'auto'});
      else panel.scrollTop=0;
    }
    if(!body) return;
    if(typeof body.scrollTo==='function') body.scrollTo({top:0,behavior:'auto'});
    else body.scrollTop=0;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _resetShrineVisitCardsTopStable(){
  try{ _scrollShrineVisitCardsBodyTop(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(window.requestAnimationFrame) requestAnimationFrame(_scrollShrineVisitCardsBodyTop);
    setTimeout(_scrollShrineVisitCardsBodyTop, 80);
    setTimeout(_scrollShrineVisitCardsBodyTop, 220);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _switchShrineVisitCardsTabBySwipe(dir){
  const tabs=['visited','unvisited','new','stats'];
  const current=(_shrineVisitCardsTab==='unvisited'||_shrineVisitCardsTab==='new'||_shrineVisitCardsTab==='stats')?_shrineVisitCardsTab:'visited';
  const idx=Math.max(0,tabs.indexOf(current));
  const nextIdx=(idx+(dir>0?1:-1)+tabs.length)%tabs.length;
  _shrineVisitCardsTab=tabs[nextIdx];
  _resetShrineVisitStatsExpansion();
  _renderShrineVisitCardsModal();
  setTimeout(_resetShrineVisitCardsTopStable, 0);
  return true;
}
function _bindShrineVisitCardsSwipe(modal){
  try{
    if(!modal || modal.__OAI_SHRINE_VISIT_SWIPE_BOUND__) return;
    modal.__OAI_SHRINE_VISIT_SWIPE_BOUND__=true;
    let sx=0, sy=0, tx=0, ty=0, tracking=false;
    function blockedTarget(target){
      return !!(target && target.closest && target.closest('.shrine-visit-cards-tabs,.shrine-visit-cards-diocese,input,textarea,select'));
    }
    modal.addEventListener('touchstart', function(e){
      const t=e.touches&&e.touches[0];
      if(!t || blockedTarget(e.target)){ tracking=false; return; }
      if(!_isShrineVisitCardsModalOpen()){ tracking=false; return; }
      sx=t.clientX; sy=t.clientY; tx=sx; ty=sy; tracking=true;
    }, {passive:true});
    modal.addEventListener('touchmove', function(e){
      if(!tracking) return;
      const t=e.touches&&e.touches[0];
      if(!t) return;
      tx=t.clientX; ty=t.clientY;
    }, {passive:true});
    modal.addEventListener('touchend', function(e){
      if(!tracking) return;
      tracking=false;
      const t=e.changedTouches&&e.changedTouches[0];
      if(t){ tx=t.clientX; ty=t.clientY; }
      const dx=tx-sx, dy=ty-sy;
      const ax=Math.abs(dx), ay=Math.abs(dy);
      if(ax<64 || ax<ay*1.45) return;
      const changed=_switchShrineVisitCardsTabBySwipe(dx<0?1:-1);
      if(changed){
        try{ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_e){}
      }
    }, {passive:false});
    modal.addEventListener('touchcancel', function(){ tracking=false; }, {passive:true});
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _isShrineVisitCardsModalOpen(){
  const modal=document.getElementById('shrine-visit-cards-modal');
  return !!(modal&&modal.classList.contains('show'));
}

/* V8-1-13-6: 성지 카테고리 전용 뒤로가기 순서표 + boundary guard
 * 13-8~13-12의 개별 history 보정 방식 대신, 성지 내부 화면 순서를 하나의 stack으로 관리한다.
 */
const OAI_SHRINE_BACK_EXTERNAL_KEY='oai_shrine_back_stack_external_v1';
function _oaiNow(){ return Date.now ? Date.now() : (new Date()).getTime(); }
function _oaiClearShrineCoverExitCarryover(reason){
  try{ if(typeof window._resetCoverExitReady==='function') window._resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof window._clearCoverExitArmed==='function') window._clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    sessionStorage.removeItem('oai_cover_exit_hard_on_next_back');
    sessionStorage.removeItem('oai_cover_exit_hard_after_first_toast');
    sessionStorage.removeItem('oai_cover_exit_long_window_once');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _oaiRearmShrineBackTrap(reason){
  try{
    window.__OAI_SHRINE_BACK_REARM_UNTIL__=_oaiNow()+8000;
    window.__OAI_SHRINE_BACK_REARM_REASON__=reason||'state';
    if(typeof window._oaiArmCoverBackTrap==='function'){
      window._oaiArmCoverBackTrap('shrine-back-rearm-'+(reason||'state'),{force:true});
      return true;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return false;
}
function _oaiHasRecentShrineBackGuard(){
  try{ return !!(Number(window.__OAI_SHRINE_BACK_REARM_UNTIL__||0) && _oaiNow()<Number(window.__OAI_SHRINE_BACK_REARM_UNTIL__||0)); }catch(e){ return false; }
}
function _oaiHandleShrineBoundaryBack(reason){
  try{
    var recent=_oaiHasRecentShrineBackGuard();
    var isShrine=(typeof _mode!=='undefined' && _mode==='shrine');
    if(!recent && !isShrine && !_oaiShrineLayerVisible() && !_oaiGetShrineBackStack().length) return false;
    if(!isShrine && !_oaiShrineLayerVisible() && !_oaiGetShrineBackStack().length) return false;
    _oaiClearShrineCoverExitCarryover('boundary-'+(reason||'back'));
    if(_oaiHandleShrineBack('boundary-'+(reason||'back'))) return true;
    var route=document.getElementById('sheet-route');
    if((route&&route.classList.contains('open')) || (typeof _routeMode!=='undefined'&&_routeMode) || (typeof _rS!=='undefined'&&_rS) || (typeof _rE!=='undefined'&&_rE)){
      try{ if(typeof resetRoute==='function') resetRoute(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ _routeMode=false; }catch(_e){}
      try{ if(route) route.classList.remove('open'); }catch(_e){}
      try{ if(_activeTab==='route') _activeTab=null; if(typeof _updateTabBtns==='function') _updateTabBtns(null); }catch(_e){}
      _oaiRearmShrineBackTrap('boundary-route-close');
      return true;
    }
    var info=document.getElementById('info-card');
    if(info&&info.classList.contains('open')){
      try{ if(typeof closeInfoCard==='function') closeInfoCard({keepMap:true}); else { info.classList.remove('open'); info.style.display='none'; } }catch(e){ console.warn('[가톨릭길동무]', e); }
      _oaiRearmShrineBackTrap('boundary-info-close');
      return true;
    }
    try{
      if(_activeTab && typeof closeTab==='function'){
        closeTab(_activeTab);
        _oaiRearmShrineBackTrap('boundary-tab-close');
        return true;
      }
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    var sheets=document.querySelectorAll('.sheet.open');
    if(sheets&&sheets.length){
      try{ sheets[sheets.length-1].classList.remove('open'); }catch(_e){}
      try{ _activeTab=null; if(typeof _updateTabBtns==='function') _updateTabBtns(null); }catch(_e){}
      _oaiRearmShrineBackTrap('boundary-sheet-close');
      return true;
    }
    if(isShrine){
      try{ if(typeof goToCover==='function') goToCover(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ if(typeof window._oaiArmCoverBackTrap==='function') window._oaiArmCoverBackTrap('shrine-boundary-cover',{force:true}); }catch(_e){}
      return true;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return false;
}
function _oaiGetShrineBackStack(){
  try{
    if(!Array.isArray(window.__OAI_SHRINE_BACK_STACK__)) window.__OAI_SHRINE_BACK_STACK__=[];
    return window.__OAI_SHRINE_BACK_STACK__;
  }catch(e){ console.warn('[가톨릭길동무]', e); return []; }
}
function _oaiSetShrineBackStack(stack){
  try{ window.__OAI_SHRINE_BACK_STACK__=Array.isArray(stack)?stack:[]; }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _oaiClearShrineBackStack(reason){
  try{ window.__OAI_SHRINE_BACK_STACK__=[]; window.__OAI_SHRINE_BACK_BASE__=null; }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _oaiShrineLayerVisible(){
  try{ return !!document.querySelector('#shrine-visit-modal.show,#shrine-auto-visit-modal.show,#shrine-visit-detail-view.show,#shrine-visit-cards-modal.show'); }catch(e){ return false; }
}
function _oaiIsShrineBackContext(){
  try{ return _mode==='shrine' || _oaiShrineLayerVisible() || _oaiGetShrineBackStack().length>0; }catch(e){ return false; }
}
function _oaiShownShrineLayerType(){
  try{ if(document.getElementById('shrine-visit-modal')?.classList.contains('show')) return 'register-modal'; }catch(e){}
  try{ if(document.getElementById('shrine-auto-visit-modal')?.classList.contains('show')) return 'auto-register-modal'; }catch(e){}
  try{ if(document.getElementById('shrine-visit-detail-view')?.classList.contains('show')) return 'record-detail'; }catch(e){}
  try{ if(document.getElementById('shrine-visit-cards-modal')?.classList.contains('show')) return 'stampbook'; }catch(e){}
  return '';
}
function _oaiShrineItemIndex(item){
  try{ var idx=Array.isArray(SHRINES)?SHRINES.indexOf(item):-1; return idx>=0?idx:null; }catch(e){ return null; }
}
function _oaiCurrentInfoIdx(){
  try{ return (_curInfoItem && typeof _curInfoItem.idx==='number' && _curInfoItem.idx>=0) ? _curInfoItem.idx : null; }catch(e){ return null; }
}
function _oaiCaptureShrineBase(reason){
  var info=document.getElementById('info-card');
  var nearby=document.getElementById('sheet-nearby');
  var list=document.getElementById('sheet-list');
  var region=document.getElementById('sheet-region');
  var route=document.getElementById('sheet-route');
  return {
    reason:reason||'capture',
    t:_oaiNow(),
    mode:'shrine',
    screen:(typeof _screen!=='undefined'?_screen:'map'),
    activeTab:(typeof _activeTab!=='undefined'?_activeTab:null),
    nearbyOpen:!!(nearby&&nearby.classList.contains('open')),
    listOpen:!!(list&&list.classList.contains('open')),
    regionOpen:!!(region&&region.classList.contains('open')),
    routeOpen:!!(route&&route.classList.contains('open')),
    infoOpen:!!(info&&info.classList.contains('open')),
    infoIdx:_oaiCurrentInfoIdx(),
    filterDio:(typeof _filterDio!=='undefined'?_filterDio:'all'),
    listSrch:(typeof _listSrch!=='undefined'?_listSrch:''),
    curFromRegion:(typeof _curFromRegion!=='undefined'?!!_curFromRegion:false),
    regionLat:(typeof _regionLat!=='undefined'?_regionLat:null),
    regionLng:(typeof _regionLng!=='undefined'?_regionLng:null),
    regionName:(typeof _regionName!=='undefined'?_regionName:''),
    regionPlaceName:(typeof _regionPlaceName!=='undefined'?_regionPlaceName:''),
    shrineVisitTab:(typeof _shrineVisitCardsTab!=='undefined'?_shrineVisitCardsTab:'visited'),
    shrineVisitDiocese:(typeof _shrineVisitCardsDiocese!=='undefined'?_shrineVisitCardsDiocese:'all')
  };
}
function _oaiNormalizeShrineEntry(entry){
  entry=entry||{};
  entry.t=entry.t||_oaiNow();
  return entry;
}
function _oaiPushShrineBack(entry, opts){
  try{
    opts=opts||{};
    if(!_oaiIsShrineBackContext()) return false;
    _oaiClearShrineCoverExitCarryover('push-'+(entry&&entry.type||'shrine'));
    _oaiRearmShrineBackTrap('push-'+(entry&&entry.type||'shrine'));
    var stack=opts.reset?[]:_oaiGetShrineBackStack().slice();
    if(opts.reset) window.__OAI_SHRINE_BACK_BASE__=entry&&entry.base?entry.base:_oaiCaptureShrineBase('reset-'+(entry&&entry.type||'shrine'));
    if(!window.__OAI_SHRINE_BACK_BASE__) window.__OAI_SHRINE_BACK_BASE__=entry&&entry.base?entry.base:_oaiCaptureShrineBase('base-'+(entry&&entry.type||'shrine'));
    entry=_oaiNormalizeShrineEntry(entry);
    if(entry.type==='stampbook'){
      stack=[];
      window.__OAI_SHRINE_BACK_BASE__=entry.base||_oaiCaptureShrineBase('stampbook-base');
    }else if(entry.type==='record-detail'){
      stack=stack.filter(function(x){ return x.type!=='record-detail' && x.type!=='register-modal' && x.type!=='auto-register-modal' && x.type!=='info-card-from-record'; });
      if(!stack.some(function(x){ return x.type==='stampbook'; }) && _isShrineVisitCardsModalOpen()){
        stack.unshift({type:'stampbook',tab:_shrineVisitCardsTab||'visited',diocese:_shrineVisitCardsDiocese||'all',base:window.__OAI_SHRINE_BACK_BASE__,t:_oaiNow()});
      }
    }else if(entry.type==='register-modal' || entry.type==='auto-register-modal'){
      stack=stack.filter(function(x){ return x.type!==entry.type; });
    }else if(entry.type==='info-card-from-record'){
      stack=stack.filter(function(x){ return x.type!=='info-card-from-record' && x.type!=='register-modal' && x.type!=='auto-register-modal'; });
    }
    stack.push(entry);
    _oaiSetShrineBackStack(stack);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _oaiShowStampbookEntry(entry){
  try{
    entry=entry||{};
    var modal=_ensureShrineVisitCardsModal();
    _shrineVisitCardsTab=entry.tab||_shrineVisitCardsTab||'visited';
    _shrineVisitCardsDiocese=entry.diocese||_shrineVisitCardsDiocese||'all';
    _renderShrineVisitCardsModal();
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    setTimeout(_resetShrineVisitCardsTopStable,0);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _oaiRestoreShrineBase(base, opts){
  try{
    opts=opts||{};
    base=base||window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('restore-default');
    _mode='shrine';
    _screen=base.screen||'map';
    document.documentElement.classList.add('app-active');
    document.documentElement.classList.remove('parish-mode','retreat-mode');
    var cover=document.getElementById('cover');
    if(cover){ cover.style.opacity='0'; cover.style.display='none'; cover.style.pointerEvents=''; }
    if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
    try{ _filterDio=base.filterDio||'all'; _listSrch=base.listSrch||''; }catch(_e){}
    try{ _regionLat=base.regionLat||null; _regionLng=base.regionLng||null; _regionName=base.regionName||''; _regionPlaceName=base.regionPlaceName||''; _curFromRegion=!!base.curFromRegion; }catch(_e){}
    if(base.activeTab && ['nearby','list','region','route'].indexOf(base.activeTab)>=0){
      var sheet=document.getElementById('sheet-'+base.activeTab);
      if(!sheet || !sheet.classList.contains('open')){
        try{ openTab(base.activeTab); }catch(e){ console.warn('[가톨릭길동무]', e); }
      }else{
        try{ _activeTab=base.activeTab; _updateTabBtns(base.activeTab); }catch(e){ console.warn('[가톨릭길동무]', e); }
      }
      if(base.activeTab==='list'){
        try{ var inp=document.getElementById('list-srch-inp'); if(inp) inp.value=_listSrch||''; renderList(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      }
    }else{
      try{ closeAllTabs(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ _restoreMapMarkers(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    if(base.infoOpen && base.infoIdx!=null && base.infoIdx>=0 && Array.isArray(SHRINES) && SHRINES[base.infoIdx]){
      setTimeout(function(){ try{ _openShrineFromAbsoluteIndex(base.infoIdx); }catch(e){ console.warn('[가톨릭길동무]', e); } },80);
    }
    try{ _updateShrineVisitMapFilterUI(); _updateShrineVisitCardsButtonUI(); }catch(_e){}
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _oaiRestoreVisibleShrineFromStack(){
  try{
    var stack=_oaiGetShrineBackStack();
    var stamp=null, detail=null, reg=null, info=null;
    stack.forEach(function(x){ if(x.type==='stampbook') stamp=x; else if(x.type==='record-detail') detail=x; else if(x.type==='register-modal'||x.type==='auto-register-modal') reg=x; else if(x.type==='info-card-from-record') info=x; });
    if(stamp) _oaiShowStampbookEntry(stamp);
    if(detail && detail.idx!=null && SHRINES[detail.idx]) _openShrineVisitDetail(detail.idx,{skipStack:true});
    if(info && info.idx!=null && SHRINES[info.idx]) _openShrineVisitDetailOnMap(info.idx,{skipStack:true});
    if(reg){
      if(reg.type==='register-modal' && reg.idx!=null && SHRINES[reg.idx]) _openShrineVisitModal(SHRINES[reg.idx],{skipStack:true});
      if(reg.type==='auto-register-modal' && window.__OAI_SHRINE_AUTO_VISIT_ENTRY__) _openShrineAutoVisitModal(window.__OAI_SHRINE_AUTO_VISIT_ENTRY__,{skipStack:true});
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _oaiExpectedShrineTypeMatches(expected,type){
  if(!expected) return true;
  if(expected===type) return true;
  if(expected==='detail' && type==='record-detail') return true;
  if(expected==='register' && type==='register-modal') return true;
  if(expected==='auto' && type==='auto-register-modal') return true;
  return false;
}
function _oaiDirectCloseVisibleShrineLayer(){
  try{
    var reg=document.getElementById('shrine-visit-modal');
    if(reg&&reg.classList.contains('show')){ _closeShrineVisitModal({fromBackStack:true}); return true; }
    var auto=document.getElementById('shrine-auto-visit-modal');
    if(auto&&auto.classList.contains('show')){ _closeShrineAutoVisitModal({fromBackStack:true}); return true; }
    if(_isShrineVisitDetailOpen()){ _closeShrineVisitDetail({fromBackStack:true}); return true; }
    if(_isShrineVisitCardsModalOpen()){ _closeShrineVisitCardsModal({fromBackStack:true}); return true; }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return false;
}
function _oaiHandleShrineBack(reason, opts){
  try{
    opts=opts||{};
    if(!_oaiIsShrineBackContext()) return false;
    var stack=_oaiGetShrineBackStack().slice();
    var top=stack.length?stack[stack.length-1]:null;
    if(opts.expected && top && !_oaiExpectedShrineTypeMatches(opts.expected, top.type)) return false;
    _oaiClearShrineCoverExitCarryover('handle-'+(reason||'shrine'));
    if(!top){
      if(_oaiDirectCloseVisibleShrineLayer()){
        _oaiRearmShrineBackTrap('layer-fallback');
        return true;
      }
      return false;
    }
    stack.pop();
    _oaiSetShrineBackStack(stack);
    if(top.type==='register-modal'){
      _closeShrineVisitModal({fromBackStack:true});
      if(!stack.length) _oaiRestoreShrineBase(top.base||window.__OAI_SHRINE_BACK_BASE__);
      else _oaiRestoreVisibleShrineFromStack();
    }else if(top.type==='auto-register-modal'){
      _closeShrineAutoVisitModal({fromBackStack:true});
      if(!stack.length) _oaiRestoreShrineBase(top.base||window.__OAI_SHRINE_BACK_BASE__);
      else _oaiRestoreVisibleShrineFromStack();
    }else if(top.type==='info-card-from-record'){
      try{ closeInfoCard({keepMap:true}); }catch(e){ console.warn('[가톨릭길동무]', e); }
      stack=_oaiGetShrineBackStack().filter(function(x){ return x.type!=='record-detail' && x.type!=='register-modal' && x.type!=='auto-register-modal'; });
      _oaiSetShrineBackStack(stack);
      _closeShrineVisitDetail({fromBackStack:true});
      if(stack.some(function(x){ return x.type==='stampbook'; })) _oaiRestoreVisibleShrineFromStack();
      else _oaiRestoreShrineBase(top.base||window.__OAI_SHRINE_BACK_BASE__);
    }else if(top.type==='record-detail'){
      _closeShrineVisitDetail({fromBackStack:true});
      if(stack.some(function(x){ return x.type==='stampbook'; })) _oaiRestoreVisibleShrineFromStack();
      else _oaiRestoreShrineBase(top.base||window.__OAI_SHRINE_BACK_BASE__);
    }else if(top.type==='stampbook'){
      _closeShrineVisitCardsModal({fromBackStack:true});
      _oaiRestoreShrineBase(top.base||window.__OAI_SHRINE_BACK_BASE__);
      window.__OAI_SHRINE_BACK_BASE__=null;
    }else{
      if(!_oaiDirectCloseVisibleShrineLayer()) return false;
    }
    _oaiRearmShrineBackTrap('handled-'+(top.type||'pop')+'-'+(reason||'back'));
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _oaiCloseShrineTopOrDirect(expected, directClose){
  try{ if(_oaiHandleShrineBack('button-'+expected,{expected:expected})) return true; }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof directClose==='function') directClose(); return true; }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _oaiSaveShrineExternalReturn(extra){
  try{
    extra=extra||{};
    if(!_oaiIsShrineBackContext()) return false;
    var state={
      t:_oaiNow(),
      extra:extra,
      base:window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('external-base'),
      stack:_oaiGetShrineBackStack(),
      shown:_oaiShownShrineLayerType(),
      detailIdx:(window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__!=null?parseInt(window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__,10):null),
      modalIdx:_oaiShrineItemIndex(window.__OAI_CURRENT_SHRINE_VISIT_ITEM__),
      infoIdx:_oaiCurrentInfoIdx()
    };
    if(!state.stack.length){
      if(state.shown==='record-detail' && state.detailIdx>=0) state.stack=[{type:'record-detail',idx:state.detailIdx,base:state.base,t:_oaiNow()}];
      else if(state.shown==='register-modal' && state.modalIdx>=0) state.stack=[{type:'register-modal',idx:state.modalIdx,base:state.base,t:_oaiNow()}];
      else if(state.shown==='stampbook') state.stack=[{type:'stampbook',tab:_shrineVisitCardsTab||'visited',diocese:_shrineVisitCardsDiocese||'all',base:state.base,t:_oaiNow()}];
      else if(state.infoIdx!=null) state.stack=[{type:'info-card-from-record',idx:state.infoIdx,base:state.base,returnTo:'base',t:_oaiNow()}];
    }
    sessionStorage.setItem(OAI_SHRINE_BACK_EXTERNAL_KEY, JSON.stringify(state));
    localStorage.setItem(OAI_SHRINE_BACK_EXTERNAL_KEY, JSON.stringify(state));
    return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _oaiRestoreShrineExternalReturn(reason){
  try{
    var raw=sessionStorage.getItem(OAI_SHRINE_BACK_EXTERNAL_KEY)||localStorage.getItem(OAI_SHRINE_BACK_EXTERNAL_KEY);
    if(!raw || window.__OAI_SHRINE_EXTERNAL_RESTORING__) return false;
    var state=JSON.parse(raw);
    if(state.t && _oaiNow()-state.t>10*60*1000){ sessionStorage.removeItem(OAI_SHRINE_BACK_EXTERNAL_KEY); localStorage.removeItem(OAI_SHRINE_BACK_EXTERNAL_KEY); return false; }
    if((!Array.isArray(SHRINES)||!SHRINES.length) && typeof _ensureShrineDataLoaded==='function'){
      _ensureShrineDataLoaded().then(function(){ _oaiRestoreShrineExternalReturn(reason||'after-load'); }).catch(function(e){ console.warn('[가톨릭길동무]', e); });
      return true;
    }
    window.__OAI_SHRINE_EXTERNAL_RESTORING__=true;
    _oaiClearShrineCoverExitCarryover('external-restore');
    _oaiRestoreShrineBase(state.base||{}, {external:true});
    _oaiSetShrineBackStack(Array.isArray(state.stack)?state.stack:[]);
    window.__OAI_SHRINE_BACK_BASE__=state.base||window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('external-restore-base');
    _oaiRestoreVisibleShrineFromStack();
    sessionStorage.removeItem(OAI_SHRINE_BACK_EXTERNAL_KEY); localStorage.removeItem(OAI_SHRINE_BACK_EXTERNAL_KEY);
    setTimeout(function(){ window.__OAI_SHRINE_EXTERNAL_RESTORING__=false; },260);
    return true;
  }catch(e){ window.__OAI_SHRINE_EXTERNAL_RESTORING__=false; console.warn('[가톨릭길동무]', e); return false; }
}
try{
  window._oaiHandleShrineBack=_oaiHandleShrineBack;
  window._oaiHandleShrineBoundaryBack=_oaiHandleShrineBoundaryBack;
  window._oaiHasShrineBackState=function(){ return _oaiIsShrineBackContext() && (_oaiGetShrineBackStack().length>0 || _oaiShrineLayerVisible() || _oaiHasRecentShrineBackGuard()); };
  window._oaiClearShrineBackStack=_oaiClearShrineBackStack;
}catch(e){ console.warn('[가톨릭길동무]', e); }
try{
  ['pageshow','focus'].forEach(function(ev){ window.addEventListener(ev,function(){ setTimeout(function(){ _oaiRestoreShrineExternalReturn(ev); }, ev==='pageshow'?80:160); },true); });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') setTimeout(function(){ _oaiRestoreShrineExternalReturn('visibility'); },180); },true);
}catch(e){ console.warn('[가톨릭길동무]', e); }
function _pushShrineVisitCardsHistory(){
  return;
}
function _openShrineVisitCardsModal(opts){
  opts=opts||{};
  if(_mode!=='shrine') return;
  const base=_oaiCaptureShrineBase('stampbook-open');
  const modal=_ensureShrineVisitCardsModal();
  _shrineVisitCardsTab='visited';
  _shrineVisitCardsDiocese='all';
  window.__OAI_SHRINE_VISIT_STATS_EXPANDED_DIO__='';
  _renderShrineVisitCardsModal();
  try{
    const body=document.getElementById('shrine-visit-cards-body');
    const dio=document.getElementById('shrine-visit-cards-diocese');
    if(body) body.scrollTop=0;
    if(dio) dio.scrollLeft=0;
  }catch(_e){}
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  if(!opts.skipStack){
    _oaiPushShrineBack({type:'stampbook',tab:_shrineVisitCardsTab||'visited',diocese:_shrineVisitCardsDiocese||'all',base:base}, {reset:true});
  }
  _resetShrineVisitCardsTopStable();
  _pushShrineVisitCardsHistory();
}
function _closeShrineVisitCardsModal(opts){
  opts=opts||{};
  const modal=document.getElementById('shrine-visit-cards-modal');
  const wasOpen=!!(modal&&modal.classList.contains('show'));
  if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
  _resetShrineVisitStatsExpansion();
  window.__OAI_SHRINE_VISIT_CARDS_HISTORY__=false;
  window.__OAI_SHRINE_VISIT_CARDS_CLOSING_BY_CODE__=false;
}

function _ensureShrineVisitDetailView(){
  let view=document.getElementById('shrine-visit-detail-view');
  if(view) return view;
  view=document.createElement('div');
  view.id='shrine-visit-detail-view';
  view.className='shrine-visit-detail-view';
  view.setAttribute('aria-hidden','true');
  view.innerHTML='<div class="shrine-visit-detail-head"><div class="shrine-visit-detail-head-title">순례한 성지</div><button type="button" id="shrine-visit-detail-x" class="shrine-visit-detail-x" aria-label="닫기">×</button></div><div id="shrine-visit-detail-body" class="shrine-visit-detail-body"></div>';
  document.body.appendChild(view);
  view.querySelectorAll('#shrine-visit-detail-back,#shrine-visit-detail-x').forEach(function(el){
    el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); _oaiCloseShrineTopOrDirect('detail', function(){ _closeShrineVisitDetail(); }); });
  });
  view.addEventListener('click', function(e){
    const register=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-register]');
    if(register){
      e.preventDefault(); e.stopPropagation();
      const idx=parseInt(window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__,10);
      if(idx>=0&&SHRINES[idx]){
        try{ _mode='shrine'; }catch(_e){}
        _openShrineVisitModal(SHRINES[idx]);
      }
      return;
    }
    const add=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-add]');
    if(add){
      e.preventDefault(); e.stopPropagation();
      const idx=parseInt(add.getAttribute('data-shrine-detail-add'),10);
      if(idx>=0&&SHRINES[idx]) _openShrineVisitModal(SHRINES[idx]);
      return;
    }
    const mapBtn=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-map]');
    if(mapBtn){
      e.preventDefault(); e.stopPropagation();
      const idx=parseInt(mapBtn.getAttribute('data-shrine-detail-map'),10);
      if(idx>=0&&SHRINES[idx]) _openShrineVisitDetailOnMap(idx);
      return;
    }
    const route=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-route]');
    if(route){
      e.preventDefault(); e.stopPropagation();
      const idx=parseInt(route.getAttribute('data-shrine-detail-route'),10);
      if(idx>=0&&SHRINES[idx]){
        const item=SHRINES[idx];
        try{ if(typeof _oaiClearShrineBackStack==='function') _oaiClearShrineBackStack('detail-route'); }catch(e){ console.warn('[가톨릭길동무]', e); }
        _closeShrineVisitDetail({fromPopstate:true});
        _closeShrineVisitCardsModal({fromPopstate:true});
        _curInfoItem={item:item,idx:idx};
        _curFromRegion=false;
        openInAppRoute();
      }
      return;
    }
    const kakao=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-kakao]');
    if(kakao){
      e.preventDefault(); e.stopPropagation();
      const idx=parseInt(kakao.getAttribute('data-shrine-detail-kakao'),10);
      if(idx>=0&&SHRINES[idx]){
        try{ _oaiSaveShrineExternalReturn({source:'pilgrim-detail-kakao',fromStampBook:true,infoIdx:idx}); }catch(e){ console.warn('[가톨릭길동무]', e); }
        _curInfoItem={item:SHRINES[idx],idx:idx};
        _curFromRegion=false;
        openKakaoNav();
      }
      return;
    }
    const hp=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-hp]');
    if(hp){
      e.preventDefault(); e.stopPropagation();
      const url=hp.getAttribute('data-shrine-detail-hp')||'';
      if(url) openCoreExternalUrl(url,{source:'pilgrim-detail-homepage',fromStampBook:true,infoIdx:window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__});
      return;
    }
    const guide=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-guide]');
    if(guide){
      e.preventDefault(); e.stopPropagation();
      const url=guide.getAttribute('data-shrine-detail-guide')||'';
      if(url) openCoreExternalUrl(url,{source:'pilgrim-detail-guide',fromStampBook:true,infoIdx:window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__});
    }
  }, true);
  return view;
}
function _isShrineVisitDetailOpen(){
  const view=document.getElementById('shrine-visit-detail-view');
  return !!(view&&view.classList.contains('show'));
}
function _pushShrineVisitDetailHistory(){
  return;
}
function _renderShrineVisitDetail(idx){
  const body=document.getElementById('shrine-visit-detail-body');
  if(!body) return;
  idx=parseInt(idx,10);
  const item=(idx>=0&&SHRINES[idx])?SHRINES[idx]:null;
  if(!item){ body.innerHTML='<div class="shrine-visit-detail-empty">성지 정보를 찾을 수 없습니다.</div>'; return; }
  const visits=_getShrineVisitDates(item);
  const count=visits.length;
  const headTitle=document.querySelector('#shrine-visit-detail-view .shrine-visit-detail-head-title');
  if(headTitle) headTitle.textContent=count?'순례한 성지':'미방문 성지';
  const recent=count?_formatVisitDate(visits[0].date):'—';
  const dateHtml=count?visits.map(function(v){ return '<span class="shrine-visit-detail-date-chip">'+_visitHtmlEsc(_formatVisitDate(v.date))+'</span>'; }).join(''):'<span class="shrine-visit-detail-empty-date">아직 등록된 날짜가 없습니다.</span>';
  const hpUrl=_getShrineHomepageUrl(item);
  const guideUrl=_getShrineGuideUrl(item);
  const telText=item.tel?_visitHtmlEsc(item.tel):'—';
  const telHref=item.tel?'tel:'+String(item.tel).replace(/[^0-9+]/g,''):'';
  const hpBtn=hpUrl?'<button type="button" class="shrine-visit-detail-action detail-home" data-shrine-detail-hp="'+_visitHtmlEsc(hpUrl)+'">홈페이지</button>':'';
  const guideBtn=guideUrl?'<button type="button" class="shrine-visit-detail-action detail-guide" data-shrine-detail-guide="'+_visitHtmlEsc(guideUrl)+'">성지 상세페이지</button>':'';
  const telBtn=telHref?'<a class="shrine-visit-detail-action detail-tel" href="'+_visitHtmlEsc(telHref)+'"><span class="detail-tel-icon">📞</span><span>'+telText+'</span></a>':'';
  const routeBtn='<button type="button" class="shrine-visit-detail-action detail-route" data-shrine-detail-route="'+idx+'">경로검색</button>';
  const kakaoBtn='<button type="button" class="shrine-visit-detail-action detail-kakao" data-shrine-detail-kakao="'+idx+'">카카오내비</button>';
  const primaryRow='<div class="shrine-visit-detail-action-row detail-primary-row">'+telBtn+routeBtn+'</div>';
  const linkRow=(hpBtn||guideBtn)?'<div class="shrine-visit-detail-action-row detail-link-row">'+hpBtn+guideBtn+'</div>':'';
  const kakaoRow='<div class="shrine-visit-detail-action-row detail-kakao-row">'+kakaoBtn+'</div>';
  body.innerHTML='<section class="shrine-visit-detail-hero"><div class="shrine-visit-detail-hero-head"><div class="shrine-visit-detail-kicker">순례 기록</div><button type="button" class="shrine-visit-detail-register" data-shrine-detail-register="1" aria-label="순례등록">순례등록</button></div><div class="shrine-visit-detail-count">순례 '+count+'회</div><div class="shrine-visit-detail-recent">최근 순례일 '+_visitHtmlEsc(recent)+'</div><div class="shrine-visit-detail-date-title">순례 날짜</div><div class="shrine-visit-detail-date-list">'+dateHtml+'</div></section><section class="shrine-visit-detail-info"><div class="shrine-visit-detail-info-head"><div class="shrine-visit-detail-section-title">성지 정보</div><button type="button" class="shrine-visit-detail-map-btn" data-shrine-detail-map="'+idx+'">지도에서 보기</button></div><div class="shrine-visit-detail-name">'+_visitHtmlEsc(item.name||'')+'</div><div class="shrine-visit-detail-row"><span>교구</span><strong>'+_visitHtmlEsc(item.diocese||'—')+'</strong></div><div class="shrine-visit-detail-row"><span>주소</span><strong>'+_visitHtmlEsc(item.addr||'—')+'</strong></div><div class="shrine-visit-detail-row"><span>전화</span><strong>'+telText+'</strong></div><div class="shrine-visit-detail-actions">'+primaryRow+linkRow+kakaoRow+'</div></section>';
}
function _openShrineVisitDetailOnMap(idx, opts){
  opts=opts||{};
  idx=parseInt(idx,10);
  if(!(idx>=0) || !SHRINES[idx]) return;
  const item=SHRINES[idx];
  if(!opts.skipStack){
    _oaiPushShrineBack({type:'info-card-from-record',idx:idx,returnTo:'stampbook',base:window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('detail-map')});
  }
  try{ _closeShrineVisitDetail({fromPopstate:true}); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ _closeShrineVisitCardsModal({fromPopstate:true}); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof _closeShrineVisitModal==='function') _closeShrineVisitModal({fromPopstate:true}); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    _mode='shrine';
    _screen='map';
    _filterDio='all';
    _listSrch='';
    _curFromRegion=false;
    document.documentElement.classList.add('app-active');
    document.documentElement.classList.remove('parish-mode','retreat-mode');
    const cover=$('cover'); if(cover){ cover.style.opacity='0'; cover.style.display='none'; }
    closeAllTabs();
    closeInfoCard({keepMap:true});
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  function showTarget(){
    try{
      if(!_map) return false;
      if(!_markers || !_markers[idx]){
        try{ _restoreMapMarkers(); }catch(_e){}
        return false;
      }
      closeAllTabs();
      _restoreMapMarkers();
      _selectShrineMarker(idx);
      _showInfoCard(item, idx);
      _focusMarkerAboveInfoCard(item);
      return true;
    }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
  }
  if(!_map || !$('map') || !$('map').children || !$('map').children.length){
    try{
      _resetMapState();
      _mapInited=true;
      window._noAutoNearby=true;
      _loadMap();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  let tries=0;
  (function retry(){
    if(showTarget()) return;
    if(tries++<24) setTimeout(retry,120);
  })();
}
function _openShrineVisitDetail(idx, opts){
  opts=opts||{};
  idx=parseInt(idx,10);
  if(!(idx>=0)&&idx!==0) return;
  if(!SHRINES[idx]) return;
  const view=_ensureShrineVisitDetailView();
  window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__=idx;
  _renderShrineVisitDetail(idx);
  view.classList.add('show');
  view.setAttribute('aria-hidden','false');
  if(!opts.skipStack){
    _oaiPushShrineBack({type:'record-detail',idx:idx,base:window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('detail-open')});
  }
  _pushShrineVisitDetailHistory();
}
function _closeShrineVisitDetail(opts){
  opts=opts||{};
  const view=document.getElementById('shrine-visit-detail-view');
  const wasOpen=!!(view&&view.classList.contains('show'));
  if(view){ view.classList.remove('show'); view.setAttribute('aria-hidden','true'); }
  window.__OAI_SHRINE_VISIT_DETAIL_HISTORY__=false;
  window.__OAI_SHRINE_VISIT_DETAIL_CLOSING_BY_CODE__=false;
}

function _scrollShrineVisitDioceseTabIntoView(value, behavior){
  try{
    const wrap=document.getElementById('shrine-visit-cards-diocese');
    if(!wrap) return;
    let btn=null;
    wrap.querySelectorAll('[data-shrine-visit-diocese]').forEach(function(el){
      if(String(el.getAttribute('data-shrine-visit-diocese')||'')===String(value)) btn=el;
    });
    if(!btn) return;
    const target=Math.max(0, btn.offsetLeft - Math.max(0,(wrap.clientWidth-btn.offsetWidth)/2));
    if(typeof wrap.scrollTo==='function') wrap.scrollTo({left:target, behavior:behavior||'smooth'});
    else wrap.scrollLeft=target;
    if(btn.scrollIntoView) setTimeout(function(){ try{ btn.scrollIntoView({behavior:behavior||'smooth', block:'nearest', inline:'center'}); }catch(_e){} }, 80);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _scrollShrineVisitExpandedStatsIntoView(value){
  try{
    const body=document.getElementById('shrine-visit-cards-body');
    if(!body||!value) return;
    const safe=String(value).replace(/\"/g,'\\"');
    const row=document.querySelector('[data-shrine-stat-diocese="'+safe+'"]');
    if(!row) return;
    const bodyRect=body.getBoundingClientRect();
    const rowRect=row.getBoundingClientRect();
    const topGap=rowRect.top-bodyRect.top;
    const bottomGap=rowRect.bottom-(bodyRect.bottom-16);
    if(topGap<8){
      body.scrollTop=Math.max(0, body.scrollTop+topGap-8);
    }else if(bottomGap>0){
      body.scrollTop=Math.min(Math.max(0,body.scrollHeight-body.clientHeight), body.scrollTop+bottomGap+8);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}


function _renderShrineVisitCardsStatsView(allVisited,allUnvisited,visited,unvisited,total){
  const allTotal=(Array.isArray(SHRINES)?SHRINES.length:(allVisited.length+allUnvisited.length));
  const allCount=allVisited.length;
  const allPct=allTotal?Math.round((allCount/allTotal)*100):0;
  const expanded=window.__OAI_SHRINE_VISIT_STATS_EXPANDED_DIO__||'';
  const entries=_getShrineVisitStatsDioceseEntries().filter(function(pair){ return pair&&pair[0]&&pair[0]!=='all'; });
  const rows=entries.map(function(pair){
    const key=pair[0], label=pair[1];
    const totalBy=(Array.isArray(SHRINES)?SHRINES.filter(function(item){ return String(item&&item.diocese||'')===String(key); }).length:0);
    const visitEntries=allVisited.filter(function(entry){ return String(entry.item&&entry.item.diocese||'')===String(key); });
    const visitBy=visitEntries.length;
    const pct=totalBy?Math.round((visitBy/totalBy)*100):0;
    return {key:key,label:label,total:totalBy,visited:visitBy,pct:pct,entries:visitEntries};
  }).filter(function(row){ return row.total>0; }).sort(function(a,b){
    return (b.pct-a.pct) || (b.visited-a.visited) || (b.total-a.total) || String(a.label||'').localeCompare(String(b.label||''),'ko');
  }).map(function(row){
    const active=String(expanded)===String(row.key);
    const open=String(expanded)===String(row.key);
    const itemHtml=open?('<div class="shrine-visit-stat-items">'+(row.entries.length?row.entries.map(function(entry){
      const recent=entry.recent?_formatVisitDate(entry.recent):'—';
      return '<div class="shrine-visit-stat-item"><span>'+_visitHtmlEsc(entry.item&&entry.item.name||'')+'</span><strong>순례 '+entry.count+'회</strong><em>'+_visitHtmlEsc(recent)+'</em></div>';
    }).join(''):'<div class="shrine-visit-stat-item empty">순례 기록이 없습니다.</div>')+'</div>'):'';
    return '<button type="button" class="shrine-visit-stat-row'+(active?' active':'')+'" data-shrine-stat-diocese="'+_visitHtmlEsc(row.key)+'"><span class="shrine-visit-stat-name">'+_visitHtmlEsc(row.label)+'</span><strong>'+row.visited+' / '+row.total+'</strong><em>'+row.pct+'%</em></button>'+itemHtml;
  }).join('');
  return '<div class="shrine-visit-stats-view"><section class="shrine-visit-stat-total"><div class="shrine-visit-stat-kicker">전체 순례 현황</div><strong>'+allCount+'곳 순례 / '+allTotal+'곳</strong><span>'+allPct+'% 순례</span></section><section class="shrine-visit-stat-list"><div class="shrine-visit-stat-kicker">교구별 순례 현황 · 순례율 높은 순</div>'+rows+'</section></div>';
}

function _renderShrineVisitCardsModal(){
  const body=document.getElementById('shrine-visit-cards-body');
  if(!body) return;
  const allVisited=_getShrineVisitEntries();
  const allUnvisited=_getShrineUnvisitedEntries();
  const allNew=_getShrineNewEntries();
  const rawTab=_shrineVisitCardsTab||'visited';
  const active=(rawTab==='unvisited'||rawTab==='new'||rawTab==='stats')?rawTab:'visited';
  _shrineVisitCardsTab=active;
  const visited=_filterShrineVisitEntriesByDiocese(allVisited);
  const unvisited=_filterShrineVisitEntriesByDiocese(allUnvisited);
  const newEntries=_filterShrineVisitEntriesByDiocese(allNew);
  const total=visited.length+unvisited.length;
  _renderShrineVisitDioceseTabs(visited.length,total);
  const dioWrap=document.getElementById('shrine-visit-cards-diocese');
  if(dioWrap){
    const hideDio=(active==='stats');
    dioWrap.classList.toggle('stats-hidden', hideDio);
    dioWrap.setAttribute('aria-hidden', hideDio?'true':'false');
  }
  const stats=document.getElementById('shrine-visit-cards-stats');
  if(stats){
    const hideTopStats=(active==='stats');
    stats.classList.toggle('stats-tab-hidden', hideTopStats);
    const displayVisited=visited.length;
    const displayTotal=total;
    const pct=displayTotal?Math.round((displayVisited/displayTotal)*100):0;
    const dioLabel=_getShrineVisitDioceseLabel(_shrineVisitCardsDiocese||'all');
    stats.innerHTML=hideTopStats?'':'<strong>'+displayVisited+'곳 순례</strong><span>/ '+displayTotal+'곳</span><b>ㅣ</b><span>'+pct+'% 순례</span><em>'+_visitHtmlEsc(dioLabel)+'</em>';
  }
  if(active!=='stats'){
    setTimeout(function(){ _scrollShrineVisitDioceseTabIntoView(_shrineVisitCardsDiocese||'all','auto'); }, 40);
  }
  const modal=document.getElementById('shrine-visit-cards-modal');
  if(modal){
    modal.querySelectorAll('[data-shrine-visit-cards-tab]').forEach(function(btn){
      const val=btn.getAttribute('data-shrine-visit-cards-tab')||'visited';
      btn.classList.toggle('active', val===active);
      btn.classList.toggle('on', val===active);
      btn.textContent=(val==='visited')?'순례한 성지':(val==='unvisited'?'미방문 성지':(val==='new'?'신규 성지':'통계'));
    });
  }
  body.classList.toggle('unvisited', active==='unvisited');
  body.classList.toggle('new', active==='new');
  body.classList.toggle('stats', active==='stats');
  if(active==='stats'){
    body.innerHTML=_renderShrineVisitCardsStatsView(allVisited,allUnvisited,visited,unvisited,total);
    return;
  }
  const entries=(active==='new')?newEntries:((active==='unvisited')?unvisited:visited);
  if(!entries.length){
    body.innerHTML='<div class="shrine-visit-cards-empty">'+(active==='visited'?'아직 순례등록한 성지가 없습니다.':(active==='new'?'신규 성지가 없습니다.':'모든 성지를 순례했습니다.'))+'</div>';
    return;
  }
  body.innerHTML='<div class="shrine-visit-card-grid">'+entries.map(function(entry){
    const item=entry.item;
    const typeClass=_shrineVisitTypeClass(item);
    const typeLabel=_shrineVisitTypeLabel(item);
    const isVisited=entry.count>0;
    const cardState=(active==='new')?'new':(isVisited?'visited':'unvisited');
    const countText=(active==='new')?(entry.count?('순례 '+entry.count+'회'):'신규'):(isVisited?('순례 '+entry.count+'회'):'미방문');
    const sealHtml=cardState==='visited'?'<span class="shrine-visit-card-seal" aria-hidden="true">순례</span>':'';
    return '<button type="button" class="shrine-visit-card-badge '+cardState+' '+typeClass+'" data-shrine-visit-card="'+entry.idx+'"><span class="shrine-visit-card-stamp">'+_visitHtmlEsc(typeLabel)+'</span><span class="shrine-visit-card-dio">'+_visitHtmlEsc(item.diocese||'')+'</span><strong>'+_visitHtmlEsc(item.name||'')+'</strong><span class="shrine-visit-card-count">'+_visitHtmlEsc(countText)+'</span>'+sealHtml+'</button>';
  }).join('')+'</div>';
}

function _loadShrineAutoVisitPrompts(){
  try{
    const raw=localStorage.getItem(OAI_SHRINE_AUTO_VISIT_PROMPT_KEY);
    const data=raw?JSON.parse(raw):{};
    return data && typeof data==='object' ? data : {};
  }catch(e){ console.warn('[가톨릭길동무]', e); return {}; }
}
function _saveShrineAutoVisitPrompts(data){
  try{ localStorage.setItem(OAI_SHRINE_AUTO_VISIT_PROMPT_KEY, JSON.stringify(data||{})); }
  catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _autoVisitPromptKey(item,date){
  return _getShrineVisitKey(item)+'|'+String(date||_todayISODate());
}
function _wasAutoVisitPromptedToday(item,date){
  const data=_loadShrineAutoVisitPrompts();
  return !!data[_autoVisitPromptKey(item,date)];
}
function _markAutoVisitPromptedToday(item,date,action){
  const data=_loadShrineAutoVisitPrompts();
  data[_autoVisitPromptKey(item,date)]={date:date||_todayISODate(),action:action||'later',savedAt:new Date().toISOString()};
  _saveShrineAutoVisitPrompts(data);
}
function _nearestShrineWithinAutoVisitRadius(lat,lng){
  if(_mode!=='shrine'||!Array.isArray(SHRINES)) return null;
  let best=null,bestM=Infinity;
  SHRINES.forEach(function(s,idx){
    if(!s||!s.lat||!s.lng) return;
    const m=calcDist(lat,lng,s.lat,s.lng)*1000;
    if(m<bestM){ bestM=m; best={item:s,idx:idx,meters:m}; }
  });
  if(best && best.meters<=OAI_SHRINE_AUTO_VISIT_RADIUS_M) return best;
  return null;
}
function _ensureShrineAutoVisitModal(){
  let modal=document.getElementById('shrine-auto-visit-modal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='shrine-auto-visit-modal';
  modal.className='shrine-auto-visit-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="shrine-auto-visit-backdrop" data-shrine-auto-close="1"></div><div class="shrine-auto-visit-panel" role="dialog" aria-modal="true" aria-label="GPS 순례등록"><div class="shrine-auto-visit-kicker">GPS 자동 감지</div><div id="shrine-auto-visit-title" class="shrine-auto-visit-title"></div><div id="shrine-auto-visit-name" class="shrine-auto-visit-name"></div><div id="shrine-auto-visit-dist" class="shrine-auto-visit-dist"></div><div class="shrine-auto-visit-actions"><button type="button" id="shrine-auto-visit-save" class="shrine-auto-visit-save">오늘 순례등록</button><button type="button" id="shrine-auto-visit-later" class="shrine-auto-visit-later">나중에</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-shrine-auto-close],#shrine-auto-visit-later').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      const entry=window.__OAI_SHRINE_AUTO_VISIT_ENTRY__;
      if(entry&&entry.item) _markAutoVisitPromptedToday(entry.item,_todayISODate(),'later');
      _oaiCloseShrineTopOrDirect('auto', function(){ _closeShrineAutoVisitModal(); });
    });
  });
  const save=modal.querySelector('#shrine-auto-visit-save');
  if(save) save.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    const entry=window.__OAI_SHRINE_AUTO_VISIT_ENTRY__;
    if(!entry||!entry.item){ _oaiCloseShrineTopOrDirect('auto', function(){ _closeShrineAutoVisitModal(); }); return; }
    const date=_todayISODate();
    if(!_hasShrineVisitOnDate(entry.item,date)) _addShrineVisit(entry.item,date,'gps');
    _markAutoVisitPromptedToday(entry.item,date,'registered');
    if(_curInfoItem&&_curInfoItem.item===entry.item) _renderInfoCardShrineVisit(entry.item);
    try{ if(_activeTab==='list') renderList(); }catch(_e){}
    try{ if(_activeTab==='nearby') _loadNearby(); }catch(_e){}
    _refreshShrineVisitMapState();
    _oaiCloseShrineTopOrDirect('auto', function(){ _closeShrineAutoVisitModal(); });
  });
  return modal;
}
function _openShrineAutoVisitModal(entry, opts){
  opts=opts||{};
  if(!entry||!entry.item) return;
  const modal=_ensureShrineAutoVisitModal();
  window.__OAI_SHRINE_AUTO_VISIT_ENTRY__=entry;
  const title=document.getElementById('shrine-auto-visit-title');
  const name=document.getElementById('shrine-auto-visit-name');
  const dist=document.getElementById('shrine-auto-visit-dist');
  const placeName=entry.item.name||'성지';
  if(title) title.textContent=placeName+'에 도착했습니다.';
  if(name) name.textContent='';
  if(dist) dist.textContent='현재 위치에서 약 '+Math.max(1,Math.round(entry.meters))+'m';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  if(!opts.skipStack){
    _oaiPushShrineBack({type:'auto-register-modal',idx:_oaiShrineItemIndex(entry.item),base:window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('auto-register-open')});
  }
}
function _closeShrineAutoVisitModal(){
  const modal=document.getElementById('shrine-auto-visit-modal');
  if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
  window.__OAI_SHRINE_AUTO_VISIT_PROMPTING__=false;
}
function _isAnyVisitModalOpen(){
  return !!(document.querySelector('#shrine-visit-modal.show,#shrine-visit-cards-modal.show,#shrine-auto-visit-modal.show,#shrine-visit-detail-view.show'));
}
function _maybePromptAutoShrineVisit(lat,lng){
  try{
    if(_mode!=='shrine'||!lat||!lng) return;
    if(window.__OAI_SHRINE_AUTO_VISIT_PROMPTING__||_isAnyVisitModalOpen()) return;
    const entry=_nearestShrineWithinAutoVisitRadius(lat,lng);
    if(!entry||!entry.item) return;
    const date=_todayISODate();
    if(_hasShrineVisitOnDate(entry.item,date)) return;
    if(_wasAutoVisitPromptedToday(entry.item,date)) return;
    window.__OAI_SHRINE_AUTO_VISIT_PROMPTING__=true;
    setTimeout(function(){
      if(_mode==='shrine'&&!_isAnyVisitModalOpen()) _openShrineAutoVisitModal(entry);
      else window.__OAI_SHRINE_AUTO_VISIT_PROMPTING__=false;
    }, 700);
  }catch(e){ console.warn('[가톨릭길동무]', e); window.__OAI_SHRINE_AUTO_VISIT_PROMPTING__=false; }
}

function _openShrineFromAbsoluteIndex(idx){
  try{
    idx=parseInt(idx,10);
    if(!(idx>=0) || !SHRINES[idx]) return;
    const item=SHRINES[idx];
    closeAllTabs();
    closeInfoCard();
    _restoreMapMarkers();
    _selectShrineMarker(idx);
    _showInfoCard(item, idx);
    _focusMarkerAboveInfoCard(item);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _bindPilgrimRegisterDelegation(){
  try{
    if(window.__OAI_PILGRIM_REGISTER_DELEGATION_BOUND__) return;
    window.__OAI_PILGRIM_REGISTER_DELEGATION_BOUND__=true;
    let activeBtn=null, sx=0, sy=0, moved=false;
    document.addEventListener('touchstart', function(e){
      const btn=e.target&&e.target.closest&&e.target.closest('.li-pilgrim-register');
      activeBtn=btn||null; moved=false;
      const t=e.touches&&e.touches[0];
      if(btn&&t){ sx=t.clientX; sy=t.clientY; }
    }, {capture:true, passive:true});
    document.addEventListener('touchmove', function(e){
      if(!activeBtn) return;
      const t=e.touches&&e.touches[0];
      if(t && (Math.abs(t.clientX-sx)>10 || Math.abs(t.clientY-sy)>10)) moved=true;
    }, {capture:true, passive:true});
    document.addEventListener('click', function(e){
      const detailBtn=e.target&&e.target.closest&&e.target.closest('[data-shrine-detail-register]');
      if(detailBtn){
        e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        const idx=parseInt(window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__,10);
        if(idx>=0 && SHRINES[idx]){
          try{ _mode='shrine'; }catch(_e){}
          _openShrineVisitModal(SHRINES[idx]);
        }
        activeBtn=null;
        return;
      }
      const btn=e.target&&e.target.closest&&e.target.closest('.li-pilgrim-register');
      if(!btn) return;
      e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      if(moved){ moved=false; activeBtn=null; return; }
      const idx=parseInt(btn.getAttribute('data-shrine-idx'),10);
      if(idx>=0 && SHRINES[idx]) _openShrineVisitModal(SHRINES[idx]);
      activeBtn=null;
    }, true);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
_bindPilgrimRegisterDelegation();
function _shrineVisitBadgeHtml(item,context){
  if(_mode!=='shrine'||!item||!_isVisitedShrine(item)) return '';
  const count=_getShrineVisitCount(item);
  const label=context==='compact'?'순례한 성지':'순례한 성지 · '+count+'회';
  return '<span class="shrine-visited-chip">'+label+'</span>';
}
function _isNewShrineItem(item){
  return !!(item && (item.isNew === true || item.addedGroup));
}
function _shrineNewBadgeHtml(item){
  if(_mode!=='shrine'||!_isNewShrineItem(item)) return '';
  return '<span class="shrine-new-chip">신규</span>';
}
function _ensureShrineVisitModal(){
  let modal=document.getElementById('shrine-visit-modal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='shrine-visit-modal';
  modal.className='shrine-visit-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="shrine-visit-backdrop" data-shrine-visit-close="1"></div><div class="shrine-visit-panel" role="dialog" aria-modal="true" aria-label="순례한 성지 등록"><div class="shrine-visit-head"><div><div class="shrine-visit-kicker">순례한 성지</div><div id="shrine-visit-title" class="shrine-visit-title"></div></div><button id="shrine-visit-x" class="shrine-visit-x" type="button" aria-label="닫기">×</button></div><label class="shrine-visit-label">방문 날짜<input id="shrine-visit-date" type="date"></label><div class="shrine-visit-actions"><button id="shrine-visit-save" type="button" class="shrine-visit-save">등록</button><button id="shrine-visit-cancel" type="button" class="shrine-visit-cancel">취소</button></div><div id="shrine-visit-list" class="shrine-visit-list"></div></div>';
  document.body.appendChild(modal);
  function close(){ _closeShrineVisitModal(); }
  modal.querySelectorAll('[data-shrine-visit-close],#shrine-visit-x,#shrine-visit-cancel').forEach(function(el){ el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); _oaiCloseShrineTopOrDirect('register', function(){ close(); }); }); });
  const save=modal.querySelector('#shrine-visit-save');
  if(save) save.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    const item=window.__OAI_CURRENT_SHRINE_VISIT_ITEM__;
    const inp=document.getElementById('shrine-visit-date');
    const date=inp&&inp.value?inp.value:_todayISODate();
    if(_hasShrineVisitOnDate(item,date)){ alert('이미 등록된 순례 날짜입니다.'); return; }
    if(!_addShrineVisit(item,date,'manual')){ alert('방문 날짜를 확인해 주세요.'); return; }
    _renderShrineVisitModalList(item);
    if(_curInfoItem&&_curInfoItem.item===item) _renderInfoCardShrineVisit(item);
    try{ if(_activeTab==='list') renderList(); }catch(_e){}
    try{ if(_activeTab==='nearby') _loadNearby(); }catch(_e){}
    _refreshShrineVisitMapState();
    try{ if(_isShrineVisitDetailOpen() && window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__!=null) _renderShrineVisitDetail(window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__); }catch(_e){}
    try{ if(inp) inp.value=_todayISODate(); }catch(_e){}
  });
  return modal;
}

function _isShrineVisitModalOpen(){
  const modal=document.getElementById('shrine-visit-modal');
  return !!(modal && modal.classList.contains('show'));
}
function _pushShrineVisitModalHistory(){
  return;
}
function _openShrineVisitModal(item, opts){
  opts=opts||{};
  if(_mode!=='shrine'||!item) return;
  const modal=_ensureShrineVisitModal();
  window.__OAI_CURRENT_SHRINE_VISIT_ITEM__=item;
  const title=document.getElementById('shrine-visit-title');
  const date=document.getElementById('shrine-visit-date');
  if(title) title.textContent=item.name||'성지';
  if(date) date.value=_todayISODate();
  _renderShrineVisitModalList(item);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  if(!opts.skipStack){
    _oaiPushShrineBack({type:'register-modal',idx:_oaiShrineItemIndex(item),base:window.__OAI_SHRINE_BACK_BASE__||_oaiCaptureShrineBase('register-open')});
  }
  _pushShrineVisitModalHistory();
}
function _closeShrineVisitModal(opts){
  opts=opts||{};
  const modal=document.getElementById('shrine-visit-modal');
  const wasOpen=!!(modal&&modal.classList.contains('show'));
  if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
  window.__OAI_SHRINE_VISIT_MODAL_HISTORY__=false;
  window.__OAI_SHRINE_VISIT_MODAL_CLOSING_BY_CODE__=false;
}


function _renderShrineVisitModalList(item){
  const list=document.getElementById('shrine-visit-list');
  if(!list) return;
  const visits=_getShrineVisitDates(item);
  if(!visits.length){ list.innerHTML='<div class="shrine-visit-empty">아직 등록된 방문 날짜가 없습니다.</div>'; return; }
  list.innerHTML='<div class="shrine-visit-list-title">방문 날짜 '+visits.length+'회</div>'+visits.map(function(v,i){
    const isGps=String(v&&v.method||'').toLowerCase()==='gps';
    return '<div class="shrine-visit-date-row'+(isGps?' gps':'')+'"><span>'+_formatVisitDate(v.date)+'</span>'+(isGps?'<em class="shrine-visit-gps-lock">GPS 등록</em>':'<button type="button" data-visit-del="'+i+'">삭제</button>')+'</div>';
  }).join('');
  list.querySelectorAll('[data-visit-del]').forEach(function(btn){ btn.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    const idx=parseInt(btn.getAttribute('data-visit-del'),10);
    const target=_getShrineVisitDates(item)[idx];
    if(target && String(target.method||'').toLowerCase()==='gps'){ alert('GPS로 등록된 순례 기록은 삭제할 수 없습니다.'); return; }
    if(confirm('이 방문 날짜를 삭제할까요?')){
      _deleteShrineVisitAt(item,idx);
      _renderShrineVisitModalList(item);
      if(_curInfoItem&&_curInfoItem.item===item) _renderInfoCardShrineVisit(item);
      try{ if(_activeTab==='list') renderList(); }catch(_e){}
      try{ if(_activeTab==='nearby') _loadNearby(); }catch(_e){}
      _refreshShrineVisitMapState();
      try{ if(_isShrineVisitDetailOpen() && window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__!=null) _renderShrineVisitDetail(window.__OAI_CURRENT_SHRINE_VISIT_DETAIL_IDX__); }catch(_e){}
    }
  }); });
}

function _renderInfoCardShrinePilgrimBadge(item){
  const icTypeEl=$('ic-type');
  if(!icTypeEl) return;
  icTypeEl.classList.remove('shrine-pilgrim-visited','shrine-pilgrim-register-badge');
  icTypeEl.removeAttribute('role');
  icTypeEl.removeAttribute('tabindex');
  icTypeEl.onclick=null;
  icTypeEl.onkeydown=null;
  if(_mode==='shrine' && item){
    const open=function(e){
      if(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }
      _openShrineVisitModal(item);
    };
    if(_isVisitedShrine(item)){
      icTypeEl.textContent='순례한 성지';
      icTypeEl.classList.add('shrine-pilgrim-visited');
      icTypeEl.setAttribute('role','button');
      icTypeEl.setAttribute('tabindex','0');
      icTypeEl.onclick=open;
      icTypeEl.onkeydown=function(e){ if(e && (e.key==='Enter'||e.key===' ')) open(e); };
      return;
    }
    icTypeEl.textContent='순례등록';
    icTypeEl.classList.add('shrine-pilgrim-register-badge');
    icTypeEl.setAttribute('role','button');
    icTypeEl.setAttribute('tabindex','0');
    icTypeEl.onclick=open;
    icTypeEl.onkeydown=function(e){ if(e && (e.key==='Enter'||e.key===' ')) open(e); };
  }else if(item){
    icTypeEl.textContent = _mode==='retreat' ? '피정의 집' : '성당';
  }
}

function _renderInfoCardShrineVisit(item){
  _renderInfoCardShrinePilgrimBadge(item);
  const box=document.getElementById('ic-shrine-visit');
  if(box){ box.style.display='none'; box.innerHTML=''; }
}

function _setMassQuickReturn(on){
  try{
    window.__MASS_QUICK_RETURN__ = !!on;
    if(on){
      var stamp = String(Date.now());
      sessionStorage.setItem('oai_mass_quick_return','1');
      sessionStorage.setItem('oai_mass_quick_return_ts', stamp);
      /* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 매일미사/성가/성경 배너 복귀 상태는 장기 보존하지 않고 세션 안에서만 유지한다. */
      try{ localStorage.removeItem('oai_mass_quick_return'); localStorage.removeItem('oai_mass_quick_return_ts'); }catch(_e){}
    }else{
      sessionStorage.removeItem('oai_mass_quick_return');
      sessionStorage.removeItem('oai_mass_quick_return_ts');
      localStorage.removeItem('oai_mass_quick_return');
      localStorage.removeItem('oai_mass_quick_return_ts');
    }
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function _setPrayerQuickReturn(on){
  try{
    window.__MASS_QUICK_FROM_PRAYER__ = !!on;
    window.__OAI_PRAYER_FROM_QUICK_LOCK__ = !!on;
    if(on){
      var stamp = String(Date.now());
      sessionStorage.setItem('oai_prayer_quick_return','1');
      sessionStorage.setItem('oai_prayer_quick_return_ts', stamp);
      sessionStorage.setItem('oai_prayer_from_quick_lock','1');
    }else{
      sessionStorage.removeItem('oai_prayer_quick_return');
      sessionStorage.removeItem('oai_prayer_quick_return_ts');
      sessionStorage.removeItem('oai_prayer_from_quick_lock');
    }
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function _clearPrayerQuickReturn(){ _setPrayerQuickReturn(false); }
function _setFaithReturnTarget(target){
  try{
    target = target || '';
    window.__OAI_FAITH_RETURN_TARGET__ = target;
    if(target) sessionStorage.setItem('oai_faith_return_target', target);
    else sessionStorage.removeItem('oai_faith_return_target');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _getFaithReturnTarget(){
  try{ return window.__OAI_FAITH_RETURN_TARGET__ || sessionStorage.getItem('oai_faith_return_target') || ''; }
  catch(e){ return window.__OAI_FAITH_RETURN_TARGET__ || ''; }
}
function _clearFaithReturnTarget(){ _setFaithReturnTarget(''); }
function _shouldFaithReturnToMassQuick(){
  try{
    return _getFaithReturnTarget() === 'massQuick' ||
      (typeof _shouldMassQuickReturn === 'function' && _shouldMassQuickReturn()) ||
      (typeof _shouldPrayerQuickReturn === 'function' && _shouldPrayerQuickReturn()) ||
      (typeof _isPrayerPopupReturnSource === 'function' && _isPrayerPopupReturnSource());
  }catch(e){ console.warn('[가톨릭길동무]', e); return _getFaithReturnTarget() === 'massQuick'; }
}
function _isFreshMassQuickReturnStore(store){
  try{
    if(!store || store.getItem('oai_mass_quick_return') !== '1') return false;
    var ts = parseInt(store.getItem('oai_mass_quick_return_ts') || '0', 10) || 0;
    if(!ts) return true;
    return Date.now() - ts < 5 * 60 * 1000;
  }catch(e){ return false; }
}
function _isFreshPrayerQuickReturn(){
  try{
    if(sessionStorage.getItem('oai_prayer_quick_return') !== '1') return false;
    var ts = parseInt(sessionStorage.getItem('oai_prayer_quick_return_ts') || '0', 10) || 0;
    if(!ts) return true;
    return Date.now() - ts < 30 * 60 * 1000;
  }catch(e){ return false; }
}
function _shouldMassQuickReturn(){
  try{
    return window.__MASS_QUICK_RETURN__ === true ||
      _isFreshMassQuickReturnStore(sessionStorage);
  }catch(e){ console.warn("[가톨릭길동무]", e); return window.__MASS_QUICK_RETURN__ === true; }
}
function _shouldPrayerQuickReturn(){
  try{
    return window.__MASS_QUICK_FROM_PRAYER__ === true ||
      window.__OAI_PRAYER_FROM_QUICK_LOCK__ === true ||
      sessionStorage.getItem('oai_prayer_from_quick_lock') === '1' ||
      _isFreshPrayerQuickReturn();
  }catch(e){ console.warn("[가톨릭길동무]", e); return window.__MASS_QUICK_FROM_PRAYER__ === true || window.__OAI_PRAYER_FROM_QUICK_LOCK__ === true; }
}
function _isPageReloadNavigation(){
  try{
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
    if(nav && nav[0] && nav[0].type === 'reload') return true;
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ return performance.navigation && performance.navigation.type === 1; }
  catch(e){ return false; }
}
function _isFreshTopLevelNavigation(){
  try{
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
    if(nav && nav[0] && nav[0].type === 'navigate') return true;
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ return performance.navigation && performance.navigation.type === 0; }
  catch(e){ return false; }
}
function _clearMassQuickReturnForReload(){
  try{
    window.__MASS_QUICK_RETURN__ = false;
    sessionStorage.removeItem('oai_mass_quick_return');
    sessionStorage.removeItem('oai_mass_quick_return_ts');
    localStorage.removeItem('oai_mass_quick_return');
    localStorage.removeItem('oai_mass_quick_return_ts');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
if(_isPageReloadNavigation() || _isFreshTopLevelNavigation()){
  _clearMassQuickReturnForReload();
  _clearPrayerQuickReturn();
  try{ _clearFaithReturnTarget(); }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _resetCoverExitReady(){
  try{
    window._exitReady = false;
    clearTimeout(window._exitTimer);
    const bt = document.getElementById('_bt');
    if(bt) bt.remove();
    const toast = document.getElementById('oai-cover-exit-toast');
    if(toast) toast.classList.remove('show');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function _clearCoverExitArmed(){
  try{
    window.__oaiCoverExitUntil = 0;
    sessionStorage.removeItem('oai_cover_exit_armed_until');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function _armCoverExitWindow(){
  try{
    var until = Date.now() + 2500;
    window.__oaiCoverExitUntil = until;
    sessionStorage.setItem('oai_cover_exit_armed_until', String(until));
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function _isCoverExitArmed(){
  try{
    var until = Number(window.__oaiCoverExitUntil || sessionStorage.getItem('oai_cover_exit_armed_until') || 0);
    return !!(until && Date.now() < until);
  }catch(e){ return false; }
}
function _isCoverScreenVisible(){
  try{
    var cover = document.getElementById('cover');
    if(!cover) return !document.documentElement.classList.contains('app-active');
    if(cover.classList.contains('hidden')) return false;
    var st = window.getComputedStyle ? window.getComputedStyle(cover) : null;
    if(st && (st.display === 'none' || st.visibility === 'hidden')) return false;
    return true;
  }catch(e){
    try{ return !document.documentElement.classList.contains('app-active'); }catch(_e){ return false; }
  }
}
function _hasOpenAppSurface(){
  try{
    return !!document.querySelector('#diocese-view.open,#web-view.open,#trail-view.open,#qna-view.open,#missa-view.open,#prayer-view.open,.module-view.open');
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _isAppScreenActive(){
  try{ if(_hasOpenAppSurface()) return true; }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(_isCoverScreenVisible()) return false; }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ return document.documentElement.classList.contains('app-active'); }catch(e){ return false; }
}
function _ensureCoverBackTrap(reason){
  return;
}
function _resetCoverBackTrap(reason){
  return;
}
function _ensureAppBackTrap(reason){
  return;
}
function _resetAppBackTrap(reason){
  return;
}
function _pushCoverOverlayBackTrap(kind, reason){
  return;
}
function _armMassQuickHistoryTrap(opts){
  return;
}
function _hideMassQuickMenuOnly(afterHidden, opts){
  const modal=document.getElementById('mass-quick-modal');
  var deferHideUntilAfter = !!(opts && opts.deferHideUntilAfter);
  _resetCoverExitReady();
  _clearCoverExitArmed();

  function hideQuickModal(){
    if(modal){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
    }
  }

  if(!deferHideUntilAfter) hideQuickModal();

  function done(){
    try{
      if(typeof afterHidden === 'function') afterHidden();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    finally{
      if(deferHideUntilAfter){
        if(window.requestAnimationFrame) requestAnimationFrame(hideQuickModal);
        else setTimeout(hideQuickModal, 0);
      }
    }
  }

  if(typeof afterHidden === 'function'){
    if(window.requestAnimationFrame) requestAnimationFrame(done);
    else setTimeout(done, 0);
  }
  return false;
}
function _isCoverAlreadyVisibleForQuickMenu(){
  try{
    var cover=document.getElementById('cover');
    return !!(cover && !document.documentElement.classList.contains('app-active') && getComputedStyle(cover).display !== 'none');
  }catch(e){ return false; }
}
function _setPrayerPopupReturnSource(on){
  try{
    window.__MASS_QUICK_POPUP_FROM_PRAYER__ = !!on;
    if(on) sessionStorage.setItem('oai_mass_quick_popup_from_prayer','1');
    else sessionStorage.removeItem('oai_mass_quick_popup_from_prayer');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _isPrayerPopupReturnSource(){
  try{
    return window.__MASS_QUICK_POPUP_FROM_PRAYER__ === true ||
      sessionStorage.getItem('oai_mass_quick_popup_from_prayer') === '1';
  }catch(e){ return window.__MASS_QUICK_POPUP_FROM_PRAYER__ === true; }
}

function _markPrayerCoverNeedsFirstToast(on){
  try{
    window.__OAI_PRAYER_COVER_NEEDS_FIRST_TOAST__ = !!on;
    if(on) sessionStorage.setItem('oai_prayer_cover_needs_first_toast','1');
    else sessionStorage.removeItem('oai_prayer_cover_needs_first_toast');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _consumePrayerCoverNeedsFirstToast(){
  try{
    var on = window.__OAI_PRAYER_COVER_NEEDS_FIRST_TOAST__ === true ||
      sessionStorage.getItem('oai_prayer_cover_needs_first_toast') === '1';
    if(on) _markPrayerCoverNeedsFirstToast(false);
    return !!on;
  }catch(e){ return window.__OAI_PRAYER_COVER_NEEDS_FIRST_TOAST__ === true; }
}
function _forceCoverAfterPrayerQuickPopup(){
  try{
    var modal=document.getElementById('mass-quick-modal');
    if(modal){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
      try{ delete modal.dataset.returnSource; }catch(_e){}
    }
    var pv=document.getElementById('prayer-view');
    var pd=document.getElementById('prayer-detail');
    if(pd) pd.classList.remove('show');
    if(pv){
      pv.classList.remove('open');
      try{ delete pv.dataset.quickSource; }catch(_e){}
    }
    document.querySelectorAll('.module-view.open,#diocese-view.open,#missa-view.open').forEach(function(v){ v.classList.remove('open'); });
    document.documentElement.classList.remove('app-active','parish-mode','retreat-mode');
    if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
    var cv=document.getElementById('cover');
    if(cv){
      cv.style.display='';
      cv.style.opacity='';
      cv.style.pointerEvents='';
      cv.scrollTop=0;
    }
    _setPrayerPopupReturnSource(false);
    _setMassQuickReturn(false);
    _clearPrayerQuickReturn();
    _resetCoverExitReady();
    _clearCoverExitArmed();
    _markPrayerCoverNeedsFirstToast(false);
    try{
      window.__OAI_PRAYER_POPUP_COVER_GUARD_UNTIL__ = 0;
      window.__OAI_PRAYER_COVER_FORCE_FIRST_TOAST_UNTIL__ = Date.now() + 10000;
    }catch(_e){}
    function prime(reason){
      try{
        if(document.documentElement.classList.contains('app-active')) return;
        var mq=document.getElementById('mass-quick-modal');
        if(mq && mq.classList.contains('show')) return;
        _resetCoverExitReady();
        _clearCoverExitArmed();
        if(typeof _resetCoverBackTrap === 'function') _resetCoverBackTrap(reason);
        else _ensureCoverBackTrap();
      }catch(_e){}
    }
    prime('prayer-popup-cover');
    if(window.requestAnimationFrame) requestAnimationFrame(function(){ prime('prayer-popup-cover-raf'); });
    setTimeout(function(){ prime('prayer-popup-cover-settle-80'); }, 80);
    setTimeout(function(){ prime('prayer-popup-cover-settle-220'); }, 220);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _openPrayerReturnQuickMenuStable(){
  try{
    var modal=document.getElementById('mass-quick-modal');
    var cv=document.getElementById('cover');
    var pv=document.getElementById('prayer-view');
    var pd=document.getElementById('prayer-detail');
    if(pd) pd.classList.remove('show');
    if(pv){
      pv.classList.remove('open');
      try{ delete pv.dataset.quickSource; }catch(_e){}
    }
    document.documentElement.classList.remove('app-active','parish-mode','retreat-mode');
    if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
    if(cv){
      cv.style.display='';
      cv.style.opacity='';
      cv.style.pointerEvents='';
      cv.scrollTop=0;
    }
    _resetCoverExitReady();
    _clearCoverExitArmed();
    _setPrayerPopupReturnSource(true);
    _setMassQuickReturn(false);
    _clearPrayerQuickReturn();
    if(modal){
      try{ modal.dataset.returnSource='prayer'; }catch(_e){}
    }
    try{ if(typeof _ensureCoverBackTrap === 'function') _ensureCoverBackTrap('prayer-return-popup'); }catch(_e){}
    openMassQuickMenu({keepReturn:true, fromPrayerReturn:true});
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _schedulePrayerReturnQuickMenuStable(){
  var called=false;
  function run(){
    if(called) return;
    called=true;
    try{
      window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP__ = null;
      window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP_UNTIL__ = 0;
    }catch(_e){}
    if(window.requestAnimationFrame) requestAnimationFrame(_openPrayerReturnQuickMenuStable);
    else setTimeout(_openPrayerReturnQuickMenuStable, 0);
  }
  try{
    window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP__ = run;
    window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP_UNTIL__ = Date.now() + 1800;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  setTimeout(function(){
    try{
      if(window.__OAI_AFTER_RESTORE_PRAYER_QUICK_POPUP__ === run) run();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }, 90);
}
function _returnToMassQuickMenu(source){
  var fromPrayer = source === 'prayer' || (source && source.fromPrayer);
  try{ var mv=document.getElementById('missa-view'); if(mv) mv.classList.remove('open'); }catch(_e){}
  try{ if(typeof _clearFaithFrame === 'function') _clearFaithFrame(); }catch(_e){}
  if(fromPrayer){
    try{ _setPrayerPopupReturnSource(true); }catch(e){ console.warn('[가톨릭길동무]', e); }
    _resetCoverExitReady();
    _clearCoverExitArmed();
    _clearMassQuickReturnForReload();
    _clearPrayerQuickReturn();
    try{ if(typeof _clearFaithReturnTarget === 'function') _clearFaithReturnTarget(); }catch(_e){}
    _schedulePrayerReturnQuickMenuStable();
    return;
  }
  if(!_isCoverAlreadyVisibleForQuickMenu() && typeof goToCover==='function'){
    goToCover();
  }
  _resetCoverExitReady();
  _clearCoverExitArmed();
  _clearMassQuickReturnForReload();
  _clearPrayerQuickReturn();
  try{ if(typeof _clearFaithReturnTarget === 'function') _clearFaithReturnTarget(); }catch(_e){}
  /*
   * V6-160 확인용: 매일미사/성가/성경에서 빠른 배너로 되돌아온 경우,
   * 배너를 다시 열기 전에 먼저 커버 전용 root+trap을 한 번 정리한다.
   * 그래야 배너 뒤로가기 1회 = 배너 닫힘, 다음 뒤로가기 = 커버 안내문구 흐름이 된다.
   * goToCover() 자체에는 trap을 넣지 않는다.
   */
  try{
    if(typeof _resetCoverBackTrap === 'function') _resetCoverBackTrap('mass-quick-return-cover-before-open');
    else if(typeof _ensureCoverBackTrap === 'function') _ensureCoverBackTrap('mass-quick-return-cover-before-open');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  var open = function(){
    try{ openMassQuickMenu({keepReturn:true}); }
    catch(e){ console.warn('[가톨릭길동무]', e); }
  };
  if(window.requestAnimationFrame) requestAnimationFrame(open);
  else setTimeout(open, 0);
}
function openMassQuickMenu(opts){
  const modal=document.getElementById('mass-quick-modal');
  if(!modal) return;
  if(opts && opts.fromPrayerReturn) _setPrayerPopupReturnSource(true);
  else if(!(opts && opts.keepReturn)) _setPrayerPopupReturnSource(false);
  try{
    if(opts && opts.fromPrayerReturn) modal.dataset.returnSource = 'prayer';
    else if(!(opts && opts.keepReturn)) delete modal.dataset.returnSource;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(!(opts && opts.keepReturn)){ _setMassQuickReturn(false); try{ if(typeof _clearFaithReturnTarget === 'function') _clearFaithReturnTarget(); }catch(_e){} }
  _resetCoverExitReady();
  _clearCoverExitArmed();
  _armMassQuickHistoryTrap(opts && opts.fromPrayerReturn ? {reason:'prayer-return', skip:true} : null);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  try{ if(typeof oaiEnterPopup === 'function') oaiEnterPopup(modal); }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function closeMassQuickMenu(opts){
  const modal=document.getElementById('mass-quick-modal');
  var fromPrayerReturn = _isPrayerPopupReturnSource();
  try{ if(modal && modal.dataset && modal.dataset.returnSource === 'prayer') fromPrayerReturn = true; }catch(e){ console.warn('[가톨릭길동무]', e); }
  _setMassQuickReturn(false);
  _clearPrayerQuickReturn();
  try{ if(typeof _clearFaithReturnTarget === 'function') _clearFaithReturnTarget(); }catch(_e){}
  _resetCoverExitReady();
  _clearCoverExitArmed();
  if(modal){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    try{ delete modal.dataset.returnSource; }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  if(fromPrayerReturn){
    _forceCoverAfterPrayerQuickPopup();
    return;
  }
  _ensureCoverBackTrap();
}
function _openFaithPortalFromMassQuick(kind, opts){
  try{ if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick'); if(typeof _setMassQuickReturn === 'function') _setMassQuickReturn(true); }catch(e){ console.warn('[가톨릭길동무]', e); }
  var run=function(){
    try{
      if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick');
      if(typeof _setMassQuickReturn === 'function') _setMassQuickReturn(true);
      if(typeof openFaithPortal === 'function') openFaithPortal(kind, opts || null);
      else if(kind === 'missa' && typeof openMissa === 'function') openMissa();
      else if(kind === 'hymn' && typeof openCatholicHymn === 'function') openCatholicHymn();
      else if(kind === 'bible' && typeof openCatholicBible === 'function') openCatholicBible();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  };
  try{
    var modal=document.getElementById('mass-quick-modal');
    if(modal && modal.classList && modal.classList.contains('show')){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
      try{ delete modal.dataset.returnSource; }catch(_e){}
      try{ document.querySelectorAll('#mass-quick-modal .app-pressing').forEach(function(el){ el.classList.remove('app-pressing'); }); }catch(_e){}
      if(window.requestAnimationFrame) window.requestAnimationFrame(run);
      else setTimeout(run, 0);
      return;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  run();
}
function openCatholicHymn(){ openFaithPortal('hymn'); }
function openCatholicBible(){ openFaithPortal('bible'); }
var _massQuickResumeTimer = null;
var _massQuickResumeBusy = false;
function _resumeMassQuickReturnIfNeeded(){
  try{
    if(!_shouldMassQuickReturn()) return false;
    if(document.documentElement.classList.contains('app-active')) return false;
    var mq = document.getElementById('mass-quick-modal');
    if(mq && mq.classList.contains('show')){
      _clearMassQuickReturnForReload();
      return true;
    }
    if(_massQuickResumeBusy) return true;
    if(_massQuickResumeTimer) clearTimeout(_massQuickResumeTimer);
    _massQuickResumeBusy = true;
    _massQuickResumeTimer = setTimeout(function(){
      try{
        _massQuickResumeTimer = null;
        if(_shouldMassQuickReturn() && !document.documentElement.classList.contains('app-active')){
          _returnToMassQuickMenu();
        }
      }catch(e){ console.warn("[가톨릭길동무]", e); }
      finally{
        setTimeout(function(){ _massQuickResumeBusy = false; }, 250);
      }
    }, 0);
    return true;
  }catch(e){ console.warn("[가톨릭길동무]", e); return false; }
}
function _tryResumeMassQuickSoon(){
  try{
    if(_resumeMassQuickReturnIfNeeded()) return true;
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  return false;
}
window.addEventListener('pageshow', function(){
  var handled = _tryResumeMassQuickSoon();
  if(!handled){
    try{ _clearMassQuickReturnForReload(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  setTimeout(_tryResumeMassQuickSoon, 80);
}, true);
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible'){
    _tryResumeMassQuickSoon();
    setTimeout(_tryResumeMassQuickSoon, 120);
  }
}, true);
window.addEventListener('focus', function(){
  _tryResumeMassQuickSoon();
  setTimeout(_tryResumeMassQuickSoon, 120);
}, true);
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(_tryResumeMassQuickSoon, 80); }, {once:true});
else setTimeout(_tryResumeMassQuickSoon, 80);
window.addEventListener('load', function(){ setTimeout(_tryResumeMassQuickSoon, 80); }, {once:true});
try{ window.openFaithPortal=openFaithPortal; window._shouldMassQuickReturn=_shouldMassQuickReturn; window._shouldPrayerQuickReturn=_shouldPrayerQuickReturn; window._setPrayerQuickReturn=_setPrayerQuickReturn; window._clearMassQuickReturnForReload=_clearMassQuickReturnForReload; window._clearPrayerQuickReturn=_clearPrayerQuickReturn; window._returnToMassQuickMenu=_returnToMassQuickMenu; window._closePrayerAndReturn=_closePrayerAndReturn; window._resetCoverExitReady=_resetCoverExitReady; window._clearCoverExitArmed=_clearCoverExitArmed; window._isCoverScreenVisible=_isCoverScreenVisible; window._isAppScreenActive=_isAppScreenActive; window._hasOpenAppSurface=_hasOpenAppSurface; window._ensureCoverBackTrap=_ensureCoverBackTrap; window._ensureAppBackTrap=_ensureAppBackTrap; window._resetAppBackTrap=_resetAppBackTrap; window._pushCoverOverlayBackTrap=_pushCoverOverlayBackTrap; window._hideMassQuickMenuOnly=_hideMassQuickMenuOnly; window._setPrayerPopupReturnSource=_setPrayerPopupReturnSource; window._isPrayerPopupReturnSource=_isPrayerPopupReturnSource; window._forceCoverAfterPrayerQuickPopup=_forceCoverAfterPrayerQuickPopup; window._resetCoverBackTrap=_resetCoverBackTrap; window._consumePrayerCoverNeedsFirstToast=_consumePrayerCoverNeedsFirstToast; window.openMassQuickMenu=openMassQuickMenu; window.closeMassQuickMenu=closeMassQuickMenu; window._openFaithPortalFromMassQuick=_openFaithPortalFromMassQuick; window._setFaithReturnTarget=_setFaithReturnTarget; window._clearFaithReturnTarget=_clearFaithReturnTarget; window._shouldFaithReturnToMassQuick=_shouldFaithReturnToMassQuick; }catch(e){ console.warn('[가톨릭길동무]', e); }

function _runRefreshAppFilesOnly(){
  var btn = document.getElementById('cover-update-btn');
  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = '새로고침 중';
    }
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    sessionStorage.setItem('oai_soft_refresh_requested', String(Date.now ? Date.now() : new Date().getTime()));
    try{ if(typeof oaiMarkRefreshHistoryCompact === 'function') oaiMarkRefreshHistoryCompact('short-refresh'); }catch(_e){}
    try{ _clearMassQuickReturnForReload(); }catch(_e){}
  }catch(e){
    console.warn('[가톨릭길동무]', e);
  }
  try{
    if(typeof oaiPrepareRefreshVeil === 'function')
      oaiPrepareRefreshVeil('short-refresh', OAI_REFRESH_VEIL_MS, OAI_REFRESH_CARRY_MS, true, OAI_REFRESH_PRE_NAV_HOLD_MS, false);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  oaiAfterRefreshVeilPaint(function(){
    setTimeout(function(){
      try{
        location.reload();
      }catch(e){
        location.href = location.href.split('#')[0];
      }
    }, 1200);
  });
}
function _showRefreshContentDialog(onConfirm){
  try{
    var old = document.getElementById('oai-refresh-content-dialog');
    if(old && old.parentNode) old.parentNode.removeChild(old);

    var ua = (navigator.userAgent || '').toLowerCase();
    var isIOSRefresh = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var cfg = isIOSRefresh ? {
      backdropPad:'20px', panelW:'min(94vw,390px)', panelPad:'21px 17px 16px',
      title:'19px', titleLH:'1.16', titleMb:'9px',
      lead:'13px', leadLH:'1.42', leadMb:'9px',
      desc:'12.5px', descLH:'1.42', descMb:'11px',
      note:'11.8px', noteLH:'1.38', notePad:'8px 9px', noteMb:'15px',
      btnH:'40px', btnMin:'94px', btnFs:'14px', okPad:'0 17px', cancelPad:'0 15px',
      keepWords:true
    } : {
      backdropPad:'22px', panelW:'min(92vw,380px)', panelPad:'22px 18px 17px',
      title:'21px', titleLH:'1.2', titleMb:'10px',
      lead:'15px', leadLH:'1.55', leadMb:'10px',
      desc:'14px', descLH:'1.55', descMb:'12px',
      note:'12.5px', noteLH:'1.45', notePad:'8px 10px', noteMb:'16px',
      btnH:'42px', btnMin:'96px', btnFs:'15px', okPad:'0 18px', cancelPad:'0 16px',
      keepWords:false
    };
    var wordStyle = cfg.keepWords ? ';word-break:keep-all;overflow-wrap:normal;' : '';

    var wrap = document.createElement('div');
    wrap.id = 'oai-refresh-content-dialog';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-label','Refresh Content');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:10090;display:flex;align-items:center;justify-content:center;background:rgba(14,21,53,.36);padding:' + cfg.backdropPad + ';box-sizing:border-box;-webkit-text-size-adjust:100%;text-size-adjust:100%;';
    wrap.innerHTML = '<div style="width:' + cfg.panelW + ';background:#fffaf2;border:1px solid rgba(212,170,106,.42);border-radius:20px;box-shadow:0 18px 42px rgba(14,21,53,.24);padding:' + cfg.panelPad + ';text-align:center;font-family:inherit;color:#1f2937;box-sizing:border-box;-webkit-text-size-adjust:100%;text-size-adjust:100%' + wordStyle + '">' +
      '<div style="font-size:' + cfg.title + ';font-weight:900;line-height:' + cfg.titleLH + ';margin-bottom:' + cfg.titleMb + ';letter-spacing:-.02em;">Refresh Content</div>' +
      '<div style="font-size:' + cfg.lead + ';font-weight:800;line-height:' + cfg.leadLH + ';color:#475569;margin-bottom:' + cfg.leadMb + ';letter-spacing:-.03em' + wordStyle + '">앱 화면을 안정형으로 다시 불러옵니다.</div>' +
      '<div style="font-size:' + cfg.desc + ';font-weight:700;line-height:' + cfg.descLH + ';color:#64748b;margin-bottom:' + cfg.descMb + ';letter-spacing:-.03em' + wordStyle + '">캐시와 설치 상태는 삭제하지 않습니다.<br>글자 크기와 즐겨찾기도 그대로 유지됩니다.</div>' +
      '<div style="font-size:' + cfg.note + ';font-weight:800;line-height:' + cfg.noteLH + ';color:#8A6A2F;background:#fff4d7;border:1px solid rgba(212,170,106,.45);border-radius:12px;padding:' + cfg.notePad + ';margin-bottom:' + cfg.noteMb + ';letter-spacing:-.035em' + wordStyle + '">문제가 계속되면 새로고침 버튼을 더 길게 눌러<br>앱 캐시 초기화를 실행할 수 있습니다.</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button type="button" data-oai-refresh-cancel="1" style="height:' + cfg.btnH + ';min-width:' + cfg.btnMin + ';padding:' + cfg.cancelPad + ';border:1px solid #d8d1c5;border-radius:999px;background:#fff;color:#475569;font-family:inherit;font-size:' + cfg.btnFs + ';font-weight:850;">취소</button>' +
      '<button type="button" data-oai-refresh-ok="1" style="height:' + cfg.btnH + ';min-width:' + cfg.btnMin + ';padding:' + cfg.okPad + ';border:0;border-radius:999px;background:#1f2a44;color:#fff;font-family:inherit;font-size:' + cfg.btnFs + ';font-weight:900;">확인</button>' +
      '</div></div>';
    function close(){ try{ if(wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap); }catch(_e){} }
    wrap.addEventListener('click', function(e){ if(e.target === wrap) close(); }, true);
    var cancel = wrap.querySelector('[data-oai-refresh-cancel]');
    var ok = wrap.querySelector('[data-oai-refresh-ok]');
    if(cancel) cancel.onclick = function(e){ e.preventDefault(); close(); };
    if(ok) ok.onclick = function(e){ e.preventDefault(); close(); if(typeof onConfirm === 'function') onConfirm(); };
    document.body.appendChild(wrap);
    setTimeout(function(){ try{ if(ok) ok.focus(); }catch(_e){} }, 0);
  }catch(e){
    console.warn('[가톨릭길동무]', e);
    if(typeof onConfirm === 'function') onConfirm();
  }
}
function refreshAppFilesOnly(){
  _showRefreshContentDialog(_runRefreshAppFilesOnly);
}
window.refreshAppFilesOnly = refreshAppFilesOnly;

async function _runClearAppFilesCacheCompletely(){
  try{
    if(typeof oaiPrepareRefreshVeil === 'function')
      oaiPrepareRefreshVeil('long-refresh-progress', OAI_REFRESH_VEIL_MS, OAI_REFRESH_CARRY_MS, true, OAI_REFRESH_PROGRESS_HOLD_MS, false);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(typeof oaiMarkRefreshHistoryCompact === 'function') oaiMarkRefreshHistoryCompact('long-refresh-progress');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  await new Promise(function(resolve){ oaiAfterRefreshVeilPaint(resolve); });
  try{
    if(window.caches && caches.keys){
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }
    if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(r){ return r.unregister(); }));
    }
  }catch(e){
    console.warn('[가톨릭길동무]', e);
  }
  oaiAfterRefreshVeilPaint(function(){
    try{
      location.reload();
    }catch(e){
      location.href = location.href.split('#')[0];
    }
  });
}
function _showCacheClearDialog(onConfirm){
  try{
    var old = document.getElementById('oai-cache-clear-dialog');
    if(old && old.parentNode) old.parentNode.removeChild(old);
    var wrap = document.createElement('div');
    wrap.id = 'oai-cache-clear-dialog';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-label','앱 캐시 초기화');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:10095;display:flex;align-items:center;justify-content:center;background:rgba(14,21,53,.46);padding:22px;box-sizing:border-box;';
    wrap.innerHTML = '<div style="width:min(92vw,390px);background:#fffaf2;border:2px solid rgba(212,170,106,.70);border-radius:20px;box-shadow:0 18px 46px rgba(14,21,53,.30);padding:22px 18px 17px;text-align:center;font-family:inherit;color:#1f2937;box-sizing:border-box;">' +
      '<div style="font-size:21px;font-weight:950;line-height:1.2;margin-bottom:10px;color:#1f2a44;">앱 캐시 초기화</div>' +
      '<div style="font-size:15px;font-weight:800;line-height:1.55;color:#475569;margin-bottom:10px;">앱 파일 캐시를 삭제하고 다시 불러옵니다.</div>' +
      '<div style="font-size:14px;font-weight:700;line-height:1.55;color:#64748b;margin-bottom:12px;">화면이 이상하게 꼬였을 때만 사용하세요.<br>글자 크기와 즐겨찾기는 유지됩니다.</div>' +
      '<div style="font-size:12.5px;font-weight:800;line-height:1.45;color:#8A3B20;background:#fff1e8;border:1px solid rgba(194,65,12,.22);border-radius:12px;padding:8px 10px;margin-bottom:16px;">인터넷이 약하면 다시 불러오는 데 시간이 걸릴 수 있습니다.</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button type="button" data-oai-cache-cancel="1" style="height:42px;min-width:96px;padding:0 16px;border:1px solid #d8d1c5;border-radius:999px;background:#fff;color:#475569;font-family:inherit;font-size:15px;font-weight:850;">취소</button>' +
      '<button type="button" data-oai-cache-ok="1" style="height:42px;min-width:120px;padding:0 18px;border:0;border-radius:999px;background:#1f2a44;color:#fff;font-family:inherit;font-size:15px;font-weight:900;">초기화</button>' +
      '</div></div>';
    function close(){ try{ if(wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap); }catch(_e){} }
    wrap.addEventListener('click', function(e){ if(e.target === wrap) close(); }, true);
    var cancel = wrap.querySelector('[data-oai-cache-cancel]');
    var ok = wrap.querySelector('[data-oai-cache-ok]');
    if(cancel) cancel.onclick = function(e){ e.preventDefault(); close(); };
    if(ok) ok.onclick = function(e){ e.preventDefault(); close(); if(typeof onConfirm === 'function') onConfirm(); };
    document.body.appendChild(wrap);
    setTimeout(function(){ try{ if(cancel) cancel.focus(); }catch(_e){} }, 0);
  }catch(e){
    console.warn('[가톨릭길동무]', e);
    if(typeof onConfirm === 'function') onConfirm();
  }
}
function clearAppFilesCacheCompletely(){
  _showCacheClearDialog(_runClearAppFilesCacheCompletely);
}
window.clearAppFilesCacheCompletely = clearAppFilesCacheCompletely;

function syncCoverUpdateVersionState(){
  try{
    var btn = document.getElementById('cover-update-btn');
    var box = document.getElementById('cover-update-box');
    var marker = document.getElementById('oai-build-marker');
    if(!btn || !box) return;
    var target = btn.getAttribute('data-target-version') || (window.APP_VERSION || 'V2');
    var current = '';
    if(window.APP_VERSION) current = String(window.APP_VERSION).trim();
    if(!current && marker) current = String(marker.textContent || '').trim();
    if(!current) current = target;
    var mismatch = current !== target;
    btn.textContent = mismatch ? '업데이트 필요' : '새로고침';
    box.classList.toggle('update-needed', mismatch);
    if(marker) marker.textContent = current;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
window.syncCoverUpdateVersionState = syncCoverUpdateVersionState;
document.addEventListener('DOMContentLoaded', function(){
  syncCoverUpdateVersionState();
  setTimeout(syncCoverUpdateVersionState, 250);
  setTimeout(syncCoverUpdateVersionState, 900);
}, true);
window.addEventListener('load', syncCoverUpdateVersionState, true);

(function(){
  'use strict';
  function resetGuideScroll(id){
    try{
      var root=document.getElementById(id);
      if(!root) return;
      root.scrollTop=0;
      root.querySelectorAll('.guide-panel,.guide-card-list').forEach(function(el){ el.scrollTop=0; });
      var panel=root.querySelector('.guide-panel');
      if(panel) panel.scrollIntoView({block:'center', inline:'nearest'});
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function stabilizeCoverBackAfterGuide(reason){
    try{ if(typeof _resetCoverExitReady === 'function') _resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof _clearCoverExitArmed === 'function') _clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof _ensureCoverBackTrap === 'function') _ensureCoverBackTrap(reason || 'guide-modal'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function showModal(id){
    var el=document.getElementById(id);
    if(!el) return;
    stabilizeCoverBackAfterGuide('guide-open');
    resetGuideScroll(id);
    el.classList.add('show');
    el.setAttribute('aria-hidden','false');
    try{ if(typeof _pushCoverOverlayBackTrap === 'function') _pushCoverOverlayBackTrap('guide-' + id, 'guide-open'); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof oaiEnterPopup==='function') oaiEnterPopup(el); }catch(e){ console.warn('[가톨릭길동무]', e); }
    setTimeout(function(){ resetGuideScroll(id); }, 0);
    try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(e){}
  }
  function hideModal(id){
    var el=document.getElementById(id);
    if(!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden','true');
    stabilizeCoverBackAfterGuide('guide-close');
    try{
      if(window.requestAnimationFrame) requestAnimationFrame(function(){ stabilizeCoverBackAfterGuide('guide-close-raf'); });
      setTimeout(function(){ stabilizeCoverBackAfterGuide('guide-close-160'); }, 160);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function openGuideManual(){ showModal('guide-manual-modal'); }
  function closeGuideManual(){ hideModal('guide-manual-modal'); }
  function bindGuide(){
    var btn=document.getElementById('cover-guide-btn');
    if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openGuideManual(); });
    var ok=document.getElementById('guide-ok-btn');
    if(ok) ok.addEventListener('click', function(e){ e.preventDefault(); closeGuideManual(); });
    document.querySelectorAll('[data-guide-close]').forEach(function(el){
      el.addEventListener('click', function(e){
        e.preventDefault();
        if(el.getAttribute('data-guide-close') === 'manual') closeGuideManual();
      });
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeGuideManual();
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindGuide, {once:true});
  else bindGuide();
  window.openGuideManual = openGuideManual;
  window.resetGuideManualScroll = function(){ resetGuideScroll('guide-manual-modal'); };
})();

function closeMissa(){
  const view=$('missa-view');
  const isShrineExternal=!!(view && view.dataset && view.dataset.externalReturnSource==='shrine');
  const shouldReturnToQuickBeforeClose = !!((view && view.dataset && view.dataset.quickSource==='massQuick') || (typeof _shouldFaithReturnToMassQuick === 'function' ? _shouldFaithReturnToMassQuick() : _shouldMassQuickReturn()));
  if(view) view.classList.remove('open');
  try{ if(typeof _clearFaithFrame === 'function') _clearFaithFrame(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(isShrineExternal){
    try{
      if(view){
        view.classList.remove('shrine-external-mode');
        delete view.dataset.externalReturnSource;
        delete view.dataset.faithCurrent;
      }
      const nav=$('missa-faith-nav');
      if(nav){ nav.innerHTML=''; nav.style.display=''; }
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof _resetCoverExitReady==='function') _resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof _clearCoverExitArmed==='function') _clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    return;
  }
  if(shouldReturnToQuickBeforeClose) _returnToMassQuickMenu();
  else { try{ if(typeof _clearFaithReturnTarget === 'function') _clearFaithReturnTarget(); }catch(e){ console.warn('[가톨릭길동무]', e); } if(typeof goToCover==='function') goToCover(); }
}
function missaLoaded(){
}

function openPrayerBook(opts){
  try{ if(typeof oaiClearMapInfoSelection === 'function') oaiClearMapInfoSelection('open-prayer'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(!(opts && opts.restore)){
    try{
      if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick');
      _setPrayerQuickReturn(true);
      window.__OAI_PRAYER_FROM_QUICK_LOCK__ = true;
      sessionStorage.setItem('oai_prayer_from_quick_lock','1');
    }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
  try{ if(typeof _resetCoverExitReady==='function') _resetCoverExitReady(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof _clearCoverExitArmed==='function') _clearCoverExitArmed(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  const view=$('prayer-view');
  if(!view) return;
  try{
    if(opts && opts.fromMassQuick) view.dataset.quickSource = 'mass';
    else delete view.dataset.quickSource;
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  const cv=$('cover');
  if(cv){ cv.style.opacity='0'; cv.style.display='none'; }
  document.documentElement.classList.add('app-active');
  try{
    if(typeof window._oaiArmPrayerBackTrap==='function') window._oaiArmPrayerBackTrap('prayer-open');
    else if(typeof _ensureAppBackTrap==='function') _ensureAppBackTrap('prayer-open');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(true);
  view.classList.add('open');
  try{
    if(opts && opts.fromMassQuick && typeof _resetAppBackTrap==='function') _resetAppBackTrap('prayer-quick-open');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  _renderFaithBottomNav('prayer');
  var restore = !!(opts && opts.restore);
  if(!restore && typeof oaiEnterView==='function') oaiEnterView(view);
  var setupDelay = (opts && opts.instant) ? 0 : 50;
  var runPrayerSetup=function(){
    setTimeout(function(){
      if(typeof window.initPrayerView==='function') try{window.initPrayerView();}catch(e){ console.warn("[가톨릭길동무]", e); }
      try{ if(typeof window.prEnsureTabsVisible==='function') window.prEnsureTabsVisible(); }catch(e){ console.warn("[가톨릭길동무]", e); }
      if(!(opts&&opts.restore) && typeof showPrayerListOnly==='function') try{showPrayerListOnly();}catch(e){ console.warn("[가톨릭길동무]", e); }
      setTimeout(function(){ try{ if(typeof window.prEnsureTabsVisible==='function') window.prEnsureTabsVisible(); }catch(e){ console.warn("[가톨릭길동무]", e); } }, 120);
      try{
        if(typeof window._oaiArmPrayerBackTrap==='function') window._oaiArmPrayerBackTrap('prayer-list-ready');
        else if(typeof _ensureAppBackTrap==='function') _ensureAppBackTrap('prayer-list-ready');
      }catch(e){ console.warn("[가톨릭길동무]", e); }
      var list=document.getElementById('prayer-list-view'); if(list) list.scrollTop=0;
      var tabs=document.getElementById('prayer-tabs'); if(tabs) tabs.scrollLeft=0;
    }, setupDelay);
  };
  if(typeof window.ensurePrayerModuleLoaded==='function'){
    window.ensurePrayerModuleLoaded().then(runPrayerSetup).catch(function(err){
      console.warn('[가톨릭길동무]', err);
      var ul=document.getElementById('pr-list-ul');
      if(ul) ul.innerHTML='<div class="pr-empty">기도문을 불러오지 못했습니다.<br>새로고침 후 다시 시도해 주세요.</div>';
    });
  } else {
    runPrayerSetup();
  }
}
function closePrayerView(){
  const view=$('prayer-view');
  const detail=$('prayer-detail');
  if(detail) detail.classList.remove('show');
  if(view){
    view.classList.remove('open');
    try{ delete view.dataset.quickSource; }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
}
function _closePrayerAndReturn(){
  try{
    if(typeof window._oaiPrayerBackHandle === 'function' && window._oaiPrayerBackHandle('prayer-close-button')) return;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(typeof window._oaiPrayerListToPopupOrCover === 'function'){
      window._oaiPrayerListToPopupOrCover('prayer-close-button');
      return;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  var pv = $('prayer-view');
  var fromQuickPrayer = _shouldPrayerQuickReturn();
  try{ if(pv && pv.dataset && pv.dataset.quickSource === 'mass') fromQuickPrayer = true; }catch(e){ console.warn("[가톨릭길동무]", e); }
  if(fromQuickPrayer){
    _returnToMassQuickMenu('prayer');
  } else {
    closePrayerView();
    try{ _clearPrayerQuickReturn(); }catch(e){ console.warn("[가톨릭길동무]", e); }
    if(typeof goToCover==='function') goToCover();
  }
}

(function(){
  'use strict';
  function ua(){ return (navigator.userAgent || '').toLowerCase(); }
  function isIOS(){
    var u = ua();
    return /iphone|ipad|ipod/.test(u) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isKakao(){ return ua().indexOf('kakaotalk') > -1; }
  function isStandalone(){
    try{ if(window.navigator.standalone === true) return true; }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches; }catch(e){ console.warn('[가톨릭길동무]', e); }
    return false;
  }
  function shouldShow(){
    return isIOS() && isKakao() && !isStandalone();
  }
  function loadIosSafariGuideImages(){
    var m = document.getElementById('ios-safari-guide-modal');
    if(!m || m.__iosSafariGuideImagesLoaded) return;
    m.__iosSafariGuideImagesLoaded = true;
    try{
      m.querySelectorAll('img[data-src]').forEach(function(img){
        if(!img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-src'));
      });
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function showModal(){
    var m = document.getElementById('ios-safari-guide-modal');
    if(!m) return;
    loadIosSafariGuideImages();
    m.classList.add('show');
    m.setAttribute('aria-hidden','false');
    try{ if(typeof oaiEnterPopup==='function') oaiEnterPopup(m); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function hideModal(){
    var m = document.getElementById('ios-safari-guide-modal');
    if(!m) return;
    m.classList.remove('show');
    m.setAttribute('aria-hidden','true');
  }
  function init(){
    var banner = document.getElementById('ios-kakao-safari-banner');
    var modal = document.getElementById('ios-safari-guide-modal');
    if(!banner) return;
    var show = shouldShow();
    if(show){
      document.documentElement.classList.add('ios-kakao-inapp');
      banner.hidden = false;
      banner.setAttribute('aria-hidden','false');
    }else{
      document.documentElement.classList.remove('ios-kakao-inapp');
      banner.hidden = true;
      banner.setAttribute('aria-hidden','true');
      hideModal();
    }
    function bindTap(el, flag, handler){
      if(!el || el[flag]) return;
      el[flag] = true;
      var fn = function(e){ e.preventDefault(); e.stopPropagation(); handler(e); };
      el.addEventListener('click', fn, true);
      el.addEventListener('touchend', fn, true);
    }
    bindTap(document.getElementById('ios-kakao-safari-help'), '__iosSafariBound', showModal);
    bindTap(document.getElementById('ios-kakao-safari-close'), '__iosSafariBannerCloseBound', function(){
      banner.hidden = true;
      banner.setAttribute('aria-hidden','true');
    });
    document.querySelectorAll('[data-ios-safari-close]').forEach(function(el){
      bindTap(el, '__iosSafariCloseBound', hideModal);
    });
  }
  document.addEventListener('DOMContentLoaded', init, true);
  window.addEventListener('pageshow', init, true);
})();

function openDioceseView(opts){
  try{ if(typeof oaiClearMapInfoSelection === 'function') oaiClearMapInfoSelection('open-diocese'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  var view=document.getElementById('diocese-view');
  var frame=document.getElementById('diocese-frame');
  var loading=document.getElementById('diocese-loading');
  if(!view||!frame) return;
  var restore = !!(opts && opts.restore);
  var needsLoad = (!frame.src || frame.src==='about:blank' || !frame._loaded);
  if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(true);
  view.classList.add('open');
  try{ if(typeof _resetCoverExitReady === 'function') _resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof _clearCoverExitArmed === 'function') _clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  function armDioceseOverlayBack(){
    try{
      if(typeof _pushCoverOverlayBackTrap === 'function') _pushCoverOverlayBackTrap('diocese-view', 'diocese-open');
      else if(typeof _resetAppBackTrap === 'function') _resetAppBackTrap('diocese-open');
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  if(!restore && typeof oaiEnterView==='function') oaiEnterView(view);
  if(loading) loading.style.display = needsLoad ? 'flex' : 'none';
  if(needsLoad){
    frame.onload=function(){
      if(loading) loading.style.display='none'; frame._loaded=true;
      try{ frame.contentWindow && frame.contentWindow.dioApplySharedFont && frame.contentWindow.dioApplySharedFont(); }catch(e){ console.warn("[가톨릭길동무]", e); }
      if(!restore) try{ frame.contentWindow && frame.contentWindow.resetDioceseFirstPage && frame.contentWindow.resetDioceseFirstPage(); }catch(e){ console.warn("[가톨릭길동무]", e); }
      if(typeof dioceseLoaded==='function') dioceseLoaded();
    };
    frame.src='diocese.html?v=V8-1-13-6-SHRINE-BOUNDARY-GUARD';
    setTimeout(armDioceseOverlayBack, 0);
  }else{
    if(!restore){
      try{ frame.contentWindow && frame.contentWindow.resetDioceseFirstPage && frame.contentWindow.resetDioceseFirstPage(); }catch(e){ console.warn("[가톨릭길동무]", e); }
    }
    armDioceseOverlayBack();
  }
}
function closeDioceseView(){
  var view=document.getElementById('diocese-view');
  var frame=document.getElementById('diocese-frame');
  var loading=document.getElementById('diocese-loading');
  var root=document.documentElement;

  try{ if(loading) loading.style.display='none'; }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(frame && frame.contentWindow){
      frame.contentWindow.__OAI_DIO_EXTERNAL_LEAVING__ = false;
      frame.contentWindow.__OAI_DIO_PARENT_RETURNING__ = false;
      if(typeof frame.contentWindow.oaiReleaseDioceseStability === 'function'){
        frame.contentWindow.oaiReleaseDioceseStability({silent:true});
      }
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    sessionStorage.removeItem(DIOCESE_RETURN_KEY);
    localStorage.removeItem(DIOCESE_RETURN_KEY);
    window.__OAI_DIOCESE_EXTERNAL_LEAVING__ = false;
    window.__OAI_DIOCESE_RESTORING__ = false;
  }catch(e){ console.warn('[가톨릭길동무]', e); }

  if(view) view.classList.remove('open','oai-enter-ready','oai-enter-show');
  try{ document.querySelectorAll('#diocese-view .oai-enter-ready,#diocese-view .oai-enter-show').forEach(function(el){ el.classList.remove('oai-enter-ready','oai-enter-show'); }); }catch(e){ console.warn('[가톨릭길동무]', e); }

  _screen='cover';
  try{ if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ root.classList.remove('app-active','parish-mode','retreat-mode','oai-diocese-returning'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    var cv=document.getElementById('cover');
    if(cv){
      cv.style.display='';
      cv.style.opacity='';
      cv.style.pointerEvents='';
      cv.scrollTop=0;
    }
    if(window.scrollTo) window.scrollTo(0,0);
    if(document.scrollingElement) document.scrollingElement.scrollTop=0;
  }catch(e){ console.warn('[가톨릭길동무]', e); }

  function primeCoverBackAfterDioceseClose(step){
    try{ if(typeof _resetCoverExitReady === 'function') _resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{ if(typeof _clearCoverExitArmed === 'function') _clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{
      if(typeof _resetCoverBackTrap === 'function') _resetCoverBackTrap('diocese-close-' + step);
      else if(typeof _ensureCoverBackTrap === 'function') _ensureCoverBackTrap('diocese-close-' + step);
      else if(typeof window._oaiArmCoverBackTrap === 'function') window._oaiArmCoverBackTrap('diocese-close-' + step);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }

  primeCoverBackAfterDioceseClose('direct');

}
function dioceseLoaded(){
  var loading=document.getElementById('diocese-loading');
  if(loading) loading.style.display='none';
}
/* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 성지 외부 링크는 웹사이트 카테고리와 같은 보호창 이동 흐름으로 통일하고 옛 core return 저장 함수는 제거 */
function normalizeCatholicExternalUrl(url){
  url = String(url || '').trim();
  if(!url) return '';

  try{
    if(typeof _decUrl === 'function') url = _decUrl(url);
  }catch(e){ console.warn("[가톨릭길동무]", e); }

  url = url.replace(/^hthttp:\/\//i, 'http://').replace(/^hthttps:\/\//i, 'https://').replace(/^http\/\//i, 'http://').replace(/^https\/\//i, 'https://');
  if(url.indexOf('//') === 0) url = 'https:' + url;
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');

  try{
    var u = new URL(url);
    u.pathname = u.pathname.replace(/\/\/+/g, '/');
    var host = u.hostname.toLowerCase();
    if(host === 'wjcatholic.or.kr') u.hostname = 'www.wjcatholic.or.kr';
    if(host === 'caincheon.or.kr') u.hostname = 'www.caincheon.or.kr';
    if(host === 'www.cathms.kr') u.hostname = 'cathms.kr';
    if(u.hostname.toLowerCase() === 'cathms.kr') u.protocol = 'https:';
    return u.toString();
  }catch(e){ return url; }
}
function _isShrineDetailGuideUrl(url){
  try{
    url = normalizeCatholicExternalUrl(url);
    if(!url) return false;
    var u = new URL(url);
    var host = String(u.hostname||'').toLowerCase();
    var path = String(u.pathname||'').toLowerCase();
    return (host.indexOf('cbck.or.kr')>=0 && path.indexOf('/catholic/shrine/read')>=0) ||
           (host.indexOf('martyr.co.kr')>=0 && path.indexOf('/assets/holy/view.html')>=0);
  }catch(e){ return false; }
}
function _getShrineHomepageUrl(item){
  var hp = item && item.hp ? normalizeCatholicExternalUrl(item.hp) : '';
  if(!hp) return '';
  /* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 신규 성지는 성지추가.xlsx의 '홈페이지' 열을 그대로 홈페이지 버튼에 연결한다. */
  if(item && item.isNew) return hp;
  if(_isShrineDetailGuideUrl(hp)) return '';
  return hp;
}
function _getShrineGuideUrl(item){
  if(!item) return '';
  /* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 성지추가.xlsx의 '주교회의 성지안내/성지 상세' URL을 우선 사용한다. */
  if(item.guideUrl) return normalizeCatholicExternalUrl(item.guideUrl);
  if(item.seq) return _SU + item.seq;
  var hp = item.hp ? normalizeCatholicExternalUrl(item.hp) : '';
  return _isShrineDetailGuideUrl(hp) ? hp : '';
}
function prepareExternalUrl(url){
  url = (typeof normalizeCatholicExternalUrl === 'function')
        ? normalizeCatholicExternalUrl(url)
        : String(url || '').trim();
  return url || null;
}
function openCatholicExternalPreserveApp(url, kind){
  url = prepareExternalUrl(url);
  if(!url) return false;
  try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{
    sessionStorage.removeItem('catholic_core_return_v1');
    localStorage.removeItem('catholic_core_return_backup_v1');
    sessionStorage.removeItem('oai_external_return_token');
    localStorage.removeItem('oai_external_return_token');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof _resetCoverExitReady==='function') _resetCoverExitReady(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof _clearCoverExitArmed==='function') _clearCoverExitArmed(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  /* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 성지·성당·피정 외부 웹사이트도 웹사이트 카테고리와 같은 보호창 이동 흐름으로 통일한다. */
  try{
    if(typeof oaiSmoothNavigate === 'function'){
      oaiSmoothNavigate(url, kind || 'external-site');
      return true;
    }
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ if(typeof markExternalReturnStabilize === 'function') markExternalReturnStabilize(kind || 'external-site'); }catch(e){ console.warn("[가톨릭길동무]", e); }
  setTimeout(function(){
    try{ location.assign(url); }catch(e){ try{ location.href = url; }catch(_e){ console.warn('[가톨릭길동무]', _e); } }
  }, 70);
  return true;
}
function openShrineExternalLikeFaithPortal(url, extra){
  url = prepareExternalUrl(url);
  if(!url) return;
  extra = extra || {};
  /* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 성지 상세/홈페이지 외부 링크는 웹사이트 카테고리와 같은 보호창 이동 흐름을 사용한다. */
  openCatholicExternalPreserveApp(url, extra.source || 'shrine-external');
}
function openCoreExternalUrl(url, extra){
  try{ _oaiSaveShrineExternalReturn(extra||{}); }catch(e){ console.warn('[가톨릭길동무]', e); }
  openShrineExternalLikeFaithPortal(url, extra);
}

const DIOCESE_RETURN_KEY='catholic_diocese_external_return_v1';
function openDioceseExternal(url, state){
  url = prepareExternalUrl(url);
  if(!url) return false;
  try{
    var payload=JSON.stringify(state || {});
    sessionStorage.setItem(DIOCESE_RETURN_KEY, payload);
    localStorage.setItem(DIOCESE_RETURN_KEY, payload);
    window.__OAI_DIOCESE_EXTERNAL_LEAVING__ = true;
    var frame=document.getElementById('diocese-frame');
    if(frame && frame.contentWindow){
      try{ frame.contentWindow.__OAI_DIO_EXTERNAL_LEAVING__ = true; frame.contentWindow.__OAI_DIO_EXTERNAL_LEAVING_TS__ = Date.now ? Date.now() : new Date().getTime(); }catch(_e){}
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(typeof oaiOpenExternalSite === 'function'){
    return oaiOpenExternalSite(url, {kind:'diocese-external'});
  }
  try{ if(typeof markExternalReturnStabilize === 'function') markExternalReturnStabilize('diocese-external'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  setTimeout(function(){
    try{ location.assign(url); }
    catch(e){ try{ location.href = url; }catch(_e){ console.warn('[가톨릭길동무]', _e); } }
  }, 70);
  return true;
}
window.openDioceseExternal = openDioceseExternal;

function _primeDioceseBackAfterExternalReturn(reason){
  try{
    var view=document.getElementById('diocese-view');
    if(!(view && view.classList && view.classList.contains('open'))) return;
    var root=document.documentElement;
    root.classList.add('app-active');
    root.classList.remove('oai-diocese-returning');
    var cover=document.getElementById('cover');
    if(cover){ cover.style.display='none'; cover.style.opacity='0'; cover.style.pointerEvents='none'; }
    if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(true);
    if(typeof _resetCoverExitReady==='function') _resetCoverExitReady();
    if(typeof _clearCoverExitArmed==='function') _clearCoverExitArmed();
    function arm(){
      try{
        if(typeof window._oaiArmCoverBackTrap === 'function'){
          window._oaiArmCoverBackTrap(reason || 'diocese-external-return', {force:true});
        }
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    arm();
    setTimeout(arm, 80);
    setTimeout(arm, 240);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
/* V8-1-13-3: 관구교구 외부페이지 복귀 후 카테고리 뒤로가기 재무장 */
function _finishDioceseExternalReturn(frame){
  try{
    var w = frame && frame.contentWindow;
    if(w){
      w.__OAI_DIO_EXTERNAL_LEAVING__ = false;
      w.__OAI_DIO_PARENT_RETURNING__ = false;
      if(typeof w.oaiReleaseDioceseStability === 'function') w.oaiReleaseDioceseStability({silent:true});
    }
  }catch(_e){}
  try{ sessionStorage.removeItem(DIOCESE_RETURN_KEY); localStorage.removeItem(DIOCESE_RETURN_KEY); }catch(_e){}
  window.__OAI_DIOCESE_EXTERNAL_LEAVING__ = false;
  window.__OAI_DIOCESE_RESTORING__ = false;
  try{ _primeDioceseBackAfterExternalReturn('diocese-external-finish'); }catch(_e){}
}
function restoreDioceseExternalState(opts){
  opts = opts || {};
  var raw=null, state=null;
  try{ raw=sessionStorage.getItem(DIOCESE_RETURN_KEY) || localStorage.getItem(DIOCESE_RETURN_KEY); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(!raw || window.__OAI_DIOCESE_RESTORING__) return false;

  try{ state=JSON.parse(raw); }catch(e){ state={}; }

  try{
    var root=document.documentElement;
    root.classList.remove('oai-diocese-returning');
    var view=document.getElementById('diocese-view');
    var frame=document.getElementById('diocese-frame');
    var alreadyOpen=!!(view && view.classList.contains('open'));
    var frameAlive=!!(frame && frame.contentWindow);

    if(alreadyOpen && frameAlive){
      var preserved=false;
      try{
        var w=frame.contentWindow;
        if(w && typeof w.isDioceseReturnPreserved === 'function') preserved = !!w.isDioceseReturnPreserved(state || {});
        else if(w && w.__OAI_DIO_EXTERNAL_LEAVING__) preserved = true;
      }catch(_e){ preserved=false; }
      if(preserved){
        _finishDioceseExternalReturn(frame);
        return true;
      }
    }

    window.__OAI_DIOCESE_RESTORING__ = true;
    try{ sessionStorage.removeItem(DIOCESE_RETURN_KEY); localStorage.removeItem(DIOCESE_RETURN_KEY); }catch(e){ console.warn('[가톨릭길동무]', e); }

    function finish(){
      try{ root.classList.remove('oai-diocese-returning'); }catch(_e){}
      window.__OAI_DIOCESE_RESTORING__ = false;
    }
    function restoreInFrame(){
      try{
        frame=document.getElementById('diocese-frame');
        var w=frame && frame.contentWindow;
        if(w){
          w.__OAI_DIO_EXTERNAL_LEAVING__ = false;
          w.__OAI_DIO_PARENT_RETURNING__ = true;
        }
        if(w && typeof w.restoreDioceseReturnState === 'function'){
          w.restoreDioceseReturnState(state || {});
          try{ _primeDioceseBackAfterExternalReturn('diocese-external-restore'); }catch(_e){}
          setTimeout(function(){ try{ _primeDioceseBackAfterExternalReturn('diocese-external-restore-late'); }catch(_e){} finish(); }, 120);
          return true;
        }
      }catch(e){ console.warn('[가톨릭길동무]', e); }
      return false;
    }

    if(!alreadyOpen && typeof openDioceseView === 'function') openDioceseView({restore:true});
    if(!alreadyOpen && typeof oaiSetMainMapLayerHidden === 'function') oaiSetMainMapLayerHidden(true);
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(restoreInFrame()){ clearInterval(timer); return; }
      if(tries>10){ clearInterval(timer); finish(); }
    }, 70);
  }catch(e){ console.warn('[가톨릭길동무]', e); window.__OAI_DIOCESE_RESTORING__ = false; }
  return true;
}
window.addEventListener('pageshow', function(ev){
  try{
    var hasReturn=sessionStorage.getItem(DIOCESE_RETURN_KEY) || localStorage.getItem(DIOCESE_RETURN_KEY);
    if(hasReturn){
      document.documentElement.classList.remove('oai-diocese-returning');
      var view=document.getElementById('diocese-view');
      var frame=document.getElementById('diocese-frame');
      if(view && view.classList.contains('open') && frame && frame.contentWindow){
        var state=null;
        try{ state=JSON.parse(hasReturn); }catch(_e){ state={}; }
        var preserved=false;
        try{
          var w=frame.contentWindow;
          if(w && typeof w.isDioceseReturnPreserved === 'function') preserved = !!w.isDioceseReturnPreserved(state || {});
          else if(w && w.__OAI_DIO_EXTERNAL_LEAVING__) preserved = true;
        }catch(_e){ preserved=false; }
        if(preserved){
          _finishDioceseExternalReturn(frame);
          return;
        }
      }
    }
  }catch(ex){}
  setTimeout(function(){ restoreDioceseExternalState({persisted: !!(ev && ev.persisted)}); }, 20);
}, true);
/* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 동작 없는 빈 포커스 리스너와 빈 지도 진입 훅 제거 */
function clearRouteNoFocus(){
  try{
    if(_mode==='shrine'){
      if(_rS&&_rS.idx>=0&&_markers[_rS.idx]) _markers[_rS.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rS.idx].shrine),false));
      if(_rE&&_rE.idx>=0&&_markers[_rE.idx]) _markers[_rE.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rE.idx].shrine),false));
    }
    _rS=null; _rE=null; _routeMode=false;
    if(typeof _setRouteLabel==='function'){ _setRouteLabel('start',''); _setRouteLabel('end',''); }
    var rs=document.getElementById('rs-result'); if(rs) rs.style.display='none';
    var hint=document.getElementById('rs-hint'); if(hint) hint.style.display='block';
    var sBtn=document.getElementById('rs-search-btn'); if(sBtn) sBtn.style.display='none';
    if(_polyline){ _polyline.setMap(null); _polyline=null; }
    if(typeof _clearRouteTmpMarkers==='function') _clearRouteTmpMarkers();
    if(typeof _showJukrimgulParkingMkr==='function') _showJukrimgulParkingMkr(false);
    var guide=document.getElementById('route-guide'); if(guide) guide.classList.remove('on');
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
/* V6-147-QNA-MYFAITH-COVER-TOAST-CHECK: 현재 성지 외부 링크는 웹사이트 카테고리와 같은 보호창 이동 방식이므로 옛 core external return 복원 로직은 제거하고,
   pageshow 시 지도 DOM이 비어 있는 경우에만 기존 지도 재로딩 보호 흐름을 유지한다. */
window.addEventListener('pageshow', function(e){
  setTimeout(()=>{
    if(_screen==='map' && (!_map || !$('map')?.children.length)){
      const reopenTab=_activeTab||'';
      _resetMapState();
      _mapInited=true;
      window._noAutoNearby = true;
      _loadMap();
      setTimeout(()=>{ if(reopenTab) openTab(reopenTab); },700);
    }
  },0);
});

let _SH_RAW = [];

const _DIO={'SE':'서울대교구','SW':'수원교구','DG':'대구대교구','DJ':'대전교구','GJ':'광주대교구','IC':'인천교구','BS':'부산교구','JJ':'전주교구','UJ':'의정부교구','CJ':'청주교구','MS':'마산교구','CC':'춘천교구','WJ':'원주교구','AD':'안동교구','JE':'제주교구','ML':'군종교구'};
const _URL_T={'1':'http://cafe.daum.net/','2':'https://cafe.daum.net/','3':'http://cafe.naver.com/','4':'https://cafe.naver.com/','5':'http://www.','6':'https://www.','7':'http://','8':'https://','P1':'https://www.casuwon.or.kr','P2':'https://www.daegu-archdiocese.or.kr','P3':'https://www.djcatholic.or.kr','P4':'https://www.gjcatholic.or.kr','P5':'http://www.caincheon.or.kr','P6':'https://www.catholicbusan.or.kr','P7':'https://www.jcatholic.or.kr','P8':'http://www.ucatholic.or.kr','P9':'https://www.cdcj.or.kr','PA':'https://cathms.kr','PB':'https://aos.catholic.or.kr','PC':'https://www.diocesejeju.or.kr','PD':'https://www.gunjong.or.kr','PE':'https://sd.uca.or.kr','PR':'https://www.cbck.or.kr/Directory/Retreat/'};
function _decUrl(u){if(!u)return '';const t=_URL_T[u.slice(0,2)];if(t)return t+u.slice(2);const t1=_URL_T[u[0]];return t1?t1+u.slice(1):u;}
function _unpack(raw){return raw.map((r,i)=>({_idx:i,name:r[0],diocese:_DIO[r[1]]||r[1],addr:r[2],tel:r[3]||'',hp:_decUrl(r[4]||''),url:_decUrl(r[5]||''),lat:r[6],lng:r[7]}));}

let PARISHES=[];
let _parishRawLoaded=false;
let _parishDioIndexReady=false;
let _parishDataLoadPromise=null;
let _parishAllDataLoadPromise=null;
const _PARISH_SPLIT_LAZY_MODE=true;

const _PARISH_DIOCESE_ORDER=[
  'SE','IC','SW','UJ','CC','WJ','DJ','CJ',
  'DG','BS','AD','MS','GJ','JJ','JE','ML'
];
const _PARISH_DIOCESE_ASSETS={
  'SE':'parishes-seoul.js',
  'IC':'parishes-incheon.js',
  'SW':'parishes-suwon.js',
  'UJ':'parishes-uijeongbu.js',
  'CC':'parishes-chuncheon.js',
  'WJ':'parishes-wonju.js',
  'DJ':'parishes-daejeon.js',
  'CJ':'parishes-cheongju.js',
  'DG':'parishes-daegu.js',
  'BS':'parishes-busan.js',
  'AD':'parishes-andong.js',
  'MS':'parishes-masan.js',
  'GJ':'parishes-gwangju.js',
  'JJ':'parishes-jeonju.js',
  'JE':'parishes-jeju.js',
  'ML':'parishes-military.js'
};
const _PARISH_DIOCESE_LOAD_STATE={};
const _PARISH_DIOCESE_LOAD_PROMISES={};
const _PARISH_ASSET_VERSION='V6-147-QNA-MYFAITH-COVER-TOAST-CHECK';
function _getParishDioceseAsset(code){
  return _PARISH_DIOCESE_ASSETS[code] || null;
}
function _getParishDioceseRawStore(){
  try{ return window._PA_DIO_RAW || null; }catch(e){ console.warn('[가톨릭길동무]', e); }
  return null;
}
function _getParishRawByDioceseCode(code){
  const store=_getParishDioceseRawStore();
  if(store && Array.isArray(store[code])) return store[code];
  const raw=_getLegacyParishRawGlobal();
  if(!Array.isArray(raw) || !code) return [];
  return raw.filter(function(r){ return r && r[1]===code; });
}
function _rememberParishDioceseLoaded(code){
  if(code) _PARISH_DIOCESE_LOAD_STATE[code]=true;
  return _PARISH_DIOCESE_LOAD_STATE;
}
function _isParishDioceseReady(code){
  return !!(code && _PARISH_DIOCESE_LOAD_STATE[code] && _getParishRawByDioceseCode(code).length);
}
function _areAllParishDiocesesReady(){
  return _PARISH_DIOCESE_ORDER.every(function(code){ return _isParishDioceseReady(code); });
}
function _rememberAllParishDiocesesLoadedFromRaw(raw){
  if(!Array.isArray(raw)) return _PARISH_DIOCESE_LOAD_STATE;
  raw.forEach(function(r){
    if(r && r[1]) _rememberParishDioceseLoaded(r[1]);
  });
  return _PARISH_DIOCESE_LOAD_STATE;
}
function _mergeLoadedParishRaw(){
  const merged=[];
  const store=_getParishDioceseRawStore();
  _PARISH_DIOCESE_ORDER.forEach(function(code){
    const part=store && Array.isArray(store[code]) ? store[code] : [];
    if(part.length) merged.push.apply(merged, part);
  });
  return merged;
}
function _getLegacyParishRawGlobal(){
  try{ if(Array.isArray(window._PA_RAW) && window._PA_RAW.length) return window._PA_RAW; }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(typeof _PA_RAW!=='undefined' && Array.isArray(_PA_RAW) && _PA_RAW.length) return _PA_RAW; }catch(e){ console.warn('[가톨릭길동무]', e); }
  return null;
}
function _getParishRawGlobal(){
  const legacy=_getLegacyParishRawGlobal();
  if(Array.isArray(legacy) && legacy.length) return legacy;
  const merged=_mergeLoadedParishRaw();
  return merged.length ? merged : null;
}
function _buildParishList(raw){
  raw = Array.isArray(raw) ? raw : [];
  return raw.map((r,i)=>({
    _idx:i,
    name:r[0],
    diocese:_DIO[r[1]]||r[1],
    addr:r[2],
    tel:r[3]||'',
    hp:_decUrl(r[4]||''),
    url:_decUrl(r[5]||''),
    lat:r[6],
    lng:r[7]
  }));
}
function _setParishRawData(raw, loaded){
  raw = Array.isArray(raw) ? raw : [];
  PARISHES=_buildParishList(raw);
  _parishRawLoaded=loaded !== false && raw.length > 0;
  if(_parishRawLoaded) _rememberAllParishDiocesesLoadedFromRaw(raw);
  if(_parishDioIndexReady && typeof _rebuildParishDioIndex==='function') _rebuildParishDioIndex();
  return PARISHES;
}
function _refreshParishDataFromLoadedDioceses(){
  const raw=_getParishRawGlobal() || [];
  return _setParishRawData(raw, raw.length>0);
}
function _initParishDataFromGlobal(){
  return _refreshParishDataFromLoadedDioceses();
}
function _showParishDataLoadingMessage(msg){
  try{
    const listBody=document.getElementById('list-body');
    if(listBody && _mode==='parish') listBody.innerHTML='<div class="empty-msg">'+(msg||'성당 정보를 불러오는 중입니다...')+'</div>';
    const nearbyBody=document.getElementById('nearby-body');
    if(nearbyBody && _mode==='parish' && _activeTab==='nearby') nearbyBody.innerHTML='<div class="empty-msg">'+(msg||'성당 정보를 불러오는 중입니다...')+'</div>';
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _afterParishDataLoaded(){
  try{
    if(_mode==='parish'){
      if(_activeTab==='list') renderList();
      if(_activeDio) _showParishDioMkrs(_activeDio);
      _syncParishDioLabels();
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _ensureParishDioceseDataLoaded(code){
  if(!code) return Promise.reject(new Error('교구 코드가 없습니다.'));
  if(_isParishDioceseReady(code)) return Promise.resolve(_refreshParishDataFromLoadedDioceses());
  if(_PARISH_DIOCESE_LOAD_PROMISES[code]) return _PARISH_DIOCESE_LOAD_PROMISES[code];
  const asset=_getParishDioceseAsset(code);
  if(!asset) return Promise.reject(new Error('교구 데이터 파일을 찾을 수 없습니다: '+code));
  _PARISH_DIOCESE_LOAD_PROMISES[code]=new Promise(function(resolve,reject){
    const already=document.querySelector('script[data-parish-dio="'+code+'"]');
    function finish(){
      const raw=_getParishRawByDioceseCode(code);
      if(raw && raw.length){
        _rememberParishDioceseLoaded(code);
        resolve(_refreshParishDataFromLoadedDioceses());
      }else{
        reject(new Error('성당 교구 데이터가 비어 있습니다: '+code));
      }
    }
    if(already){
      already.addEventListener('load', finish, {once:true});
      already.addEventListener('error', function(){ reject(new Error('성당 교구 데이터 로드 실패: '+code)); }, {once:true});
      setTimeout(function(){ try{ if(_getParishRawByDioceseCode(code).length) finish(); }catch(_e){} },0);
      return;
    }
    const sc=document.createElement('script');
    sc.src=asset+'?v='+_PARISH_ASSET_VERSION;
    sc.dataset.parishDio=code;
    sc.onload=finish;
    sc.onerror=function(){ reject(new Error('성당 교구 데이터 로드 실패: '+code)); };
    document.head.appendChild(sc);
  }).then(function(result){
    delete _PARISH_DIOCESE_LOAD_PROMISES[code];
    _afterParishDataLoaded();
    return result;
  }).catch(function(err){
    delete _PARISH_DIOCESE_LOAD_PROMISES[code];
    throw err;
  });
  return _PARISH_DIOCESE_LOAD_PROMISES[code];
}
function _ensureAllParishDiocesesLoaded(){
  if(_areAllParishDiocesesReady()) return Promise.resolve(_refreshParishDataFromLoadedDioceses());
  if(_parishAllDataLoadPromise) return _parishAllDataLoadPromise;
  _showParishDataLoadingMessage('전체 성당 정보를 불러오는 중입니다...');
  _parishAllDataLoadPromise=Promise.all(_PARISH_DIOCESE_ORDER.map(function(code){
    return _ensureParishDioceseDataLoaded(code);
  })).then(function(){
    _parishAllDataLoadPromise=null;
    return _refreshParishDataFromLoadedDioceses();
  }).catch(function(err){
    _parishAllDataLoadPromise=null;
    throw err;
  });
  return _parishAllDataLoadPromise;
}
function _ensureParishDataLoaded(){
  if(_parishRawLoaded && PARISHES.length) return Promise.resolve(PARISHES);
  if(_parishDataLoadPromise) return _parishDataLoadPromise;
  _parishDataLoadPromise=_ensureAllParishDiocesesLoaded().catch(function(err){
    _parishDataLoadPromise=null;
    throw err;
  });
  return _parishDataLoadPromise;
}
_initParishDataFromGlobal();

const _PRAYER_ASSET_VERSION='V8-1-13-6-SHRINE-BOUNDARY-GUARD';
let _prayerModuleLoadPromise=null;
function _isPrayerDataReady(){
  return !!(window.PRAYER_DATA && typeof window.PRAYER_DATA === 'object');
}
function _isPrayerModuleReady(){
  return _isPrayerDataReady() &&
         typeof window.initPrayerView === 'function' &&
         typeof window.prRenderList === 'function' &&
         typeof window.prAdjustFont === 'function';
}
function _showPrayerLoadingMessage(msg){
  const body=document.getElementById('pr-list-ul');
  if(body) body.innerHTML='<div class="pr-empty">'+(msg||'기도문을 불러오는 중입니다...')+'</div>';
}
function _loadPrayerScriptOnce(src, attrName, errMsg){
  return new Promise(function(resolve,reject){
    const existing=document.querySelector('script['+attrName+'="true"]');
    if(existing){
      if(existing.dataset.loaded === 'true') { resolve(true); return; }
      existing.addEventListener('load', function(){ resolve(true); }, {once:true});
      existing.addEventListener('error', function(){ reject(new Error(errMsg)); }, {once:true});
      return;
    }
    const sc=document.createElement('script');
    sc.src=src;
    sc.setAttribute(attrName,'true');
    sc.onload=function(){ sc.dataset.loaded='true'; resolve(true); };
    sc.onerror=function(){ reject(new Error(errMsg)); };
    document.head.appendChild(sc);
  });
}
function ensurePrayerModuleLoaded(){
  if(_isPrayerModuleReady()) return Promise.resolve(true);
  if(_prayerModuleLoadPromise) return _prayerModuleLoadPromise;
  _showPrayerLoadingMessage('기도문을 불러오는 중입니다...');
  _prayerModuleLoadPromise=Promise.resolve()
    .then(function(){
      if(_isPrayerDataReady()) return true;
      return _loadPrayerScriptOnce('prayer-data.js?v='+_PRAYER_ASSET_VERSION, 'data-prayer-data-loader', '기도문 데이터 로드 실패');
    })
    .then(function(){
      if(!_isPrayerDataReady()) throw new Error('기도문 데이터가 준비되지 않았습니다.');
      if(typeof window.initPrayerView === 'function') return true;
      return _loadPrayerScriptOnce('prayer.js?v='+_PRAYER_ASSET_VERSION, 'data-prayer-loader', '기도문 모듈 로드 실패');
    })
    .then(function(){
      if(_isPrayerModuleReady()) return true;
      throw new Error('기도문 모듈이 준비되지 않았습니다.');
    })
    .catch(function(err){
      _prayerModuleLoadPromise=null;
      throw err;
    });
  return _prayerModuleLoadPromise;
}
try{ window.ensurePrayerModuleLoaded=ensurePrayerModuleLoaded; }catch(e){ console.warn('[가톨릭길동무]', e); }

let _RT_RAW = [];
let _retreatRawLoaded = false;
let _retreatDataLoadPromise = null;
const _RETREAT_ASSET_VERSION='V6-147-QNA-MYFAITH-COVER-TOAST-CHECK';

let RETREATS = [];
function _buildRetreatList(raw){
  return _unpack(Array.isArray(raw) ? raw : []);
}
function _getRetreatRawGlobal(){
  try{ if(Array.isArray(window._RT_RAW)) return window._RT_RAW; }catch(e){ console.warn('[가톨릭길동무]', e); }
  return null;
}
function _setRetreatRawData(raw, loaded){
  _RT_RAW = Array.isArray(raw) ? raw : [];
  RETREATS = _buildRetreatList(_RT_RAW);
  _retreatRawLoaded = loaded !== false && _RT_RAW.length > 0;
  return RETREATS;
}
function _initRetreatDataFromGlobal(){
  const raw=_getRetreatRawGlobal();
  return _setRetreatRawData(raw || [], !!raw);
}
function _ensureRetreatDataLoaded(){
  const existingRaw=_getRetreatRawGlobal();
  if(existingRaw && (!_retreatRawLoaded || !RETREATS.length)) _setRetreatRawData(existingRaw, true);
  if(_retreatRawLoaded && RETREATS.length) return Promise.resolve(RETREATS);
  if(_retreatDataLoadPromise) return _retreatDataLoadPromise;
  _retreatDataLoadPromise=new Promise(function(resolve,reject){
    const already=document.querySelector('script[data-retreat-loader="true"],script[src*="retreats.js"]');
    function finish(){
      const raw=_getRetreatRawGlobal();
      if(raw && raw.length){ resolve(_setRetreatRawData(raw, true)); }
      else reject(new Error('피정의집 데이터가 비어 있습니다.'));
    }
    if(already){
      already.addEventListener('load', finish, {once:true});
      already.addEventListener('error', function(){ reject(new Error('피정의집 데이터 로드 실패')); }, {once:true});
      setTimeout(function(){ try{ if(_getRetreatRawGlobal()) finish(); }catch(_e){} }, 0);
      return;
    }
    const sc=document.createElement('script');
    sc.src='retreats.js?v='+_RETREAT_ASSET_VERSION;
    sc.dataset.retreatLoader='true';
    sc.onload=finish;
    sc.onerror=function(){ reject(new Error('피정의집 데이터 로드 실패')); };
    document.head.appendChild(sc);
  }).catch(function(err){
    _retreatDataLoadPromise=null;
    throw err;
  });
  return _retreatDataLoadPromise;
}
try{ window._setRetreatRawData=_setRetreatRawData; }catch(e){ console.warn('[가톨릭길동무]', e); }
_initRetreatDataFromGlobal();
function _getCurrentItems(){return _mode==='shrine'?SHRINES:(_mode==='retreat'?RETREATS:PARISHES);}
function _getModeTypeText(){return _mode==='shrine'?'성지':(_mode==='retreat'?'피정의 집':'성당');}
function _getModeTypeLabel(item){return _mode==='shrine'?item.type:(_mode==='retreat'?'🏔 피정의 집':'⛪ 성당');}
function _itemSearchBlob(item){return String((item&&item.name)||'')+' '+String((item&&item.diocese)||'')+' '+String((item&&item.addr)||'')+' '+String((item&&item.kw)||'');}
function _itemSearchNorm(item){return _itemSearchBlob(item).replace(/\s+/g,'');}
const _RETREAT_DIO_COLORS={'SE':'#c0392b','IC':'#c0392b','SW':'#c0392b','UJ':'#c0392b','CC':'#1565c0','WJ':'#1565c0','DJ':'#c0392b','CJ':'#1565c0','DG':'#1b7a3e','AD':'#1b7a3e','BS':'#1565c0','MS':'#1b7a3e','GJ':'#1b7a3e','JJ':'#1b7a3e','JE':'#1b7a3e','ML':'#c0392b'};
const OAI_CATHEDRAL_CATEGORY_COLOR = '#3F4752';
const OAI_RETREAT_CATEGORY_COLOR = '#3F6F5A';
const OAI_RETREAT_LIST_DOT_COLOR = '#c0392b';
function _getRetreatColor(item){return OAI_RETREAT_CATEGORY_COLOR;}
function _getModeMarkerColor(item){return _mode==='shrine'?(TC[item.type]||'#555'):(_mode==='retreat'?_getRetreatColor(item):OAI_CATHEDRAL_CATEGORY_COLOR);}
function _getRouteGuideTarget(){return _mode==='shrine'?'성지':(_mode==='retreat'?'피정의 집':'성당');}
const OAI_ROUTE_VISUAL_DELAY_MS = 260;

const JSKEY = (window.APP_CONFIG && window.APP_CONFIG.KAKAO_JS_KEY) || '';
const KAKAO_REST_PROXY_URL = (window.APP_CONFIG && window.APP_CONFIG.KAKAO_REST_PROXY_URL) || '';
(function(){
  if(!JSKEY || !KAKAO_REST_PROXY_URL){
    console.warn(
      '[가톨릭길동무] Kakao 설정이 비어 있습니다.\n' +
      '  JS 키는 도메인 제한 후 공개 코드에 둘 수 있고, REST 호출은 Worker 프록시 URL로 연결해야 합니다.'
    );
  }
})();
function _appendQueryToUrl(url, params){
  const qs = new URLSearchParams(params || {}).toString();
  if(!qs) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + qs;
}
function _kakaoRestProxyUrl(endpoint, params){
  if(!KAKAO_REST_PROXY_URL) return '';
  return _appendQueryToUrl(KAKAO_REST_PROXY_URL, Object.assign({ endpoint: endpoint }, params || {}));
}
function _kakaoRestFetch(endpoint, params){
  const url = _kakaoRestProxyUrl(endpoint, params);
  if(!url) return Promise.reject(new Error('missing kakao rest proxy url'));
  return fetch(url, { method:'GET', credentials:'omit', cache:'no-store' });
}
function _kakaoDirectionsFetch(origin, destination, timeoutMs){
  const params = { origin: origin, destination: destination, priority:'RECOMMEND' };
  if(!timeoutMs || typeof AbortController === 'undefined') return _kakaoRestFetch('directions', params);
  const url = _kakaoRestProxyUrl('directions', params);
  if(!url) return Promise.reject(new Error('missing kakao rest proxy url'));
  const controller = new AbortController();
  const timer = setTimeout(function(){ try{ controller.abort(); }catch(e){} }, timeoutMs);
  return fetch(url, { method:'GET', credentials:'omit', cache:'no-store', signal: controller.signal })
    .finally(function(){ clearTimeout(timer); });
}
function _kakaoKeywordFetch(query, size, page){
  var params = { query: query, size: String(size || 10) };
  if(page) params.page = String(page);
  return _kakaoRestFetch('keyword', params);
}
function _dedupeKakaoDocs(groups, max){
  var seen = {};
  var docs = [];
  (groups || []).forEach(function(list){
    (list || []).forEach(function(d){
      var key = d.id || [d.place_name, d.x, d.y, d.road_address_name || d.address_name || ''].join('|');
      if(seen[key]) return;
      seen[key] = true;
      docs.push(d);
    });
  });
  return docs.slice(0, max);
}
function _kakaoKeywordDocsFromRest(query, max){
  var pages = Math.ceil(max / 15);
  var jobs = [];
  for(var page=1; page<=pages; page++){
    var size = Math.min(15, max - ((page - 1) * 15));
    jobs.push(
      _kakaoKeywordFetch(query, size, page)
        .then(function(r){ return r.json(); })
        .then(function(data){ return (data && data.documents) ? data.documents : []; })
        .catch(function(){ return []; })
    );
  }
  return Promise.all(jobs).then(function(groups){ return _dedupeKakaoDocs(groups, max); });
}
function _kakaoKeywordDocsFromJs(query, max){
  return new Promise(function(resolve){
    try{
      if(!(window.kakao && kakao.maps && kakao.maps.services && kakao.maps.services.Places)){
        resolve([]);
        return;
      }
      var places = new kakao.maps.services.Places();
      var pageLimit = Math.ceil(max / 15);
      var groups = [];
      var pageCount = 0;
      var settled = false;

      function done(){
        if(settled) return;
        settled = true;
        resolve(_dedupeKakaoDocs(groups, max));
      }

      var searchOpts = { size: 15 };
      try{ if(kakao.maps.services.SortBy && kakao.maps.services.SortBy.ACCURACY) searchOpts.sort = kakao.maps.services.SortBy.ACCURACY; }catch(_e){}
      places.keywordSearch(query, function(data, status, pagination){
        try{
          var OK = kakao.maps.services.Status.OK;
          if(status === OK && data && data.length){
            groups.push(data);
            pageCount += 1;
            if(_dedupeKakaoDocs(groups, max).length >= max){ done(); return; }
            if(pagination && pagination.hasNextPage && pageCount < pageLimit){
              setTimeout(function(){
                try{ pagination.nextPage(); }catch(_e){ done(); }
              }, 80);
              return;
            }
          }
        }catch(e){
          console.warn('[가톨릭길동무]', e);
        }
        done();
      }, searchOpts);

      setTimeout(done, 4200);
    }catch(e){
      console.warn('[가톨릭길동무]', e);
      resolve([]);
    }
  });
}
function _kakaoKeywordDocs(query, limit){
  var max = Math.max(1, parseInt(limit || 10, 10) || 10);
  return _kakaoKeywordDocsFromRest(query, max).then(function(restDocs){
    restDocs = restDocs || [];
    if(restDocs.length >= max) return restDocs.slice(0, max);
    return _kakaoKeywordDocsFromJs(query, max).then(function(jsDocs){
      return _dedupeKakaoDocs([restDocs, jsDocs || []], max);
    }).catch(function(){ return restDocs.slice(0, max); });
  }).catch(function(){
    return _kakaoKeywordDocsFromJs(query, max).then(function(jsDocs){ return (jsDocs || []).slice(0, max); });
  });
}
const KAKAO_PLACE_SEARCH_DISPLAY_LIMIT = 30;
const TC    = {'성지':'#c0392b','순례지':'#1565c0','순교 사적지':'#1b7a3e'};
const _DIOS=[['all','전체'],['서울대교구','서울'],['인천교구','인천'],['수원교구','수원'],['의정부교구','의정부'],['춘천교구','춘천'],['원주교구','원주'],['대전교구','대전'],['청주교구','청주'],['대구대교구','대구'],['안동교구','안동'],['부산교구','부산'],['마산교구','마산'],['광주대교구','광주'],['전주교구','전주'],['제주교구','제주'],['군종교구','군종']];
const _MY_DIOCESE_STORAGE_KEY='oai_my_diocese_name';
function _getMyDioceseName(){
  try{return (localStorage.getItem(_MY_DIOCESE_STORAGE_KEY)||'').trim();}
  catch(e){return '';}
}
function _isMyDioceseName(name){
  const my=_getMyDioceseName();
  return !!(my&&name&&String(name).trim()===my);
}
function _getDioceseOrderIndex(name){
  const idx=_DIOS.findIndex(function(x){return x&&x[0]===name;});
  return idx<0?999:idx;
}
function _sortDioceseNamesWithMyFirst(names){
  const my=_getMyDioceseName();
  return names.slice().sort(function(a,b){
    if(my){
      const ar=String(a||'')===my?0:1;
      const br=String(b||'')===my?0:1;
      if(ar!==br)return ar-br;
    }
    return _getDioceseOrderIndex(a)-_getDioceseOrderIndex(b);
  });
}
function _getDioFilterEntries(){
  const my=_getMyDioceseName();
  if(!my)return _DIOS.slice();
  const first=_DIOS[0];
  const rest=_DIOS.slice(1);
  const myEntry=rest.find(function(x){return x&&x[0]===my;});
  if(!myEntry)return _DIOS.slice();
  return [first,myEntry].concat(rest.filter(function(x){return !(x&&x[0]===my);}));
}
function _renderDioFilterBars(){
  const fb=$('list-filter-bar'), sm=$('sm-filter-bar');
  if(!fb||!sm)return;
  const entries=_getDioFilterEntries();
  fb.innerHTML='';
  sm.innerHTML='';
  entries.forEach(function(pair,i){
    const v=pair[0], l=pair[1];
    const active=(_filterDio===v)||(!_filterDio&&i===0);
    const on=(_smDio===v)||(!_smDio&&i===0);
    const myCls=_isMyDioceseName(v)?' my-diocese-filter':'';
    const myLabel=_isMyDioceseName(v)?'<span class="filter-my-dio-badge">나의 교구</span>':'';
    fb.innerHTML+=`<button class="filter-btn${active?' active':''}${myCls}" onclick="setDioFilter('${v}',this)">${l}${myLabel}</button>`;
    sm.innerHTML+=`<button class="sm-fb${on?' on':''}${myCls}" onclick="setSmDio('${v}',this)">${l}${myLabel}</button>`;
  });
}

const _SU='https://www.cbck.or.kr/Catholic/Shrine/Read?seq=';
const _navCache = new Map();
const _NAV_CONCURRENCY = 5;
const OAI_NEARBY_ROUTE_CANDIDATE_LIMIT = 20;
const OAI_NEARBY_ROUTE_TIMEOUT_MS = 3000;
const OAI_MY_LOCATION_MARKER_ZINDEX = 1200;
let _navActive = 0;
const _navQueue = [];
let _suppressNextRouteGuide = false;

function _navFetch(origin, dest) {
  const key = `${origin}→${dest}`;
  if (_navCache.has(key)) return Promise.resolve(_navCache.get(key));
  return new Promise((resolve) => {
    function run() {
      _navActive++;
      _kakaoDirectionsFetch(origin, dest, OAI_NEARBY_ROUTE_TIMEOUT_MS)
        .then(r => r.json())
        .then(data => {
          const route = data.routes?.[0];
          const val = (route && route.result_code === 0)
            ? { km: route.summary.distance / 1000, dur: route.summary.duration }
            : null;
          if (val) _navCache.set(key, val);
          resolve(val);
        })
        .catch(() => resolve(null))
        .finally(() => {
          _navActive--;
          if (_navQueue.length) _navQueue.shift()();
        });
    }
    if (_navActive < _NAV_CONCURRENCY) run();
    else _navQueue.push(run);
  });
}
const $=id=>document.getElementById(id);
const $$=s=>document.querySelectorAll(s);
const _GEO=navigator.geolocation;
const _GO1={enableHighAccuracy:true,timeout:10000};
const _GO2={enableHighAccuracy:false,timeout:3000,maximumAge:300000};
const _EC=encodeURIComponent;
const _NS='xmlns="http://www.w3.org/2000/svg"';
const _svgUrl=s=>'data:image/svg+xml;charset=utf-8,'+_EC(s);
const _isMob=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const _isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const _TY={'A':'성지','B':'순례지','C':'순교 사적지'};

let _shrineRawLoaded = false;
let _shrineDataLoadPromise = null;
const _SHRINE_ASSET_VERSION='V6-147-QNA-MYFAITH-COVER-TOAST-CHECK';
let SHRINES = [];
let JUKRIMGUL_IDX = -1;
function _decodeShrineHomePage(hp){
  if(!hp) return '';
  if(_URL_T[hp.slice(0,2)]) return _URL_T[hp.slice(0,2)] + hp.slice(2);
  if(_URL_T[hp[0]]) return _URL_T[hp[0]] + hp.slice(1);
  return hp;
}
const OAI_NEW_SHRINE_URL_FIXES={};
function _applyNewShrineUrlFix(s){
  try{
    if(!s || !s.isNew || !s.name) return s;
    const fix=OAI_NEW_SHRINE_URL_FIXES[String(s.name)]||null;
    if(!fix) return s;
    if(fix.hp) s.hp=fix.hp; else delete s.hp;
    if(fix.guideUrl) s.guideUrl=fix.guideUrl; else delete s.guideUrl;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return s;
}
function _buildShrineList(raw){
  return (Array.isArray(raw) ? raw : []).map(function(src){
    const s = _applyNewShrineUrlFix(Object.assign({}, src));
    if(s.hp) s.hp = _decodeShrineHomePage(s.hp);
    if(s.guideUrl) s.guideUrl = _decodeShrineHomePage(s.guideUrl);
    if(_DIO[s.diocese]) s.diocese = _DIO[s.diocese];
    if(_TY[s.type]) s.type = _TY[s.type];
    return s;
  });
}
function _getShrineRawGlobal(){
  try{ if(Array.isArray(window._SH_RAW)) return window._SH_RAW; }catch(e){ console.warn('[가톨릭길동무]', e); }
  return null;
}
function _rebuildShrineSpecialIndexes(){
  try{ JUKRIMGUL_IDX = SHRINES.findIndex(function(s){ return s && s.name === '죽림굴'; }); }catch(e){ JUKRIMGUL_IDX = -1; }
}
function _setShrineRawData(raw, loaded){
  _SH_RAW = Array.isArray(raw) ? raw : [];
  SHRINES = _buildShrineList(_SH_RAW);
  _shrineRawLoaded = loaded !== false && _SH_RAW.length > 0;
  _rebuildShrineSpecialIndexes();
  return SHRINES;
}
function _initShrineDataFromGlobal(){
  const raw = _getShrineRawGlobal();
  return _setShrineRawData(raw || _SH_RAW || [], !!(raw || (_SH_RAW && _SH_RAW.length)));
}
function _ensureShrineDataLoaded(){
  const existingRaw=_getShrineRawGlobal();
  if(existingRaw && (!_shrineRawLoaded || !SHRINES.length)) _setShrineRawData(existingRaw, true);
  if(_shrineRawLoaded && SHRINES.length) return Promise.resolve(SHRINES);
  if(_shrineDataLoadPromise) return _shrineDataLoadPromise;
  _shrineDataLoadPromise=new Promise(function(resolve,reject){
    const already=document.querySelector('script[data-shrine-loader="true"],script[src*="shrines.js"]');
    function finish(){
      const raw=_getShrineRawGlobal();
      if(raw && raw.length){ resolve(_setShrineRawData(raw, true)); }
      else reject(new Error('성지 데이터가 비어 있습니다.'));
    }
    if(already){
      already.addEventListener('load', finish, {once:true});
      already.addEventListener('error', function(){ reject(new Error('성지 데이터 로드 실패')); }, {once:true});
      setTimeout(function(){ try{ if(_getShrineRawGlobal()) finish(); }catch(_e){} }, 0);
      return;
    }
    const sc=document.createElement('script');
    sc.src='shrines.js?v='+_SHRINE_ASSET_VERSION;
    sc.dataset.shrineLoader='true';
    sc.onload=finish;
    sc.onerror=function(){ reject(new Error('성지 데이터 로드 실패')); };
    document.head.appendChild(sc);
  }).catch(function(err){
    _shrineDataLoadPromise=null;
    throw err;
  });
  return _shrineDataLoadPromise;
}
try{ window._setShrineRawData = _setShrineRawData; }catch(e){ console.warn('[가톨릭길동무]', e); }
_initShrineDataFromGlobal();
const AppState = {
  map:              null,   // Kakao 지도 인스턴스
  markers:          [],     // 성지/성당 마커 배열
  retreatMarkers:   [],     // 피정의 집 마커 배열
  myMkr:            null,   // 내 위치 마커
  myLat:            null,   // 내 위치 위도
  myLng:            null,   // 내 위치 경도
  jukrimgulParkMkr: null,   // 죽림굴 주차장 마커
  startTmpMkr:      null,   // 출발지 임시 마커
  endTmpMkr:        null,   // 도착지 임시 마커
  wayTmpMkr:        null,   // 경유지1 임시 마커
  way2TmpMkr:       null,   // 경유지2 임시 마커
  way3TmpMkr:       null,   // 경유지3 임시 마커
  paSelMkr:         null,   // parish/retreat 선택 마커
  selIdx:           -1,     // 현재 선택된 shrine 마커 인덱스
  polyline:         null,   // 경로 폴리라인

  mode:       'shrine',  // 'shrine' | 'parish' | 'retreat'
  screen:     'cover',   // 'cover' | 'map'
  activeTab:  null,      // 현재 열린 탭 이름

  filterDio:  'all',     // 교구 필터
  listSrch:   '',        // 목록 검색어

  regionLat:       null,
  regionLng:       null,
  regionName:      '',
  regionPlaceName: '',
  regionCache:     [],   // 지역검색 결과 캐시
  regionMarker:    null, // 지역검색 선택 장소 보라색 마커
  regionResultMarkers: [], // 성당 지역검색 결과 전용 임시 마커

  nearbyCache: [],       // 내주변 결과 캐시
  nearbyParishMarkers: [], // 성당 첫 진입/내주변 10곳 전용 마커
  nearbyLoadToken: 0,    // 내주변 비동기 거리 계산 최신 요청 번호

  routeMode:        false,
  rS:               null,  // 출발지 {lat, lng, name, idx}
  rW:               null,  // 경유지1 {lat, lng, name, idx}
  routeWaypointEnabled: false, // 경유지1 박스 표시 여부
  rW2:              null,  // 경유지2 {lat, lng, name, idx}
  routeWaypoint2Enabled: false, // 경유지2 박스 표시 여부
  rW3:              null,  // 경유지3 {lat, lng, name, idx}
  routeWaypoint3Enabled: false, // 경유지3 박스 표시 여부
  rE:               null,  // 도착지
  routeRegionStart: null,  // 지역검색에서 길찾기 시작 시 출발지 보존
  routeStartMarkerExplicitCurrent: false, // 길찾기 탭의 '현위치' 버튼을 눌렀을 때만 출발지 임시 마커 표시

  smRole: 'start',
  smDio:  'all',

  curInfoItem:   null,   // 현재 열린 인포카드 아이템
  curFromRegion: false,  // 인포카드가 지역검색에서 열렸는지

  kakaoLaunching: false,
  mapInited:      false,

  exitReady: false,
  exitTimer: null,

  dioMkrs:            {},   // code → [Marker, ...]
  dioOverlays:        {},   // code → CustomOverlay
  activeDio:          null, // 현재 마커 펼쳐진 교구 코드
  parishSysInited:    false,
  parishIdleListener: null, // 뷰포트 필터링용 idle 이벤트 리스너
  parishDioUserZoomTouched: false, // 사용자가 성당 교구 지도에서 직접 확대/축소했는지
  parishDioProgrammaticMoveUntil: 0, // 앱이 조정한 줌 변경을 사용자 조작으로 오인하지 않기 위한 보호 시간

  smPlaceDebounce: null,
  smTab: 'cat',  // 'cat' | 'place'
};

(function installStateProxy() {
  const map = [
    ['_map',              'map'],
    ['_markers',          'markers'],
    ['_retreatMarkers',   'retreatMarkers'],
    ['_myMkr',            'myMkr'],
    ['_myLat',            'myLat'],
    ['_myLng',            'myLng'],
    ['_jukrimgulParkMkr', 'jukrimgulParkMkr'],
    ['_startTmpMkr',      'startTmpMkr'],
    ['_endTmpMkr',        'endTmpMkr'],
    ['_wayTmpMkr',        'wayTmpMkr'],
    ['_way2TmpMkr',       'way2TmpMkr'],
    ['_way3TmpMkr',       'way3TmpMkr'],
    ['_paSelMkr',         'paSelMkr'],
    ['_selIdx',           'selIdx'],
    ['_polyline',         'polyline'],
    ['_mode',             'mode'],
    ['_screen',           'screen'],
    ['_activeTab',        'activeTab'],
    ['_filterDio',        'filterDio'],
    ['_listSrch',         'listSrch'],
    ['_regionLat',        'regionLat'],
    ['_regionLng',        'regionLng'],
    ['_regionName',       'regionName'],
    ['_regionPlaceName',  'regionPlaceName'],
    ['_regionCache',      'regionCache'],
    ['_regionMarker',     'regionMarker'],
    ['_regionResultMarkers','regionResultMarkers'],
    ['_nearbyCache',      'nearbyCache'],
    ['_nearbyLoadToken',  'nearbyLoadToken'],
    ['_routeMode',        'routeMode'],
    ['_rS',               'rS'],
    ['_rW',               'rW'],
    ['_routeWaypointEnabled','routeWaypointEnabled'],
    ['_rW2',              'rW2'],
    ['_routeWaypoint2Enabled','routeWaypoint2Enabled'],
    ['_rW3',              'rW3'],
    ['_routeWaypoint3Enabled','routeWaypoint3Enabled'],
    ['_rE',               'rE'],
    ['_routeRegionStart', 'routeRegionStart'],
    ['_routeStartMarkerExplicitCurrent', 'routeStartMarkerExplicitCurrent'],
    ['_smRole',           'smRole'],
    ['_smDio',            'smDio'],
    ['_curInfoItem',      'curInfoItem'],
    ['_curFromRegion',    'curFromRegion'],
    ['_kakaoLaunching',   'kakaoLaunching'],
    ['_mapInited',        'mapInited'],
    ['_exitReady',        'exitReady'],
    ['_exitTimer',        'exitTimer'],
    ['_dioMkrs',             'dioMkrs'],
    ['_dioOverlays',         'dioOverlays'],
    ['_activeDio',           'activeDio'],
    ['_parishSysInited',     'parishSysInited'],
    ['_parishIdleListener',  'parishIdleListener'],
    ['_parishDioUserZoomTouched', 'parishDioUserZoomTouched'],
    ['_parishDioProgrammaticMoveUntil', 'parishDioProgrammaticMoveUntil'],
    ['_smPlaceDebounce',  'smPlaceDebounce'],
    ['_smTab',            'smTab'],
  ];
  map.forEach(function([legacyName, stateKey]) {
    Object.defineProperty(window, legacyName, {
      get: function() { return AppState[stateKey]; },
      set: function(v) { AppState[stateKey] = v; },
      configurable: true,
      enumerable: false,
    });
  });
})();

const JUKRIMGUL_PARKING = {lat:35.550726, lng:129.014589, name:'죽림굴주차장', kw:'죽림굴주차장'};
(function(){
  if(!window.visualViewport) return;
  let _kbOpen=false;
  window.visualViewport.addEventListener('resize',()=>{
  const ratio = window.visualViewport.height / window.innerHeight;
  const isKb = ratio < 0.75;
  if(isKb===_kbOpen) return;
  _kbOpen=isKb;
  if(isKb){
   document.documentElement.classList.add('kb-open');
  } else {
   document.documentElement.classList.remove('kb-open');
  }
  });
})();
(function(){
  function measureSA(){
  const b=document.createElement('div');
  b.style.cssText='position:fixed;bottom:0;left:0;width:1px;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(b);
  const sb=b.offsetHeight||0;
  document.body.removeChild(b);
  if(sb>0) document.documentElement.style.setProperty('--sb',sb+'px');
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',measureSA):measureSA();
  window.addEventListener('resize',measureSA);
})();
(function(){
  const c=$('cv-stars');
  if(!c) return;
  for(let i=0;i<22;i++){
  const s=document.createElement('span');
  s.className='cv-star';
  const sz=Math.random()*4+2;
  s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${(Math.random()*3).toFixed(1)}s;animation-duration:${(2+Math.random()*3).toFixed(1)}s;`;
  c.appendChild(s);
  }
})();
(function(){
  window._appExiting = false;
})();

function _forceNextCoverBackToast(reason){
  return;
}
function _consumeForceNextCoverBackToast(){
  try{
    var until = Number(window.__oaiForceNextCoverBackToastUntil || 0);
    if(until && Date.now() < until){
      window.__oaiForceNextCoverBackToastUntil = 0;
      window.__oaiForceNextCoverBackToastReason = '';
      _exitReady = false;
      clearTimeout(_exitTimer);
      _clearCoverExitArmed();
      const old=$('_bt');
      if(old) old.remove();
      return true;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return false;
}

function _showBackToast(){
  try{
    if(sessionStorage.getItem('oai_cover_exit_hard_on_next_back') === '1'){
      sessionStorage.removeItem('oai_cover_exit_hard_on_next_back');
      sessionStorage.removeItem('oai_cover_exit_hard_after_first_toast');
      _exitReady=false;
      _clearCoverExitArmed();
      clearTimeout(_exitTimer);
      doExit();
      return true;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  var forceFirstToast = false;
  try{ forceFirstToast = _consumeForceNextCoverBackToast(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(typeof _consumePrayerCoverNeedsFirstToast === 'function' && _consumePrayerCoverNeedsFirstToast()){
      _exitReady = false;
      _clearCoverExitArmed();
      clearTimeout(_exitTimer);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(!forceFirstToast && (_exitReady || _isCoverExitArmed())){
    _exitReady=false;
    _clearCoverExitArmed();
    clearTimeout(_exitTimer);
    doExit();
    return true; // 두 번째 뒤로가기: popstate 트랩을 다시 심지 않도록 알림
  }
  _exitReady=true;
  _armCoverExitWindow();
  const old=$('_bt');
  if(old) old.remove();
  const t=document.createElement('div');
  t.id='_bt';
  t.textContent='한 번 더 누르면 앱이 종료됩니다';
  t.style.cssText='position:fixed;top:50%;left:50%;bottom:auto;transform:translate(-50%,-50%);background:rgba(14,21,53,.94);color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:800;z-index:99999;white-space:nowrap;pointer-events:none;box-shadow:0 14px 36px rgba(0,0,0,.32);';
  document.body.appendChild(t);
  var coverExitToastMs = 2500;
  try{
    if(sessionStorage.getItem('oai_cover_exit_hard_after_first_toast') === '1'){
      sessionStorage.removeItem('oai_cover_exit_hard_after_first_toast');
      sessionStorage.setItem('oai_cover_exit_hard_on_next_back', '1');
    }
    if(sessionStorage.getItem('oai_cover_exit_long_window_once') === '1'){
      sessionStorage.removeItem('oai_cover_exit_long_window_once');
      coverExitToastMs = 10000;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  _exitTimer=setTimeout(function(){
    _exitReady=false;
    _clearCoverExitArmed();
    if(t.parentNode)t.remove();
  },coverExitToastMs);
  return false; // 첫 번째 뒤로가기: 토스트만 표시
}


function attemptAppExit(){
  window._appExiting = true;
  const bt=$('_bt'); if(bt) bt.remove();
  try{ sessionStorage.removeItem('catholic_core_return_v1'); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ sessionStorage.removeItem('catholic_integrated_return_v2'); }catch(e){ console.warn("[가톨릭길동무]", e); }

  try{ if(navigator.app && typeof navigator.app.exitApp === 'function'){ navigator.app.exitApp(); return; } }catch(e){ console.warn("[가톨릭길동무]", e); }

  try{ window.open('', '_self'); window.close(); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{ document.documentElement.classList.add('app-exiting'); }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function closeExitDlg(){
  _exitReady=false;
  clearTimeout(_exitTimer);
  const bt=$('_bt'); if(bt) bt.remove();
  $('exit-dlg').classList.remove('open');
}
function doExit(){
  closeExitDlg();
  attemptAppExit();
}

function oaiEnterView(el){
  if(!el) return;
  try{
    var root=document.documentElement;
    if(root.classList.contains('oai-returning')) return;
    el.classList.remove('oai-enter-ready','oai-enter-show','oai-popup-ready','oai-popup-show','oai-prepaint-view');
    if(el.id === 'app') return;
    var veil=document.getElementById('oai-category-entry-veil');
    if(!veil) return;
    var ms=parseInt(getComputedStyle(root).getPropertyValue('--oai-category-enter-ms'),10) || 700;
    clearTimeout(window.__oaiCategoryDissolveTimer);
    clearTimeout(window.__oaiCategoryVeilTimer);
    veil.style.opacity='1';
    veil.className='soft';
    root.classList.remove('oai-category-dissolving');
    root.classList.add('oai-category-entering','oai-category-dissolve');
    try{ void veil.offsetHeight; }catch(_e){}
    var show=function(){
      try{
        root.classList.add('oai-category-dissolving');
        veil.style.opacity='0';
        window.__oaiCategoryDissolveTimer=setTimeout(function(){
          try{
            root.classList.remove('oai-category-entering','oai-category-dissolve','oai-category-dissolving');
            veil.style.opacity='';
            veil.className='';
          }catch(e){ console.warn("[가톨릭길동무]", e); }
        }, ms + 120);
      }catch(e){ console.warn("[가톨릭길동무]", e); }
    };
    if(window.requestAnimationFrame) requestAnimationFrame(show);
    else setTimeout(show,16);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function oaiEnterPopup(el){
  if(!el) return;
  try{
    var root=document.documentElement;
    if(root.classList.contains('oai-returning')) return;
    el.classList.remove('oai-popup-ready','oai-popup-show','oai-enter-ready','oai-enter-show','oai-prepaint-view');
    el.classList.add('oai-popup-ready');
    try{ void el.offsetHeight; }catch(_e){}
    var ms=parseInt(getComputedStyle(root).getPropertyValue('--oai-popup-enter-ms'),10) || 500;
    var show=function(){
      try{
        el.classList.add('oai-popup-show');
        clearTimeout(el.__oaiPopupTimer);
        el.__oaiPopupTimer=setTimeout(function(){
          try{ el.classList.remove('oai-popup-ready','oai-popup-show','oai-prepaint-view'); }catch(e){ console.warn("[가톨릭길동무]", e); }
        }, ms + 120);
      }catch(e){ console.warn("[가톨릭길동무]", e); }
    };
    if(window.requestAnimationFrame) requestAnimationFrame(show);
    else setTimeout(show,16);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function oaiShowCategoryEntryVeil(mode){
  try{
    var veil=document.getElementById('oai-category-entry-veil');
    if(!veil) return;
    veil.className = mode || 'shrine';
    document.documentElement.classList.add('oai-category-entering');
    clearTimeout(window.__oaiCategoryVeilTimer);
    window.__oaiCategoryVeilTimer=setTimeout(oaiHideCategoryEntryVeil, 700);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function oaiHideCategoryEntryVeil(){
  try{
    clearTimeout(window.__oaiCategoryVeilTimer);
    var root=document.documentElement;
    var veil=document.getElementById('oai-category-entry-veil');
    if(veil){ veil.style.opacity='0'; }
    setTimeout(function(){
      try{
        root.classList.remove('oai-category-entering');
        if(veil){ veil.style.opacity=''; veil.className=''; }
      }catch(e){ console.warn("[가톨릭길동무]", e); }
    }, 230);
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function oaiPreopenNearbySheetForCategory(){
  try{
    if(!(_mode==='shrine' || _mode==='parish' || _mode==='retreat')) return;
    _updateSheetPanelTitles();
    ['list','region','route'].forEach(function(n){
      var s=$('sheet-'+n);
      if(s){
        s.classList.remove('open','from-left','from-right','exit-left','exit-right','oai-preopen-nearby');
      }
    });
    var sheet=$('sheet-nearby');
    var body=$('nearby-body');
    if(sheet){
      sheet.style.display='';
      sheet.classList.remove('from-left','from-right','exit-left','exit-right');
      sheet.classList.add('open','oai-preopen-nearby');
    }
    if(body){
      body.innerHTML='<div class="empty-msg">📍 위치를 확인하는 중...</div>';
      try{ body.scrollTop=0; }catch(_e){}
    }
    if(typeof _updateTabBtns==='function') _updateTabBtns('nearby');
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function startApp(mode){
  if(mode==='shrine' && (!_shrineRawLoaded || !SHRINES.length)){
    _mode='shrine';
    try{
      const cover=$('cover');
      if(cover) cover.style.display='none';
      if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
      document.documentElement.classList.add('app-active');
      document.documentElement.classList.remove('parish-mode','retreat-mode');
      const mapEl=$('map');
      if(mapEl) mapEl.innerHTML='<div class="map-loading"><div class="map-loading-icon" aria-hidden="true"></div><div class="map-loading-txt">성지 정보를 불러오는 중...</div></div>';
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    _ensureShrineDataLoaded().then(function(){ startApp('shrine'); }).catch(function(err){
      console.warn('[가톨릭길동무] 성지 데이터 로드 실패', err);
      try{ alert('성지 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); }catch(_e){}
      try{ if(typeof goToCover==='function') goToCover(); }catch(_e){}
      try{ if(typeof oaiHideCategoryEntryVeil==='function') oaiHideCategoryEntryVeil(); }catch(_e){}
    });
    return;
  }
  if(mode==='retreat' && (!_retreatRawLoaded || !RETREATS.length)){
    _mode='retreat';
    try{
      const cover=$('cover');
      if(cover) cover.style.display='none';
      if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
      document.documentElement.classList.add('app-active','retreat-mode');
      document.documentElement.classList.remove('parish-mode');
      const mapEl=$('map');
      if(mapEl) mapEl.innerHTML='<div class="map-loading"><div class="map-loading-icon" aria-hidden="true"></div><div class="map-loading-txt">피정의집 정보를 불러오는 중...</div></div>';
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    _ensureRetreatDataLoaded().then(function(){ startApp('retreat'); }).catch(function(err){
      console.warn('[가톨릭길동무] 피정의집 데이터 로드 실패', err);
      try{ alert('피정의집 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); }catch(_e){}
      try{ if(typeof goToCover==='function') goToCover(); }catch(_e){}
      try{ if(typeof oaiHideCategoryEntryVeil==='function') oaiHideCategoryEntryVeil(); }catch(_e){}
    });
    return;
  }
  if(mode==='parish' && !_PARISH_SPLIT_LAZY_MODE && (!_parishRawLoaded || !PARISHES.length)){
    _mode='parish';
    try{
      const cover=$('cover');
      if(cover) cover.style.display='none';
      if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
      document.documentElement.classList.add('app-active','parish-mode');
      document.documentElement.classList.remove('retreat-mode');
      const mapEl=$('map');
      if(mapEl) mapEl.innerHTML='<div class="map-loading"><div class="map-loading-icon" aria-hidden="true"></div><div class="map-loading-txt">성당 정보를 불러오는 중...</div></div>';
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    _ensureParishDataLoaded().then(function(){ startApp('parish'); }).catch(function(err){
      console.warn('[가톨릭길동무] 성당 데이터 로드 실패', err);
      try{ alert('성당 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); }catch(_e){}
      try{ if(typeof goToCover==='function') goToCover(); }catch(_e){}
      try{ if(typeof oaiHideCategoryEntryVeil==='function') oaiHideCategoryEntryVeil(); }catch(_e){}
    });
    return;
  }
  _mode=mode;
  try{ if(typeof _oaiClearShrineBackStack==='function') _oaiClearShrineBackStack('startApp:'+mode); }catch(e){ console.warn('[가톨릭길동무]', e); }
  _shrineVisitMapFilter='all';
  _filterDio='all';
  _listSrch='';
  window._noAutoNearby = false;  // 직접 진입 시 nearby 열기 허용
  _regionLat=null; _regionLng=null; _regionCache=[];
  _regionName=''; _regionPlaceName='';
  _nearbyCache=[];
  try{ _cancelNearbyLoad(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  _curFromRegion=false;
  _curInfoItem=null;
  closeAllTabs();
  closeInfoCard();
  resetRoute();
  const _ls=$('list-srch-inp'); if(_ls) _ls.value='';
  const _lsx=$('list-srch-x'); if(_lsx) _lsx.style.display='none';
  $$('.filter-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  $$('.sm-fb').forEach((b,i)=>b.classList.toggle('on',i===0));

 _renderDioFilterBars();  _screen='map';
  $('cover').style.display='none';
  if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
  document.documentElement.classList.add('app-active');
  document.documentElement.classList.toggle('parish-mode',mode==='parish');
  document.documentElement.classList.toggle('retreat-mode',mode==='retreat');
  try{ _ensureShrineVisitMapFilter(); _updateShrineVisitMapFilterUI(); _ensureShrineVisitCardsButton(); _updateShrineVisitCardsButtonUI(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  const _setTxt=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
  const listLbl = mode==='parish' ? '성당찾기' : (mode==='retreat' ? '피정의집 찾기' : '성지찾기');
  const listSearchInput=$('list-srch-inp');
  if(listSearchInput){
    const ph = mode==='parish' ? '선택 교구 성당명, 주소 검색' : '이름, 주소 검색';
    listSearchInput.placeholder = ph;
    listSearchInput.setAttribute('aria-label', ph);
  }
  _setTxt('tab-nearby-lbl', '내주변');
  _setTxt('tab-list-lbl', listLbl);
  $('legend').style.display = mode==='shrine'?'block':'none';
  if(mode==='shrine' || mode==='retreat'){
    try{ oaiPreopenNearbySheetForCategory(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }

  _resetMapState();
  _mapInited=true;
  requestAnimationFrame(function(){ setTimeout(_loadMap, 0); });
}

function _resetMapState(){
  if(_map){ try{_map=null;}catch(e){ console.warn("[가톨릭길동무]", e); } }
  _markers=[];
  _retreatMarkers=[];
  _dioMkrs={};
  _dioOverlays={};
  _activeDio=null;
  _parishSysInited=false;
  _parishDioUserZoomTouched=false;
  _parishDioProgrammaticMoveUntil=0;
  try{ if(AppState) AppState.nearbyParishDioCode=null; }catch(e){ console.warn('[가톨릭길동무]',e); }
  if(_parishIdleListener){ try{kakao.maps.event.removeListener(_parishIdleListener);}catch(e){ console.warn('[가톨릭길동무]',e); } _parishIdleListener=null; }
  _paSelMkr=null;
  try{ _clearParishNearbyMarkers(); }catch(e){ console.warn('[가톨릭길동무]',e); }
  _myMkr=null;
  _myLat=null; _myLng=null;
  const mapEl=$('map');
  if(mapEl) mapEl.innerHTML='';
  _mapInited=false;
}
function goToCover(){
  try{ if(typeof _oaiClearShrineBackStack==='function') _oaiClearShrineBackStack('goToCover'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ _cancelNearbyLoad(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(document.querySelector('#web-view.open,#trail-view.open,#qna-view.open,#diocese-view.open,#missa-view.open') && typeof oaiHoldStabilityVeil === 'function') oaiHoldStabilityVeil('view-close', 260);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  closeTab(_activeTab);
  closeInfoCard();
  resetRoute();
  _markers.forEach(m=>{if(m)try{m.marker.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); }});
  _retreatMarkers.forEach(o=>{try{o.marker.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); }});
  Object.values(_dioMkrs).forEach(arr=>arr.forEach(mk=>{try{mk.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); }}));
  if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); } _paSelMkr=null;}
  try{ _clearParishNearbyMarkers(); }catch(e){ console.warn('[가톨릭길동무]',e); }
  if(_myMkr){try{_myMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); } _myMkr=null;}
  _screen='cover';
  try{ _updateShrineVisitMapFilterUI(); _updateShrineVisitCardsButtonUI(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(typeof oaiSetMainMapLayerHidden==='function') oaiSetMainMapLayerHidden(false);
  document.documentElement.classList.remove('app-active','parish-mode','retreat-mode');
  const _coverEl=$('cover');
  if(_coverEl){
    _coverEl.style.display='';
    _coverEl.style.opacity='';
    _coverEl.style.pointerEvents='';
    _coverEl.scrollTop=0;
  }
  try{ if(typeof _resetCoverExitReady === 'function') _resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    if(typeof window.oaiSettleCoverSize === 'function'){
      window.oaiSettleCoverSize('cover-return');
      setTimeout(function(){ window.oaiSettleCoverSize('cover-return-late'); }, 180);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _loadMap(){
  const wrap=$('map');
  wrap.innerHTML='<div class="map-loading"><div class="map-loading-icon" aria-hidden="true"></div><div class="map-loading-txt">지도를 불러오는 중...</div></div>';
  if(window.kakao&&window.kakao.maps){
    try{kakao.maps.load(_onMapReady);}catch(e){_mapError(e.message);}
    return;
  }
  const sc=document.createElement('script');
  sc.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JSKEY}&autoload=false&libraries=services`;
  const timer=setTimeout(()=>_mapError('카카오내비 로딩 시간 초과'),20000);
  sc.onload=()=>{clearTimeout(timer);try{kakao.maps.load(_onMapReady);}catch(e){_mapError(e.message);}};
  sc.onerror=()=>{clearTimeout(timer);_mapError(`도메인 등록 필요: ${location.hostname}`);};
  document.head.appendChild(sc);
}

function _mapError(msg){
  const m=$('map');
  m.innerHTML=`<div class="map-loading"><div style="font-size:40px;margin-bottom:16px">🗺️</div><div style="font-size:15px;font-weight:700;color:var(--gold);margin-bottom:12px">지도를 불러올 수 없습니다</div><div style="font-size:12px;color:rgba(255,255,255,.7);line-height:1.8;max-width:280px;word-break:keep-all">${msg}</div></div>`;
  _markers=new Array(SHRINES.length).fill(null);
  renderList();
  openTab('nearby');
  if(typeof oaiHideCategoryEntryVeil==='function') setTimeout(oaiHideCategoryEntryVeil, 260);
}

function _onMapReady(){
 const KM=kakao.maps;window._LL=KM.LatLng;window._MM=KM.Marker;window._MI=KM.MarkerImage;window._SZ=KM.Size;window._PT=KM.Point;window._LB=KM.LatLngBounds;window._PL=KM.Polyline;window._EL=KM.event.addListener;
  _map=new kakao.maps.Map($('map'),{
  center:new _LL(36.2,127.9),level:8
  });
  kakao.maps.event.addListener(_map,'click',()=>{
  closeInfoCard();
  document.activeElement?.blur();
  });
  if(_mode==='shrine'){
    _buildShrineMarkers();
  } else {
    _markers=new Array(SHRINES.length).fill(null);
  }
  renderList();
  _autoLocate();
  if(_mode==='parish') { _buildParishDioSystem(); _syncParishDioLabels(); }
  else if(_mode==='retreat') _buildRetreatMarkers();
  if(!window._noAutoNearby){
    openTab('nearby');
  }
  window._noAutoNearby = false;
  try{ _updateShrineVisitMapFilterUI(); _updateShrineVisitCardsButtonUI(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(typeof oaiHideCategoryEntryVeil==='function') setTimeout(oaiHideCategoryEntryVeil, 260);
}

function _modeTargetLabel(){
  return _mode==='parish'?'성당':(_mode==='retreat'?'피정의 집':'성지');
}
function _updateSheetPanelTitles(){
  const noun=_modeTargetLabel();
  const near=$('nearby-sheet-title');
  const list=$('list-sheet-title');
  const region=$('region-sheet-title');
  if(near) near.textContent='내 주변 '+noun+' 10곳';
  if(list) list.textContent=noun+' 찾기';
  if(region) region.textContent='지역검색';
}
function closeSheetPanelOnly(name){
  if(!name) return;
  _blurAll && _blurAll();
  _closeSheetOnly(name);
  if(_activeTab===name) _activeTab=null;
  _updateTabBtns(null);
}

function closeRouteSheetByX(){
  _blurAll && _blurAll();
  _closeSheetOnly('route');
  if(_activeTab==='route') _activeTab=null;
  _updateTabBtns(null);
  setTimeout(function(){
    try{ resetRoute(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    _routeMode=false;
    try{ _exitRouteMode(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }, OAI_ROUTE_VISUAL_DELAY_MS);
}

function closeCategoryToCoverFromMap(){
  _blurAll && _blurAll();
  if(typeof goToCover === 'function') goToCover();
}

function zoomCategoryMap(delta){
  if(!_map || typeof _map.getLevel !== 'function' || typeof _map.setLevel !== 'function') return;
  try{
    const cur = _map.getLevel();
    const next = Math.max(1, Math.min(14, cur + delta));
    if(next !== cur) _map.setLevel(next);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function openTab(name, opts){
  opts = opts || {};
  var shouldAutoFocusKeyboard = opts.keyboard === true;
  if(_activeTab===name) return;
  try{ if(typeof oaiClearMapInfoSelection === 'function') oaiClearMapInfoSelection('tab-switch:'+name); }catch(e){ console.warn('[가톨릭길동무]', e); }
  _updateSheetPanelTitles();
  const prevName = _activeTab;
  const dir = window._swipeDir || null;

  if(prevName && dir){
    const prevSheet = $('sheet-'+prevName);
    if(prevSheet && prevSheet.classList.contains('open')){
      prevSheet.classList.add(dir === 'right' ? 'exit-left' : 'exit-right');
      setTimeout(()=>{
        prevSheet.style.transition = 'none'; // 아래로 내려가는 버그 방지
        prevSheet.classList.remove('open','exit-left','exit-right');
        void prevSheet.offsetHeight; // reflow
        prevSheet.style.transition = '';
      }, 280);
    } else {
      _closeSheetOnly(prevName);
    }
  } else {
    _closeSheetOnly(prevName);
  }

  closeInfoCard({keepMap:true});
  _curFromRegion=false;
  if(name!=='route') resetRoute();
  _exitRouteMode();
  if(!(_mode==='parish' && name==='nearby')) _restoreMapMarkers();
  else { try{ _clearParishNearbyMarkers(); }catch(e){ console.warn('[가톨릭길동무]',e); } }
  _resetTabWork(name);
  if(_mode==='shrine' && name==='nearby'){
    window.__OAI_SHRINE_NEARBY_DISTANCE_DONE__=false;
    window.__OAI_SHRINE_NEARBY_LOADING__=true;
    try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
  }
  _activeTab=name;

  const sheet=$('sheet-'+name);
  if(sheet){ sheet.classList.remove('oai-preopen-nearby'); }
  if(sheet && dir){
    sheet.classList.add('from-'+dir);
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        sheet.classList.remove('from-right','from-left');
        sheet.classList.add('open');
      });
    });
  } else {
    if(sheet){ sheet.style.display=''; sheet.classList.add('open'); }
  }

  _updateTabBtns(name);
  if(name==='nearby')     _loadNearby();
  else if(name==='list')  { renderList(); if(shouldAutoFocusKeyboard) oaiFocusSearchKeyboardInput('list-srch-inp'); }
  else if(name==='region'){ if(shouldAutoFocusKeyboard) oaiFocusSearchKeyboardInput('region-inp'); }
  else if(name==='route') _enterRouteMode();
  setTimeout(()=>_scrollSheetTop(name), 30);
}

function closeTab(name){
  if(!name) return;
  let _routeDest = null;
  let _routeRegionStartKeep = null;
  if(name === 'route' && _rE && _rE.lat){
    _routeDest = Object.assign({}, _rE);
    if(_routeRegionStart && _routeRegionStart.lat) _routeRegionStartKeep = Object.assign({}, _routeRegionStart);
  }
  _closeSheetOnly(name);
  if(_activeTab===name) _activeTab=null;
  _updateTabBtns(null);
  if(name==='route'){
    setTimeout(function(){
      try{ resetRoute(); }catch(e){ console.warn("[가톨릭길동무]", e); }
      _routeMode=false;
      if(_routeDest){
        const items = _getCurrentItems();
        const idx = (typeof _routeDest.idx==='number' && _routeDest.idx>=0)
          ? _routeDest.idx
          : items.findIndex(p=>Number(p.lat)===Number(_routeDest.lat) && Number(p.lng)===Number(_routeDest.lng));
        if(idx>=0){
          const item=items[idx];
          if(item) setTimeout(()=>{
            try{
              if(_mode==='shrine') _selectShrineMarker(idx);
              else if(_mode==='parish') _selectParishMarker(item);
              else _selectRetreatMarker(item);
              if(_routeRegionStartKeep && _routeRegionStartKeep.lat){
                _routeRegionStart = Object.assign({}, _routeRegionStartKeep);
                _regionLat = _routeRegionStartKeep.lat;
                _regionLng = _routeRegionStartKeep.lng;
                _regionPlaceName = _routeRegionStartKeep.placeName || _routeRegionStartKeep.name || _regionPlaceName;
                _regionName = _routeRegionStartKeep.placeName || _routeRegionStartKeep.name || _regionName;
                _curFromRegion = true;
              }
              _showInfoCard(item,idx);
              _focusMarkerAboveInfoCard(item);
            }catch(e){ console.warn("[가톨릭길동무]", e); }
          }, 90);
        }
      }
    }, OAI_ROUTE_VISUAL_DELAY_MS);
  } else {
    _restoreMapMarkers();
  }
}

function _closeSheetOnly(name){
  if(!name) return;
  $('sheet-'+name)?.classList.remove('open');
}

function closeAllTabs(){
  ['nearby','list','region','route'].forEach(n=>_closeSheetOnly(n));
  _activeTab=null;
  _updateTabBtns(null);
}

function _scrollSheetTop(name){
  const sheet=$('sheet-'+name);
  if(sheet) sheet.scrollTop=0;
  const body = name==='nearby' ? $('nearby-body') : name==='list' ? $('list-body') : name==='region' ? $('region-body') : name==='route' ? $('sheet-route') : null;
  if(body) body.scrollTop=0;
}

function _resetTabWork(name){
  document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
  if(name!=='route'){
    _listSrch='';
    const lsi=$('list-srch-inp'); if(lsi) lsi.value='';
    const lsx=$('list-srch-x'); if(lsx) lsx.style.display='none';
    _filterDio='all';
    $$('.filter-btn').forEach((b,i)=>b.classList.toggle('active', i===0 || b.textContent.trim()==='전체'));
    _regionLat=null;_regionLng=null;_regionCache=[];
    _clearRegionMarker();
    _clearRegionResultMarkers();
    _routeRegionStart=null;
    const ri=$('region-inp'); if(ri) ri.value='';
    const rb=$('region-body');
    if(rb) rb.innerHTML=_regionGuideHtml();
  }
  _scrollSheetTop(name);
}

function toggleTab(name){
  if(_activeTab===name){
    closeInfoCard({keepMap:true});
    _resetTabWork(name);
    if(name==='nearby') _loadNearby();
    else if(name==='list') { renderList(); oaiFocusSearchKeyboardInput('list-srch-inp'); }
    else if(name==='region'){
      _regionLat=null;_regionLng=null;_regionCache=[];
      _clearRegionMarker();
      _clearRegionResultMarkers();
      const ri=$('region-inp'); if(ri) ri.value='';
      const rb=$('region-body');
      if(rb) rb.innerHTML=_regionGuideHtml();
      oaiFocusSearchKeyboardInput('region-inp');
    }
    else if(name==='route'){ resetRoute({fresh:true}); _enterRouteMode(); }
    setTimeout(()=>_scrollSheetTop(name),30);
    return;
  }
  if(name==='route') resetRoute({fresh:true});
  openTab(name, {keyboard:true});
}

function _updateTabBtns(active){
  let activeBtn = null;
  $$('.tab-btn').forEach(b=>{
    const on = b.dataset.tab===active;
    b.classList.toggle('active', on);
    if(on) activeBtn = b;
  });
  if(activeBtn){
    try{ activeBtn.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}); }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
  try{ if(typeof window.oaiKeepActiveTabsVisible === 'function') window.oaiKeepActiveTabsVisible('map-tab'); }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function oaiScrollActiveTabIntoView(container, behavior){
  try{
    if(!container) return false;
    var active = container.querySelector('.active,.on,[aria-selected="true"],[aria-pressed="true"]');
    if(!active) return false;
    if(active === container) return false;
    active.scrollIntoView({behavior: behavior || 'smooth', block:'nearest', inline:'center'});
    return true;
  }catch(e){ console.warn("[가톨릭길동무]", e); return false; }
}
function oaiKeepActiveTabsVisible(reason){
  try{
    var selectors = [
      '#tabbar',
      '#prayer-tabs',
      '#web-cats',
      '.trail-tabs',
      '.qna-tabs',
      '#srch-modal #sm-tab-bar',
      '#sm-tab-bar'
    ];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(container){
        oaiScrollActiveTabIntoView(container, reason === 'instant' ? 'auto' : 'smooth');
      });
    });
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
window.oaiKeepActiveTabsVisible = oaiKeepActiveTabsVisible;
document.addEventListener('click', function(e){
  try{
    var t = e.target;
    if(!t || !t.closest) return;
    if(!t.closest('.tab-btn,.pr-tab,.web-cat-btn,.trail-tab,.qna-tab,.sm-tab,.filter-btn')) return;
    setTimeout(function(){ oaiKeepActiveTabsVisible('click'); }, 30);
    setTimeout(function(){ oaiKeepActiveTabsVisible('click-late'); }, 220);
  }catch(err){ console.warn("[가톨릭길동무]", err); }
}, true);

function _getInfoCardCenterTargetY(mapH){
  return Math.round((mapH || 700) * 0.34);
}
function _setMapCenterByInfoCardStandard(pos){
  if(!_map || !pos) return false;
  try{
    const mapEl = $('map-wrap') || $('map');
    const mapH = (mapEl && (mapEl.clientHeight || mapEl.offsetHeight)) || window.innerHeight || 700;
    const proj = _map.getProjection && _map.getProjection();
    if(proj && proj.containerPointFromCoords && proj.coordsFromContainerPoint){
      const p = proj.containerPointFromCoords(pos);
      const centerY = Math.round(mapH / 2);
      const targetY = _getInfoCardCenterTargetY(mapH);
      const point = (window.kakao && kakao.maps && kakao.maps.Point)
        ? new kakao.maps.Point(p.x, p.y + (centerY - targetY))
        : {x:p.x, y:p.y + (centerY - targetY)};
      const newCenter = proj.coordsFromContainerPoint(point);
      if(newCenter){ _map.setCenter(newCenter); return true; }
    }
    _map.setCenter(pos);
    return true;
  }catch(e){ console.warn("[가톨릭길동무]", e); }
  return false;
}
function _biasCurrentMapCenterToInfoCardStandard(){
  if(!_map || typeof _map.getCenter!=='function') return false;
  try{ return _setMapCenterByInfoCardStandard(_map.getCenter()); }
  catch(e){ console.warn("[가톨릭길동무]", e); }
  return false;
}
function _setBoundsByInfoCardStandard(bounds, top, right, bottom, left){
  if(!_map || !bounds) return false;
  try{
    _map.setBounds(bounds, top, right, bottom, left);
    _biasCurrentMapCenterToInfoCardStandard();
    return true;
  }catch(e1){
    try{
      _map.setBounds(bounds);
      _biasCurrentMapCenterToInfoCardStandard();
      return true;
    }catch(e2){ console.warn("[가톨릭길동무]", e2); }
  }
  return false;
}

function _getRouteBoundsPadding(){
  const mapEl = $('map-wrap') || $('map');
  const mapH = (mapEl && (mapEl.clientHeight || mapEl.offsetHeight)) || window.innerHeight || 700;
  const tabH = ($('tabbar') && $('tabbar').offsetHeight) || 54;
  const sheet = $('sheet-route');
  let sheetH = 0;
  try{
    if(sheet && sheet.classList.contains('open')){
      const r = sheet.getBoundingClientRect ? sheet.getBoundingClientRect() : null;
      sheetH = Math.ceil((r && r.height) || sheet.offsetHeight || 0);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  const bottomMin = 172;
  const bottomMax = Math.max(210, Math.round(mapH * 0.62));
  const bottom = Math.min(bottomMax, Math.max(bottomMin, sheetH + 28));
  return { top: tabH + 12, right: 52, bottom: bottom, left: 52 };
}
function _fitRouteBounds(bounds, opts){
  if(!_map || !bounds) return false;
  const pad = _getRouteBoundsPadding();
  try{
    _map.setBounds(bounds, pad.top, pad.right, pad.bottom, pad.left);
    if(opts && opts.repeat){
      setTimeout(function(){ try{ const p=_getRouteBoundsPadding(); _map.setBounds(bounds, p.top, p.right, p.bottom, p.left); }catch(e){ console.warn('[가톨릭길동무]', e); } }, 90);
      setTimeout(function(){ try{ const p=_getRouteBoundsPadding(); _map.setBounds(bounds, p.top, p.right, p.bottom, p.left); }catch(e){ console.warn('[가톨릭길동무]', e); } }, 260);
    }
    return true;
  }catch(e1){
    try{ _map.setBounds(bounds); return true; }
    catch(e2){ console.warn('[가톨릭길동무]', e2); }
  }
  return false;
}

function _focusMarkerAboveInfoCard(item){
  if(!_map || !item || !item.lat || !item.lng) return;
  try{
    _setMapCenterByInfoCardStandard(new _LL(item.lat,item.lng));
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function selectItem(idx, opts={}){
  const items = _getCurrentItems();
  const item  = items[idx];
  if(!item) return;
  const fromSearchList = !!(_listSrch && _listSrch.trim());
  const fromRegionState = !!((opts.fromRegion || _isRegionSearchActiveForItem(item)) && _regionLat && _regionLng);
  _curFromRegion = fromRegionState;
  if(fromRegionState) _rememberRegionStart(_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
  closeAllTabs();
  if(_mode==='shrine'){
  if(fromRegionState){
   _showRegionResultsOnMap(_regionCache,_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
  } else if(fromSearchList){
   _restoreAllCategoryMarkersForSelection();
  } else if(opts.fromNearby && _nearbyCache.length>0){
   _showItemsOnMap(_nearbyCache);
  } else {
   _restoreMapMarkers();
  }
  _selectShrineMarker(idx);
  } else if(_mode==='parish') {
  if(fromRegionState) _showRegionResultsOnMap(_regionCache,_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
  _selectParishMarker(item);
  } else {
  if(fromRegionState) _showRegionResultsOnMap(_regionCache,_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
  else if(fromSearchList) _restoreAllCategoryMarkersForSelection();
  _selectRetreatMarker(item);
  }
  _showInfoCard(item, idx);
  _focusMarkerAboveInfoCard(item);
}

function _fitInfoCardButtons(){
  try{
    const btns=document.querySelectorAll('#info-card .ic-link-btn,#info-card .ic-route-btn,#info-card .ic-tel-btn,#info-card .btn-kakao-nav');
    btns.forEach(btn=>{
      btn.style.fontSize='16px';
      btn.style.letterSpacing='-.04em';
      btn.style.whiteSpace='nowrap';
      let size=16;
      while(size>11 && btn.scrollWidth>btn.clientWidth){
        size-=0.5;
        btn.style.fontSize=size+'px';
      }
    });
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function _showInfoCard(item, idx){
  _curInfoItem = {item, idx};

  $('ic-name').innerHTML = String(item.name||'') + _shrineNewBadgeHtml(item);
  $('ic-sub').textContent  = item.diocese;
  _renderInfoCardShrinePilgrimBadge(item);
  $('ic-addr').textContent = item.addr;
  let noteEl=$('ic-note');
  if(!noteEl){
  noteEl=document.createElement('div');
  noteEl.id='ic-note';
  noteEl.style.cssText='margin:6px 14px 0;padding:8px 10px;background:#fff8e1;border-left:3px solid #f39c12;border-radius:6px;font-size:12px;color:#7a4f00;line-height:1.55;display:none;';
  $('ic-addr').closest('.ic-addr-row').insertAdjacentElement('afterend', noteEl);
  }
  if(item.note){noteEl.textContent=item.note;noteEl.style.display='block';}
  else noteEl.style.display='none';
  const telBtn=$('ic-tel-link');
  const routeBtn=document.querySelector('.ic-route-btn');
  if(item.tel){
  $('ic-tel').textContent=item.tel;
  telBtn.href='tel:'+item.tel.replace(/[^0-9+]/g,'');
  _show(telBtn);
  } else {
  _hide(telBtn);
  }
  const distCol=$('ic-dist-col');
  const distEl=$('ic-dist');
  distCol.classList.remove('ready');
  distEl.textContent='—';           // 미리 공간 확보(레이아웃 고정)
  if(_myLat && item.lat){
  const _snap=item;
  (async()=>{
   try{
    const res=await _kakaoDirectionsFetch(`${_myLng},${_myLat}`, `${_snap.lng},${_snap.lat}`);
    if(!res.ok) throw new Error('fail');
    const data=await res.json();
    const route=data.routes?.[0];
    if(route&&route.result_code===0){
     const km=(route.summary.distance/1000).toFixed(1);
     if(_curInfoItem&&_curInfoItem.item===_snap){
      distEl.textContent=km+' km';
      distCol.classList.add('ready');
     }
    }
   }catch(e){ console.warn("[가톨릭길동무]", e); }
  })();
  }
  const hp=$('ic-hp');
  const hpUrl = (_mode==='shrine') ? _getShrineHomepageUrl(item) : (item.hp ? normalizeCatholicExternalUrl(item.hp) : '');
  if(hpUrl){
    hp.href = hpUrl;
    hp.target = '_self';
    hp.rel = 'noopener';
    hp.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      openCoreExternalUrl(hpUrl,{infoIdx:idx, source:'homepage'});
    };
    _show(hp);
  }
  else _hide(hp);
  const guide=$('ic-guide');
  let guideShown=false;
  if(_mode==='shrine'){
    const guideUrl=_getShrineGuideUrl(item);
    if(guideUrl){ guide.onclick=()=>openCoreExternalUrl(guideUrl,{infoIdx:idx, source:'shrine-detail'}); guide.textContent='성지 상세페이지'; _show(guide); guideShown=true;}
    else _hide(guide);
  } else {
    if(item.url){ guide.onclick=()=>openCoreExternalUrl(item.url,{infoIdx:idx}); guide.textContent=(_mode==='retreat'?'피정의 집 상세페이지':'성당 상세페이지'); _show(guide); guideShown=true;}
    else _hide(guide);
  }
  const linksRow=$('ic-links-row');
  if(linksRow) (hpUrl||guideShown)?_show(linksRow):_hide(linksRow);

  _renderInfoCardShrineVisit(item);
  $('info-card').classList.add('open');
  try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
  setTimeout(_fitInfoCardButtons, 0);
  setTimeout(_fitInfoCardButtons, 80);
}

function closeInfoCard(opts){
  opts = opts || {};
  const wasItem = _curInfoItem; // 닫기 전에 저장
  const card = $('info-card');
  if(card) card.classList.remove('open');
  try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
  _curInfoItem=null;
  _curFromRegion=false;
  if(_mode==='shrine') _clearShrineMarkerSel();
  else {
    if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); }  _paSelMkr=null;}
  }
  if(!opts.keepMap && wasItem && wasItem.item && wasItem.item.lat && _map){
    try{ _focusMarkerAboveInfoCard(wasItem.item); }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
}

function oaiClearMapInfoSelection(reason){
  try{
    closeInfoCard({keepMap:true});
    _curInfoItem=null;
    _curFromRegion=false;
    if(_mode==='shrine') _clearShrineMarkerSel();
    else if(_paSelMkr){
      try{ _paSelMkr.setMap(null); }catch(e){ console.warn('[가톨릭길동무]', e); }
      _paSelMkr=null;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
try{ window.oaiClearMapInfoSelection=oaiClearMapInfoSelection; }catch(e){ console.warn('[가톨릭길동무]', e); }

function openInAppRoute(){
  if(!_curInfoItem) return;
  const {item, idx}=_curInfoItem;
  if(!item.lat||!item.lng) return;

  function doRoute(spLat, spLng, spName){
    closeInfoCard({keepMap:true});
    openTab('route');
    _routeStartMarkerExplicitCurrent=false;
    _rS={idx:-1, name:spName, lat:spLat, lng:spLng};
    _rE={idx, name:item.name, lat:item.lat, lng:item.lng};
    _setRouteLabel('start', spName);
    _setRouteLabel('end', item.name);
    if(_mode==='shrine'){
     if(idx>=0&&_markers[idx]){ _markers[idx].marker.setImage(_mkrImgRoute('#0000ff','도')); _setRouteMarkerZ(idx,'end'); }
     if(_shouldShowRouteStartMarker()&&_rS.idx>=0&&_markers[_rS.idx]){ _markers[_rS.idx].marker.setImage(_mkrImgRoute('#ff0000','출')); _setRouteMarkerZ(_rS.idx,'start'); }
    }
    _refreshRouteTmpMarkers();
    _enterRouteMode();
    setTimeout(function(){ try{ _calcRoute(); }catch(e){ console.warn('[가톨릭길동무]', e); } }, OAI_ROUTE_VISUAL_DELAY_MS);
  }
  if(_curFromRegion && _regionLat){
    const placeName = _regionPlaceName || _regionName || '검색지';
    const name=`📍 ${placeName}`;
    _routeRegionStart={lat:_regionLat,lng:_regionLng,name:name,placeName:placeName};
    doRoute(_regionLat, _regionLng, name);
    return;
  }
  _routeRegionStart=null;
  if(_myLat){
    doRoute(_myLat, _myLng, '현위치');
  } else {
    _GEO.getCurrentPosition(
     p=>{ _setMyLoc(p.coords.latitude, p.coords.longitude); doRoute(p.coords.latitude, p.coords.longitude, '현위치'); },
     ()=>alert('위치를 가져올 수 없습니다.'),
     {enableHighAccuracy:true, timeout:10000}
    );
  }
}

function _routeStartLabelFilled(){
  try{
    const el=$('rs-start-lbl');
    const txt=(el&&el.textContent?el.textContent:'').trim();
    return !!(txt && !txt.includes('선택하세요'));
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function _routeHasVisibleStart(){
  return !!(_rS && _rS.lat && _rS.lng && (!_rS.isImplicitCurrentLocation || _routeStartLabelFilled()));
}
function _restoreRouteSelectionMarkersAfterReset(){
  try{
    if(_mode==='parish'){
      try{ _clearRegionResultMarkers(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      _restoreMapMarkers();
    }else if(_mode==='shrine' || _mode==='retreat'){
      _restoreAllCategoryMarkersForSelection();
    }else{
      _restoreMapMarkers();
    }
    if(_routeRegionStart && _routeRegionStart.lat && _routeRegionStart.lng){
      _showRegionPlaceMarker(
        _routeRegionStart.lat,
        _routeRegionStart.lng,
        _routeRegionStart.placeName || _routeRegionStart.name || _regionPlaceName || _regionName || '검색지'
      );
    }else if(_regionLat && _regionLng && _regionMarker){
      _showRegionPlaceMarker(_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _clearRouteVisualOnly(){
  try{
    if(_polyline){ _polyline.setMap(null); _polyline=null; }
    _hide($('rs-result'));
    const hint=$('rs-hint'); if(hint) hint.style.display='block';
    _showJukrimgulParkingMkr(false);
    _clearRouteTmpMarkers();
    _restoreRouteSelectionMarkersAfterReset();
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _restoreRouteMarkerVisual(role, routeItem){
  try{
    if(!routeItem || routeItem.idx<0) return;
    if(_mode==='shrine' && _markers[routeItem.idx]){
      const s=_markers[routeItem.idx].shrine;
      _markers[routeItem.idx].marker.setImage(_mkrImg(_shrineMarkerColor(s),false));
      _markers[routeItem.idx].marker.setZIndex(1);
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _isRouteWaypointRole(role){
  return role==='waypoint' || role==='waypoint2' || role==='waypoint3';
}
function _routeWaypointIndex(role){
  if(role==='waypoint3') return 3;
  if(role==='waypoint2') return 2;
  return 1;
}
function _routeWaypointColor(role){
  if(role==='waypoint3') return '#b45309';
  if(role==='waypoint2') return '#d97706';
  return '#f39c12';
}
function _routeRoleColor(role){
  if(role==='start') return '#E53935';
  if(role==='waypoint3') return '#b45309';
  if(role==='waypoint2') return '#d97706';
  if(role==='waypoint') return '#f39c12';
  return '#2E7D32';
}
function _routeRoleShort(role){
  if(role==='start') return '출';
  if(role==='waypoint3') return '경3';
  if(role==='waypoint2') return '경2';
  if(role==='waypoint') return '경1';
  return '도';
}
function _routeSearchTitle(role,noun){
  if(role==='start') return `🔵 출발 ${noun} 검색`;
  if(role==='waypoint3') return `🟠 경유지3 ${noun} 검색`;
  if(role==='waypoint2') return `🟠 경유지2 ${noun} 검색`;
  if(role==='waypoint') return `🟠 경유지1 ${noun} 검색`;
  return `🔴 도착 ${noun} 검색`;
}
function _routeWaypointMarkerText(role){
  if(role==='waypoint3') return '경3';
  if(role==='waypoint2') return '경2';
  return '경1';
}
function _routePointCancelTitle(role){
  if(role==='start') return '출발지를 취소하시겠습니까?';
  if(role==='end') return '도착지를 취소하시겠습니까?';
  return '경유지' + _routeWaypointIndex(role) + '을 취소하시겠습니까?';
}
function _routePointCancelButtonText(role){
  if(role==='start') return '출발지 취소';
  if(role==='end') return '도착지 취소';
  return '경유지' + _routeWaypointIndex(role) + ' 취소';
}
function _getRoutePointByRole(role){
  if(role==='start') return _rS;
  if(role==='waypoint') return _rW;
  if(role==='waypoint2') return _rW2;
  if(role==='waypoint3') return _rW3;
  return _rE;
}
function _setRoutePointByRole(role, obj){
  if(role==='start') _rS=obj;
  else if(role==='waypoint') _rW=obj;
  else if(role==='waypoint2') _rW2=obj;
  else if(role==='waypoint3') _rW3=obj;
  else _rE=obj;
}
function _getRouteWaypointEnabledByRole(role){
  if(role==='waypoint3') return _routeWaypoint3Enabled;
  if(role==='waypoint2') return _routeWaypoint2Enabled;
  return _routeWaypointEnabled;
}
function _setRouteWaypointEnabledByRole(role, enabled){
  if(role==='waypoint3') _setRouteWaypoint3Enabled(enabled);
  else if(role==='waypoint2') _setRouteWaypoint2Enabled(enabled);
  else _setRouteWaypointEnabled(enabled);
}
function _nextAvailableWaypointRole(){
  if(!(_routeWaypointEnabled || (_rW&&_rW.lat&&_rW.lng))) return 'waypoint';
  if(!(_routeWaypoint2Enabled || (_rW2&&_rW2.lat&&_rW2.lng))) return 'waypoint2';
  if(!(_routeWaypoint3Enabled || (_rW3&&_rW3.lat&&_rW3.lng))) return 'waypoint3';
  return null;
}
function _getRouteWaypoints(){
  const list=[];
  if(_rW && _rW.lat && _rW.lng) list.push(_rW);
  if(_rW2 && _rW2.lat && _rW2.lng) list.push(_rW2);
  if(_rW3 && _rW3.lat && _rW3.lng) list.push(_rW3);
  return list;
}
function _routeWaypointsReadyCount(){ return _getRouteWaypoints().length; }
function _refreshExistingRoutePointMarkerImages(){
  try{
    if(_mode!=='shrine') return;
    if(_rS && !_rS.isRegionStart && _shouldShowRouteStartMarker() && _rS.idx>=0 && _markers[_rS.idx]){
      _markers[_rS.idx].marker.setImage(_mkrImgRoute('#ff0000','출'));
      _setRouteMarkerZ(_rS.idx,'start');
    }
    if(_rW && _rW.idx>=0 && _markers[_rW.idx]){
      _markers[_rW.idx].marker.setImage(_mkrImgRoute(_routeWaypointColor('waypoint'),_routeWaypointMarkerText('waypoint')));
      _setRouteMarkerZ(_rW.idx,'waypoint');
    }
    if(_rW2 && _rW2.idx>=0 && _markers[_rW2.idx]){
      _markers[_rW2.idx].marker.setImage(_mkrImgRoute(_routeWaypointColor('waypoint2'),_routeWaypointMarkerText('waypoint2')));
      _setRouteMarkerZ(_rW2.idx,'waypoint2');
    }
    if(_rW3 && _rW3.idx>=0 && _markers[_rW3.idx]){
      _markers[_rW3.idx].marker.setImage(_mkrImgRoute(_routeWaypointColor('waypoint3'),_routeWaypointMarkerText('waypoint3')));
      _setRouteMarkerZ(_rW3.idx,'waypoint3');
    }
    if(_rE && _rE.idx>=0 && _markers[_rE.idx]){
      const s=_markers[_rE.idx].shrine;
      _markers[_rE.idx].marker.setImage(_mkrImgRoute(_typeColor(s.type),'도'));
      _setRouteMarkerZ(_rE.idx,'end');
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _restoreMarkersForRouteDestinationSelection(){
  try{
    if(!_map || !_routeMode || !_rS || _rE || _polyline) return;
    if(_mode==='parish'){
      if(_paSelMkr){ try{ _paSelMkr.setMap(null); }catch(e){ console.warn('[가톨릭길동무]', e); } _paSelMkr=null; }
      const items=_getCurrentItems ? _getCurrentItems() : [];
      const startItem=(_rS.idx>=0 && items && items[_rS.idx]) ? items[_rS.idx] : null;
      const code=startItem ? _parishDioCodeOf(startItem) : (_activeDio || null);
      if(code){
        if(_mode==='parish' && !_isParishDioceseReady(code)){
          _ensureParishDioceseDataLoaded(code).then(function(){
            try{ _restoreMarkersForRouteDestinationSelection(); }catch(e){ console.warn('[가톨릭길동무]', e); }
          }).catch(function(err){ console.warn('[가톨릭길동무] 성당 교구 데이터 로드 실패', err); });
          return;
        }
        if(_activeDio && _activeDio!==code) _hideParishDioMkrs(_activeDio);
        _activeDio=code;
        _showParishDioMkrs(code);
        _syncParishDioLabels();
      }else{
        _restoreMapMarkers();
      }
      _refreshRouteTmpMarkers();
      return;
    }
    if(_mode==='shrine' || _mode==='retreat') _restoreAllCategoryMarkersForSelection();
    else _restoreMapMarkers();
    _refreshRouteTmpMarkers();
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _setRoutePointFromItem(role,item,idx){
  if(!item||!item.lat||!item.lng) return;
  _clearRouteVisualOnly();
  if(role==='start'){
    _restoreRouteMarkerVisual('start',_rS);
    _routeRegionStart=null;
    _routeStartMarkerExplicitCurrent=false;
    _rS={idx:idx,name:item.name,lat:item.lat,lng:item.lng};
    _setRouteLabel('start',item.name);
    if(_mode==='shrine'&&_shouldShowRouteStartMarker()&&idx>=0&&_markers[idx]){ _markers[idx].marker.setImage(_mkrImgRoute('#ff0000','출')); _setRouteMarkerZ(idx,'start'); }
    _refreshRouteTmpMarkers();
    if(_rE){ _hideRouteGuide(); _updateSearchBtn(); }
    else { _showRouteGuideText(`도착 ${_getRouteGuideTarget()}를 탭하세요`); }
    _restoreMarkersForRouteDestinationSelection();
  }else if(_isRouteWaypointRole(role)){
    const oldPoint=_getRoutePointByRole(role);
    _restoreRouteMarkerVisual(role,oldPoint);
    _setRouteWaypointEnabledByRole(role,true);
    _setRoutePointByRole(role,{idx:idx,name:item.name,lat:item.lat,lng:item.lng});
    if(_mode==='shrine'&&idx>=0&&_markers[idx]){ _markers[idx].marker.setImage(_mkrImgRoute(_routeWaypointColor(role),_routeWaypointMarkerText(role))); _setRouteMarkerZ(idx,role); }
    _setRouteLabel(role,item.name);
    _syncRouteWaypointBox();
    _refreshRouteTmpMarkers();
    if(_rS&&_rE){ _hideRouteGuide(); _updateSearchBtn(); }
  }else{
    _restoreRouteMarkerVisual('end',_rE);
    _rE={idx:idx,name:item.name,lat:item.lat,lng:item.lng};
    if(_mode==='shrine'&&idx>=0&&_markers[idx]){ _markers[idx].marker.setImage(_mkrImgRoute(_typeColor(item.type),'도')); _setRouteMarkerZ(idx,'end'); }
    _setRouteLabel('end',item.name);
    _refreshRouteTmpMarkers();
    if(_rS){ _hideRouteGuide(); _updateSearchBtn(); }
    else { _showRouteGuideText(`출발 ${_getRouteGuideTarget()}를 탭하세요`); }
  }
}
function _infoRouteHasFixedStart(){
  try{
    if(_curFromRegion && _regionLat && _regionLng) return true;
    if(_routeHasVisibleStart()) return true;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  return false;
}
let _routeChoiceMode = 'set';
let _routeCancelRole = null;

function _prepareRouteChoiceSetUI(){
  const dlg=$('route-choice-modal');
  if(!dlg) return;
  _routeChoiceMode='set';
  _routeCancelRole=null;
  const desc=dlg.querySelector('.route-choice-desc');
  const start=$('route-choice-start');
  const end=$('route-choice-end');
  const cancel=$('route-choice-cancel');
  if(desc) desc.textContent='이 장소를 길찾기에 어떻게 사용할까요?';
  if(start){ start.className='route-choice-btn start'; start.textContent='출발지로 설정'; start.style.display=''; }
  if(end){ end.className='route-choice-btn end'; end.textContent='도착지로 설정'; end.style.display=''; }
  if(cancel){ cancel.className='route-choice-btn cancel'; cancel.textContent='취소'; cancel.style.display=''; }
}
function _prepareRouteCancelUI(role){
  const dlg=$('route-choice-modal');
  if(!dlg) return;
  _routeChoiceMode='cancel';
  _routeCancelRole=role;
  const title=$('route-choice-name');
  const desc=dlg.querySelector('.route-choice-desc');
  const start=$('route-choice-start');
  const end=$('route-choice-end');
  const cancel=$('route-choice-cancel');
  if(title) title.textContent=_routePointCancelTitle(role);
  if(desc) desc.textContent='선택을 유지하거나 해당 지점만 취소할 수 있습니다.';
  if(start){ start.className='route-choice-btn keep'; start.textContent='유지'; start.style.display=''; }
  if(end){ end.className='route-choice-btn danger'; end.textContent=_routePointCancelButtonText(role); end.style.display=''; }
  if(cancel) cancel.style.display='none';
}
function _openRoutePointCancelChoice(role){
  const dlg=$('route-choice-modal');
  if(!dlg){ clearRoute(role); return; }
  _prepareRouteCancelUI(role);
  dlg.classList.add('open');
  try{ document.activeElement&&document.activeElement.blur(); }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _handleRouteChoiceStart(){
  if(_routeChoiceMode==='cancel'){ _closeInfoRouteChoice(); return; }
  _setInfoRouteStart();
}
function _handleRouteChoiceEnd(){
  if(_routeChoiceMode==='cancel'){ const role=_routeCancelRole; _closeInfoRouteChoice(); if(role) clearRoute(role); return; }
  _setInfoRouteEnd();
}
function _openInfoRouteChoice(){
  if(!_curInfoItem) return;
  if(_infoRouteHasFixedStart() && !(_rE&&_rE.lat&&_rE.lng)){
    _setInfoRouteEnd();
    return;
  }
  const dlg=$('route-choice-modal');
  if(!dlg){ openInAppRoute(); return; }
  _prepareRouteChoiceSetUI();
  const name=$('route-choice-name');
  if(name) name.textContent=_curInfoItem.item.name||'';
  dlg.classList.add('open');
  try{ document.activeElement&&document.activeElement.blur(); }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _closeInfoRouteChoice(){
  const dlg=$('route-choice-modal');
  if(dlg) dlg.classList.remove('open');
  _routeChoiceMode='set';
  _routeCancelRole=null;
  _prepareRouteChoiceSetUI();
}
try{ window._closeInfoRouteChoice=_closeInfoRouteChoice; window._openRoutePointCancelChoice=_openRoutePointCancelChoice; }catch(e){ console.warn('[가톨릭길동무]', e); }
function _setInfoRouteStart(){
  if(!_curInfoItem) return;
  const item=_curInfoItem.item, idx=_curInfoItem.idx;
  _closeInfoRouteChoice();
  closeInfoCard({keepMap:true});
  openTab('route');
  _setRoutePointFromItem('start',item,idx);
}
function _runInfoRouteToEndWithStart(startObj,item,idx){
  _routeStartMarkerExplicitCurrent=!!(startObj && startObj.showStartMarker === true);
  if(startObj && startObj.showStartMarker !== true) delete startObj.showStartMarker;
  _rS=startObj;
  _setRouteLabel('start', startObj.name==='현재 위치' ? '현위치' : (startObj.name||'출발지'));
  _setRoutePointFromItem('end',item,idx);
  setTimeout(function(){ try{ _calcRoute(); }catch(e){ console.warn('[가톨릭길동무]', e); } }, OAI_ROUTE_VISUAL_DELAY_MS);
}
function _setInfoRouteEnd(){
  if(!_curInfoItem) return;
  const item=_curInfoItem.item, idx=_curInfoItem.idx;
  const useRegionStart=!!(_curFromRegion && _regionLat && _regionLng);
  _closeInfoRouteChoice();
  closeInfoCard({keepMap:true});
  if(useRegionStart){
    const placeName=_regionPlaceName||_regionName||'검색지';
    const startObj={idx:-1,name:'📍 '+placeName,lat:_regionLat,lng:_regionLng,isRegionStart:true,showStartMarker:false};
    _routeStartMarkerExplicitCurrent=false;
    _routeRegionStart={lat:_regionLat,lng:_regionLng,name:startObj.name,placeName:placeName};
    _suppressNextRouteGuide=true;
    openTab('route');
    _runInfoRouteToEndWithStart(startObj,item,idx);
    return;
  }
  openTab('route');
  if(_routeHasVisibleStart()){
    _setRoutePointFromItem('end',item,idx);
    setTimeout(function(){ try{ _calcRoute(); }catch(e){ console.warn('[가톨릭길동무]', e); } }, OAI_ROUTE_VISUAL_DELAY_MS);
    return;
  }
  if(_myLat&&_myLng){
    _runInfoRouteToEndWithStart({idx:-1,name:'현재 위치',lat:_myLat,lng:_myLng,isImplicitCurrentLocation:false},item,idx);
    return;
  }
  if(!_GEO){ alert('위치 정보를 지원하지 않습니다.'); return; }
  _GEO.getCurrentPosition(function(p){
    _setMyLoc(p.coords.latitude,p.coords.longitude);
    _runInfoRouteToEndWithStart({idx:-1,name:'현재 위치',lat:p.coords.latitude,lng:p.coords.longitude,isImplicitCurrentLocation:false},item,idx);
  },function(){ alert('위치를 가져올 수 없습니다.'); },_GO1);
}
function selectMapFromSearchModal(){
  try{
    _blurAll && _blurAll();
    closeSearchModal();
    if(!_activeTab||_activeTab!=='route') openTab('route');
    else _enterRouteMode();
    _showRouteGuideText(_routeHasVisibleStart()?`도착 ${_getRouteGuideTarget()}를 탭하세요`:`출발지를 탭하거나 지도에서 ${_getRouteGuideTarget()}를 선택하세요`);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
try{ window.selectMapFromSearchModal=selectMapFromSearchModal; }catch(e){ console.warn('[가톨릭길동무]', e); }

function openKakaoNav(){
  if(!_curInfoItem) return;
  const {item,idx}=_curInfoItem;
  const isJuk = _mode==='shrine' && idx === JUKRIMGUL_IDX && JUKRIMGUL_IDX >= 0;
  const navItem = isJuk ? {...item, lat:JUKRIMGUL_PARKING.lat, lng:JUKRIMGUL_PARKING.lng, kw:JUKRIMGUL_PARKING.kw, name:JUKRIMGUL_PARKING.name} : item;
  const ep=_EC(navItem.kw||navItem.name);
  function launch(spLat,spLng,spName){
    const startName=spName||'현위치';
    const w=spLat?`https://map.kakao.com/link/from/${_EC(startName)},${spLat},${spLng}/to/${ep},${navItem.lat},${navItem.lng}`:
           `https://map.kakao.com/link/to/${ep},${navItem.lat},${navItem.lng}`;
    const a=spLat?`kakaomap://route?sp=${spLat},${spLng}&ep=${navItem.lat},${navItem.lng}&by=CAR`:
           `kakaomap://route?ep=${navItem.lat},${navItem.lng}&by=CAR`;
    _kakaoLaunch(w,a);
  }
  if((_curFromRegion || _isRegionSearchActiveForItem(item)) && _regionLat && _regionLng){
    const placeName=_regionPlaceName||_regionName||'검색지';
    _rememberRegionStart(_regionLat,_regionLng,placeName);
    launch(_regionLat,_regionLng,'📍 '+placeName);
  }
  else if(_myLat) launch(_myLat,_myLng,'현위치');
  else if(_GEO){
    _GEO.getCurrentPosition(p=>launch(p.coords.latitude,p.coords.longitude),
     ()=>launch(null,null),{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
  } else launch(null,null);
}

function _mkrImgRetreat(color,big){
  const w=big?40:28,h=big?52:36;
  const svg=big?
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C8.954 0 0 8.954 0 20c0 14.21 20 32 20 32S40 34.21 40 20C40 8.954 31.046 0 20 0z" fill="${color}"/><circle cx="20" cy="20" r="9" fill="white" opacity="0.95"/><text x="20" y="25" text-anchor="middle" font-size="14" fill="${color}" font-family="serif" font-weight="bold">✦</text></svg>`:
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z" fill="${color}" opacity="0.9"/><circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/><text x="14" y="18" text-anchor="middle" font-size="10" fill="${color}" font-family="serif" font-weight="bold">✦</text></svg>`;
  return new _MI(_svgUrl(svg),new _SZ(w,h),{offset:new _PT(w/2,h)});
}
function _mkrImg(color,big){
  const w=big?40:28,h=big?52:36;
  const crossBig = `<g fill="#fff" opacity="0.96"><rect x="18.45" y="10.5" width="3.1" height="18.5" rx="1.1"/><rect x="13.4" y="16.3" width="13.2" height="3.1" rx="1.1"/></g>`;
  const crossSmall = `<g fill="#fff" opacity="0.96"><rect x="12.85" y="7.8" width="2.3" height="12.8" rx="0.8"/><rect x="9.6" y="11.7" width="8.8" height="2.3" rx="0.8"/></g>`;
  const svg=big?
  `<svg ${_NS} width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C8.954 0 0 8.954 0 20c0 14.21 20 32 20 32S40 34.21 40 20C40 8.954 31.046 0 20 0z" fill="${color}"/>${crossBig}</svg>`:
  `<svg ${_NS} width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z" fill="${color}" opacity="0.92"/>${crossSmall}</svg>`;
  return new _MI(_svgUrl(svg),new _SZ(w,h),{offset:new _PT(w/2,h)});
}

function _mkrImgRoute(color,label){
  const c=label==='출' ? '#FF0000' : (label==='도' ? '#005BFF' : (color||'#005BFF'));
  const fs=String(label||'').length>1 ? 10.5 : 13;
  const svg=`<svg ${_NS} width='36' height='46' viewBox='0 0 36 46'><ellipse cx='18' cy='43' rx='8' ry='3' fill='rgba(0,0,0,0.25)'/><path d='M18 2C9 2 2 9 2 18C2 28 18 42 18 42C18 42 34 28 34 18C34 9 27 2 18 2Z' fill='${c}' stroke='white' stroke-width='2.5'/><circle cx='18' cy='18' r='10' fill='white' opacity='0.9'/><text x='18' y='22.5' font-size='${fs}' font-weight='900' fill='${c}' text-anchor='middle' font-family='Arial,sans-serif'>${label}</text></svg>`;
  return new _MI(_svgUrl(svg),new _SZ(36,46),{offset:new _PT(18,44)});
}

function _routeMarkerZ(role){
  if(role==='start') return 340;
  if(role==='waypoint') return 336;
  if(role==='waypoint2') return 335;
  if(role==='waypoint3') return 334;
  return 330;
}
function _setRouteMarkerZ(idx, role){
  try{
    const z=_routeMarkerZ(role);
    if(idx>=0 && _markers && _markers[idx] && _markers[idx].marker){
      _markers[idx].marker.setZIndex(z);
    }
    if(idx>=0 && _retreatMarkers){
      const r=_retreatMarkers.find(o=>o && o.index===idx);
      if(r && r.marker) r.marker.setZIndex(z);
    }
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

function _clearRouteTmpMarkers(){
  if(_startTmpMkr){ _startTmpMkr.setMap(null); _startTmpMkr=null; }
  if(_endTmpMkr){ _endTmpMkr.setMap(null); _endTmpMkr=null; }
  if(_wayTmpMkr){ _wayTmpMkr.setMap(null); _wayTmpMkr=null; }
  if(_way2TmpMkr){ _way2TmpMkr.setMap(null); _way2TmpMkr=null; }
  if(_way3TmpMkr){ _way3TmpMkr.setMap(null); _way3TmpMkr=null; }
}
function _routeEndMarkerColor(){
  if(_mode==='shrine' && _rE && _rE.idx>=0 && _markers[_rE.idx] && _markers[_rE.idx].shrine){
    return _typeColor(_markers[_rE.idx].shrine.type);
  }
  return '#0000ff';
}
function _shouldShowRouteStartMarker(){
  if(!(_activeTab === 'route' && _routeMode && _rS && _rS.lat && _rS.lng)) return false;
  if(_rS.isImplicitCurrentLocation && !_routeStartMarkerExplicitCurrent && _rS.showStartMarker !== true) return false;
  return true;
}
function _refreshRouteTmpMarkers(){
  if(!_map) return;
  _clearRouteTmpMarkers();
  _refreshExistingRoutePointMarkerImages();
  const routeResultShowing = !!_polyline;
  const needStart = !!(_rS && !_rS.isRegionStart && (routeResultShowing || _shouldShowRouteStartMarker()));
  const needWaypoint = !!(_rW && (_mode!=='shrine' || _rW.idx<0 || !_markers[_rW.idx] || routeResultShowing));
  const needWaypoint2 = !!(_rW2 && (_mode!=='shrine' || _rW2.idx<0 || !_markers[_rW2.idx] || routeResultShowing));
  const needWaypoint3 = !!(_rW3 && (_mode!=='shrine' || _rW3.idx<0 || !_markers[_rW3.idx] || routeResultShowing));
  const needEnd = !!(_rE && (_mode!=='shrine' || _rE.idx<0 || !_markers[_rE.idx]));
  if(needStart){
    _startTmpMkr = new _MM({
      position:new _LL(_rS.lat,_rS.lng),
      image:_mkrImgRoute('#ff0000','출'),
      zIndex:340
    });
    kakao.maps.event.addListener(_startTmpMkr,'click',function(){ _openRoutePointCancelChoice('start'); });
    _startTmpMkr.setMap(_map);
  }
  if(needWaypoint){
    _wayTmpMkr = new _MM({
      position:new _LL(_rW.lat,_rW.lng),
      image:_mkrImgRoute(_routeWaypointColor('waypoint'),_routeWaypointMarkerText('waypoint')),
      zIndex:_routeMarkerZ('waypoint')
    });
    kakao.maps.event.addListener(_wayTmpMkr,'click',function(){ _openRoutePointCancelChoice('waypoint'); });
    _wayTmpMkr.setMap(_map);
  }
  if(needWaypoint2){
    _way2TmpMkr = new _MM({
      position:new _LL(_rW2.lat,_rW2.lng),
      image:_mkrImgRoute(_routeWaypointColor('waypoint2'),_routeWaypointMarkerText('waypoint2')),
      zIndex:_routeMarkerZ('waypoint2')
    });
    kakao.maps.event.addListener(_way2TmpMkr,'click',function(){ _openRoutePointCancelChoice('waypoint2'); });
    _way2TmpMkr.setMap(_map);
  }
  if(needWaypoint3){
    _way3TmpMkr = new _MM({
      position:new _LL(_rW3.lat,_rW3.lng),
      image:_mkrImgRoute(_routeWaypointColor('waypoint3'),_routeWaypointMarkerText('waypoint3')),
      zIndex:_routeMarkerZ('waypoint3')
    });
    kakao.maps.event.addListener(_way3TmpMkr,'click',function(){ _openRoutePointCancelChoice('waypoint3'); });
    _way3TmpMkr.setMap(_map);
  }
  if(needEnd){
    _endTmpMkr = new _MM({
      position:new _LL(_rE.lat,_rE.lng),
      image:_mkrImgRoute(_routeEndMarkerColor(),'도'),
      zIndex:320
    });
    kakao.maps.event.addListener(_endTmpMkr,'click',function(){ _openRoutePointCancelChoice('end'); });
    _endTmpMkr.setMap(_map);
  }
}

function _typeColor(t){return t==='성지'?'#c0392b':t==='순례지'?'#1565c0':'#1b7a3e';}

function _buildShrineMarkers(){
  _markers=new Array(SHRINES.length).fill(null);
  const BATCH=30;
  let idx=0;
  function next(){
  const end=Math.min(idx+BATCH,SHRINES.length);
  for(let i=idx;i<end;i++){
   const s=SHRINES[i];
   if(!s.lat||!s.lng||s.lat<33||s.lat>38||s.lng<124||s.lng>132) continue;
   const mk=new _MM({
    position:new _LL(s.lat,s.lng),
    image:_mkrImg(_shrineMarkerColor(s),false),title:s.name
   });
   mk.setMap(_map);
   (function(index){
    kakao.maps.event.addListener(mk,'click',()=>{
     if(_routeMode) _selectRouteItem(index);
     else selectItem(index,{fromRegion:_isRegionSearchActiveForItem(SHRINES[index])});
    });
   })(i);
   _markers[i]={marker:mk,shrine:s,index:i};
  }
  idx=end;
  if(idx<SHRINES.length) requestAnimationFrame(next);
  }
  requestAnimationFrame(next);
}

function _clearShrineMarkers(){
  _markers.forEach(m=>{if(m)m.marker.setMap(null);});
}

function _restoreMapMarkers(){
  if(_mode==='parish'){
    try{ _clearParishNearbyMarkers(); }catch(e){ console.warn('[가톨릭길동무]',e); }
    const keepCode = (AppState && AppState.nearbyParishDioCode) || _activeDio || null;
    if(keepCode){
      if(_activeDio && _activeDio!==keepCode){
        try{ _hideParishDioMkrs(_activeDio); }catch(e){ console.warn('[가톨릭길동무]',e); }
      }
      _activeDio=keepCode;
      _showParishDioMkrs(keepCode);
      _syncParishDioLabels();
      return;
    }
    _syncParishDioLabels();
    try{ _showCurrentParishDioIfIdle(); }catch(e){ console.warn('[가톨릭길동무]',e); }
    return;
  }
  if(_mode==='retreat'){
    _restoreRetreatMarkers();
    return;
  }
  _markers.forEach(m=>{
  if(!m) return;
  const s=m.shrine;
  const ok=(_filterDio==='all'||s.diocese===_filterDio)&&
      (!_listSrch||_itemSearchBlob(s).includes(_listSrch)||_itemSearchNorm(s).includes(String(_listSrch).replace(/\s+/g,'')))&&
      _isShrineVisibleByVisitFilter(s);
  if(ok){
    m.marker.setImage(_mkrImg(_shrineMarkerColor(s),false));
    m.marker.setZIndex(1);
  }
  m.marker.setMap(ok?_map:null);
  });
}

function _restoreAllCategoryMarkersForSelection(){
  if(!_map) return;
  if(_mode==='shrine'){
    _markers.forEach(m=>{
      if(!m||!m.marker) return;
      try{
        m.marker.setMap(_isShrineVisibleByVisitFilter(m.shrine)?_map:null);
        m.marker.setImage(_mkrImg(_shrineMarkerColor(m.shrine),false));
        m.marker.setZIndex(1);
      }catch(e){ console.warn("[가톨릭길동무]", e); }
    });
    _selIdx=-1;
    return;
  }
  if(_mode==='retreat'){
    if(!_retreatMarkers.length) _buildRetreatMarkers();
    _retreatMarkers.forEach(o=>{
      if(!o||!o.marker) return;
      try{
        o.marker.setMap(_map);
        o.marker.setImage(_mkrImgRetreat('#2e7d32',false));
        o.marker.setZIndex(45);
      }catch(e){ console.warn("[가톨릭길동무]", e); }
    });
    if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); } _paSelMkr=null;}
  }
}

function _selectShrineMarker(idx){
  if(_selIdx>=0&&_markers[_selIdx]){
  _markers[_selIdx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_selIdx].shrine),false));
  _markers[_selIdx].marker.setZIndex(1);
  }
  if(idx>=0&&_markers[idx]){
  _markers[idx].marker.setImage(_mkrImg('#FFE500',true));
  _markers[idx].marker.setZIndex(10);
  }
  _selIdx=idx;
}

function _clearShrineMarkerSel(){
  if(_selIdx>=0&&_markers[_selIdx]){
  _markers[_selIdx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_selIdx].shrine),false));
  _markers[_selIdx].marker.setZIndex(1);
  }
  _selIdx=-1;
}

function _clearParishNearbyMarkers(){
  try{
    const arr=(AppState && AppState.nearbyParishMarkers) || [];
    arr.forEach(function(mk){ try{ mk.setMap(null); }catch(e){ console.warn('[가톨릭길동무]',e); } });
    if(AppState) AppState.nearbyParishMarkers=[];
  }catch(e){ console.warn('[가톨릭길동무]',e); }
}

function _fitParishNearbyBounds(items, lat, lng){
  if(_mode!=='parish' || !_map || !Array.isArray(items) || !items.length || typeof _LB==='undefined' || typeof _LL==='undefined') return false;
  try{
    const bounds=new _LB();
    let count=0;
    if(lat && lng){ bounds.extend(new _LL(lat,lng)); count++; }
    items.forEach(function(p){
      if(!p || !p.lat || !p.lng || p.lat===0 || p.lng===0) return;
      bounds.extend(new _LL(p.lat,p.lng));
      count++;
    });
    if(count>1){
      _markParishDioProgrammaticMove(1500);
      if(typeof _setBoundsByInfoCardStandard==='function') return _setBoundsByInfoCardStandard(bounds, 84, 54, 142, 54);
      _map.setBounds(bounds, 84, 54, 142, 54);
      return true;
    }
    const anchor=items.find(function(p){ return p && p.lat && p.lng && p.lat!==0 && p.lng!==0; });
    if(anchor) return _focusParishPointAround(anchor.lat,anchor.lng,{level:6});
  }catch(e){ console.warn('[가톨릭길동무]',e); }
  return false;
}

function _showParishNearbyMarkersOnMap(items, lat, lng, phase){
  if(_mode!=='parish' || !_map || !Array.isArray(items) || !items.length || typeof _LL==='undefined') return;
  try{
    const anchor = items.find(function(p){ return p && p.lat && p.lng && p.lat!==0 && p.lng!==0; });
    const code = anchor ? _parishDioCodeOf(anchor) : '';
    if(!code){
      _clearParishNearbyMarkers();
      return;
    }

    _clearParishNearbyMarkers();

    if(_activeDio && _activeDio!==code){
      try{ _hideParishDioMkrs(_activeDio); }catch(e){ console.warn('[가톨릭길동무]',e); }
    }

    if(_paSelMkr){ try{ _paSelMkr.setMap(null); }catch(e){ console.warn('[가톨릭길동무]',e); } _paSelMkr=null; }
    _activeDio = code;
    _showParishDioMkrs(code);
    _syncParishDioLabels();

    const lastCode = AppState ? AppState.nearbyParishDioCode : null;
    if(lastCode!==code || phase==='est'){
      if(AppState) AppState.nearbyParishDioCode = code;
      _fitParishNearbyBounds(items, lat, lng);
    }
    _raiseMyLocationMarker();
  }catch(e){ console.warn('[가톨릭길동무]',e); }
}

function _showItemsOnMap(items){
  _markers.forEach(m=>{if(m)m.marker.setMap(null);});
  const bounds=new _LB();
  let shownCount=0;
  const shown=(Array.isArray(items)?items:[]).filter(function(s){ return _isShrineVisibleByVisitFilter(s); });
  shown.forEach(s=>{
  const i=SHRINES.indexOf(s);
  if(i>=0&&_markers[i]){
   _markers[i].marker.setImage(_mkrImg(_shrineMarkerColor(s),false));
   _markers[i].marker.setZIndex(1);
   _markers[i].marker.setMap(_map);
   if(s.lat&&s.lng){ bounds.extend(new _LL(s.lat,s.lng)); shownCount++; }
  }
  });
  if(shownCount>0){
    if(typeof _setBoundsByInfoCardStandard==='function'){
      _setBoundsByInfoCardStandard(bounds,60,60,60,60);
    }else{
      try{_map.setBounds(bounds,60,60,60,60);}catch(e){ console.warn("[가톨릭길동무]", e); }
    }
  }
  _raiseMyLocationMarker();
}

function _showAllShrinesOnMapWithNearbyBounds(items, lat, lng){
  if(_mode!=='shrine' || !_map) return;
  try{
    _clearShrineMarkerSel();
    _markers.forEach(function(m){
      if(!m || !m.marker || !m.shrine) return;
      const s=m.shrine;
      const valid=s.lat&&s.lng&&s.lat>=33&&s.lat<=38&&s.lng>=124&&s.lng<=132&&_isShrineVisibleByVisitFilter(s);
      m.marker.setMap(valid?_map:null);
      if(valid){
        m.marker.setImage(_mkrImg(_shrineMarkerColor(s),false));
        m.marker.setZIndex(1);
      }
    });

    if(!Array.isArray(items) || !items.length || typeof _LB==='undefined' || typeof _LL==='undefined') return;
    const bounds=new _LB();
    let count=0;
    if(lat && lng){ bounds.extend(new _LL(lat,lng)); count++; }
    items.forEach(function(s){
      if(!s || !s.lat || !s.lng || !_isShrineVisibleByVisitFilter(s)) return;
      bounds.extend(new _LL(s.lat,s.lng));
      count++;
    });
    if(count>1){
      if(typeof _setBoundsByInfoCardStandard==='function') _setBoundsByInfoCardStandard(bounds,60,60,142,60);
      else _map.setBounds(bounds,60,60,142,60);
    }
    _raiseMyLocationMarker();
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _selectParishMarker(p){
  if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); }  _paSelMkr=null;}
  if(!_map||!p.lat||!p.lng) return null;
  const dioCode=_parishDioCodeOf(p);
  if(dioCode && _parishSysInited){
    if(_activeDio && _activeDio!==dioCode) _hideParishDioMkrs(_activeDio);
    _activeDio=dioCode;
    _showParishDioMkrs(dioCode);
    _syncParishDioLabels();
  }else if(dioCode){
    _ensureParishMarkerZoom();
  }
  _paSelMkr=new _MM({position:new _LL(p.lat,p.lng),image:_mkrImg('#FFE500',true),zIndex:200});
  _paSelMkr.setMap(_map);
  _raiseMyLocationMarker();
  return dioCode;
}

const _DIO_CFG={
  'SE':{n:'서울대교구',lat:37.565,lng:126.988,c:'#C0392B'},
  'IC':{n:'인천교구',  lat:37.478,lng:126.626,c:'#2471A3'},
  'SW':{n:'수원교구',  lat:37.180,lng:127.018,c:'#7D3C98'},
  'UJ':{n:'의정부교구',lat:37.740,lng:127.058,c:'#CA6F1E'},
  'CC':{n:'춘천교구',  lat:37.875,lng:127.720,c:'#117A65'},
  'WJ':{n:'원주교구',  lat:37.340,lng:127.960,c:'#1E8449'},
  'DJ':{n:'대전교구',  lat:36.352,lng:127.378,c:'#B03A2E'},
  'CJ':{n:'청주교구',  lat:36.630,lng:127.490,c:'#4A235A'},
  'DG':{n:'대구대교구',lat:35.870,lng:128.585,c:'#1A5276'},
  'AD':{n:'안동교구',  lat:36.570,lng:128.725,c:'#9A7D0A'},
  'BS':{n:'부산교구',  lat:35.155,lng:129.065,c:'#6E2F1A'},
  'MS':{n:'마산교구',  lat:35.225,lng:128.580,c:'#6C3483'},
  'GJ':{n:'광주대교구',lat:35.158,lng:126.895,c:'#1A5276'},
  'JJ':{n:'전주교구',  lat:35.820,lng:127.145,c:'#1D6A39'},
  'JE':{n:'제주교구',  lat:33.490,lng:126.530,c:'#B7950B'},
  'ML':{n:'군종교구',  lat:37.530,lng:126.972,c:'#5D6D7E'},

};

const _PARISH_DIO_CODE_MAP={'서울대교구':'SE','인천교구':'IC','수원교구':'SW','의정부교구':'UJ',
  '춘천교구':'CC','원주교구':'WJ','대전교구':'DJ','청주교구':'CJ','대구대교구':'DG',
  '안동교구':'AD','부산교구':'BS','마산교구':'MS','광주대교구':'GJ','전주교구':'JJ',
  '제주교구':'JE','군종교구':'ML'};
function _parishDioCodeOf(p){
  return p && p.diocese ? (_PARISH_DIO_CODE_MAP[p.diocese] || null) : null;
}

function _isParishDioBoundsOutlier(p, code){
  if(!p) return false;
  const name=String(p.name||'');
  const addr=String(p.addr||'');
  if(code==='IC' && (addr.indexOf('인천 옹진군')>=0 || name.indexOf('백령')>=0 || addr.indexOf('백령')>=0 || name.indexOf('대청')>=0 || addr.indexOf('대청')>=0 || name.indexOf('연평')>=0 || addr.indexOf('연평')>=0 || name.indexOf('덕적')>=0 || addr.indexOf('덕적')>=0)) return true;
  if(code==='DG' && (addr.indexOf('울릉')>=0 || name.indexOf('울릉')>=0)) return true;
  return false;
}

let _PA_BY_DIO={};
function _rebuildParishDioIndex(){
  const m={};
  PARISHES.forEach(p=>{
    const code=_parishDioCodeOf(p)||'ETC';
    (m[code]||(m[code]=[])).push(p);
  });
  _PA_BY_DIO=m;
  return _PA_BY_DIO;
}
_parishDioIndexReady=true;
_rebuildParishDioIndex();

function _dioLabelSize(lvl){
  if(lvl<=4) return 18; if(lvl===5) return 16;
  if(lvl===6) return 15; if(lvl===7) return 14;
  if(lvl===8) return 13; return 12;
}

function _markParishDioProgrammaticMove(ms){
  try{
    _parishDioProgrammaticMoveUntil=(Date.now?Date.now():new Date().getTime())+(ms||1400);
  }catch(e){ console.warn('[가톨릭길동무]',e); }
}

function _parishDioCenter(code){
  if(!_map||typeof _LL==='undefined') return null;
  const parishes=_PA_BY_DIO[code]||[];
  let minLat=Infinity,maxLat=-Infinity,minLng=Infinity,maxLng=-Infinity,count=0;
  parishes.forEach(function(p){
    if(!p||!p.lat||!p.lng||p.lat===0||p.lng===0) return;
    if(_isParishDioBoundsOutlier(p, code)) return;
    minLat=Math.min(minLat,p.lat); maxLat=Math.max(maxLat,p.lat);
    minLng=Math.min(minLng,p.lng); maxLng=Math.max(maxLng,p.lng);
    count++;
  });
  if(count>0) return new _LL((minLat+maxLat)/2,(minLng+maxLng)/2);
  const cfg=_DIO_CFG[code];
  return cfg ? new _LL(cfg.lat,cfg.lng) : null;
}

function _centerParishDioWithoutZoom(code){
  if(_mode!=='parish'||!_map) return false;
  const center=_parishDioCenter(code);
  if(!center) return false;
  try{
    if(typeof _map.panTo==='function') _map.panTo(center);
    else _map.setCenter(center);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]',e); }
  return false;
}

function _focusParishPointAround(lat, lng, opts){
  opts=opts||{};
  if(_mode!=='parish'||!_map||!lat||!lng||typeof _LL==='undefined') return false;
  const targetLevel = opts.level || 6;
  const pos = new _LL(lat,lng);
  try{
    if(typeof _map.getLevel==='function' && typeof _map.setLevel==='function'){
      const lvl = _map.getLevel();
      if(lvl > targetLevel){
        _markParishDioProgrammaticMove(1300);
        _map.setLevel(targetLevel);
      }
    }
    if(typeof _setMapCenterByInfoCardStandard==='function'){
      return _setMapCenterByInfoCardStandard(pos);
    }
    _map.setCenter(pos);
    return true;
  }catch(e){ console.warn('[가톨릭길동무]',e); }
  return false;
}

function _buildParishDioSystem(){
  if(_parishSysInited) return;
  _parishSysInited=true;
  const lvl=_map.getLevel();
  Object.entries(_DIO_CFG).forEach(([code,cfg])=>{
    if(code==='ML') return;
    const el=document.createElement('div');
    el.className='dio-label';
    el.dataset.code=code;
    const fs=_dioLabelSize(lvl);
    el.style.cssText=`cursor:pointer;background:rgba(255,255,255,0.92);color:${cfg.c};`+
      `font-size:${fs}px;font-weight:800;padding:4px 9px;border-radius:20px;`+
      `border:2px solid ${cfg.c};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);`+
      `letter-spacing:-.3px;transition:transform .15s;user-select:none;`;
    el.textContent=cfg.n;
    el.addEventListener('click',function(e){
      e.stopPropagation();
      _toggleParishDio(code);
    });
    const ov=new kakao.maps.CustomOverlay({
      position:new _LL(cfg.lat,cfg.lng),
      content:el,
      xAnchor:0.5,yAnchor:0.5,
      zIndex:100
    });
    _dioOverlays[code]=ov;
    try{ ov.setMap(_map); if(typeof ov.setZIndex==='function') ov.setZIndex(10000); }catch(e){ console.warn('[가톨릭길동무]',e); }
  });
  kakao.maps.event.addListener(_map,'zoom_changed',function(){
    const lvl2=_map.getLevel();
    const fs2=_dioLabelSize(lvl2);
    document.querySelectorAll('.dio-label').forEach(el2=>{
      el2.style.fontSize=fs2+'px';
    });
    try{
      const now=Date.now?Date.now():new Date().getTime();
      if(_mode==='parish' && now>_parishDioProgrammaticMoveUntil){
        _parishDioUserZoomTouched=true;
      }
    }catch(e){ console.warn('[가톨릭길동무]',e); }
  });
}

function _isParishRouteLineActive(){
  return _mode==='parish' && !!_polyline;
}
function _showDioOverlays(){
  if(_isParishRouteLineActive()){
    _hideDioOverlays();
    return;
  }
  Object.values(_dioOverlays).forEach(ov=>{ try{ov.setMap(_map);}catch(e){ console.warn("[가톨릭길동무]", e); } });
}
function _hideDioOverlays(){
  Object.values(_dioOverlays).forEach(ov=>{ try{ov.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); } });
}

function _syncParishDioLabels(){
  if(_mode!=='parish' || !_map) return;
  if(_isParishRouteLineActive()){
    _hideDioOverlays();
    return;
  }
  if(!_parishSysInited){ try{ _buildParishDioSystem(); }catch(e){ console.warn('[가톨릭길동무]',e); } }
  Object.entries(_dioOverlays||{}).forEach(function(pair){
    const code=pair[0], ov=pair[1];
    try{ ov.setMap(_map); if(typeof ov.setZIndex==='function') ov.setZIndex(10000); }catch(e){ console.warn('[가톨릭길동무]',e); }
    const el = ov && typeof ov.getContent==='function' ? ov.getContent() : null;
    if(el && el.style){
      el.style.display = (code===_activeDio) ? 'none' : '';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.zIndex = '10000';
      el.style.transform = '';
    }
  });
}

function _toggleParishDio(code){
  if(_mode==='parish' && !_isParishDioceseReady(code)){
    _showParishDataLoadingMessage((_DIO[code]||'해당 교구')+' 성당 정보를 불러오는 중입니다...');
    _ensureParishDioceseDataLoaded(code).then(function(){ _toggleParishDio(code); }).catch(function(err){
      console.warn('[가톨릭길동무] 성당 교구 데이터 로드 실패', err);
      try{ alert('성당 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); }catch(_e){}
    });
    return;
  }
  if(_activeDio===code){
    _hideParishDioMkrs(code);
    _activeDio=null;
    _syncParishDioLabels();
    return;
  }
  if(_activeDio) _hideParishDioMkrs(_activeDio);
  _activeDio=code;
  _showParishDioMkrs(code);
  _syncParishDioLabels();
  _focusParishDio(code,{fromLabel:true});
}

function _focusParishDio(code, opts){
  opts=opts||{};
  if(opts.fromLabel && _parishDioUserZoomTouched){
    if(_centerParishDioWithoutZoom(code)) return;
  }
  _fitParishDioBounds(code,{reason:'dio-click'});
}

function _fitParishDioBounds(code, opts){
  opts=opts||{};
  if(_mode!=='parish'||!_map||typeof _LB==='undefined'||typeof _LL==='undefined') return false;
  const parishes=_PA_BY_DIO[code]||[];
  let bounds=null, count=0, only=null;
  try{
    parishes.forEach(function(p){
      if(!p||!p.lat||!p.lng||p.lat===0||p.lng===0) return;
      if(_isParishDioBoundsOutlier(p, code)) return;
      only=p;
      const pos=new _LL(p.lat,p.lng);
      if(!bounds) bounds=new _LB();
      bounds.extend(pos);
      count++;
    });
    if(count>1 && bounds){
      _markParishDioProgrammaticMove(1700);
      if(typeof _setBoundsByInfoCardStandard==='function'){
        _setBoundsByInfoCardStandard(bounds, 86, 64, 126, 64);
      }else{
        try{ _map.setBounds(bounds, 86, 64, 126, 64); }
        catch(e1){ _map.setBounds(bounds); }
      }
      setTimeout(function(){
        try{
          if(_mode==='parish' && _activeDio===code && typeof _map.getLevel==='function' && typeof _map.setLevel==='function'){
            var lvl=_map.getLevel();
            if(lvl<8){ _markParishDioProgrammaticMove(1200); _map.setLevel(8); }
          }
        }catch(e2){ console.warn('[가톨릭길동무]',e2); }
      }, opts.delay || 90);
      return true;
    }
    if(count===1 && only){
      if(typeof _map.setLevel==='function'){ _markParishDioProgrammaticMove(1200); _map.setLevel(8); }
      if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(only.lat,only.lng));
      else _map.setCenter(new _LL(only.lat,only.lng));
      return true;
    }
    const cfg=_DIO_CFG[code];
    if(cfg){
      if(typeof _map.setLevel==='function'){ _markParishDioProgrammaticMove(1200); _map.setLevel(8); }
      if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(cfg.lat,cfg.lng));
      else _map.setCenter(new _LL(cfg.lat,cfg.lng));
      return true;
    }
  }catch(e){ console.warn('[가톨릭길동무]',e); }
  return false;
}

function _ensureParishMarkerZoom(){
  if(_mode!=='parish'||!_map||typeof _map.getLevel!=='function'||typeof _map.setLevel!=='function') return;
  try{
    if(_map.getLevel()>6){ _markParishDioProgrammaticMove(1200); _map.setLevel(6); }
  }catch(e){ console.warn('[가톨릭길동무]',e); }
}
function _showParishDioMkrs(code){
  if(_isParishRouteLineActive()){
    try{ _hideParishDioMkrs(code); }catch(e){ console.warn('[가톨릭길동무]',e); }
    return;
  }
  if(!_dioMkrs[code]){
    const cfg=_DIO_CFG[code]||{c:'#555'};
    const parishes=_PA_BY_DIO[code]||[];
    _dioMkrs[code]=[];
    parishes.forEach(p=>{
      if(!p.lat||!p.lng||p.lat===0||p.lng===0) return;
      const mk=new _MM({
        position:new _LL(p.lat,p.lng),
        image:_mkrImg(cfg.c,false),
        title:p.name,
        zIndex:50
      });
      kakao.maps.event.addListener(mk,'click',function(){
        const idx=PARISHES.indexOf(p);
        if(_routeMode) _selectRouteItem(idx);
        else selectItem(idx,{fromNearby:false,fromRegion:_isRegionSearchActiveForItem(PARISHES[idx])});
      });
      _dioMkrs[code].push(mk);
    });
  }
  _updateParishViewport(code);
  if(_parishIdleListener){
    try{kakao.maps.event.removeListener(_parishIdleListener);}catch(e){ console.warn('[가톨릭길동무]',e); }
    _parishIdleListener=null;
  }
  _parishIdleListener=kakao.maps.event.addListener(_map,'idle',function(){
    if(_activeDio===code) _updateParishViewport(code);
  });
}

function _updateParishViewport(code){
  const mkrs=_dioMkrs[code];
  if(!mkrs||!_map) return;
  if(_isParishRouteLineActive()){
    mkrs.forEach(mk=>{
      try{ mk.setMap(null); }catch(e){ console.warn('[가톨릭길동무]',e); }
    });
    return;
  }
  mkrs.forEach(mk=>{
    try{ mk.setMap(_map); }catch(e){ console.warn('[가톨릭길동무]',e); }
  });
}

function _hideParishDioMkrs(code){
  (_dioMkrs[code]||[]).forEach(mk=>{ try{mk.setMap(null);}catch(e){ console.warn('[가톨릭길동무]',e); } });
  if(_parishIdleListener){
    try{kakao.maps.event.removeListener(_parishIdleListener);}catch(e){ console.warn('[가톨릭길동무]',e); }
    _parishIdleListener=null;
  }
}
function _buildRetreatMarkers(){
  if(!_map) return;
  if(!_retreatMarkers.length){
    RETREATS.forEach((p,i)=>{
      if(!p.lat||!p.lng||p.lat===0) return;
      const mk=new _MM({
        position:new _LL(p.lat,p.lng),
        image:_mkrImg('#2e7d32',false),
        title:p.name,
        zIndex:45
      });
      (function(idx){kakao.maps.event.addListener(mk,'click',function(){
        if(_routeMode) _selectRouteItem(idx);
        else selectItem(idx,{fromNearby:false,fromRegion:_isRegionSearchActiveForItem(RETREATS[idx])});
      });})(i);
      _retreatMarkers.push({marker:mk,item:p,index:i});
    });
  }
  _retreatMarkers.forEach(o=>o.marker.setMap(_map));
  _raiseMyLocationMarker();
}
function _clearRetreatMarkers(){
  _retreatMarkers.forEach(o=>o.marker.setMap(null));
  if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); } _paSelMkr=null;}
}
function _restoreRetreatMarkers(){
  _retreatMarkers.forEach(o=>{
    const s=o.item;
    const ok=(_filterDio==='all'||s.diocese===_filterDio)&&(!_listSrch||_itemSearchBlob(s).includes(_listSrch)||_itemSearchNorm(s).includes(String(_listSrch).replace(/\s+/g,'')));
    o.marker.setMap(ok?_map:null);
  });
}
function _selectRetreatMarker(p){
  if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); } _paSelMkr=null;}
  if(!_map||!p.lat||!p.lng) return;
  _paSelMkr=new _MM({position:new _LL(p.lat,p.lng),image:_mkrImgRetreat('#FFE500',true),zIndex:180});
  _paSelMkr.setMap(_map);
  _raiseMyLocationMarker();
}

function _clearParishMarkers(){
  if(_paSelMkr){try{_paSelMkr.setMap(null);}catch(e){ console.warn("[가톨릭길동무]", e); }  _paSelMkr=null;}
  if(_activeDio){ _hideParishDioMkrs(_activeDio); _activeDio=null; }
  document.querySelectorAll('.dio-label').forEach(e=>e.style.transform='');
  _hideDioOverlays();
}

function _autoLocate(){
  if(!_GEO) return;
  _GEO.getCurrentPosition(p=>{
  _setMyLoc(p.coords.latitude,p.coords.longitude);
  if(_mode==='shrine'){
   _map.setLevel(8);
   if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(p.coords.latitude,p.coords.longitude));
   else _map.setCenter(new _LL(p.coords.latitude,p.coords.longitude));
  } else if(_mode==='parish'){
   _map.setLevel(6);
   if(typeof _focusParishPointAround==='function') _focusParishPointAround(p.coords.latitude,p.coords.longitude,{level:6});
   else _map.setCenter(new _LL(p.coords.latitude,p.coords.longitude));
  } else if(_mode==='retreat'){
   _map.setLevel(9);
   if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(p.coords.latitude,p.coords.longitude));
   else _map.setCenter(new _LL(p.coords.latitude,p.coords.longitude));
  }
  },()=>{},
  _GO2);
  setTimeout(()=>{
  _GEO.getCurrentPosition(p=>{
   _setMyLoc(p.coords.latitude,p.coords.longitude);
  },()=>{},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  },500);
}

function _nearestDioCode(lat,lng){
  if(!_DIO_CFG) return null;
  let best=null,bestD=Infinity;
  Object.entries(_DIO_CFG).forEach(([code,cfg])=>{
    if(code==='ML') return;
    if(!cfg.lat||!cfg.lng) return;
    const d=Math.pow(lat-cfg.lat,2)+Math.pow(lng-cfg.lng,2);
    if(d<bestD){bestD=d;best=code;}
  });
  return best;
}
function _showCurrentParishDioIfIdle(){
  if(_activeTab==='nearby' || (_nearbyCache && _nearbyCache.length)) return;
  if(_mode!=='parish'||!_map||!_myLat||!_myLng||_paSelMkr||_routeMode||_rS||_rE) return;
  if(!_parishSysInited) return;
  const code=_nearestDioCode(_myLat,_myLng);
  if(!code) return;
  if(!_isParishDioceseReady(code)){
    _ensureParishDioceseDataLoaded(code).then(function(){ _showCurrentParishDioIfIdle(); }).catch(function(err){ console.warn('[가톨릭길동무] 현재 위치 교구 로드 실패', err); });
    return;
  }
  try{
    if(_activeDio && _activeDio!==code) _hideParishDioMkrs(_activeDio);
    _ensureParishMarkerZoom();
    _activeDio=code;
    _showParishDioMkrs(code);
    _syncParishDioLabels();
    if(typeof _focusParishPointAround==='function') _focusParishPointAround(_myLat,_myLng,{level:6});
    document.querySelectorAll('.dio-label').forEach(e=>{e.style.transform='';e.style.display='';});
    const clickedEl=_dioOverlays[code]?.getContent?.();
    if(clickedEl){clickedEl.style.display='none';}
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}
function _raiseMyLocationMarker(){
  try{
    if(_myMkr && typeof _myMkr.setZIndex==='function') _myMkr.setZIndex(OAI_MY_LOCATION_MARKER_ZINDEX);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _setMyLoc(lat,lng){
  _myLat=lat;_myLng=lng;
  if(typeof kakao==='undefined'||!_map) return;  // 지도 미로드 시 무시
  if(_myMkr) _myMkr.setMap(null);
  const svg=`<svg ${_NS} width='28' height='28' viewBox='0 0 28 28'><circle cx='14' cy='14' r='12' fill='#1a73e8' opacity='.18'/><circle cx='14' cy='14' r='7' fill='#1a73e8'/><circle cx='14' cy='14' r='3.5' fill='white'/></svg>`;
  _myMkr=new _MM({
  position:new _LL(lat,lng),
  image:new _MI(_svgUrl(svg),
   new _SZ(28,28),{offset:new _PT(14,14)}),
  zIndex:OAI_MY_LOCATION_MARKER_ZINDEX
  });
  _myMkr.setMap(_map);
  _raiseMyLocationMarker();
  setTimeout(_showCurrentParishDioIfIdle, 80);
  if(_mode==='shrine') setTimeout(function(){ _maybePromptAutoShrineVisit(lat,lng); }, 180);
}

function goMyLoc(){
  if(!_GEO) return alert('위치 정보를 지원하지 않습니다.');
  _GEO.getCurrentPosition(p=>{
  _setMyLoc(p.coords.latitude,p.coords.longitude);
  _map.setLevel(7);
  if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(p.coords.latitude,p.coords.longitude));
  else _map.setCenter(new _LL(p.coords.latitude,p.coords.longitude));
  },err=>{
  if(_mode==='shrine') window.__OAI_SHRINE_NEARBY_LOADING__=false;
  try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
  alert(err.code===1?'위치 권한을 허용해 주세요.':'위치를 가져올 수 없습니다.');
  },_GO1);
}

function _beginNearbyLoad(){
  try{
    AppState.nearbyLoadToken = (AppState.nearbyLoadToken || 0) + 1;
    return AppState.nearbyLoadToken;
  }catch(e){
    window.__oaiNearbyLoadToken = (window.__oaiNearbyLoadToken || 0) + 1;
    return window.__oaiNearbyLoadToken;
  }
}
function _cancelNearbyLoad(){
  _beginNearbyLoad();
}
function _isNearbyLoadCurrent(mode, token, body){
  try{
    if(mode && _mode !== mode) return false;
    if(_screen !== 'map') return false;
    if(token && AppState && AppState.nearbyLoadToken !== token) return false;
    if(body && body !== $('nearby-body')) return false;
    return true;
  }catch(e){
    return false;
  }
}

function _loadNearby(){
  const body=$('nearby-body');
  _cancelNearbyLoad();
  if(_mode==='shrine'){
    window.__OAI_SHRINE_NEARBY_DISTANCE_DONE__=false;
    window.__OAI_SHRINE_NEARBY_LOADING__=true;
  }
  try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
  body.innerHTML='<div class="empty-msg">📍 위치를 확인하는 중...</div>';

  if(!_GEO){
  if(_mode==='shrine') window.__OAI_SHRINE_NEARBY_LOADING__=false;
  body.innerHTML='<div style="padding:30px;text-align:center;color:#c0392b;font-size:13px">⚠️ 위치 기능을 지원하지 않습니다</div>';
  return;
  }

  const go=(lat,lng)=>{
  _myLat=lat;_myLng=lng;
  if(_mode==='shrine') _loadNearbyShrines(lat,lng);
  else if(_mode==='retreat') _loadNearbyRetreats(lat,lng);
  else _loadNearbyParishes(lat,lng);
  };

  if(_myLat) { go(_myLat,_myLng); return; }

  _GEO.getCurrentPosition(p=>{
  _setMyLoc(p.coords.latitude,p.coords.longitude);
  go(p.coords.latitude,p.coords.longitude);
  },err=>{
  if(err.code===1){
    body.innerHTML=`<div style="padding:28px 20px;text-align:center;">
      <div style="font-size:36px;margin-bottom:12px">📍</div>
      <div style="font-size:14px;font-weight:700;color:#c0392b;margin-bottom:8px">위치 권한이 거부되어 있습니다</div>
      <div style="font-size:12px;color:#888;line-height:1.7;margin-bottom:18px">
        브라우저 주소창 왼쪽의 🔒 아이콘을 탭한 뒤<br>
        <b>위치</b> 권한을 <b>허용</b>으로 변경하고 새로고침하세요.
      </div>
      <button onclick="_loadNearby()" style="background:#0e1535;color:#d4aa6a;border:none;border-radius:20px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">↺ 다시 시도</button>
    </div>`;
  } else {
    body.innerHTML=`<div style="padding:28px 20px;text-align:center;">
      <div style="font-size:36px;margin-bottom:12px">😔</div>
      <div style="font-size:14px;font-weight:700;color:#c0392b;margin-bottom:8px">위치를 가져올 수 없습니다</div>
      <div style="font-size:12px;color:#888;line-height:1.7;margin-bottom:18px">GPS 신호가 약하거나 네트워크 문제일 수 있습니다.<br>잠시 후 다시 시도해보세요.</div>
      <button onclick="_loadNearby()" style="background:#0e1535;color:#d4aa6a;border:none;border-radius:20px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">↺ 다시 시도</button>
    </div>`;
  }
  },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}

function _loadNearbyWithDist(lat,lng,items,getIdx,getColor,getLabel){
  const body=$('nearby-body');
  const requestMode=_mode;
  const requestToken=_beginNearbyLoad();
  const POOL=items.filter(p=>p.lat&&p.lng);
  const prelim=POOL.map(p=>({p,d:calcDist(lat,lng,p.lat,p.lng)})).sort((a,b)=>a.d-b.d).slice(0,OAI_NEARBY_ROUTE_CANDIDATE_LIMIT);

  if(!prelim.length){
    if(body && _isNearbyLoadCurrent(requestMode,requestToken,body)) body.innerHTML='<div class="empty-msg">표시할 장소가 없습니다.</div>';
    if(requestMode==='shrine'){
      window.__OAI_SHRINE_NEARBY_LOADING__=false;
      window.__OAI_SHRINE_NEARBY_DISTANCE_DONE__=true;
      try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
    }
    return;
  }

  if(body && _isNearbyLoadCurrent(requestMode,requestToken,body)){
    body.innerHTML='<div class="empty-msg nearby-distance-loading"><span class="nearby-distance-spinner" aria-hidden="true"></span><span class="nearby-distance-title">📍 내 위치 기준 자동차 거리 계산 중</span><span class="nearby-distance-sub">가까운 20곳 후보를 계산한 뒤 10곳을 보여줍니다.</span></div>';
  }

  const results=new Array(prelim.length).fill(null);
  let done=0;

  prelim.forEach((x,i)=>{
    _navFetch(`${lng},${lat}`,`${x.p.lng},${x.p.lat}`)
    .then(val=>{ results[i]=val||{km:x.d*1.35,dur:null}; })
    .catch(()=>{ results[i]={km:x.d*1.35,dur:null}; })
    .finally(()=>{
      done++;
      if(done===prelim.length){
        if(!_isNearbyLoadCurrent(requestMode,requestToken,body)) return;
        _renderNearbyDone(prelim,results,getIdx,getColor,getLabel,'final',requestMode,requestToken);
      }
    });
  });
}
function _renderNearbyDone(prelim,results,getIdx,getColor,getLabel,phase,requestMode,requestToken){
  const body=$('nearby-body');
  if(!body) return;
  if(requestMode && !_isNearbyLoadCurrent(requestMode,requestToken,body)) return;
  const sorted=prelim.map((x,i)=>({x,r:results[i]||{km:x.d*1.35,dur:null}})).sort((a,b)=>a.r.km-b.r.km).slice(0,10);
  _nearbyCache=sorted.map(o=>o.x.p);
  if(phase==='final'&&_mode==='shrine'&&_map) _showAllShrinesOnMapWithNearbyBounds(_nearbyCache,_myLat,_myLng);
  if(phase==='final'&&_mode==='parish'&&_map) _showParishNearbyMarkersOnMap(_nearbyCache,_myLat,_myLng,phase);
  const scrollTop=body.scrollTop||0;
  body.innerHTML=sorted.map((o,i)=>{
    const idx=getIdx(o.x.p);
    const c=getColor(o.x.p);
    const lbl=getLabel(o.x.p);
    const km=o.r.km.toFixed(1);
    const isEst=(phase==='est');
    const distTxt=isEst?`~${km}km`:`🚗${km}km`;
    const dur=(!isEst&&o.r.dur)?`<span style="font-size:10px;color:#aaa;font-weight:400;margin-left:3px">${_fmtTime(o.r.dur)}</span>`:'';
    return `<div class="nearby-item${(_mode==='shrine'&&_isVisitedShrine(o.x.p))?' shrine-visited-card':''}" onclick="selectItem(${idx},{fromNearby:true})"><div class="nearby-num" style="background:${c}!important">${i+1}</div><div class="nearby-info"><div class="nearby-name">${o.x.p.name}${_shrineNewBadgeHtml(o.x.p)}</div><div class="nearby-addr">${o.x.p.addr.substring(0,26)}${o.x.p.addr.length>26?'…':''}</div>${_shrineVisitBadgeHtml(o.x.p,'nearby')}</div><div class="nearby-meta"><div class="nearby-type" style="background:${c}18!important;color:${c}!important">${lbl}</div><div class="nearby-dist" style="color:${isEst?'#aaa':c}!important">${distTxt}${dur}</div></div></div>`;
  }).join('');
  if(phase==='final'){
    body.scrollTop=scrollTop;
    if(_mode==='shrine'){
      window.__OAI_SHRINE_NEARBY_LOADING__=false;
      window.__OAI_SHRINE_NEARBY_DISTANCE_DONE__=true;
    }
    try{ _updateShrineVisitCardsButtonUI(); }catch(_e){}
  }
}
function _loadNearbyShrines(lat,lng){
  _loadNearbyWithDist(lat,lng,SHRINES,p=>SHRINES.indexOf(p),p=>TC[p.type]||'#555',p=>p.type);
}
function _loadNearbyParishes(lat,lng){
  if(!_areAllParishDiocesesReady()){
    const body=$('nearby-body');
    if(body) body.innerHTML='<div class="empty-msg nearby-distance-loading"><span class="nearby-distance-spinner" aria-hidden="true"></span><span class="nearby-distance-title">성당 정보 불러오는 중</span><span class="nearby-distance-sub">전체 성당 정보를 준비하고 있습니다.</span></div>';
    _ensureAllParishDiocesesLoaded().then(function(){ _loadNearbyParishes(lat,lng); }).catch(function(err){
      console.warn('[가톨릭길동무] 전체 성당 데이터 로드 실패', err);
      if(body) body.innerHTML='<div class="empty-msg">성당 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</div>';
    });
    return;
  }
  _loadNearbyWithDist(lat,lng,PARISHES,p=>PARISHES.indexOf(p),()=>OAI_CATHEDRAL_CATEGORY_COLOR,()=>'⛪ 성당');
}
function _loadNearbyRetreats(lat,lng){
  _loadNearbyWithDist(lat,lng,RETREATS,p=>RETREATS.indexOf(p),p=>_getRetreatColor(p),()=>'🏔 피정의 집');
}

function renderList(){
  const body=$('list-body');
  if(!body) return;
  const items = _getCurrentItems();
  const q=_listSrch;
  const groups={};
  items.forEach((s,i)=>{
  if(_mode==='shrine' && (!s.lat||!s.lng||s.lat<33||s.lat>38)) return;
  const matchDio = _mode==='parish' ? (_filterDio==='all'||s.diocese===_filterDio) : (q?true:(_filterDio==='all'||s.diocese===_filterDio));
  if(!matchDio) return;
  if(q){
    const nq=q.replace(/\s+/g,'');
    const nameNorm=String(s.name||'').replace(/\s+/g,'');
    const dioNorm=String(s.diocese||'').replace(/\s+/g,'');
    const addrNorm=String(s.addr||'').replace(/\s+/g,'');
    const allNorm=_itemSearchNorm(s);
    let matchAll=false;
    if(_mode==='parish'){
      matchAll = nameNorm.startsWith(nq) || addrNorm.includes(nq);
    } else {
      const tokens=q.trim().split(/\s+/);
      matchAll=tokens.length>=2
        ?tokens.every(t=>{const nt=t.replace(/\s+/g,'');return nameNorm.includes(nt)||dioNorm.includes(nt)||addrNorm.includes(nt)||allNorm.includes(nt);})
        :nameNorm.includes(nq)||dioNorm.includes(nq)||addrNorm.includes(nq)||allNorm.includes(nq);
    }
    if(!matchAll) return;
  }
  if(!groups[s.diocese]) groups[s.diocese]=[];
  groups[s.diocese].push({s,i});
  });
  if(Object.keys(groups).length===0){
  if(_mode==='parish' && !PARISHES.length) body.innerHTML='<div class="empty-msg">교구를 선택해 주세요.</div>';
  else if(_mode==='parish' && q && _filterDio!=='all') body.innerHTML='<div class="empty-msg">선택한 교구 안에 검색 결과가 없습니다</div>';
  else body.innerHTML='<div class="empty-msg">검색 결과가 없습니다</div>';
  return;
  }
  if(q){
    const nq=q.replace(/\s+/g,'');
    Object.keys(groups).forEach(dio=>{
      groups[dio].sort((a,b)=>{
        const an=a.s.name.replace(/\s+/g,''),bn=b.s.name.replace(/\s+/g,'');
        const ae=an===nq,be=bn===nq;
        if(ae&&!be) return -1; if(!ae&&be) return 1;
        const as=an.startsWith(nq),bs=bn.startsWith(nq);
        if(as&&!bs) return -1; if(!as&&bs) return 1;
        return 0;
      });
    });
  }
  body.innerHTML='';
  _sortDioceseNamesWithMyFirst(Object.keys(groups)).forEach((dio)=>{
  const entries=groups[dio];
  const hd=document.createElement('div');
  hd.className='dio-hd'+(_isMyDioceseName(dio)?' my-diocese-hd':'');
  hd.textContent=dio;
  if(_isMyDioceseName(dio)){
    const badge=document.createElement('span');
    badge.className='list-my-dio-badge';
    badge.textContent='나의 교구';
    hd.appendChild(badge);
  }
  body.appendChild(hd);
  entries.forEach(({s,i})=>{
   const c=_getModeMarkerColor(s);
   const dotColor = (_mode==='retreat') ? OAI_RETREAT_LIST_DOT_COLOR : c;
   const d=document.createElement('div');
   d.className='list-item'+((_mode==='shrine'&&_isVisitedShrine(s))?' shrine-visited-card':'');
   const pilgrimBtn = _mode==='shrine' ? `<button type="button" class="li-pilgrim-register" data-shrine-idx="${i}">순례등록</button>` : '';
   d.innerHTML=`<div class="li-dot" style="background:${dotColor}"></div>
    <div class="li-info"><div class="li-name">${s.name}${_shrineNewBadgeHtml(s)}</div><div class="li-sub">${s.addr.substring(0,28)}${s.addr.length>28?'…':''}</div>${_shrineVisitBadgeHtml(s,'list')}</div>
    <div class="li-side"><span class="li-badge" style="background:${c}18!important;color:${c}!important">${_mode==='shrine'?s.type:(_mode==='retreat'?'피정의 집':'성당')}</span>${pilgrimBtn}</div>`;
   d.onclick=(ev)=>{ if(ev&&ev.target&&ev.target.closest&&ev.target.closest('.li-pilgrim-register')) return; selectItem(i); };
   body.appendChild(d);
  });
  });
}

function onListSearch(v){
  _listSrch=v.trim();
  $('list-srch-x').style.display=v?'block':'none';
  renderList();
  setTimeout(()=>_scrollSheetTop('list'),0);
}
function clearListSearch(){
  _listSrch='';
  $('list-srch-inp').value='';
  $('list-srch-x').style.display='none';
  renderList();
  setTimeout(()=>_scrollSheetTop('list'),0);
}
function setDioFilter(v,btn){
  if(_mode==='parish'){
    const code = v==='all' ? null : (_PARISH_DIO_CODE_MAP[v]||null);
    if(v==='all' && !_areAllParishDiocesesReady()){
      _filterDio=v;
      $$('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn?.classList.add('active');
      _showParishDataLoadingMessage('전체 성당 정보를 불러오는 중입니다...');
      _ensureAllParishDiocesesLoaded().then(function(){ setDioFilter(v,btn); }).catch(function(err){ console.warn('[가톨릭길동무] 전체 성당 데이터 로드 실패', err); });
      return;
    }
    if(code && !_isParishDioceseReady(code)){
      _filterDio=v;
      $$('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn?.classList.add('active');
      _showParishDataLoadingMessage((_DIO[code]||v)+' 성당 정보를 불러오는 중입니다...');
      _ensureParishDioceseDataLoaded(code).then(function(){ setDioFilter(v,btn); }).catch(function(err){ console.warn('[가톨릭길동무] 성당 교구 데이터 로드 실패', err); });
      return;
    }
  }
  _filterDio=v;
  $$('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn?.classList.add('active');
  _listSrch='';
  const inp=$('list-srch-inp');
  if(inp){inp.value='';$('list-srch-x').style.display='none';}
  renderList();
  setTimeout(()=>_scrollSheetTop('list'),0);
  if(v!=='all'&&DIOCESE_CENTER[v]&&_map){
  if(_mode==='parish'){
    const code=_PARISH_DIO_CODE_MAP[v]||null;
    if(code){
      try{
        if(_activeDio && _activeDio!==code) _hideParishDioMkrs(_activeDio);
        _activeDio=code;
        _showParishDioMkrs(code);
        _syncParishDioLabels();
        if(_fitParishDioBounds(code,{reason:'list-filter'})) return;
      }catch(e){ console.warn('[가톨릭길동무]',e); }
    }
  }
  const dc=DIOCESE_CENTER[v];
  _map.setLevel(dc.mob||10);
  if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(dc.lat,dc.lng));
  else _map.setCenter(new _LL(dc.lat,dc.lng));
  } else if(v==='all'&&_map){
  _map.setLevel(8);
  if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(36.2,127.9));
  else _map.setCenter(new _LL(36.2,127.9));
  }
}

function _regionHtmlEsc(v){
  return String(v == null ? '' : v).replace(/[&<>"]/g, function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];
  });
}
function _regionAttrEsc(v){
  return _regionHtmlEsc(v).replace(/'/g, '&#39;');
}

function _regionModeLabel(){
  return _mode==='parish' ? '성당' : (_mode==='retreat' ? '피정의 집' : '성지');
}
function _regionGuideHtml(){
  return '<div class="empty-msg region-guide-empty">📍 여행지나 숙소 지역을 검색하면<br>근처 ' + _regionModeLabel() + ' 목록이 나타납니다</div>';
}

function _clearRegionMarker(){
  try{ if(_regionMarker){ _regionMarker.setMap(null); _regionMarker=null; } }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _clearRegionResultMarkers(){
  try{ (_regionResultMarkers||[]).forEach(function(mk){ try{ mk.setMap(null); }catch(e){} }); }catch(e){ console.warn('[가톨릭길동무]', e); }
  _regionResultMarkers=[];
}
function _isRegionSearchActiveForItem(item){
  return !!(_regionLat && _regionLng && Array.isArray(_regionCache) && _regionCache.indexOf(item)>=0);
}
function _rememberRegionStart(lat,lng,name){
  if(!lat || !lng) return;
  const placeName = name || _regionPlaceName || _regionName || '검색지';
  _regionLat=Number(lat); _regionLng=Number(lng);
  _regionName=placeName; _regionPlaceName=placeName;
  _routeRegionStart={lat:_regionLat,lng:_regionLng,name:'📍 '+placeName,placeName:placeName};
}
function _showRegionPlaceMarker(lat,lng,name){
  if(!_map || !lat || !lng || typeof _LL==='undefined' || typeof _MM==='undefined') return;
  try{
    _clearRegionMarker();
    _regionMarker=new _MM({
      position:new _LL(lat,lng),
      image:_mkrImg('#7E22CE',true),
      title:name||'검색 위치',
      zIndex:360
    });
    kakao.maps.event.addListener(_regionMarker,'click',function(){
      try{
        if(_routeMode && _rS && _rS.isRegionStart) _openRoutePointCancelChoice('start');
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    });
    _regionMarker.setMap(_map);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _focusRegionSearchCenter(lat,lng){
  if(!_map || !lat || !lng || typeof _LL==='undefined') return;
  try{
    if(typeof _map.setLevel==='function') _map.setLevel(6);
    if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(lat,lng));
    else _map.setCenter(new _LL(lat,lng));
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _showRegionResultsOnMap(items, lat, lng, name){
  if(!_map) return;
  items=Array.isArray(items)?items:[];
  _rememberRegionStart(lat,lng,name);
  _showRegionPlaceMarker(lat,lng,name);
  _clearRegionResultMarkers();
  try{
    if(_mode==='shrine'){
      _markers.forEach(function(m){ if(m&&m.marker) m.marker.setMap(null); });
      items.forEach(function(s){ const i=SHRINES.indexOf(s); if(i>=0&&_markers[i]) _markers[i].marker.setMap(_map); });
    }else if(_mode==='retreat'){
      (_retreatMarkers||[]).forEach(function(o){ if(o&&o.marker) o.marker.setMap(null); });
      items.forEach(function(s){ const found=(_retreatMarkers||[]).find(function(o){ return o&&o.item===s; }); if(found&&found.marker) found.marker.setMap(_map); });
    }else if(_mode==='parish'){
      try{ _clearParishNearbyMarkers(); }catch(e){}
      try{ if(_activeDio){ _hideParishDioMkrs(_activeDio); _activeDio=null; } _hideDioOverlays(); }catch(e){}
      items.forEach(function(p){
        if(!p||!p.lat||!p.lng) return;
        const idx=PARISHES.indexOf(p);
        const mk=new _MM({position:new _LL(p.lat,p.lng),image:_mkrImg(OAI_CATHEDRAL_CATEGORY_COLOR,false),title:p.name,zIndex:55});
        kakao.maps.event.addListener(mk,'click',function(){ if(_routeMode) _selectRouteItem(idx); else selectItem(idx,{fromRegion:true}); });
        mk.setMap(_map);
        _regionResultMarkers.push(mk);
      });
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  _focusRegionSearchCenter(lat,lng);
}
function _openRegionMapFromCard(){
  if(!_regionLat || !_regionLng) return;
  closeAllTabs();
  _showRegionResultsOnMap(_regionCache,_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
}

const DIOCESE_CENTER={
  '서울대교구':{lat:37.53,lng:126.97,mob:10},'인천교구':{lat:37.60,lng:126.55,mob:10},
  '수원교구':{lat:37.20,lng:127.05,mob:10},'의정부교구':{lat:37.85,lng:127.05,mob:10},
  '춘천교구':{lat:37.90,lng:128.00,mob:10},'원주교구':{lat:37.20,lng:128.00,mob:10},
  '대전교구':{lat:36.45,lng:126.80,mob:10},'청주교구':{lat:36.70,lng:127.80,mob:10},
  '대구대교구':{lat:35.90,lng:128.50,mob:10},'안동교구':{lat:36.60,lng:128.50,mob:10},
  '부산교구':{lat:35.50,lng:129.00,mob:10},'마산교구':{lat:35.25,lng:128.30,mob:10},
  '광주대교구':{lat:35.10,lng:126.90,mob:10},'전주교구':{lat:35.75,lng:127.00,mob:10},
  '제주교구':{lat:33.40,lng:126.50,mob:10},
  '군종교구':{lat:37.53,lng:126.97,mob:10},
};

function onRegionInp(v){
  const body=$('region-body');
  if(!v.trim()){
    body.innerHTML=_regionGuideHtml();
  }
}
function doRegionSearch(){
  const inp=$('region-inp');
  const q=(inp.value||'').trim();
  if(!q) return;
  inp.blur();
  const body=$('region-body');
  body.innerHTML='<div class="empty-msg">🔍 장소 검색 중...</div>';
  _kakaoKeywordDocs(q, KAKAO_PLACE_SEARCH_DISPLAY_LIMIT)
  .then(docs=>{
    if(!docs.length){ _showRegionFallback(q); return; }
    let html='<div style="padding:8px 14px 4px;font-size:11px;font-weight:700;color:#888;background:#f8f9fc;border-bottom:1px solid #eee;">📍 지역을 선택하세요</div>';
    docs.forEach(d=>{
      const nm=d.place_name||'', ad=d.road_address_name||d.address_name||'';
      const cat=d.category_name||'', url=d.place_url||'';
      html+=`<div class="region-place-cand nearby-item" data-lat="${parseFloat(d.y)}" data-lng="${parseFloat(d.x)}" data-name="${_regionAttrEsc(nm)}" data-addr="${_regionAttrEsc(ad)}" data-cat="${_regionAttrEsc(cat)}" data-url="${_regionAttrEsc(url)}"><div class="sm-place-icon" aria-hidden="true">📍</div><div class="nearby-info"><div class="nearby-name">${_regionHtmlEsc(nm)}</div>${ad?`<div class="nearby-addr">${_regionHtmlEsc(ad)}</div>`:''}</div></div>`;
    });
    body.innerHTML=html;
    body.onclick=function(e){
      const cand=e.target.closest('.region-place-cand');
      if(!cand) return;
      body.onclick=null;
      const clat=parseFloat(cand.dataset.lat),clng=parseFloat(cand.dataset.lng),cname=cand.dataset.name;
      const caddr=cand.dataset.addr||'', ccat=cand.dataset.cat||'', curl=cand.dataset.url||'';
      _rememberRegionStart(clat,clng,cname);
      body.innerHTML='<div class="empty-msg">🚗 자동차 거리 계산 중...</div>';
      _showRegionResults(cname,clat,clng,{place_name:cname,road_address_name:caddr,address_name:caddr,category_name:ccat,place_url:curl});
      if(_map){
        if(typeof _setMapCenterByInfoCardStandard==='function') _setMapCenterByInfoCardStandard(new _LL(clat,clng));
        else _map.setCenter(new _LL(clat,clng));
      }
    };
  }).catch(()=>_showRegionFallback(q));
}

function _showRegionResults(q,lat,lng,doc){
  const items=_getCurrentItems();
  const POOL=items.filter(s=>s.lat&&s.lng);
  const prelim=POOL.map(s=>({s,d:calcDist(lat,lng,s.lat,s.lng)})).sort((a,b)=>a.d-b.d).slice(0,30);
  if(!prelim.length){
    _regionCache=[];
    _showRegionResultsOnMap([],lat,lng,doc.place_name||q);
    $('region-body').innerHTML='<div class="empty-msg">표시할 '+_regionModeLabel()+' 목록이 없습니다</div>';
    return;
  }
  const placeName=doc.place_name||q;
  const placeAddr=doc.road_address_name||doc.address_name||'';
  const placeCat=doc.category_name?doc.category_name.split(' > ').pop():'';
  const placeUrl=doc.place_url||'';
  const isParish=_mode==='parish',isRetreat=_mode==='retreat';
  const safePlaceName=_regionHtmlEsc(placeName);
  const safePlaceAddr=_regionHtmlEsc(placeAddr);
  const safePlaceCat=_regionHtmlEsc(placeCat);
  const safePlaceUrl=_regionAttrEsc(placeUrl);
  const infoCard=`<div class="region-info-card"><div class="ric-hd"><div class="ric-icon">📍</div><div class="ric-name-wrap"><div class="ric-name">${safePlaceName}</div>${placeAddr?`<div class="ric-addr">${safePlaceAddr}</div>`:''}${placeCat?`<div class="ric-cat">${safePlaceCat}</div>`:''}</div><button type="button" class="ric-map-link" onclick="_openRegionMapFromCard()">지도 보기</button></div></div>`;
  const listHd=`<div class="region-list-hd">${isParish?'⛪ 근처 성당':(isRetreat?'🏔 근처 피정의 집':'✝ 근처 성지')} <span style="font-size:13px;font-weight:500;color:#aaa">· 자동차 거리순 10곳</span></div>`;
  $('region-body').innerHTML=infoCard+listHd+'<div id="rg-loading" style="text-align:center;padding:10px;font-size:12px;color:#888;">🚗 정확한 거리 계산 중입니다…</div><div id="rg-list" style="background:#fff"></div>';
  const results=new Array(prelim.length).fill(null);let done=0;
  prelim.forEach((x,i)=>{
    _navFetch(`${lng},${lat}`,`${x.s.lng},${x.s.lat}`)
    .then(val=>{results[i]=val||{km:x.d*1.35,dur:null};})
    .catch(()=>{results[i]={km:x.d*1.35,dur:null};})
    .finally(()=>{ done++;
      if(done===prelim.length){
        const sorted=prelim.map((x,i)=>({x,r:results[i]||{km:x.d*1.35,dur:null}})).sort((a,b)=>a.r.km-b.r.km).slice(0,10);
        _regionCache=sorted.map(o=>o.x.s);
        _showRegionResultsOnMap(_regionCache,lat,lng,placeName);
        const rgl=$('rg-list');
        const loadEl=$('rg-loading');
        if(loadEl) loadEl.style.display='none';
        if(rgl) rgl.innerHTML=sorted.map((o,i)=>{
          const idx=items.indexOf(o.x.s);const c=_getModeMarkerColor(o.x.s);const lbl=_getModeTypeLabel(o.x.s);
          const km=o.r.km.toFixed(1);const dur=o.r.dur?`<span style="font-size:10px;color:#aaa;font-weight:400;margin-left:3px">${_fmtTime(o.r.dur)}</span>`:'';
          return `<div class="region-item${(_mode==='shrine'&&_isVisitedShrine(o.x.s))?' shrine-visited-card':''}" onclick="selectItem(${idx},{fromRegion:true})"><div class="nearby-num" style="background:${c}!important;width:28px;height:28px;font-size:12px">${i+1}</div><div class="nearby-info"><div class="nearby-name">${o.x.s.name}${_shrineNewBadgeHtml(o.x.s)}</div><div class="nearby-addr">${o.x.s.addr.substring(0,26)}${o.x.s.addr.length>26?'…':''}</div>${_shrineVisitBadgeHtml(o.x.s,'region')}</div><div class="nearby-meta"><div class="nearby-type" style="background:${c}18!important;color:${c}!important">${lbl}</div><div class="nearby-dist" style="color:${c}!important">🚗${km}km${dur}</div></div></div>`;
        }).join('');
      }
    });
  });
}

function _showRegionFallback(q){
  _regionPlaceName=q;
  const items=_getCurrentItems();
  var _matched_all=items.filter(function(s){return s.addr.includes(q)||s.name.includes(q)||(s.diocese&&s.diocese.includes(q))||(s.kw&&String(s.kw).includes(q))||_itemSearchNorm(s).includes(String(q).replace(/\s+/g,''));});
  _matched_all.sort(function(a,b){
    var an=a.name,bn=b.name;
    var ae=an===q,be=bn===q;
    if(ae&&!be) return -1; if(!ae&&be) return 1;
    var as=an.startsWith(q),bs=bn.startsWith(q);
    if(as&&!bs) return -1; if(!as&&bs) return 1;
    return 0;
  });
  const matched=_matched_all.slice(0,10);
  if(!matched.length){
  $('region-body').innerHTML='<div class="empty-msg">검색 결과가 없습니다</div>';
  return;
  }
  _regionCache=matched;
  _clearRegionMarker();
  _clearRegionResultMarkers();
  if(_mode==='shrine'&&_map) _showItemsOnMap(_regionCache);
  const items2=_getCurrentItems();
  const list=matched.map((s,i)=>{
  const idx=items2.indexOf(s);
  const c=_getModeMarkerColor(s);
  return `<div class="region-item${(_mode==='shrine'&&_isVisitedShrine(s))?' shrine-visited-card':''}" onclick="selectItem(${idx},{fromRegion:true})">
   <div class="nearby-num" style="background:${c}!important;width:26px;height:26px;font-size:12px">${i+1}</div>
   <div class="nearby-info"><div class="nearby-name">${s.name}${_shrineNewBadgeHtml(s)}</div><div class="nearby-addr">${s.addr.substring(0,26)}…</div>${_shrineVisitBadgeHtml(s,'region')}</div>
   <div class="nearby-meta"><div class="nearby-type" style="background:${c}18!important;color:${c}!important">${_mode==='shrine'?s.type:(_mode==='retreat'?'피정의 집':'성당')}</div></div>
  </div>`;
  }).join('');
  $('region-body').innerHTML=
  `<div style="padding:10px 16px 8px;font-size:12px;font-weight:700;color:#1565c0;background:#fff;border-bottom:1px solid #eee">검색결과 ${matched.length}곳</div>${list}`;
}

function _showRouteGuideText(msg){
  const g=$('route-guide');
  if(!g) return;
  msg=String(msg||'');
  if(/^도착\s+.+를\s+탭하세요$/.test(msg)){
    g.classList.remove('on');
    g.textContent='';
    return;
  }
  if(_polyline || (_rS && _rE)){
    g.classList.remove('on');
    g.textContent='';
    return;
  }
  g.textContent=msg||'';
  g.classList.add('on');
}

function _hideRouteGuide(){
  const g=$('route-guide');
  if(!g) return;
  g.classList.remove('on');
  g.textContent='';
}

function _setImplicitCurrentLocationStartLabelVisible(visible){
  try{
    if(_rS && (_rS.name === '현재 위치' || _rS.name === '현위치')){
      _setRouteLabel('start', visible ? '현위치' : '');
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _ensureCurrentLocationStart(){
  if(_rS&&_rS.lat&&_rS.lng) return;
  if(_routeRegionStart&&_routeRegionStart.lat&&_routeRegionStart.lng){
    _routeStartMarkerExplicitCurrent=false;
    _rS={idx:-1,name:_routeRegionStart.name||'📍 검색지',lat:_routeRegionStart.lat,lng:_routeRegionStart.lng,isRegionStart:true};
    _setRouteLabel('start',_rS.name);
    _refreshRouteTmpMarkers();
    _updateSearchBtn();
    return;
  }
  if(_myLat&&_myLng){
    _routeStartMarkerExplicitCurrent=false;
    _rS={idx:-1,name:'현재 위치',lat:_myLat,lng:_myLng,isImplicitCurrentLocation:true};
    _setRouteLabel('start','');
    _refreshRouteTmpMarkers();
    _updateSearchBtn();
    return;
  }
  if(!_GEO) return;
  _GEO.getCurrentPosition(p=>{
    _setMyLoc(p.coords.latitude,p.coords.longitude);
    if(!_rS){
      _routeStartMarkerExplicitCurrent=false;
      _rS={idx:-1,name:'현재 위치',lat:p.coords.latitude,lng:p.coords.longitude,isImplicitCurrentLocation:true};
      _setRouteLabel('start','');
      _refreshRouteTmpMarkers();
      _updateSearchBtn();
      if(!_rE){
        _showRouteGuideText(`도착 ${_getRouteGuideTarget()}를 탭하세요`);
      }
    }
  },()=>{},_GO1);
}

function _enterRouteMode(){
  _routeMode=true;
  const rs=$('sheet-route');
  if(rs){ rs.style.display=''; rs.classList.add('open'); }
  _syncRouteWaypointBox();
  _ensureCurrentLocationStart();
  if(_suppressNextRouteGuide){
    _suppressNextRouteGuide=false;
    _hideRouteGuide();
    return;
  }
  if(_rS&&_rE){
    _hideRouteGuide();
    return;
  }
  _showRouteGuideText(_rS?`도착 ${_getRouteGuideTarget()}를 탭하세요`:`출발지를 탭하거나 지도에서 ${_getRouteGuideTarget()}를 선택하세요`);
}

function _exitRouteMode(){
  _routeMode=false;
  _hideRouteGuide();
}

function setMyLocAsStart(){
  _routeRegionStart=null;
  function applyCurrentStart(lat,lng){
    _setMyLoc(lat,lng);
    _clearRouteTmpMarkers();
    if(_mode==='shrine'&&_rS&&_rS.idx>=0&&_markers[_rS.idx]) _markers[_rS.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rS.idx].shrine),false));
    _routeStartMarkerExplicitCurrent=true;
    _rS={idx:-1,name:'현재 위치',lat:lat,lng:lng,isImplicitCurrentLocation:false,showStartMarker:true};
    _setRouteLabel('start','현위치');
    _refreshRouteTmpMarkers();
    if(_rE) _updateSearchBtn();
    else {
      _showRouteGuideText(`도착 ${_getRouteGuideTarget()}를 탭하세요`);
    }
  }
  if(_myLat&&_myLng){
    applyCurrentStart(_myLat,_myLng);
    return;
  }
  if(!_GEO) return alert('위치 정보를 지원하지 않습니다.');
  _GEO.getCurrentPosition(p=>{
    applyCurrentStart(p.coords.latitude,p.coords.longitude);
  },()=>alert('위치를 가져올 수 없습니다.'),_GO1);
}

function _setRouteWaypointEnabled(enabled){
  _routeWaypointEnabled=!!enabled;
  _syncRouteWaypointBoxes();
}
function _setRouteWaypoint2Enabled(enabled){
  _routeWaypoint2Enabled=!!enabled;
  _syncRouteWaypointBoxes();
}
function _setRouteWaypoint3Enabled(enabled){
  _routeWaypoint3Enabled=!!enabled;
  _syncRouteWaypointBoxes();
}
function _syncRouteWaypointBoxes(){
  const stack=$('rs-top') ? $('rs-top').querySelector('.rs-route-stack') : document.querySelector('.rs-route-stack');
  const sheet=$('sheet-route');
  const routeWaypoints=(typeof _getRouteWaypoints==='function') ? _getRouteWaypoints() : [];
  const resultShowing=!!(_polyline || ($('rs-result') && $('rs-result').style.display !== 'none'));
  const w1Has=!!(_rW&&_rW.lat&&_rW.lng);
  const w2Has=!!(_rW2&&_rW2.lat&&_rW2.lng);
  const w3Has=!!(_rW3&&_rW3.lat&&_rW3.lng);
  const w1Visible= resultShowing ? w1Has : !!(_routeWaypointEnabled || w1Has);
  const w2Visible= resultShowing ? w2Has : !!(_routeWaypoint2Enabled || w2Has);
  const w3Visible= resultShowing ? w3Has : !!(_routeWaypoint3Enabled || w3Has);
  const summaryVisible=!!(resultShowing && routeWaypoints.length);
  const shouldScrollForMultiWaypoint=!!(!resultShowing && (w2Visible || w3Visible || routeWaypoints.length >= 2));
  const summaryBox=$('rs-waypoints-summary-box');
  const summaryLbl=$('rs-waypoints-summary-lbl');
  const box1=$('rs-waypoint-box');
  const box2=$('rs-waypoint2-box');
  const box3=$('rs-waypoint3-box');
  const add1=$('rs-add-waypoint-btn');
  const add2=$('rs-add-waypoint2-btn');
  const add3=$('rs-add-waypoint3-btn');
  const tools0=$('rs-start-waypoint-tools');
  const tools1=$('rs-waypoint-end-tools');
  const tools2=$('rs-waypoint2-end-tools');
  const tools3=$('rs-waypoint3-end-tools');
  const swap0=$('rs-swap-btn');
  const swap1=$('rs-swap-waypoint-end-btn');
  const swap2=$('rs-swap-waypoint2-end-btn');
  const swap3=$('rs-swap-waypoint3-end-btn');
  const wx1=$('rs-waypoint-x');
  const wx2=$('rs-waypoint2-x');
  const wx3=$('rs-waypoint3-x');
  if(stack){
    stack.classList.toggle('has-waypoint', !summaryVisible && w1Visible);
    stack.classList.toggle('has-waypoint2', !summaryVisible && w2Visible);
    stack.classList.toggle('has-waypoint3', !summaryVisible && w3Visible);
    stack.classList.toggle('has-waypoint-summary', summaryVisible);
    stack.classList.toggle('route-result-showing', resultShowing);
  }
  if(sheet){
    sheet.classList.toggle('route-waypoint-scroll', shouldScrollForMultiWaypoint);
    sheet.classList.toggle('route-result-showing', resultShowing);
  }
  if(summaryBox){
    summaryBox.style.display=summaryVisible?'flex':'none';
    if(summaryVisible){
      const summaryText='경유지 '+routeWaypoints.length+'곳 · '+routeWaypoints.map(function(p,idx){
        return (idx+1)+'. '+((p&&p.name)||('경유지'+(idx+1)));
      }).join(' → ');
      if(summaryLbl) summaryLbl.textContent=summaryText;
      summaryBox.setAttribute('title', summaryText);
    }else{
      if(summaryLbl) summaryLbl.textContent='경유지 없음';
      summaryBox.removeAttribute('title');
    }
  }
  if(box1) box1.style.display=(!summaryVisible && w1Visible)?'flex':'none';
  if(box2) box2.style.display=(!summaryVisible && w2Visible)?'flex':'none';
  if(box3) box3.style.display=(!summaryVisible && w3Visible)?'flex':'none';
  const showResultAddWaypoint=!!(resultShowing && routeWaypoints.length===0);
  if(add1) add1.style.display=((!resultShowing && !w1Visible) || showResultAddWaypoint)?'inline-flex':'none';
  if(add2) add2.style.display=(!resultShowing && w1Visible && !w2Visible)?'inline-flex':'none';
  if(add3) add3.style.display=(!resultShowing && w2Visible && !w3Visible)?'inline-flex':'none';
  if(tools0) tools0.style.display=(resultShowing ? (showResultAddWaypoint?'block':'none') : 'block');
  if(tools1) tools1.style.display=(!resultShowing && w1Visible)?'flex':'none';
  if(tools2) tools2.style.display=(!resultShowing && w2Visible)?'flex':'none';
  if(tools3) tools3.style.display=(!resultShowing && w3Visible)?'flex':'none';
  if(swap0) swap0.style.display=(!resultShowing || showResultAddWaypoint)?'flex':'none';
  if(swap1) swap1.style.display=(!resultShowing && w1Visible)?'flex':'none';
  if(swap2) swap2.style.display=(!resultShowing && w2Visible)?'flex':'none';
  if(swap3) swap3.style.display=(!resultShowing && w3Visible)?'flex':'none';
  if(wx1) wx1.style.display=(!resultShowing && w1Visible)?'inline-flex':'none';
  if(wx2) wx2.style.display=(!resultShowing && w2Visible)?'inline-flex':'none';
  if(wx3) wx3.style.display=(!resultShowing && w3Visible)?'inline-flex':'none';
}
function _ensureRouteWaypointBox(role){
  role = role || _nextAvailableWaypointRole() || 'waypoint';
  _setRouteWaypointEnabledByRole(role,true);
  _setRouteLabel(role, _getRoutePointByRole(role) ? (_getRoutePointByRole(role).name||('경유지'+_routeWaypointIndex(role))) : '');
  _refreshRouteTmpMarkers();
  if(!_getRoutePointByRole(role)) _showRouteGuideText('지도에서 경유지'+_routeWaypointIndex(role)+' 마커를 선택하거나 경유지 박스를 눌러 검색하세요');
}
function _beginWaypointAddMode(role){
  role = role || _nextAvailableWaypointRole();
  if(!role){ _showRouteGuideText('경유지는 현재 3곳까지 추가할 수 있습니다.'); return; }
  _ensureRouteWaypointBox(role);
  if(_polyline) _clearRouteResultOnly();
  else _restoreRouteSelectionMarkersAfterReset();
  _refreshRouteTmpMarkers();
  _showRouteGuideText('지도에서 경유지'+_routeWaypointIndex(role)+'를 선택하거나 경유지 박스를 눌러 검색하세요');
}
function _syncRouteWaypointBox(){
  _routeWaypointEnabled=!!(_routeWaypointEnabled || (_rW&&_rW.lat&&_rW.lng));
  _routeWaypoint2Enabled=!!(_routeWaypoint2Enabled || (_rW2&&_rW2.lat&&_rW2.lng));
  _routeWaypoint3Enabled=!!(_routeWaypoint3Enabled || (_rW3&&_rW3.lat&&_rW3.lng));
  _syncRouteWaypointBoxes();
}
function _setRouteLabel(role,name){
  const el=$(`rs-${role}-lbl`);
  if(!el) return;
  const rawName = name || '';
  const emptyText = role==='start' ? '출발지를 선택하세요' : (_isRouteWaypointRole(role) ? ('경유지'+_routeWaypointIndex(role)+'을 선택하세요') : '도착지를 선택하세요');
  el.textContent = rawName || emptyText;
  el.className='rs-lbl'+(rawName?' filled':' empty');
  if(role==='start' && $('rs-start-x')) $('rs-start-x').style.display=name?'inline-flex':'none';
  if(role==='end' && $('rs-end-x')) $('rs-end-x').style.display=name?'inline-flex':'none';
  if(role==='waypoint' && $('rs-waypoint-x')) $('rs-waypoint-x').style.display=(_routeWaypointEnabled || rawName)?'inline-flex':'none';
  if(role==='waypoint2' && $('rs-waypoint2-x')) $('rs-waypoint2-x').style.display=(_routeWaypoint2Enabled || rawName)?'inline-flex':'none';
  if(role==='waypoint3' && $('rs-waypoint3-x')) $('rs-waypoint3-x').style.display=(_routeWaypoint3Enabled || rawName)?'inline-flex':'none';
  if(_isRouteWaypointRole(role)) _setRouteWaypointEnabledByRole(role, !!(_getRouteWaypointEnabledByRole(role) || rawName));
  _updateSearchBtn();
}

function _updateSearchBtn(){
  const btn=$('rs-search-btn');
  if(!btn) return;
  const filled=!!(_rS&&_rS.lat&&_rS.lng&&_rE&&_rE.lat&&_rE.lng);
  btn.style.display=filled?'flex':'none';
}

function _dropEmptyWaypointInputsForRouteResult(){
  if(!(_rW&&_rW.lat&&_rW.lng)) _routeWaypointEnabled=false;
  if(!(_rW2&&_rW2.lat&&_rW2.lng)) _routeWaypoint2Enabled=false;
  if(!(_rW3&&_rW3.lat&&_rW3.lng)) _routeWaypoint3Enabled=false;
  _syncRouteWaypointBoxes();
}

function doSearchRoute(){ document.activeElement&&document.activeElement.blur();
  if(_rS && (_rS.name === '현재 위치' || _rS.name === '현위치')) _setImplicitCurrentLocationStartLabelVisible(true);
  if(_rS&&_rE) setTimeout(function(){ try{ _calcRoute(); }catch(e){ console.warn('[가톨릭길동무]', e); } }, OAI_ROUTE_VISUAL_DELAY_MS);
}

function _routePointName(point){
  return point && point.name ? point.name : '';
}
function _syncRoutePointLabels(){
  _setRouteLabel('start', _routePointName(_rS));
  _setRouteLabel('waypoint', _routePointName(_rW));
  _setRouteLabel('waypoint2', _routePointName(_rW2));
  _setRouteLabel('waypoint3', _routePointName(_rW3));
  _setRouteLabel('end', _routePointName(_rE));
  _syncRouteWaypointBox();
}
function _repaintRoutePointMarkers(){
  try{
    _clearRouteResultOnly();
    _clearRouteTmpMarkers();
    _restoreRouteSelectionMarkersAfterReset();
    if(_mode==='shrine'){
      if(_rS && _shouldShowRouteStartMarker() && _rS.idx>=0 && _markers[_rS.idx]){
        _markers[_rS.idx].marker.setImage(_mkrImgRoute('#ff0000','출'));
        _setRouteMarkerZ(_rS.idx,'start');
      }
      if(_rW && _rW.idx>=0 && _markers[_rW.idx]){
        _markers[_rW.idx].marker.setImage(_mkrImgRoute(_routeWaypointColor('waypoint'),_routeWaypointMarkerText('waypoint')));
        _setRouteMarkerZ(_rW.idx,'waypoint');
      }
      if(_rW2 && _rW2.idx>=0 && _markers[_rW2.idx]){
        _markers[_rW2.idx].marker.setImage(_mkrImgRoute(_routeWaypointColor('waypoint2'),_routeWaypointMarkerText('waypoint2')));
        _setRouteMarkerZ(_rW2.idx,'waypoint2');
      }
      if(_rW3 && _rW3.idx>=0 && _markers[_rW3.idx]){
        _markers[_rW3.idx].marker.setImage(_mkrImgRoute(_routeWaypointColor('waypoint3'),_routeWaypointMarkerText('waypoint3')));
        _setRouteMarkerZ(_rW3.idx,'waypoint3');
      }
      if(_rE && _rE.idx>=0 && _markers[_rE.idx]){
        _markers[_rE.idx].marker.setImage(_mkrImgRoute(_typeColor(_markers[_rE.idx].shrine.type),'도'));
        _setRouteMarkerZ(_rE.idx,'end');
      }
    }
    _refreshRouteTmpMarkers();
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function _routePointReady(point){
  return !!(point && point.lat && point.lng);
}
function _pendingRouteWaypointRole(){
  if(_routeWaypointEnabled && !(_rW && _rW.lat && _rW.lng)) return 'waypoint';
  if(_routeWaypoint2Enabled && !(_rW2 && _rW2.lat && _rW2.lng)) return 'waypoint2';
  if(_routeWaypoint3Enabled && !(_rW3 && _rW3.lat && _rW3.lng)) return 'waypoint3';
  return null;
}
function _swapRouteObjects(a,b){
  const map = {start:'_rS', waypoint:'_rW', waypoint2:'_rW2', waypoint3:'_rW3', end:'_rE'};
  if(!map[a] || !map[b]) return;
  const av = _getRoutePointByRole(a);
  const bv = _getRoutePointByRole(b);
  if((_isRouteWaypointRole(a) || _isRouteWaypointRole(b)) && !(_routePointReady(av) && _routePointReady(bv))) return;
  if(_isRouteWaypointRole(a)) _setRouteWaypointEnabledByRole(a,true);
  if(_isRouteWaypointRole(b)) _setRouteWaypointEnabledByRole(b,true);
  _setRoutePointByRole(a,bv);
  _setRoutePointByRole(b,av);
  _routeStartMarkerExplicitCurrent=!!(_rS && _rS.showStartMarker === true);
  if(!(_rW && _rW.lat && _rW.lng) && !_routeWaypointEnabled) _setRouteWaypointEnabled(false);
  if(!(_rW2 && _rW2.lat && _rW2.lng) && !_routeWaypoint2Enabled) _setRouteWaypoint2Enabled(false);
  if(!(_rW3 && _rW3.lat && _rW3.lng) && !_routeWaypoint3Enabled) _setRouteWaypoint3Enabled(false);
  _syncRoutePointLabels();
  _repaintRoutePointMarkers();
  if(_rS&&_rE) _updateSearchBtn();
}
function swapRoute(){
  if(_routeWaypointEnabled || (_rW&&_rW.lat&&_rW.lng)) _swapRouteObjects('start','waypoint');
  else _swapRouteObjects('start','end');
}
function swapRouteWaypointEnd(){
  if(_routeWaypoint2Enabled || (_rW2&&_rW2.lat&&_rW2.lng)) _swapRouteObjects('waypoint','waypoint2');
  else if(_routeWaypointEnabled || (_rW&&_rW.lat&&_rW.lng)) _swapRouteObjects('waypoint','end');
}
function swapRouteWaypoint2End(){
  if(_routeWaypoint3Enabled || (_rW3&&_rW3.lat&&_rW3.lng)) _swapRouteObjects('waypoint2','waypoint3');
  else if(_routeWaypoint2Enabled || (_rW2&&_rW2.lat&&_rW2.lng)) _swapRouteObjects('waypoint2','end');
}
function swapRouteWaypoint3End(){
  if(!(_routeWaypoint3Enabled || (_rW3&&_rW3.lat&&_rW3.lng))) return;
  _swapRouteObjects('waypoint3','end');
}


function _isRouteResultShowing(){
  const result=$('rs-result');
  return !!(_polyline || (result && result.style.display !== 'none'));
}

function _returnRouteResultToInputWindow(){
  if(!_isRouteResultShowing()) return false;
  _clearRouteResultOnly();
  _syncRoutePointLabels();
  _updateSearchBtn();
  const sheet=$('sheet-route');
  if(sheet){ sheet.style.display=''; sheet.classList.add('open'); }
  _showRouteGuideText('수정할 출발지·경유지·도착지를 선택한 뒤 다시 경로검색을 누르세요');
  return true;
}

function _clearRouteResultOnly(){
  try{
    _hide($('rs-result'));
    const hint=$('rs-hint'); if(hint) hint.style.display='block';
    const sBtn=$('rs-search-btn'); if(sBtn) sBtn.style.display='none';
    const sheet=$('sheet-route'); if(sheet) sheet.classList.remove('route-result-showing');
    const stack=$('rs-top') ? $('rs-top').querySelector('.rs-route-stack') : document.querySelector('.rs-route-stack'); if(stack) stack.classList.remove('route-result-showing');
    if(_polyline){ _polyline.setMap(null); _polyline=null; }
    _showJukrimgulParkingMkr(false);
    _syncRouteWaypointBox();
    _restoreRouteSelectionMarkersAfterReset();
    _updateSearchBtn();
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
function clearRoute(role){
  if(role==='start'&&_rS){
    if(_mode==='shrine'&&_rS.idx>=0&&_markers[_rS.idx]) _markers[_rS.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rS.idx].shrine),false));
    _rS=null;
    _routeStartMarkerExplicitCurrent=false;
    _routeRegionStart=null;
    _setRouteLabel('start','');
    _clearRouteResultOnly();
    _refreshRouteTmpMarkers();
    if(_rE) _showRouteGuideText(`출발 ${_getRouteGuideTarget()}를 탭하세요`);
    else _showRouteGuideText(`출발지를 탭하거나 지도에서 ${_getRouteGuideTarget()}를 선택하세요`);
    return;
  }
  if(_isRouteWaypointRole(role) && (_getRoutePointByRole(role)||_getRouteWaypointEnabledByRole(role))){
    const oldPoint=_getRoutePointByRole(role);
    if(_mode==='shrine'&&oldPoint&&oldPoint.idx>=0&&_markers[oldPoint.idx]) _markers[oldPoint.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[oldPoint.idx].shrine),false));
    if(role==='waypoint'){
      _rW=_rW2;
      _rW2=_rW3;
      _rW3=null;
      _routeWaypointEnabled=!!(_rW&&_rW.lat&&_rW.lng);
      _routeWaypoint2Enabled=!!(_rW2&&_rW2.lat&&_rW2.lng);
      _routeWaypoint3Enabled=false;
      _setRouteLabel('waypoint', _routePointName(_rW));
      _setRouteLabel('waypoint2', _routePointName(_rW2));
      _setRouteLabel('waypoint3','');
    }else if(role==='waypoint2'){
      _rW2=_rW3;
      _rW3=null;
      _routeWaypoint2Enabled=!!(_rW2&&_rW2.lat&&_rW2.lng);
      _routeWaypoint3Enabled=false;
      _setRouteLabel('waypoint2', _routePointName(_rW2));
      _setRouteLabel('waypoint3','');
    }else{
      _rW3=null;
      _routeWaypoint3Enabled=false;
      _setRouteLabel('waypoint3','');
    }
    _clearRouteResultOnly();
    _refreshRouteTmpMarkers();
    _syncRouteWaypointBox();
    _repaintRoutePointMarkers();
    if(_rS&&_rE) _updateSearchBtn();
    return;
  }
  if(role==='end'&&_rE){
    if(_mode==='shrine'&&_rE.idx>=0&&_markers[_rE.idx]) _markers[_rE.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rE.idx].shrine),false));
    _rE=null;
    _setRouteLabel('end','');
    _clearRouteResultOnly();
    _refreshRouteTmpMarkers();
    if(_rS) _showRouteGuideText(`도착 ${_getRouteGuideTarget()}를 탭하세요`);
    else _showRouteGuideText(`출발지를 탭하거나 지도에서 ${_getRouteGuideTarget()}를 선택하세요`);
  }
}

function resetRoute(opts){
  opts = opts || {};
  const fromButton = !!opts.fromButton;
  const fresh = !!opts.fresh;
  if(fresh) _routeRegionStart=null;
  const destItem = (!fresh && _rE) ? {lat:_rE.lat, lng:_rE.lng, idx:_rE.idx} : null;
  const regionStart = (!fresh && _routeRegionStart && _routeRegionStart.lat) ? Object.assign({}, _routeRegionStart) : null;

  if(_mode==='shrine'){
    if(_rS&&_rS.idx>=0&&_markers[_rS.idx]) _markers[_rS.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rS.idx].shrine),false));
    if(_rW&&_rW.idx>=0&&_markers[_rW.idx]) _markers[_rW.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rW.idx].shrine),false));
    if(_rW2&&_rW2.idx>=0&&_markers[_rW2.idx]) _markers[_rW2.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rW2.idx].shrine),false));
    if(_rW3&&_rW3.idx>=0&&_markers[_rW3.idx]) _markers[_rW3.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rW3.idx].shrine),false));
    if(_rE&&_rE.idx>=0&&_markers[_rE.idx]) _markers[_rE.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rE.idx].shrine),false));
  }
  _rS=_rW=_rW2=_rW3=_rE=null;
  _routeWaypointEnabled=false;
  _routeWaypoint2Enabled=false;
  _routeWaypoint3Enabled=false;
  _routeStartMarkerExplicitCurrent=false;
  _setRouteLabel('start','');_setRouteLabel('waypoint','');_setRouteLabel('waypoint2','');_setRouteLabel('waypoint3','');_setRouteLabel('end','');
  _setRouteWaypointEnabled(false);
  _setRouteWaypoint2Enabled(false);
  _setRouteWaypoint3Enabled(false);
  _hide($('rs-result'));
  $('rs-hint').style.display='block';
  const sBtn=$('rs-search-btn');
  if(sBtn) sBtn.style.display='none';
  if(_polyline){_polyline.setMap(null);_polyline=null;}
  _clearRouteTmpMarkers();
  _showJukrimgulParkingMkr(false);
  _hideRouteGuide();
  _restoreRouteSelectionMarkersAfterReset();

  if(fromButton){
    if(_activeTab!=='route') openTab('route');
    const rs=$('sheet-route');
    if(rs){ rs.style.display=''; rs.classList.add('open'); }
    closeInfoCard({keepMap:true});
    if(regionStart){
      _routeRegionStart=Object.assign({}, regionStart);
      _regionLat=regionStart.lat;
      _regionLng=regionStart.lng;
      _regionPlaceName=regionStart.placeName || regionStart.name || _regionPlaceName;
      _regionName=regionStart.placeName || regionStart.name || _regionName;
      _showRegionPlaceMarker(_regionLat,_regionLng,_regionPlaceName||_regionName||'검색지');
    }
    _ensureCurrentLocationStart();
    try{
      if(_mode==='shrine') _clearShrineMarkerSel();
      else if(_paSelMkr){ try{ _paSelMkr.setMap(null); }catch(e){ console.warn("[가톨릭길동무]", e); } _paSelMkr=null; }
    }catch(e){ console.warn("[가톨릭길동무]", e); }
    return;
  }

  if(destItem && destItem.lat && _map){
    try{
      const _items=_getCurrentItems();
      const _idx=(typeof destItem.idx==='number' && destItem.idx>=0) ? destItem.idx : _items.findIndex(p=>Number(p.lat)===Number(destItem.lat) && Number(p.lng)===Number(destItem.lng));
      const _item=_idx>=0 ? _items[_idx] : null;
      if(_item){
        if(_mode==='shrine') _selectShrineMarker(_idx);
        else if(_mode==='parish') _selectParishMarker(_item);
        else _selectRetreatMarker(_item);
        _showInfoCard(_item, _idx);
        _focusMarkerAboveInfoCard(_item);
      }
    }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
}

function _routePointMatchesItem(point, idx, item){
  if(!point) return false;
  if(typeof point.idx==='number' && point.idx>=0 && point.idx===idx) return true;
  if(item && point.lat && point.lng){
    return Number(point.lat)===Number(item.lat) && Number(point.lng)===Number(item.lng);
  }
  return false;
}
function _selectRouteItem(idx){
  const items=_getCurrentItems();
  const s=items[idx];
  if(!s||!s.lat||!s.lng) return;
  if(_routePointMatchesItem(_rS,idx,s)){
    _openRoutePointCancelChoice('start');
    return;
  }
  if(_routePointMatchesItem(_rW,idx,s)){
    _openRoutePointCancelChoice('waypoint');
    return;
  }
  if(_routePointMatchesItem(_rW2,idx,s)){
    _openRoutePointCancelChoice('waypoint2');
    return;
  }
  if(_routePointMatchesItem(_rW3,idx,s)){
    _openRoutePointCancelChoice('waypoint3');
    return;
  }
  if(_routePointMatchesItem(_rE,idx,s)){
    _openRoutePointCancelChoice('end');
    return;
  }
  const hasStart=_routeHasVisibleStart();
  const hasEnd=!!(_rE&&_rE.lat&&_rE.lng);
  if(!hasStart){
    _setRoutePointFromItem('start',s,idx);
    if(!_activeTab||_activeTab!=='route') openTab('route');
    if(hasEnd) _updateSearchBtn();
    return;
  }
  const pendingWaypointRole = _pendingRouteWaypointRole();
  if(pendingWaypointRole){
    _setRoutePointFromItem(pendingWaypointRole,s,idx);
  }else if(!hasEnd){
    _setRoutePointFromItem('end',s,idx);
  }else{
    _showRouteGuideText('경유지를 추가하려면 + 경유지를 먼저 누르세요');
    return;
  }
  if(!_activeTab||_activeTab!=='route') openTab('route');
}

function _hideParishMarkersForRouteDisplay(){
  if(_mode!=='parish') return;
  try{ _clearParishNearbyMarkers(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ _hideDioOverlays(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{
    Object.keys(_dioMkrs||{}).forEach(function(code){
      (_dioMkrs[code]||[]).forEach(function(mk){
        try{ mk.setMap(null); }catch(e){ console.warn('[가톨릭길동무]', e); }
      });
    });
    if(_parishIdleListener){
      try{ kakao.maps.event.removeListener(_parishIdleListener); }catch(e){ console.warn('[가톨릭길동무]', e); }
      _parishIdleListener=null;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  try{ if(_paSelMkr) _paSelMkr.setMap(null); }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _hideRetreatMarkersForRouteDisplay(){
  if(_mode!=='retreat') return;
  try{
    (_retreatMarkers||[]).forEach(function(o){
      if(!o || !o.marker) return;
      o.marker.setMap(null);
    });
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function _hideCategoryMarkersForRouteDisplay(){
  if(_mode==='parish') _hideParishMarkersForRouteDisplay();
  else if(_mode==='retreat') _hideRetreatMarkersForRouteDisplay();
}

async function _calcRoute(){
  if(!_rS||!_rE) return;
  _hideRouteGuide();
  $('rs-km').textContent='…';
  $('rs-time').textContent='…';
  $('rs-result').style.display='block';
  $('rs-hint').style.display='none';
  _dropEmptyWaypointInputsForRouteResult();
  const sBtn=$('rs-search-btn');
  if(sBtn) sBtn.style.display='none';
  if(_polyline){_polyline.setMap(null);_polyline=null;}
  const isJuk = _mode==='shrine' && _rE.idx === JUKRIMGUL_IDX && JUKRIMGUL_IDX >= 0;
  const navDest = isJuk ? JUKRIMGUL_PARKING : _rE;
  _showJukrimgulParkingMkr(isJuk);
  const note=$('rs-note');
  function setRouteNote(txt, html){
    if(!note) return;
    if(html) note.innerHTML=txt; else note.textContent=txt;
    note.style.display=txt?'block':'none';
  }
  if(isJuk){
    setRouteNote('⚠️ <b>죽림굴주차장</b>까지 경로 안내 · 자동차가 올라가지 못하는 구간이므로 주차장에서 도보로 이동하세요.', true);
  } else {
    setRouteNote('', false);
  }

  const waypoints = _getRouteWaypoints();
  _drawLine(_rS, navDest, null, {fit:false, waypoints:waypoints});

  async function fetchLeg(a,b){
    const res=await _kakaoDirectionsFetch(`${a.lng},${a.lat}`, `${b.lng},${b.lat}`);
    if(!res.ok) throw new Error(res.status);
    const data=await res.json();
    const route=data.routes?.[0];
    if(!route||route.result_code!==0) throw new Error('no route');
    const path=[];
    for(const sec of route.sections||[])
      for(const road of sec.roads||[]){
        const vx=road.vertexes;
        for(let i=0;i<vx.length-1;i+=2) path.push(new _LL(vx[i+1],vx[i]));
      }
    return { distance:route.summary.distance, duration:route.summary.duration, path:path };
  }

  try{
    const routePoints=[_rS].concat(waypoints,[navDest]);
    if(waypoints.length){
      let distance=0, duration=0, path=[];
      for(let i=0;i<routePoints.length-1;i++){
        const leg=await fetchLeg(routePoints[i], routePoints[i+1]);
        distance+=(leg.distance||0);
        duration+=(leg.duration||0);
        path=path.concat(leg.path||[]);
      }
      $('rs-km').textContent=(distance/1000).toFixed(1);
      $('rs-time').textContent=_fmtTime(duration);
      _drawLine(_rS, navDest, path.length>1?path:null, {waypoints:waypoints});
      if(!isJuk) setRouteNote('', false);
      return;
    }
    const leg=await fetchLeg(_rS, navDest);
    $('rs-km').textContent=(leg.distance/1000).toFixed(1);
    $('rs-time').textContent=_fmtTime(leg.duration);
    _drawLine(_rS, navDest, leg.path.length>1?leg.path:null);
    if(!isJuk) setRouteNote('', false);
  } catch(e){
    const routePoints=[_rS].concat(waypoints,[navDest]);
    let d=0;
    for(let i=0;i<routePoints.length-1;i++){
      d += calcDist(routePoints[i].lat,routePoints[i].lng,routePoints[i+1].lat,routePoints[i+1].lng);
    }
    d *= 1.4;
    $('rs-km').textContent=d.toFixed(1);
    $('rs-time').textContent=_fmtTime(d/70*3600);
    if(!isJuk) setRouteNote('* 직선거리 기반 추정값', false);
    _drawLine(_rS, navDest, null, {fit:true, waypoints:waypoints});
  }
}

function _drawLine(s1,s2,path,opts){
  opts = opts || {};
  const waypoints = Array.isArray(opts.waypoints)
    ? opts.waypoints.filter(p=>p&&p.lat&&p.lng)
    : (opts.via && opts.via.lat && opts.via.lng ? [opts.via] : []);
  _hideRouteGuide();
  if(_polyline) _polyline.setMap(null);
  _clearRouteTmpMarkers();
  const pts=path||([new _LL(s1.lat,s1.lng)].concat(waypoints.map(p=>new _LL(p.lat,p.lng)),[new _LL(s2.lat,s2.lng)]));
  _polyline=new _PL({path:pts,
  strokeWeight:path?6:3,strokeColor:path?'#1a73e8':'#b8965a',
  strokeOpacity:path?0.88:0.7,strokeStyle:path?'solid':'dashed'});
  _polyline.setMap(_map);
  _syncRouteWaypointBox();
  _refreshRouteTmpMarkers();
  _hideCategoryMarkersForRouteDisplay();

  if(path){
  _markers.forEach((m,i)=>{
   if(!m) return;
   const isRoute=(_rS&&_rS.idx===i)||(_rW&&_rW.idx===i)||(_rW2&&_rW2.idx===i)||(_rW3&&_rW3.idx===i)||(_rE&&_rE.idx===i);
   m.marker.setMap(isRoute?_map:null);
  });
  if(_mode==='parish'){
    _hideDioOverlays();
    if(_activeDio) _hideParishDioMkrs(_activeDio);
  } else if(_mode==='retreat'){
    _retreatMarkers.forEach(o=>{
      const isRoute=(_rS&&_rS.idx===o.index)||(_rW&&_rW.idx===o.index)||(_rW2&&_rW2.idx===o.index)||(_rW3&&_rW3.idx===o.index)||(_rE&&_rE.idx===o.index);
      o.marker.setMap(isRoute?_map:null);
    });
  }
  }

  const bounds=new _LB();
  pts.forEach(p=>bounds.extend(p));
  if(s1 && s1.lat && s1.lng) bounds.extend(new _LL(s1.lat,s1.lng));
  waypoints.forEach(function(wp){ bounds.extend(new _LL(wp.lat,wp.lng)); });
  if(s2 && s2.lat && s2.lng) bounds.extend(new _LL(s2.lat,s2.lng));
  if(_startTmpMkr) bounds.extend(new _LL(s1.lat,s1.lng));
  if(_wayTmpMkr && _rW) bounds.extend(new _LL(_rW.lat,_rW.lng));
  if(_way2TmpMkr && _rW2) bounds.extend(new _LL(_rW2.lat,_rW2.lng));
  if(_way3TmpMkr && _rW3) bounds.extend(new _LL(_rW3.lat,_rW3.lng));
  if(_endTmpMkr) bounds.extend(new _LL(s2.lat,s2.lng));
  if(opts.fit !== false){
    if(typeof _fitRouteBounds==='function') _fitRouteBounds(bounds, {repeat:false});
    else { try{_map.setBounds(bounds,80,52,190,52);}catch(e){ console.warn("[가톨릭길동무]", e); } }
  }
}

function _showJukrimgulParkingMkr(show){
  if(_jukrimgulParkMkr){ _jukrimgulParkMkr.setMap(null); _jukrimgulParkMkr=null; }
  if(!show||!_map) return;
  const svg=`<svg ${_NS} width="34" height="44" viewBox="0 0 34 44">
  <ellipse cx="17" cy="42" rx="6" ry="2.5" fill="rgba(0,0,0,.2)"/>
  <path d="M17 0C9.3 0 3 6.3 3 14c0 9.5 14 28 14 28S31 23.5 31 14C31 6.3 24.7 0 17 0z" fill="#7b2fbe"/>
  <circle cx="17" cy="14" r="9" fill="white" opacity=".9"/>
  <text x="17" y="19" text-anchor="middle" font-size="12" font-weight="900" fill="#7b2fbe" font-family="sans-serif">P</text>
  </svg>`;
  _jukrimgulParkMkr = new _MM({
  position: new _LL(JUKRIMGUL_PARKING.lat, JUKRIMGUL_PARKING.lng),
  image: new kakao.maps.MarkerImage(
   'data:image/svg+xml;charset=utf-8,'+_EC(svg),
   new _SZ(34,44),{offset:new _PT(17,44)}
  ),
  title:'죽림굴주차장', zIndex:15
  });
  _jukrimgulParkMkr.setMap(_map);
  if(JUKRIMGUL_IDX>=0 && _markers[JUKRIMGUL_IDX])
  _markers[JUKRIMGUL_IDX].marker.setMap(_map);
}

function _kakaoLaunch(w,a){
 try{ markExternalReturnStabilize('kakao-route'); }catch(e){ console.warn("[가톨릭길동무]", e); }
 if(_isMob){
  _kakaoLaunching=true;
  setTimeout(()=>{_kakaoLaunching=false;},3000);
  const f=document.createElement('iframe');
  f.style.cssText='display:none;width:0;height:0;border:0;position:fixed;';
  document.body.appendChild(f);f.src=a;
  const t=setTimeout(()=>{_kakaoLaunching=false;if(typeof oaiSmoothNavigate==='function') oaiSmoothNavigate(w,'kakao-route'); else location.href=w;},1500);
  window.addEventListener('blur',()=>clearTimeout(t),{once:true});
  setTimeout(()=>{if(document.body.contains(f))document.body.removeChild(f);},2000);
 } else { if(typeof oaiSmoothNavigate==='function') oaiSmoothNavigate(w,'kakao-route'); else location.href=w; }
}
function _routeLinkPointName(point, fallback){
  return _EC((point && (point.kw || point.name)) || fallback || '장소');
}
function _buildKakaoRouteWebLink(start, waypoints, end){
  const points=[start].concat(waypoints || [], [end]).filter(p=>p&&p.lat&&p.lng);
  if(points.length<2) return '';
  if(points.length>2){
    return 'https://map.kakao.com/link/by/car/' + points.map(function(p,i){
      return `${_routeLinkPointName(p, i===0?'출발지':(i===points.length-1?'도착지':'경유지'))},${p.lat},${p.lng}`;
    }).join('/');
  }
  const sp=_routeLinkPointName(start,'출발지');
  const ep=_routeLinkPointName(end,'도착지');
  return `https://map.kakao.com/link/from/${sp},${start.lat},${start.lng}/to/${ep},${end.lat},${end.lng}`;
}
function _launchKakaoRouteWebOnly(w){
  try{ markExternalReturnStabilize('kakao-route'); }catch(e){ console.warn('[가톨릭길동무]', e); }
  if(typeof oaiSmoothNavigate==='function') oaiSmoothNavigate(w,'kakao-route');
  else location.href=w;
}
function doKakaoRoute(){
  if(!_rS||!_rE) return;
  const isJuk = _rE.idx === JUKRIMGUL_IDX && JUKRIMGUL_IDX >= 0;
  const finalDest = isJuk ? JUKRIMGUL_PARKING : _rE;
  const waypoints = _getRouteWaypoints();
  const w=_buildKakaoRouteWebLink(_rS, waypoints, finalDest);
  if(!w) return;

  if(waypoints.length){
    _launchKakaoRouteWebOnly(w);
    return;
  }

  const a=`kakaomap://route?sp=${_rS.lat},${_rS.lng}&ep=${finalDest.lat},${finalDest.lng}&by=CAR`;
  _kakaoLaunch(w,a);
}

function smSwitchTab(tab){
  _smTab=tab;
  $('sm-tab-cat').classList.toggle('active',tab==='cat');
  $('sm-tab-place').classList.toggle('active',tab==='place');
  const activeSmTab = tab==='cat' ? $('sm-tab-cat') : $('sm-tab-place');
  if(activeSmTab){
    try{ activeSmTab.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}); }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
  $('sm-body').style.display=tab==='cat'?'':'none';
  $('sm-body-place').style.display=tab==='place'?'':'none';
  const inp=$('sm-inp');
  if(tab==='place'){
    if(inp&&inp.value.trim()) _searchKakaoPlace(inp.value.trim());
  } else if(tab==='cat'&&inp){ filterModal(inp.value||''); }
  oaiFocusSearchKeyboardInput('sm-inp');
}

function onSmInp(v){
  if(_smTab==='cat'){ filterModal(v); return; }
  clearTimeout(_smPlaceDebounce);
  if(!v.trim()){ $('sm-body-place').innerHTML='<div class="sm-place-loading">장소명을 입력하세요</div>'; return; }
  $('sm-body-place').innerHTML='<div class="sm-place-loading">🔍 검색 중...</div>';
  _smPlaceDebounce=setTimeout(()=>_searchKakaoPlace(v.trim()),400);
}

function _searchKakaoPlace(q){
  _kakaoKeywordDocs(q, KAKAO_PLACE_SEARCH_DISPLAY_LIMIT)
  .then(docs=>{
    const body=$('sm-body-place');
    if(!body) return;
    if(!docs.length){ body.innerHTML='<div class="sm-place-loading">검색 결과가 없습니다</div>'; return; }
    const cat=docs[0].category_group_name||'';
    body.innerHTML=docs.map(d=>{
      const icon=d.category_group_code==='MT1'?'🏪':d.category_group_code==='SC4'?'🏫':d.category_group_code==='HP8'?'🏥':d.category_group_code==='PM9'?'💊':d.category_group_code==='OL7'?'⛽':'📍';
      const lat=parseFloat(d.y),lng=parseFloat(d.x),nm=d.place_name,ad=d.road_address_name||d.address_name;
      return `<div class="sm-place-item" data-lat="${lat}" data-lng="${lng}" data-name="${nm.replace(/"/g,'&quot;')}" data-addr="${ad.replace(/"/g,'&quot;')}"><div class="sm-place-icon">${icon}</div><div class="sm-place-info"><div class="sm-place-name">${nm}</div><div class="sm-place-addr">${ad}</div></div></div>`;
    }).join('');
  }).catch(()=>{ const b=$('sm-body-place'); if(b) b.innerHTML='<div class="sm-place-loading">검색 실패</div>'; });
}

function selectFromPlaceModal(lat,lng,name,addr){
  closeSearchModal();
  const role=_smRole;
  _clearRouteTmpMarkers();
  const locObj={idx:-1,name:name,lat:lat,lng:lng,isPlace:true};
  if(role==='start'){
    _routeRegionStart=null;
    if(_mode==='shrine'&&_rS&&_rS.idx>=0&&_markers[_rS.idx]) _markers[_rS.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rS.idx].shrine),false));
    _rS=locObj;
    _setRouteLabel('start',name);
    _refreshRouteTmpMarkers();
    _enterRouteMode();
    if(_rE) _updateSearchBtn();
    else{ _showRouteGuideText(`도착 ${_getRouteGuideTarget()}를 탭하세요`); }
  } else if(_isRouteWaypointRole(role)) {
    const oldPoint=_getRoutePointByRole(role);
    if(_mode==='shrine'&&oldPoint&&oldPoint.idx>=0&&_markers[oldPoint.idx]) _markers[oldPoint.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[oldPoint.idx].shrine),false));
    _setRouteWaypointEnabledByRole(role,true);
    _setRoutePointByRole(role,locObj);
    _setRouteLabel(role,name);
    _refreshRouteTmpMarkers();
    _hideRouteGuide();
    if(_rS&&_rE) _updateSearchBtn();
  } else {
    if(_mode==='shrine'&&_rE&&_rE.idx>=0&&_markers[_rE.idx]) _markers[_rE.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rE.idx].shrine),false));
    _rE=locObj;
    _setRouteLabel('end',name);
    _refreshRouteTmpMarkers();
    _hideRouteGuide();
    if(_rS) _updateSearchBtn();
    else _showRouteGuideText(`출발 ${_getRouteGuideTarget()}를 탭하세요`);
  }
  if(!_activeTab||_activeTab!=='route') openTab('route');
  if(_map) _map.panTo(new _LL(lat,lng));
}
function openSearchModal(role){
  closeInfoCard({keepMap:true});
  _smRole=role;_smDio='all';
  _smTab='cat';
  const catTab=$('sm-tab-cat');
  if(catTab) catTab.textContent=_mode==='shrine'?'성지':_mode==='parish'?'성당':'피정의 집';
  if($('sm-tab-cat')) $('sm-tab-cat').classList.add('active');
  if($('sm-tab-place')) $('sm-tab-place').classList.remove('active');
  requestAnimationFrame(function(){
    try{ $('sm-tab-cat')?.scrollIntoView({behavior:'instant', block:'nearest', inline:'center'}); }catch(e){ console.warn("[가톨릭길동무]", e); }
  });
  if($('sm-body')) $('sm-body').style.display='';
  if($('sm-body-place')) {
    $('sm-body-place').style.display='none';
    $('sm-body-place').innerHTML='';
    if(!$('sm-body-place')._hasDelegate){
      $('sm-body-place')._hasDelegate=true;
      $('sm-body-place').addEventListener('click',function(e){
        const item=e.target.closest('.sm-place-item');
        if(!item) return;
        const lat=parseFloat(item.dataset.lat);
        const lng=parseFloat(item.dataset.lng);
        const name=item.dataset.name;
        const addr=item.dataset.addr;
        selectFromPlaceModal(lat,lng,name,addr);
      });
    }
  }
  const hd=$('srch-modal')?.querySelector('.sm-hd');
  if(hd){
    hd.style.background=_mode==='parish'?'var(--parish-bg)':_mode==='retreat'?'var(--retreat-bg)':'var(--navy)';
  }
  const sfb=$('srch-modal')?.querySelector('.sm-filter');
  if(sfb){
    sfb.style.background=_mode==='parish'?'var(--parish-bg)':_mode==='retreat'?'var(--retreat-bg)':'var(--navy2)';
  }
  $$('.sm-fb').forEach(b=>b.classList.remove('on'));
  document.querySelector('.sm-fb')?.classList.add('on');
  const noun=_getRouteGuideTarget();
  $('sm-title').textContent=_routeSearchTitle(role,noun);
  const smInput=$('sm-inp');
  if(smInput){
    const smPh = _mode==='parish' ? '선택 교구 성당명, 주소 검색' : '이름 또는 장소 입력';
    smInput.placeholder = smPh;
    smInput.setAttribute('aria-label', smPh);
    smInput.value='';
  }
  filterModal('');
  var searchModal=$('srch-modal');
  if(searchModal){
    searchModal.classList.add('open');
    try{ if(typeof oaiEnterPopup==='function') oaiEnterPopup(searchModal); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  oaiFocusSearchKeyboardInput('sm-inp');
}

function _blurAll(){ try{document.activeElement&&document.activeElement.blur();}catch(e){ console.warn("[가톨릭길동무]", e); } }
function oaiInputIsVisible(el){
  try{
    if(!el) return false;
    if(el.disabled || el.readOnly) return false;
    var r=el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
}
function oaiFocusSearchKeyboardInput(id, delay){
  function run(){
    try{
      var el=document.getElementById(id);
      if(!oaiInputIsVisible(el)) return;
      if(document.activeElement!==el){
        try{ el.focus({preventScroll:true}); }catch(_e){ el.focus(); }
      }
      try{ if(typeof el.select === 'function' && el.value) el.select(); }catch(_e){}
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  if(delay && delay>0) setTimeout(run, delay);
  else { run(); setTimeout(run, 60); }
}
function oaiBlurIfAutoFocusedInput(id){
  setTimeout(function(){
    try{
      var el=document.getElementById(id);
      if(el && document.activeElement===el) el.blur();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  },0);
}
function closeSearchModal(){
  _blurAll && _blurAll();
  $('srch-modal').classList.remove('open');
}

function setSmDio(v,btn){
  if(_mode==='parish'){
    const code = v==='all' ? null : (_PARISH_DIO_CODE_MAP[v]||null);
    if(v==='all' && !_areAllParishDiocesesReady()){
      _smDio=v;
      $$('.sm-fb').forEach(b=>b.classList.remove('on'));
      btn?.classList.add('on');
      const body=$('sm-body'); if(body) body.innerHTML='<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">전체 성당 정보를 불러오는 중입니다...</div>';
      _ensureAllParishDiocesesLoaded().then(function(){ setSmDio(v,btn); }).catch(function(err){ console.warn('[가톨릭길동무] 전체 성당 데이터 로드 실패', err); });
      return;
    }
    if(code && !_isParishDioceseReady(code)){
      _smDio=v;
      $$('.sm-fb').forEach(b=>b.classList.remove('on'));
      btn?.classList.add('on');
      const body=$('sm-body'); if(body) body.innerHTML='<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">성당 정보를 불러오는 중입니다...</div>';
      _ensureParishDioceseDataLoaded(code).then(function(){ setSmDio(v,btn); }).catch(function(err){ console.warn('[가톨릭길동무] 성당 교구 데이터 로드 실패', err); });
      return;
    }
  }
  _smDio=v;
  $$('.sm-fb').forEach(b=>b.classList.remove('on'));
  btn?.classList.add('on');
  filterModal($('sm-inp')?.value||'');
}

function filterModal(q){
  const body=$('sm-body');
  const groups={};
  _getCurrentItems().forEach((s,i)=>{
  const matchDio=_mode==='parish' ? (_smDio==='all'||s.diocese===_smDio) : (q?true:(_smDio==='all'||s.diocese===_smDio));
  if(!matchDio) return;
  if(q){
    const nq=q.replace(/\s+/g,'');
    const nameNorm=String(s.name||'').replace(/\s+/g,'');
    const dioNorm=String(s.diocese||'').replace(/\s+/g,'');
    const addrNorm=String(s.addr||'').replace(/\s+/g,'');
    const allNorm=_itemSearchNorm(s);
    let matchAll=false;
    if(_mode==='parish'){
      matchAll = nameNorm.startsWith(nq) || addrNorm.includes(nq);
    } else {
      const tokens=q.trim().split(/\s+/);
      matchAll=tokens.length>=2
        ?tokens.every(t=>{const nt=t.replace(/\s+/g,'');return nameNorm.includes(nt)||dioNorm.includes(nt)||addrNorm.includes(nt)||allNorm.includes(nt);})
        :nameNorm.includes(nq)||dioNorm.includes(nq)||addrNorm.includes(nq)||allNorm.includes(nq);
    }
    if(!matchAll) return;
  }
  if(!s.lat||!s.lng) return;
  if(!groups[s.diocese]) groups[s.diocese]=[];
  groups[s.diocese].push({s,i});
  });
  let html='';
  _sortDioceseNamesWithMyFirst(Object.keys(groups)).forEach((dio)=>{
  const items=groups[dio];
  const c=_routeRoleColor(_smRole);
  const myBadge=_isMyDioceseName(dio)?'<span class="sm-my-dio-badge">나의 교구</span>':'';
  html+=`<div class="sm-grp${_isMyDioceseName(dio)?' my-diocese-sm-grp':''}" style="color:${c}">${dio}${myBadge}</div>`;
  items.forEach(({s,i})=>{
   const tc=_mode==='shrine'?(TC[s.type]||'#555'):_getModeMarkerColor(s);
   const badge=_mode==='shrine'?s.type:(_mode==='retreat'?'피정':'성당');
   html+=`<div class="sm-item" onclick="selectFromModal(${i})"><div class="sm-role" style="background:${c}">${_routeRoleShort(_smRole)}</div><div class="sm-info"><div class="sm-name">${s.name}</div><div class="sm-sub">${s.addr}</div></div><span class="sm-badge" style="color:${tc};background:${tc}18">${badge}</span></div>`;
  });
  });
  body.innerHTML=html||((_mode==='parish'&&!PARISHES.length)?'<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">교구를 선택해 주세요</div>':((_mode==='parish'&&q&&_smDio!=='all')?'<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">선택한 교구 안에 검색 결과가 없습니다</div>':'<div style="padding:32px;text-align:center;color:#aaa;font-size:13px">검색 결과가 없습니다</div>'));
}

function selectFromModal(idx){
  const s=_getCurrentItems()[idx];
  if(!s) return;
  closeSearchModal();
  const role=_smRole;
  if(role==='start'){
  _routeRegionStart=null;
  _routeStartMarkerExplicitCurrent=false;
  if(_mode==='shrine'&&_rS&&_rS.idx>=0&&_markers[_rS.idx]) _markers[_rS.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rS.idx].shrine),false));
  _clearRouteTmpMarkers();
  _rS={idx,name:s.name,lat:s.lat,lng:s.lng};
  if(_mode==='shrine'&&_shouldShowRouteStartMarker()){ _markers[idx]?.marker.setImage(_mkrImgRoute(_typeColor(s.type),'출')); _setRouteMarkerZ(idx,'start'); }
  _setRouteLabel('start',s.name);
  _refreshRouteTmpMarkers();
  _enterRouteMode();
  if(_rE) _updateSearchBtn();
  else {
   _showRouteGuideText(`도착 ${_getRouteGuideTarget()}를 탭하세요`);
  }
  } else if(_isRouteWaypointRole(role)) {
  const oldPoint=_getRoutePointByRole(role);
  if(_mode==='shrine'&&oldPoint&&oldPoint.idx>=0&&_markers[oldPoint.idx]) _markers[oldPoint.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[oldPoint.idx].shrine),false));
  _setRouteWaypointEnabledByRole(role,true);
  _clearRouteTmpMarkers();
  _setRoutePointByRole(role,{idx,name:s.name,lat:s.lat,lng:s.lng});
  if(_mode==='shrine'){ _markers[idx]?.marker.setImage(_mkrImgRoute(_routeWaypointColor(role),_routeWaypointMarkerText(role))); _setRouteMarkerZ(idx,role); }
  _setRouteLabel(role,s.name);
  _refreshRouteTmpMarkers();
  _hideRouteGuide();
  if(_rS&&_rE) _updateSearchBtn();
  } else {
  if(_mode==='shrine'&&_rE&&_rE.idx>=0&&_markers[_rE.idx]) _markers[_rE.idx].marker.setImage(_mkrImg(_shrineMarkerColor(_markers[_rE.idx].shrine),false));
  _rE={idx,name:s.name,lat:s.lat,lng:s.lng};
  if(_mode==='shrine'){ _markers[idx]?.marker.setImage(_mkrImgRoute(_typeColor(s.type),'도')); _setRouteMarkerZ(idx,'end'); }
  _setRouteLabel('end',s.name);
  _refreshRouteTmpMarkers();
  _hideRouteGuide();
  if(_rS) _updateSearchBtn();
  else _showRouteGuideText(`출발 ${_getRouteGuideTarget()}를 탭하세요`);
  }
  if(!_activeTab||_activeTab!=='route') openTab('route');
  if(s.lat&&s.lng&&_map) _map.panTo(new _LL(s.lat,s.lng));
}

function _fetchDist(lat,lng,iLat,iLng,distId){
 _navFetch(`${lng},${lat}`,`${iLng},${iLat}`)
 .then(val=>{
  if(!val) return;
  const km=val.km.toFixed(1);
  const el=$(distId);if(el)el.innerHTML=`🚗${km}km<span style="font-size:10px;color:#aaa;font-weight:400;margin-left:3px">${_fmtTime(val.dur)}</span>`;
 }).catch(()=>{});
}
function _nearbyHtml(idx,i,name,addr,c,tLabel,distId,estKm){
 if(_mode==='retreat') c=OAI_RETREAT_CATEGORY_COLOR;
 else if(_mode==='parish') c=OAI_CATHEDRAL_CATEGORY_COLOR;
 return `<div class="nearby-item" onclick="selectItem(${idx},{fromNearby:true})"><div class="nearby-num" style="background:${c}!important">${i+1}</div><div class="nearby-info"><div class="nearby-name">${name}</div><div class="nearby-addr">${addr.substring(0,26)}${addr.length>26?'…':''}</div></div><div class="nearby-meta"><div class="nearby-type" style="background:${c}18!important;color:${c}!important">${tLabel}</div><div class="nearby-dist" id="${distId}" style="color:${c}!important">🚗${estKm}km</div></div></div>`;
}
function _regionHtml(idx,i,name,addr,c,tLabel,distId,estKm){
 if(_mode==='retreat') c=OAI_RETREAT_CATEGORY_COLOR;
 else if(_mode==='parish') c=OAI_CATHEDRAL_CATEGORY_COLOR;
 return `<div class="region-item" onclick="selectItem(${idx},{fromRegion:true})"><div class="nearby-num" style="background:${c}!important;width:28px;height:28px;font-size:12px">${i+1}</div><div class="nearby-info"><div class="nearby-name">${name}</div><div class="nearby-addr">${addr.substring(0,26)}${addr.length>26?'…':''}</div></div><div class="nearby-meta"><div class="nearby-type" style="background:${c}18!important;color:${c}!important">${tLabel}</div>${distId?`<div class="nearby-dist" id="${distId}" style="color:${c}!important">🚗${estKm}km</div>`:''}</div></div>`;
}
function _show(el,d){if(el)el.style.display=d||'flex';}
function _hide(el){if(el)el.style.display='none';}
function calcDist(a,b,c,d){
  const R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180;
  const x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.asin(Math.sqrt(x));
}
function _fmtTime(s){
  if(!s||s<60) return '1분 미만';
  const m=Math.round(s/60);
  if(m<60) return m+'분';
  return Math.floor(m/60)+'시간'+(m%60?' '+m%60+'분':'');
}
(function(){
  const TABS = ['nearby','list','region','route'];
  let _swSt = null;
  const MIN_DX = 55, MAX_DY = 90;

  function _doMainSwipe(dx){
    if(typeof _screen === 'undefined' || _screen !== 'map') return;
    if(document.getElementById('srch-modal')?.classList.contains('open')) return;
    const idx = (typeof _activeTab !== 'undefined' && _activeTab)
      ? TABS.indexOf(_activeTab) : -1;
    const next = dx < 0
      ? (idx < TABS.length - 1 ? TABS[idx + 1] : TABS[0])
      : (idx > 0 ? TABS[idx - 1] : TABS[TABS.length - 1]);
    window._swipeDir = dx < 0 ? 'right' : 'left';
    if(typeof openTab === 'function') openTab(next);
    window._swipeDir = null;
  }

  document.addEventListener('touchstart', function(e){
    _swSt = {x: e.touches[0].clientX, y: e.touches[0].clientY};
  }, {passive: true});

  document.addEventListener('touchend', function(e){
    if(!_swSt) return;
    const ex = e.changedTouches[0].clientX;
    const ey = e.changedTouches[0].clientY;
    const dx = ex - _swSt.x;
    const dy = Math.abs(ey - _swSt.y);
    _swSt = null;
    if(Math.abs(dx) < MIN_DX || dy > MAX_DY) return;

    const tgt = e.target;

    const tv = document.getElementById('trail-view');
    if(tv?.classList.contains('open')){
      if(tgt.closest('#trail-map') || tgt.closest('.trail-tabs')) return;
      if(typeof trailSetView === 'function')
        trailSetView(dx < 0 ? 'list' : 'map');
      if(typeof window.oaiSwipeAction === 'function') window.oaiSwipeAction(document.getElementById('trail-list') || document.querySelector('#trail-view .trail-panel.on'), dx < 0 ? 'left' : 'right');
      return;
    }

    const wv = document.getElementById('web-view');
    if(wv?.classList.contains('open')){
      return;
    }

    if(tgt.closest('.srch-bar'))   return;
    if(tgt.closest('.filter-bar')) return;
    if(tgt.closest('#map'))        return;
    if(tgt.closest('.sm-body, .sm-body-place')) return;

    const inApp =
      tgt.closest('#nearby-body') ||
      tgt.closest('#list-body')   ||
      tgt.closest('#region-body') ||
      tgt.closest('#sheet-route') ||
      tgt.closest('#info-card');
    if(inApp) _doMainSwipe(dx);

  }, {passive: true});
})();

(function(){
  const IDLE_MS = 10 * 60 * 1000; // 10분
  let _idleTimer = null;
  function _resetIdle(){
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(()=>{
      if(document.documentElement.classList.contains('app-active')){
        _resetMapState();
        goToCover();
      }
    }, IDLE_MS);
  }
  ['touchstart','touchend','click','keydown','scroll'].forEach(ev=>{
    document.addEventListener(ev, _resetIdle, {passive:true});
  });
  _resetIdle();
})();

document.addEventListener('DOMContentLoaded', function bindEvents() {
  function on(id, evt, fn, opts) {
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.addEventListener(evt, fn, opts || false);
  }
  function onQ(sel, evt, fn) {
    document.querySelectorAll(sel).forEach(function(el) { el.addEventListener(evt, fn); });
  }
  function adjustAppFont(delta) {
    if (typeof window.__APP_adjustSharedFont === 'function') {
      window.__APP_adjustSharedFont(delta);
      return;
    }
    if (typeof window.prAdjustFont === 'function') window.prAdjustFont(delta);
  }
  function withPrayerModule(fn) {
    if (typeof window.ensurePrayerModuleLoaded === 'function') {
      window.ensurePrayerModuleLoaded().then(function(){ try{ fn(); }catch(e){ console.warn('[가톨릭길동무]', e); } })
        .catch(function(err){ console.warn('[가톨릭길동무]', err); });
      return;
    }
    try{ fn(); }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function prepareSearchKeyboardInput(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('inputmode', 'search');
    el.setAttribute('enterkeyhint', 'done');
    el.removeAttribute('autofocus');
    return el;
  }
  function blurSearchKeyboardOnDone(e, afterBlur) {
    if (!e || e.key !== 'Enter' || e.isComposing) return false;
    e.preventDefault();
    e.stopPropagation();
    var target = e.currentTarget || e.target;
    if (typeof afterBlur === 'function') {
      try { afterBlur(target); } catch (err) { console.warn('[가톨릭길동무]', err); }
    }
    setTimeout(function() { try { target && target.blur && target.blur(); } catch (err) { console.warn('[가톨릭길동무]', err); } }, 0);
    return true;
  }
  ['list-srch-inp', 'region-inp', 'sm-inp', 'prayer-search-inp'].forEach(prepareSearchKeyboardInput);

  on('missa-close', 'click', function() { closeMissa(); });

  on('exit-cancel-btn', 'click', function() { closeExitDlg(); });
  on('exit-ok-btn',     'click', function() { doExit(); });

  on('diocese-close-btn', 'click', function() {
    if (typeof closeDioceseView === 'function') closeDioceseView();
  });
  on('diocese-frame', 'load', function() {
    if (typeof dioceseLoaded === 'function') dioceseLoaded();
  });

  on('prayer-close',  'click', function() { _closePrayerAndReturn(); });
  on('prayer-search-inp', 'input', function() { withPrayerModule(function(){ if(typeof window.prRenderList==='function') window.prRenderList(); }); });
  on('prayer-search-inp', 'keydown', function(e) {
    blurSearchKeyboardOnDone(e, function() {
      withPrayerModule(function(){ if(typeof window.prRenderList==='function') window.prRenderList(); });
    });
  });
  on('pr-sm-btn-1',   'click', function() { withPrayerModule(function(){ if(typeof window.prAdjustFont==='function') window.prAdjustFont(-1); }); });
  on('pr-lg-btn-1',   'click', function() { withPrayerModule(function(){ if(typeof window.prAdjustFont==='function') window.prAdjustFont(1); }); });
  on('pr-sm-btn-2',   'click', function() { withPrayerModule(function(){ if(typeof window.prAdjustFont==='function') window.prAdjustFont(-1); }); });
  on('pr-lg-btn-2',   'click', function() { withPrayerModule(function(){ if(typeof window.prAdjustFont==='function') window.prAdjustFont(1); }); });
  on('pr-detail-star','click', function(e) { var ev=e; withPrayerModule(function(){ if(typeof window.prToggleDetailFav==='function') window.prToggleDetailFav(ev); }); });
  on('pr-back-btn',   'click', function() { withPrayerModule(function(){ if(typeof window.prCloseDetail==='function') window.prCloseDetail(); else if(typeof window.closePrayerView==='function') window.closePrayerView(); }); });

  on('cover-sm-btn',  'click', function(e) { e.stopPropagation(); adjustAppFont(-1); });
  on('cover-lg-btn',  'click', function(e) { e.stopPropagation(); adjustAppFont(1); });

  on('cc-1', 'click', function() { if (typeof openMassQuickMenu === 'function') openMassQuickMenu(); });
  on('cc-2', 'click', function() { hideCoverAndRun(function() { if (typeof startApp === 'function') startApp('parish'); }); });
  on('cc-3', 'click', function() { hideCoverAndRun(function() { if (typeof startApp === 'function') startApp('shrine'); }); });
  on('cc-4', 'click', function() { hideCoverAndRun(function() { if (typeof startApp === 'function') startApp('retreat'); }); });
  on('cc-5', 'click', function() { hideCoverAndRun(function() { if (typeof openTrailView === 'function') openTrailView(); }); });
  on('cc-6', 'click', function() { hideCoverAndRun(function() { if (typeof openWebView === 'function') openWebView(); }); });
  on('cc-7', 'click', function() { hideCoverAndRun(function() { openDioceseView(); }); });

  onQ('[data-mass-quick-close]', 'click', function() { closeMassQuickMenu(); });
  on('mass-quick-missa', 'click', function(e) {
    if(e){ e.preventDefault(); e.stopPropagation(); }
    if (typeof _openFaithPortalFromMassQuick === 'function') _openFaithPortalFromMassQuick('missa', {forceReload:true});
    else { _setMassQuickReturn(true); if (typeof openFaithPortal === 'function') openFaithPortal('missa', {forceReload:true}); else if (typeof openMissa === 'function') openMissa(); }
  });
  on('mass-quick-prayer', 'click', function() {
    try{ if(typeof _setFaithReturnTarget === 'function') _setFaithReturnTarget('massQuick'); }catch(e){ console.warn('[가톨릭길동무]', e); }
    _setPrayerQuickReturn(true);
    var openPrayerFromQuick = function(){
      try{
        document.querySelectorAll('#mass-quick-modal .app-pressing').forEach(function(el){ el.classList.remove('app-pressing'); });
      }catch(e){ console.warn('[가톨릭길동무]', e); }
      if (typeof openPrayerBook === 'function') openPrayerBook({fromMassQuick:true, instant:true});
      else alert('기도문 기능이 연결되지 않았습니다.');
    };
    try{
      var mq=document.getElementById('mass-quick-modal');
      if(mq){ mq.classList.remove('show'); mq.setAttribute('aria-hidden','true'); }
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    if(window.requestAnimationFrame) window.requestAnimationFrame(openPrayerFromQuick);
    else setTimeout(openPrayerFromQuick, 0);
  });
  on('mass-quick-hymn', 'click', function(e) {
    if(e){ e.preventDefault(); e.stopPropagation(); }
    if (typeof _openFaithPortalFromMassQuick === 'function') _openFaithPortalFromMassQuick('hymn');
    else { _setMassQuickReturn(true); if (typeof openCatholicHymn === 'function') openCatholicHymn(); }
  });
  on('mass-quick-bible', 'click', function(e) {
    if(e){ e.preventDefault(); e.stopPropagation(); }
    if (typeof _openFaithPortalFromMassQuick === 'function') _openFaithPortalFromMassQuick('bible');
    else { _setMassQuickReturn(true); if (typeof openCatholicBible === 'function') openCatholicBible(); }
  });

  (function bindCoverRefreshPressActions(){
    var refreshBtn = document.getElementById('cover-update-btn');
    if(!refreshBtn) return;

    var holdTimer = null;
    var pressStarted = false;
    var longActionFired = false;
    var suppressClickUntil = 0;
    var CACHE_HOLD_MS = 1200;

    function now(){ return Date.now ? Date.now() : new Date().getTime(); }
    function stopEvent(e, preventDefault){
      try{
        if(!e) return;
        e.stopPropagation();
        if(preventDefault && e.cancelable) e.preventDefault();
      }catch(_e){}
    }
    function vibrateShort(){ try{ if(navigator.vibrate) navigator.vibrate(12); }catch(_e){} }
    function vibrateLong(){ try{ if(navigator.vibrate) navigator.vibrate([32, 22, 48]); }catch(_e){} }
    function clearHold(){ if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; } }
    function beginPress(e){
      try{ if(e && e.button !== undefined && e.button !== 0) return; }catch(_e){}
      stopEvent(e, false);
      clearHold();
      pressStarted = true;
      longActionFired = false;
      holdTimer = setTimeout(function(){
        holdTimer = null;
        if(!pressStarted || longActionFired) return;
        longActionFired = true;
        pressStarted = false;
        suppressClickUntil = now() + 1600;
        vibrateLong();
        if(typeof clearAppFilesCacheCompletely === 'function') clearAppFilesCacheCompletely();
      }, CACHE_HOLD_MS);
    }
    function endPress(e){
      stopEvent(e, false);
      pressStarted = false;
      clearHold();
    }
    function cancelPress(e){
      stopEvent(e, false);
      pressStarted = false;
      clearHold();
    }
    function shortRefresh(e){
      stopEvent(e, true);
      if(now() < suppressClickUntil || longActionFired){
        longActionFired = false;
        return;
      }
      pressStarted = false;
      clearHold();
      if(typeof refreshAppFilesOnly === 'function') refreshAppFilesOnly();
    }
    function preventNativePressMenu(e){ stopEvent(e, true); return false; }

    if(window.PointerEvent){
      on(refreshBtn, 'pointerdown', beginPress, {passive:false});
      on(refreshBtn, 'pointerup', endPress, {passive:false});
      on(refreshBtn, 'pointercancel', cancelPress, {passive:false});
      on(refreshBtn, 'pointerleave', function(e){
        try{ if(e && e.pointerType === 'mouse') cancelPress(e); }catch(_e){}
      }, {passive:false});
    }else{
      on(refreshBtn, 'touchstart', beginPress, {passive:true});
      on(refreshBtn, 'touchend', endPress, {passive:true});
      on(refreshBtn, 'touchcancel', cancelPress, {passive:true});
      on(refreshBtn, 'mousedown', beginPress, {passive:false});
      on(refreshBtn, 'mouseup', endPress, {passive:false});
      on(refreshBtn, 'mouseleave', cancelPress, {passive:false});
    }
    on(refreshBtn, 'click', shortRefresh, {capture:true});
    on(refreshBtn, 'contextmenu', preventNativePressMenu, {capture:true});
    on(refreshBtn, 'selectstart', preventNativePressMenu, {capture:true});
    on(refreshBtn, 'dragstart', preventNativePressMenu, {capture:true});
  })();
  on('qna-cover-btn',  'click', function() { openQnaView(); });

  (function bindCoverMenu(){
    var modal = document.getElementById('cover-menu-modal');
    if(!modal) return;
    function normalizeCoverMenuBackState(reason){
      try{ if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ if(typeof window._ensureCoverBackTrap === 'function') window._ensureCoverBackTrap(reason || 'cover-menu'); }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function openMenu(){
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
      normalizeCoverMenuBackState('cover-menu-open');
      try{ if(typeof window._pushCoverOverlayBackTrap === 'function') window._pushCoverOverlayBackTrap('cover-menu', 'cover-menu-open'); }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function closeMenu(){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
      normalizeCoverMenuBackState('cover-menu-close');
    }
    window.closeCoverMenuPopup = closeMenu;
    window.isCoverMenuPopupOpen = function(){
      return !!(modal && modal.classList && modal.classList.contains('show'));
    };
    on('cover-menu-btn', 'click', function(e){
      if(e && e.preventDefault) e.preventDefault();
      openMenu();
    });
    on('cover-menu-close', 'click', function(e){
      if(e && e.preventDefault) e.preventDefault();
      closeMenu();
    });
    modal.addEventListener('click', function(e){
      if(e && e.target && e.target.getAttribute && e.target.getAttribute('data-cover-menu-close') === 'true') closeMenu();
    });
    on('cover-menu-guide-btn', 'click', function(e){
      if(e && e.preventDefault) e.preventDefault();
      closeMenu();
      try{
        if(window.openGuideManual) window.openGuideManual();
        else if(typeof openGuideManual === 'function') openGuideManual();
      }catch(err){ console.warn('[가톨릭길동무]', err); }
    });
    function markInternalPrivacyNavigation(){
      try{
        sessionStorage.setItem('oai_internal_return_no_effect_once','1');
        sessionStorage.setItem('oai_internal_return_no_effect_until', String((Date.now ? Date.now() : new Date().getTime()) + 7000));
        sessionStorage.setItem('oai_internal_page_nav','privacy');
        sessionStorage.removeItem('oai_external_nav_started_at');
        sessionStorage.removeItem('oai_external_nav_pagehide');
        sessionStorage.removeItem('oai_external_nav_kind');
        sessionStorage.removeItem('oai_external_nav_pending');
        sessionStorage.removeItem('oai_external_nav_hold_until');
        sessionStorage.removeItem('oai_external_nav_force_release_at');
        sessionStorage.removeItem('oai_refresh_veil_until');
        sessionStorage.removeItem('oai_refresh_veil_hold_ms');
        sessionStorage.removeItem('oai_refresh_veil_reason');
        sessionStorage.removeItem('oai_refresh_veil_visible_until');
      }catch(_e){}
    }
    on('cover-menu-qna-btn', 'click', function(e){
      if(e && e.preventDefault) e.preventDefault();
      closeMenu();
      try{ openQnaView(); }catch(err){ console.warn('[가톨릭길동무]', err); }
    });
    on('cover-menu-privacy-link', 'click', function(){
      markInternalPrivacyNavigation();
      closeMenu();
    });
    document.addEventListener('keydown', function(e){
      if(e && e.key === 'Escape' && modal.classList.contains('show')) closeMenu();
    });
  })();

  if (window.bindMyFaithLifePanel) window.bindMyFaithLifePanel(on);


  on('tab-btn-nearby', 'click', function() { toggleTab('nearby'); });
  on('tab-btn-list',   'click', function() { toggleTab('list'); });
  on('tab-btn-region', 'click', function() { toggleTab('region'); });
  on('tab-btn-route',  'click', function() { toggleTab('route'); });

  on('nearby-close-btn', 'click', function(e) { e.stopPropagation(); closeSheetPanelOnly('nearby'); });
  on('list-close-btn',   'click', function(e) { e.stopPropagation(); closeSheetPanelOnly('list'); });
  on('region-close-btn', 'click', function(e) { e.stopPropagation(); closeSheetPanelOnly('region'); });
  on('route-close-btn',  'click', function(e) { e.stopPropagation(); closeRouteSheetByX(); });
  on('map-category-close-btn', 'click', function(e) { e.stopPropagation(); closeCategoryToCoverFromMap(); });

  on('loc-btn', 'click', function() { goMyLoc(); });

  on('list-srch-inp', 'input', function() { onListSearch(this.value); });
  on('list-srch-inp', 'keydown', function(e) { blurSearchKeyboardOnDone(e, function(inp) { onListSearch(inp.value || ''); }); });
  on('list-srch-x',   'click', function() { clearListSearch(); });

  on('region-inp', 'keydown', function(e) { blurSearchKeyboardOnDone(e, function() { doRegionSearch(); }); });
  on('region-inp', 'input',   function() { onRegionInp(this.value); });
  on('region-search-btn', 'click', function() {
    if (document.activeElement) document.activeElement.blur();
    doRegionSearch();
  });

  on('rs-start-box', 'click', function() { if(_returnRouteResultToInputWindow()) return; openSearchModal('start'); });
  on('rs-end-box',   'click', function() { if(_returnRouteResultToInputWindow()) return; openSearchModal('end'); });
  on('rs-waypoints-summary-box', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } _returnRouteResultToInputWindow(); });
  on('rs-waypoint-box', 'click', function() { openSearchModal('waypoint'); });
  on('rs-waypoint2-box', 'click', function() { openSearchModal('waypoint2'); });
  on('rs-waypoint3-box', 'click', function() { openSearchModal('waypoint3'); });
  on('rs-add-waypoint-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } _beginWaypointAddMode('waypoint'); });
  on('rs-add-waypoint2-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } _beginWaypointAddMode('waypoint2'); });
  on('rs-add-waypoint3-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } _beginWaypointAddMode('waypoint3'); });
  on('rs-myloc-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } setMyLocAsStart(); });
  on('rs-start-x',   'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } clearRoute('start'); });
  on('rs-end-x',     'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } clearRoute('end'); });
  on('rs-waypoint-x','click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } clearRoute('waypoint'); });
  on('rs-waypoint2-x','click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } clearRoute('waypoint2'); });
  on('rs-waypoint3-x','click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } clearRoute('waypoint3'); });
  on('rs-swap-btn',  'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } swapRoute(); });
  on('rs-swap-waypoint-end-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } swapRouteWaypointEnd(); });
  on('rs-swap-waypoint2-end-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } swapRouteWaypoint2End(); });
  on('rs-swap-waypoint3-end-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } swapRouteWaypoint3End(); });
  on('rs-search-btn','click', function() { doSearchRoute(); });
  on('rs-kakao-btn', 'click', function() { doKakaoRoute(); });
  on('rs-reset-btn', 'click', function() { resetRoute({ fromButton: true }); });

  on('ic-close-btn', 'click', function(e) { if(e){ e.preventDefault(); e.stopPropagation(); } closeInfoCard({keepMap:true}); });
  on('ic-route-btn', 'click', function() { _openInfoRouteChoice(); });
  on('ic-guide',     'click', function() { if (typeof openShrineDetail === 'function') openShrineDetail(); });
  on('ic-kakao-nav', 'click', function() { openKakaoNav(); });

  // X 버튼 터치 보강: 경로/인포카드 위에 다른 레이어가 있어도 닫힘이 먼저 실행되도록 캡처 단계에서도 한 번 더 묶는다.
  ['click','pointerup','touchend'].forEach(function(ev){
    on('ic-close-btn', ev, function(e){ if(e){ e.preventDefault(); e.stopPropagation(); } closeInfoCard({keepMap:true}); }, true);
    on('route-close-btn', ev, function(e){ if(e){ e.preventDefault(); e.stopPropagation(); } closeRouteSheetByX(); }, true);
  });

  on('sm-close-btn', 'click', function() { closeSearchModal(); });
  on('sm-map-select-btn', 'click', function() { selectMapFromSearchModal(); });
  on('route-choice-start', 'click', function() { _handleRouteChoiceStart(); });
  on('route-choice-end', 'click', function() { _handleRouteChoiceEnd(); });
  on('route-choice-cancel', 'click', function() { _closeInfoRouteChoice(); });
  on('route-choice-backdrop', 'click', function() { _closeInfoRouteChoice(); });
  on('sm-inp', 'input', function() { onSmInp(this.value); });
  on('sm-inp', 'keydown', function(e) {
    blurSearchKeyboardOnDone(e, function(inp) {
      var v = (inp && inp.value ? inp.value : '').trim();
      if(_smTab==='place'){
        if(v) _searchKakaoPlace(v);
      } else {
        filterModal(v);
      }
    });
  });

  function closeGeneralModuleByButton(viewId){
    try{
      if(typeof window._oaiCloseGeneralModuleToCover === 'function' && window._oaiCloseGeneralModuleToCover(viewId + '-close-button')) return;
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    var v = document.getElementById(viewId);
    if (v) v.classList.remove('open');
    if (typeof goToCover === 'function') goToCover();
  }
  on('web-close-btn', 'click', function() { closeGeneralModuleByButton('web-view'); });
  on('trail-close-btn', 'click', function() { closeGeneralModuleByButton('trail-view'); });
  on('qna-close-btn', 'click', function() { closeGeneralModuleByButton('qna-view'); });

  on('trail-sh-close-btn', 'click', function() { trailCloseSheet(); });
  on('trail-loc-btn',      'click', function() { trailMyLoc(); });
  on('trail-tab-map',  'click', function() { trailSetView('map'); });
  on('trail-tab-list', 'click', function() { trailSetView('list'); });

  on('qna-tab-write',   'click', function() { qnaShowTab('write'); });

  on('sm-tab-cat',   'click', function() { smSwitchTab('cat'); });
  on('sm-tab-place', 'click', function() { smSwitchTab('place'); });

  on('missa-frame', 'load', function() { if (typeof missaLoaded === 'function') missaLoaded(); });
});



(function installOaiMapSearchKeyboardViewportLock(){
  if(window.__OAI_MAP_SEARCH_KEYBOARD_VIEWPORT_LOCK__) return;
  window.__OAI_MAP_SEARCH_KEYBOARD_VIEWPORT_LOCK__=true;
  var lock=null;
  function isTargetInput(el){
    try{ return !!(el && (el.id==='list-srch-inp' || el.id==='region-inp' || el.id==='sm-inp')); }catch(_e){ return false; }
  }
  function getActiveTarget(){
    try{ return isTargetInput(document.activeElement) ? document.activeElement : null; }catch(_e){ return null; }
  }
  function getSheetNameForInput(el){ return el && el.id==='region-inp' ? 'region' : (el && el.id==='sm-inp' ? 'search' : 'list'); }
  function getPanel(name){ return name==='search' ? document.getElementById('srch-modal') : document.getElementById('sheet-'+name); }
  function getScrollBox(name){
    if(name==='search') return document.getElementById('sm-body') || document.getElementById('sm-body-place');
    return name==='region' ? document.getElementById('region-body') : document.getElementById('list-body');
  }
  function makeLock(el){
    var name=getSheetNameForInput(el);
    var sheet=getPanel(name);
    var body=getScrollBox(name);
    return {
      inputId: el && el.id || '',
      sheetName: name,
      winY: window.scrollY || document.documentElement.scrollTop || 0,
      docY: document.documentElement.scrollTop || 0,
      bodyY: document.body ? (document.body.scrollTop || 0) : 0,
      sheetTop: sheet ? sheet.scrollTop || 0 : 0,
      bodyTop: body ? body.scrollTop || 0 : 0
    };
  }
  function restore(reason,savedLock){
    try{
      var cur=savedLock || lock;
      var el=getActiveTarget();
      if(!cur) return;
      if(!savedLock && (!el || el.id!==cur.inputId)) return;
      var sheet=getPanel(cur.sheetName);
      var body=getScrollBox(cur.sheetName);
      if(window.scrollTo) window.scrollTo(0, cur.winY || 0);
      if(document.documentElement) document.documentElement.scrollTop=cur.docY || cur.winY || 0;
      if(document.body) document.body.scrollTop=cur.bodyY || 0;
      if(sheet) sheet.scrollTop=cur.sheetTop || 0;
      if(body && reason!=='input') body.scrollTop=cur.bodyTop || 0;
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function start(el){
    try{
      if(!isTargetInput(el)) return;
      lock=makeLock(el);
      document.documentElement.classList.add('oai-map-search-keyboard-lock');
      [0,40,100,180,320].forEach(function(delay){ setTimeout(function(){ restore('start-'+delay); }, delay); });
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function stop(){
    var snapshot=lock;
    [0,80,160,300,520].forEach(function(delay){
      setTimeout(function(){ try{ if(!getActiveTarget()) restore('stop-'+delay, snapshot); }catch(e){ console.warn('[가톨릭길동무]', e); } }, delay);
    });
    setTimeout(function(){
      try{
        if(getActiveTarget()) return;
        restore('stop-final', snapshot);
        document.documentElement.classList.remove('oai-map-search-keyboard-lock');
        if(lock===snapshot) lock=null;
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }, 680);
  }
  document.addEventListener('focusin', function(e){ if(isTargetInput(e.target)) start(e.target); }, true);
  document.addEventListener('focusout', function(e){ if(isTargetInput(e.target)) stop(); }, true);
  document.addEventListener('input', function(e){ if(isTargetInput(e.target)) setTimeout(function(){ restore('input'); }, 0); }, true);
  try{
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', function(){ if(getActiveTarget()) { restore('vv-resize'); setTimeout(function(){ restore('vv-resize-late'); }, 120); } }, {passive:true});
      window.visualViewport.addEventListener('scroll', function(){ if(getActiveTarget()) restore('vv-scroll'); }, {passive:true});
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  window.addEventListener('resize', function(){ if(getActiveTarget()) setTimeout(function(){ restore('win-resize'); }, 40); }, {passive:true});
})();

(function installOaiKeyboardDismissOnOutsideTouch(){
  if(window.__OAI_KEYBOARD_DISMISS_ON_TOUCH_INSTALLED__) return;
  window.__OAI_KEYBOARD_DISMISS_ON_TOUCH_INSTALLED__=true;
  function isEditable(el){
    try{ return !!(el && el.closest && el.closest('input,textarea,[contenteditable="true"],.srch-inner,.sm-si')); }catch(e){ return false; }
  }
  function blurActive(){
    try{
      const ae=document.activeElement;
      if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable)) ae.blur();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function hasActiveEditable(){
    try{
      const ae=document.activeElement;
      return !!(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable));
    }catch(e){ return false; }
  }
  document.addEventListener('touchstart', function(e){
    if(hasActiveEditable() && !isEditable(e.target)) blurActive();
  }, {capture:true, passive:true});
  document.addEventListener('mousedown', function(e){
    if(hasActiveEditable() && !isEditable(e.target)) blurActive();
  }, true);
  document.addEventListener('touchmove', function(e){
    if(hasActiveEditable() && !isEditable(e.target)) blurActive();
  }, {capture:true, passive:true});
  document.addEventListener('scroll', function(e){
    if(!hasActiveEditable()) return;
    try{
      const t=e.target;
      if(t===document || t===window || (t && t.closest && t.closest('#list-body,#nearby-body,#region-body,#sm-results,.sheet-body,.sm-inner'))) blurActive();
    }catch(_e){ blurActive(); }
  }, true);
})();



