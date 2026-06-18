(function(){
  'use strict';
  if(window.__APP_PULL_REFRESH_CLEAN_V20_8__) return;
  window.__APP_PULL_REFRESH_CLEAN_V20_8__ = true;

  function $(id){ return document.getElementById(id); }
  function isTypingTarget(el){
    if(!el) return false;
    var tag=(el.tagName||'').toLowerCase();
    return tag==='input' || tag==='textarea' || el.isContentEditable;
  }
  function isCoverVisible(){
    var cover=$('cover');
    return !!(cover && !document.documentElement.classList.contains('app-active') && getComputedStyle(cover).display !== 'none');
  }
  function closeTransientViews(){
    try{
      document.querySelectorAll('.module-view.open,#prayer-view.open,#diocese-view.open,#missa-view.open,.sheet.open,.trail-sheet.open,#srch-modal.open,#info-card.open,#exit-dlg.open').forEach(function(v){
        v.classList.remove('open','show');
      });
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }
  function isRefreshDialogOpen(){
    try{ return !!document.getElementById('oai-refresh-content-dialog'); }catch(e){ return false; }
  }
  function isGuideModalOpen(){
    try{ return !!document.querySelector('.guide-modal.show') || !!document.querySelector('.cover-menu-modal.show') || !!document.querySelector('.my-diocese-modal.show') || isRefreshDialogOpen(); }catch(e){ return false; }
  }
  function closeGuideModals(){
    try{
      if(typeof window.closeMyFaithLifeModal === 'function' && typeof window.isMyFaithLifeModalOpen === 'function' && window.isMyFaithLifeModalOpen()){
        window.closeMyFaithLifeModal();
        return;
      }
      if(typeof window.closeCoverMenuPopup === 'function' && typeof window.isCoverMenuPopupOpen === 'function' && window.isCoverMenuPopupOpen()){
        window.closeCoverMenuPopup();
        return;
      }
      var mq = $('mass-quick-modal');
      if(mq && mq.classList.contains('show') && typeof window.closeMassQuickMenu === 'function'){
        window.closeMassQuickMenu();
      } else {
        document.querySelectorAll('.guide-modal.show').forEach(function(el){
          el.classList.remove('show');
          el.setAttribute('aria-hidden','true');
        });
      }
      if(typeof window.resetGuideManualScroll === 'function') window.resetGuideManualScroll();
      if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady();
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }

  function hideIndicator(ind){
    if(!ind) return;
    ind.classList.remove('show','ready','refreshing');
    ind.style.removeProperty('transform');
  }
  function setIndicator(ind, state, dy){
    if(!ind) return;
    var y=Math.min(Math.max(dy||0,0),112);
    ind.style.setProperty('transform','translate(-50%,' + Math.round(y * 0.36) + 'px) scale(1)','important');
    ind.classList.add('show');
    ind.classList.toggle('ready', state === 'ready');
    ind.classList.toggle('refreshing', state === 'refreshing');
  }

  window.__oaiSoftCoverRefresh = function(){
    var cover=$('cover'), ind=$('cv-pull-modern');
    try{ if(typeof window._clearMassQuickReturnForReload === 'function') window._clearMassQuickReturnForReload(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    try{
      document.documentElement.classList.remove('app-active','parish-mode','retreat-mode','oai-returning');
      closeTransientViews();
      closeGuideModals();
      if(cover){
        cover.style.display='';
        cover.style.opacity='';
        cover.style.pointerEvents='';
        cover.classList.remove('pulling','refreshing');
        cover.scrollTop=0;
      }
      hideIndicator(ind);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  };

  function installPullRefresh(){
    var cover=$('cover'), ind=$('cv-pull-modern');
    if(!cover || !ind || cover.__oaiPullRefreshCleanV20_8) return;
    cover.__oaiPullRefreshCleanV20_8 = true;

    var sx=0, sy=0, active=false, ready=false, refreshing=false;
    var THRESHOLD=74;
    var MAX=112;

    cover.addEventListener('touchstart', function(e){
      if(refreshing || isGuideModalOpen() || !isCoverVisible() || isTypingTarget(document.activeElement) || cover.scrollTop > 0 || !e.touches || !e.touches[0]) return;
      sx=e.touches[0].clientX;
      sy=e.touches[0].clientY;
      active=true;
      ready=false;
      hideIndicator(ind);
    }, {passive:true, capture:true});

    cover.addEventListener('touchmove', function(e){
      if(!active || refreshing || isGuideModalOpen() || !e.touches || !e.touches[0]){ active=false; ready=false; hideIndicator(ind); return; }
      var dx=e.touches[0].clientX - sx;
      var dy=e.touches[0].clientY - sy;
      if(Math.abs(dx) > Math.abs(dy) * 1.15){ active=false; hideIndicator(ind); return; }
      if(dy <= 3){ ready=false; hideIndicator(ind); return; }
      if(e.cancelable) e.preventDefault();
      ready = dy >= THRESHOLD;
      setIndicator(ind, ready ? 'ready' : 'pulling', Math.min(dy, MAX));
    }, {passive:false, capture:true});

    function finish(){
      if(!active) return;
      active=false;
      if(!ready){ ready=false; hideIndicator(ind); return; }
      ready=false;
      refreshing=true;
      setIndicator(ind, 'refreshing', MAX);
      try{ navigator.vibrate && navigator.vibrate(10); }catch(e){ console.warn('[가톨릭길동무]', e); }
      setTimeout(function(){
        try{ window.__oaiSoftCoverRefresh(); }catch(e){ console.warn('[가톨릭길동무]', e); }
        refreshing=false;
        hideIndicator(ind);
      }, 420);
    }
    cover.addEventListener('touchend', finish, {passive:true, capture:true});
    cover.addEventListener('touchcancel', function(){ active=false; ready=false; refreshing=false; hideIndicator(ind); }, {passive:true, capture:true});
  }

  window.addEventListener('pageshow', function(){
    try{
      var ind=$('cv-pull-modern');
      hideIndicator(ind);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }, true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPullRefresh, {once:true});
  else installPullRefresh();
})();
