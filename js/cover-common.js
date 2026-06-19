'use strict';

(function(){
  if(window.__APP_FONT_SCALE_GUARD__) return;
  window.__APP_FONT_SCALE_GUARD__=true;
  var QA_URL="qa-firebase.html?v=V8-1-13-6-SHRINE-BOUNDARY-GUARD";
  var FONT_KEY='prayer_font_size';
  var BASE=16;
  var FONT_SIZES=[13,14,15,16,17,18,19,20,21,22,24,26,28,30];
  function el(id){return document.getElementById(id)}

  var COVER_RETURN_TOAST_KEY = 'oai_cover_toast_on_return';
  var COVER_RETURN_TOAST_TS_KEY = 'oai_cover_toast_on_return_ts';
  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function markCoverToastOnReturn(reason){
    try{
      sessionStorage.setItem(COVER_RETURN_TOAST_KEY, reason || 'cover-return');
      sessionStorage.setItem(COVER_RETURN_TOAST_TS_KEY, String(now()));
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function clearCoverToastOnReturn(){
    try{
      sessionStorage.removeItem(COVER_RETURN_TOAST_KEY);
      sessionStorage.removeItem(COVER_RETURN_TOAST_TS_KEY);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function isCoverReadyForReturnToast(){
    try{
      var cover = el('cover');
      if(!cover) return false;
      var st = window.getComputedStyle ? window.getComputedStyle(cover) : null;
      if(st && (st.display === 'none' || st.visibility === 'hidden')) return false;
      if(document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('app-active')) return false;
      var myFaith = el('my-diocese-modal');
      if(myFaith && myFaith.classList && myFaith.classList.contains('show')) return false;
      var menu = el('cover-menu-modal');
      if(menu && menu.classList && menu.classList.contains('show')) return false;
      return true;
    }catch(e){ return false; }
  }
  function activateCoverToastOnReturn(reason){
    try{
      if(!isCoverReadyForReturnToast()) return false;
      if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady();
      if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed();
      if(typeof window._forceNextCoverBackToast === 'function') window._forceNextCoverBackToast(reason || 'cover-return');
      if(typeof window._resetCoverBackTrap === 'function') window._resetCoverBackTrap(reason || 'cover-return');
      else if(typeof window._oaiArmCoverBackTrap === 'function') window._oaiArmCoverBackTrap(reason || 'cover-return', {force:true});
      return true;
    }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
  }
  function consumeCoverToastOnReturn(){
    var reason = '';
    try{
      reason = sessionStorage.getItem(COVER_RETURN_TOAST_KEY) || '';
      if(!reason) return false;
      var ts = parseInt(sessionStorage.getItem(COVER_RETURN_TOAST_TS_KEY) || '0', 10) || 0;
      if(ts && now() - ts > 10 * 60 * 1000){ clearCoverToastOnReturn(); return false; }
    }catch(e){ return false; }
    if(activateCoverToastOnReturn(reason)){ clearCoverToastOnReturn(); return true; }
    return false;
  }
  function scheduleCoverToastOnReturnCheck(){
    try{
      consumeCoverToastOnReturn();
      setTimeout(consumeCoverToastOnReturn, 120);
      setTimeout(consumeCoverToastOnReturn, 420);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  window.oaiPrepareCoverToastOnReturn = markCoverToastOnReturn;
  window.oaiActivateCoverToastOnReturn = activateCoverToastOnReturn;
  window.oaiCheckCoverToastOnReturn = consumeCoverToastOnReturn;
  window.addEventListener('pageshow', scheduleCoverToastOnReturnCheck, true);
  window.addEventListener('focus', scheduleCoverToastOnReturnCheck, true);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') scheduleCoverToastOnReturnCheck(); }, true);
  function clampPx(px){
    px=parseInt(px,10);
    if(FONT_SIZES.indexOf(px)>=0) return px;
    return BASE;
  }
  function getPx(){ return clampPx(localStorage.getItem(FONT_KEY)||BASE); }
  function setPx(px){
    px=clampPx(px);
    try{ localStorage.setItem(FONT_KEY,String(px)); }catch(e){ console.warn("[가톨릭길동무]", e); }
    applyScale();
    return px;
  }
  function adjustSharedFont(delta){
    delta=parseInt(delta,10)||0;
    var cur=getPx();
    var idx=FONT_SIZES.indexOf(cur);
    if(idx<0) idx=FONT_SIZES.indexOf(BASE);
    var next=idx+delta;
    if(next<0) next=0;
    if(next>=FONT_SIZES.length) next=FONT_SIZES.length-1;
    return setPx(FONT_SIZES[next]);
  }
  function applyScale(){
    var px=getPx();
    var scale=px/BASE;
    document.documentElement.classList.add('oai-font-global');
    document.documentElement.style.setProperty('--app-font-scale',String(scale));
    var pv=el('prayer-view');
    if(pv){
      pv.style.setProperty('--pr-item-fs',px+'px');
      pv.style.setProperty('--pr-body-fs',px+'px');
      pv.style.setProperty('--pr-detail-fs',(px+1)+'px');
      pv.style.setProperty('--pr-icon-sz',Math.max(34,Math.round(px*2.2))+'px');
      pv.style.setProperty('--pr-icon-fs',Math.max(17,Math.round(px*1.2))+'px');
    }
    try{
      var df=el('diocese-frame');
      if(df && df.contentWindow && typeof df.contentWindow.dioApplySharedFont==='function') df.contentWindow.dioApplySharedFont();
    }catch(e){ console.warn("[가톨릭길동무]", e); }
  }
  window.__APP_getSharedFontPx=getPx;
  window.__APP_setSharedFontPx=setPx;
  window.__APP_adjustSharedFont=adjustSharedFont;
  window.__APP_applyGlobalFont=applyScale;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', applyScale, {once:true});
  else applyScale();
  window.addEventListener('load', applyScale, {once:true});
  function ensureCoverControls(){
    var cover=el('cover');
    if(!cover) return;
    var box=el('cover-font-controls');
    if(!box){
      box=document.createElement('div');
      box.id='cover-font-controls';
      cover.appendChild(box);
    }
    box.className='pr-font-ctrl';
    box.setAttribute('aria-label','글자 크기 조절');
    box.innerHTML='<button id="cover-sm-btn" class="pr-font-btn pr-sm" type="button" aria-label="글자 작게">가</button><div class="pr-font-divider"></div><button id="cover-lg-btn" class="pr-font-btn pr-lg" type="button" aria-label="글자 크게">가</button>';
    var sm=box.querySelector('.pr-sm'),lg=box.querySelector('.pr-lg');
    if(sm)sm.onclick=function(e){e.preventDefault();e.stopPropagation();adjustSharedFont(-1)};
    if(lg)lg.onclick=function(e){e.preventDefault();e.stopPropagation();adjustSharedFont(1)};
  }
  function setEmojiIcons(){var icons={'cc-1':'✝️','cc-2':'⛪','cc-3':'🙏','cc-4':'🌿','cc-5':'🥾','cc-6':'🌐','cc-7':'🧭'};Object.keys(icons).forEach(function(id){var btn=el(id);if(!btn)return;var wrap=btn.querySelector('.cover-icon-wrap');if(wrap)wrap.innerHTML='<span class="cover-emoji" aria-hidden="true">'+icons[id]+'</span>';});}
  function configureQna(){
    window.QNA_FORM_URL=QA_URL;
    var q=el('qna-list');
    if(q) q.innerHTML='';
  }
  window.qnaOpenFormUrl=function(){ if(typeof window.goQaFirebase==='function') window.goQaFirebase(); else location.href=QA_URL; };
  function wireQnaButton(){var btn=el('qna-cover-btn');if(btn)btn.onclick=function(ev){if(ev)ev.preventDefault();window.openQnaView();};}
  function goQnaWithLoading(){
    try{ configureQna(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      markCoverToastOnReturn('qna-return-cover');
      if(typeof window.oaiHoldStabilityVeil === 'function') window.oaiHoldStabilityVeil('qna-open', 220);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
    setTimeout(function(){ location.href=QA_URL; }, 10);
  }
  window.openQnaView=function(){ goQnaWithLoading(); };
  window.goQaFirebase=function(){ goQnaWithLoading(); };
  window.qnaShowTab=function(){ configureQna(); };
  function boot(){ensureCoverControls();setEmojiIcons();configureQna();wireQnaButton();applyScale();scheduleCoverToastOnReturnCheck();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('load',function(){boot();setTimeout(boot,250);setTimeout(boot,900);},{once:true});window.addEventListener('pageshow',boot);
})();


(function(){
  if(window.__APP_PWA_INSTALL_GUARD__) return;
  window.__APP_PWA_INSTALL_GUARD__ = true;

  var promptEvent = null;
  var installing = false;

  function isStandaloneNow(){
    try{
      return window.navigator.standalone === true ||
             (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    }catch(e){ return false; }
  }

  function getBtn(){ return document.getElementById('pwa-install-btn'); }

  function showInstallBtn(){
    var btn = getBtn();
    if(btn && !isStandaloneNow()) btn.style.display = 'flex';
  }

  function hideInstallBtn(){
    var btn = getBtn();
    if(btn) btn.style.setProperty('display','none','important');
  }

  function applyVisibility(){
    if(isStandaloneNow()) hideInstallBtn();
    else if(promptEvent) showInstallBtn();
  }

  function bindInstallButton(){
    var btn = getBtn();
    if(!btn || btn.__oaiInstallBound) return;
    btn.__oaiInstallBound = true;
    btn.addEventListener('click', function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      if(ev && ev.stopPropagation) ev.stopPropagation();
      if(typeof window.triggerPwaInstall === 'function') window.triggerPwaInstall();
    });
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    promptEvent = e;
    window.__OAI_PWA_DEFERRED_PROMPT__ = e;
    installing = false;
    bindInstallButton();
    showInstallBtn();
  });

  window.addEventListener('appinstalled', function(){
    promptEvent = null;
    window.__OAI_PWA_DEFERRED_PROMPT__ = null;
    installing = false;
    hideInstallBtn();
  });

  window.triggerPwaInstall = function(){
    var p = promptEvent || window.__OAI_PWA_DEFERRED_PROMPT__;
    if(isStandaloneNow()){
      hideInstallBtn();
      return;
    }
    if(!p || installing){
      return;
    }
    installing = true;
    p.prompt();
    Promise.resolve(p.userChoice).then(function(choice){
      var accepted = choice && choice.outcome === 'accepted';
      promptEvent = null;
      window.__OAI_PWA_DEFERRED_PROMPT__ = null;
      installing = false;
      if(accepted) hideInstallBtn();
      else showInstallBtn();
    }).catch(function(err){
      console.warn('[가톨릭길동무]', err);
      promptEvent = null;
      window.__OAI_PWA_DEFERRED_PROMPT__ = null;
      installing = false;
      showInstallBtn();
    });
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindInstallButton, {once:true});
  else bindInstallButton();

  try{
    var mql = window.matchMedia && window.matchMedia('(display-mode: standalone)');
    if(mql && mql.addEventListener) mql.addEventListener('change', applyVisibility);
    else if(mql && mql.addListener) mql.addListener(applyVisibility);
  }catch(e){ console.warn('[가톨릭길동무]', e); }

  window.addEventListener('load', function(){ bindInstallButton(); applyVisibility(); });
  window.addEventListener('pageshow', function(){ bindInstallButton(); applyVisibility(); });
})();
