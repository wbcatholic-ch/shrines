(function(){
  'use strict';
  if(window.__OAI_NEW_BACK_CONTROLLER__) return;
  window.__OAI_NEW_BACK_CONTROLLER__ = true;
  window.__BACK_CTRL__ = true;
  window.__OAI_FULL_BACK_CTRL_ACTIVE__ = true;

  var state={stage:'V7-1-COVER-HASH-BACK-EXIT-CHECK',currentBase:'cover',currentLayer:'',currentContent:'',currentModal:'',lastReason:''};
  var restoring=false;
  var exitReady=false;
  var exitTimer=0;
  var guardHash='#oai-back-guard';

  function baseHref(){ try{ return location.href.split('#')[0]; }catch(_e){ return location.href; } }
  function guardHref(){ return baseHref()+guardHash; }

  function arm(reason, opts){
    try{
      opts=opts||{};
      if(!opts.force && location.hash===guardHash) return true;
      history.replaceState({oai_back_hash_root:1,reason:reason||'stage1-root'},'',baseHref());
      history.pushState({oai_back_hash_guard:1,reason:reason||'stage1-guard'},'',guardHref());
      return true;
    }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
  }

  function setState(next){
    try{ next=next||{}; Object.keys(next).forEach(function(k){ state[k]=next[k]; }); }
    catch(e){ console.warn('[가톨릭길동무]', e); }
  }

  function getState(){
    return {stage:state.stage,currentBase:state.currentBase,currentLayer:state.currentLayer,currentContent:state.currentContent,currentModal:state.currentModal,lastReason:state.lastReason};
  }

  function isCoverVisible(){
    try{
      var cover=document.getElementById('cover');
      if(!cover) return false;
      var html=document.documentElement;
      if(html && html.classList && html.classList.contains('app-active')) return false;
      var cs=window.getComputedStyle?getComputedStyle(cover):null;
      if(cs && (cs.display==='none' || cs.visibility==='hidden')) return false;
      return true;
    }catch(_e){ return state.currentBase==='cover'; }
  }

  function clearToast(){
    try{ clearTimeout(exitTimer); }catch(_e){}
    exitTimer=0;
    try{ var old=document.getElementById('_bt'); if(old) old.remove(); }catch(_e){}
  }

  function showCoverExitToast(){
    try{
      clearToast();
      exitReady=true;
      var t=document.createElement('div');
      t.id='_bt';
      t.textContent='한 번 더 누르면 앱이 종료됩니다';
      t.style.cssText='position:fixed;top:50%;left:50%;bottom:auto;transform:translate(-50%,-50%);background:rgba(14,21,53,.94);color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:800;z-index:99999;white-space:nowrap;pointer-events:none;box-shadow:0 14px 36px rgba(0,0,0,.32);';
      document.body.appendChild(t);
      exitTimer=setTimeout(function(){ exitReady=false; clearToast(); }, 2500);
    }catch(e){ console.warn('[가톨릭길동무]', e); }
  }

  function exitFromCover(){
    try{
      exitReady=false;
      clearToast();
      try{ window._appExiting=true; }catch(_e){}
      try{ history.replaceState({oai_cover_exit:1}, '', baseHref()); }catch(_e){}
      setTimeout(function(){
        try{
          if(typeof window.attemptAppExit === 'function') window.attemptAppExit();
          else history.back();
        }catch(_e){ try{ history.back(); }catch(__e){} }
      }, 40);
      return true;
    }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
  }

  function coverBack(reason){
    try{
      if(exitReady) return exitFromCover();
      showCoverExitToast();
      arm(reason||'cover-first-back', {force:true});
      return true;
    }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
  }

  function restoreGuard(reason){
    try{
      if(restoring) return true;
      restoring=true;
      setTimeout(function(){
        try{ arm((reason||'stage1')+'-hash-rearm', {force:true}); }
        catch(e){ console.warn('[가톨릭길동무]', e); }
        restoring=false;
      }, 30);
      return true;
    }catch(e){
      restoring=false;
      try{ arm((reason||'stage1')+'-fallback', {force:true}); }catch(_e){}
      console.warn('[가톨릭길동무]', e);
      return true;
    }
  }

  function handleBack(reason){
    try{
      state.lastReason=reason||'back';
      if(isCoverVisible()) return coverBack(state.lastReason);
      exitReady=false;
      clearToast();
      return restoreGuard(state.lastReason);
    }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
  }

  function enterCover(reason){
    try{
      setState({currentBase:'cover', currentLayer:'', currentContent:'', currentModal:''});
      exitReady=false;
      clearToast();
      arm(reason||'enter-cover', {force:true});
      return true;
    }catch(e){ console.warn('[가톨릭길동무]', e); return true; }
  }

  window.OAI_BACK={arm:arm,handleBack:handleBack,enterCover:enterCover,setState:setState,getState:getState};
  window.oaiArmBackBlocker=function(reason, force){ return arm(reason||'compat-arm', {force:!!force}); };
  window.__oaiArmEarlyCoverBackGuard=window.oaiArmBackBlocker;
  window._oaiArmCoverBackTrap=function(reason){ return arm(reason||'legacy-arm-ignored', {force:true}); };
  window._oaiSuppressNextCoverBackToast=function(){};

  window.addEventListener('popstate', function(e){
    try{ if(e&&e.preventDefault)e.preventDefault(); if(e&&e.stopImmediatePropagation)e.stopImmediatePropagation(); else if(e&&e.stopPropagation)e.stopPropagation(); }catch(_e){}
    handleBack('popstate');
  }, true);

  window.addEventListener('hashchange', function(e){
    handleBack('hashchange');
  }, true);

  document.addEventListener('backbutton', function(e){
    try{ if(e&&e.preventDefault)e.preventDefault(); if(e&&e.stopImmediatePropagation)e.stopImmediatePropagation(); else if(e&&e.stopPropagation)e.stopPropagation(); }catch(_e){}
    handleBack('hardware-back');
  }, true);

  window.addEventListener('pageshow', function(){ arm('pageshow-hash', {force:true}); }, true);
  window.addEventListener('focus', function(){ setTimeout(function(){ arm('focus-hash', {force:true}); }, 0); }, true);
  enterCover('init-cover-hash');
})();
