'use strict';

(function(){
  window.bindMyFaithLifePanel = function(on){
    var DIO_KEY = 'oai_my_diocese_name';
    var PARISH_KEY = 'oai_my_parish_data';
    var NO_PARISH_NAME = '본당 선택 안함';
    var dioceses = [
      '서울대교구','대구대교구','광주대교구','수원교구','인천교구',
      '의정부교구','춘천교구','원주교구','대전교구','청주교구',
      '부산교구','마산교구','안동교구','전주교구','제주교구'
    ];
    var DIO_INFO = {
      '서울대교구': {home:'https://aos.catholic.or.kr/index', priest:'https://aos.catholic.or.kr/pro10315'},
      '대구대교구': {home:'https://www.daegu-archdiocese.or.kr/', priest:'https://www.daegu-archdiocese.or.kr/page/priest.html?srl=priest'},
      '광주대교구': {home:'https://www.gjcatholic.or.kr/', priest:'https://www.gjcatholic.or.kr/priest/priests'},
      '수원교구': {home:'https://www.casuwon.or.kr/', priest:'https://www.casuwon.or.kr/priest/priest'},
      '인천교구': {home:'http://www.caincheon.or.kr/', priest:'http://www.caincheon.or.kr/father/father_list.do'},
      '의정부교구': {home:'http://ucatholic.or.kr/', priest:'http://ucatholic.or.kr/bbs/board.php?bo_table=priest'},
      '춘천교구': {home:'https://www.cccatholic.or.kr/', priest:'https://www.cccatholic.or.kr/diocese/priest/priest'},
      '원주교구': {home:'http://www.wjcatholic.or.kr/', priest:'http://www.wjcatholic.or.kr/company/sajedan'},
      '대전교구': {home:'https://www.djcatholic.or.kr/home/', priest:'https://www.djcatholic.or.kr/home/pages/priest_list.php'},
      '청주교구': {home:'https://www.cdcj.or.kr/', priest:'https://www.cdcj.or.kr/diocese/priest/priest'},
      '부산교구': {home:'https://www.catholicbusan.or.kr/', priest:'https://www.catholicbusan.or.kr/clergy/priest'},
      '마산교구': {home:'https://cathms.kr/', priest:'https://cathms.kr/saje'},
      '안동교구': {home:'https://www.acatholic.or.kr/', priest:'https://www.acatholic.or.kr/sub2/sub1.asp'},
      '전주교구': {home:'https://jcatholic.or.kr/index.php', priest:'https://www.jcatholic.or.kr/theme/main/pages/priest.php?st=diocese'},
      '제주교구': {home:'https://www.diocesejeju.or.kr/', priest:'https://www.diocesejeju.or.kr/diocese_father'}
    };
    var btn = document.getElementById('cover-diocese-btn');
    var menuBtn = document.getElementById('cover-menu-myfaith-btn');
    var setupBanner = document.getElementById('my-diocese-setup-banner');
    var modal = document.getElementById('my-diocese-modal');
    var body = document.getElementById('my-diocese-list');
    var title = document.getElementById('my-diocese-title');
    var subtitle = modal ? modal.querySelector('.my-diocese-subtitle') : null;
    if(!btn || !modal || !body) return;
    var myFaithStableHeight = 0;
    var myFaithPendingActive = false;
    var myFaithPendingName = '';
    var myFaithPendingParish = null;
    var myFaithRenderSettingsEdit = null;
    var myFaithExpandedSection = '';
    function selectedName(){ try{ return (localStorage.getItem(DIO_KEY) || '').trim(); }catch(e){ return ''; } }
    function setSelectedName(name){ try{ localStorage.setItem(DIO_KEY, String(name || '').trim()); }catch(e){ console.warn('[가톨릭길동무]', e); } }
    function noParishItem(dioceseName){ return {name:NO_PARISH_NAME,diocese:String(dioceseName||''),addr:'',hp:'',url:'',none:true}; }
    function isNoParishItem(item){ return !!(item && (item.none === true || String(item.name||'') === NO_PARISH_NAME)); }
    function selectedParish(){
      try{ var raw = localStorage.getItem(PARISH_KEY) || ''; if(!raw) return null; var item = JSON.parse(raw); return item && item.name ? item : null; }
      catch(e){ return null; }
    }
    function setSelectedParish(item){
      try{
        if(!item || !item.name){ localStorage.removeItem(PARISH_KEY); return; }
        localStorage.setItem(PARISH_KEY, JSON.stringify({name:String(item.name||''),diocese:String(item.diocese||''),addr:String(item.addr||''),hp:String(item.hp||''),url:String(item.url||''),none:isNoParishItem(item)}));
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function cloneMyFaithParish(item){
      if(!item || !item.name) return null;
      return {name:String(item.name||''),diocese:String(item.diocese||''),addr:String(item.addr||''),hp:String(item.hp||''),url:String(item.url||''),none:isNoParishItem(item)};
    }
    function beginMyFaithPendingEdit(){
      myFaithPendingActive = true;
      myFaithPendingName = selectedName();
      myFaithPendingParish = cloneMyFaithParish(selectedParish());
      myFaithExpandedSection = 'diocese';
    }
    function beginMyFaithBlankEdit(){
      myFaithPendingActive = true;
      myFaithPendingName = '';
      myFaithPendingParish = null;
      myFaithExpandedSection = 'diocese';
    }
    function cancelMyFaithPendingEdit(){
      myFaithPendingActive = false;
      myFaithPendingName = '';
      myFaithPendingParish = null;
      myFaithExpandedSection = '';
    }
    function getMyFaithEditName(){ if(!myFaithPendingActive) beginMyFaithPendingEdit(); return String(myFaithPendingName || '').trim(); }
    function getMyFaithEditParish(){ if(!myFaithPendingActive) beginMyFaithPendingEdit(); return myFaithPendingParish; }
    function setMyFaithEditName(name){
      if(!myFaithPendingActive) beginMyFaithPendingEdit();
      name = String(name || '').trim();
      if(String(myFaithPendingName || '').trim() !== name) myFaithPendingParish = null;
      myFaithPendingName = name;
      myFaithExpandedSection = name ? 'parish' : 'diocese';
    }
    function setMyFaithEditParish(item){ if(!myFaithPendingActive) beginMyFaithPendingEdit(); myFaithPendingParish = cloneMyFaithParish(item); myFaithExpandedSection = ''; }
    function commitMyFaithPendingEdit(){
      if(!myFaithPendingActive) return true;
      var name = String(myFaithPendingName || '').trim();
      var parish = cloneMyFaithParish(myFaithPendingParish);
      if(!name){
        try{ alert('교구를 선택해 주세요.'); }catch(_e){}
        return false;
      }
      if(!parish || !parish.name) parish = noParishItem(name);
      if(isNoParishItem(parish)) parish.diocese = name;
      setSelectedName(name);
      setSelectedParish(parish);
      cancelMyFaithPendingEdit();
      updateButton();
      refreshDependentViews();
      return true;
    }
    function cancelMyFaithSettingsAndReturn(){
      var hadSavedSetting = !!selectedName();
      cancelMyFaithPendingEdit();
      if(hadSavedSetting) renderHome();
      else closeModal();
    }
    function returnToMyFaithSettingsEdit(){
      if(typeof myFaithRenderSettingsEdit === 'function') myFaithRenderSettingsEdit();
      else renderHome();
    }
    function safeText(x){ return String(x || '').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c); }); }
    function setHeader(main, sub){ if(title){ title.textContent = main || '나의 신앙생활'; try{ title.setAttribute('data-myfaith-title', title.textContent); }catch(_e){} } if(subtitle) subtitle.textContent = sub || ''; }
    function setBodyMode(name){ body.className = name || 'my-faith-body'; body.innerHTML = ''; }
    function isElementVisibleForSetup(el){
      try{
        if(!el) return false;
        if(el.hidden) return false;
        if(el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
        var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
        if(cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')) return false;
        return true;
      }catch(_e){ return false; }
    }
    function isInstallGuideVisible(){
      try{
        return isElementVisibleForSetup(document.getElementById('pwa-install-btn')) ||
               isElementVisibleForSetup(document.getElementById('ios-kakao-safari-banner'));
      }catch(_e){ return false; }
    }
    var setupBannerRefreshTimer = null;
    function scheduleSetupBannerUpdate(){
      try{
        if(setupBannerRefreshTimer) clearTimeout(setupBannerRefreshTimer);
        setupBannerRefreshTimer = setTimeout(function(){
          setupBannerRefreshTimer = null;
          updateSetupBanner();
        }, 40);
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function bindSetupBannerVisibilityWatch(){
      try{
        ['pwa-install-btn','ios-kakao-safari-banner'].forEach(function(id){
          var el = document.getElementById(id);
          if(!el || el.__myDioceseSetupWatchBound) return;
          el.__myDioceseSetupWatchBound = true;
          new MutationObserver(scheduleSetupBannerUpdate).observe(el, {attributes:true, attributeFilter:['style','hidden','class','aria-hidden']});
        });
        if(document.documentElement && !document.documentElement.__myDioceseSetupWatchBound){
          document.documentElement.__myDioceseSetupWatchBound = true;
          new MutationObserver(scheduleSetupBannerUpdate).observe(document.documentElement, {attributes:true, attributeFilter:['class']});
        }
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function updateSetupBanner(){
      try{
        var showBanner = !selectedName() && !isInstallGuideVisible();
        var coverEl = document.getElementById('cover');
        if(coverEl) coverEl.classList.toggle('my-diocese-setup-active', showBanner);
        if(!setupBanner) return;
        setupBanner.hidden = !showBanner;
        setupBanner.classList.toggle('show', showBanner);
        setupBanner.setAttribute('aria-hidden', showBanner ? 'false' : 'true');
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    window.refreshMyDioceseSetupBanner = scheduleSetupBannerUpdate;
    function updateButton(){
      btn.innerHTML = '<span class="cover-faith-cross" aria-hidden="true">✞</span><span class="diocese-btn-label">나의 신앙생활</span>';
      btn.setAttribute('aria-label','나의 신앙생활 열기');
      updateSetupBanner();
    }
    function refreshDependentViews(){
      try{ if(typeof _renderDioFilterBars === 'function') _renderDioFilterBars(_mode); }catch(_e){}
      try{ if(typeof window.webRenderCats === 'function') window.webRenderCats(); }catch(_e){}
      try{ if(typeof window.webRenderList === 'function') window.webRenderList(); }catch(_e){}
      try{ if(typeof window.prRefreshVisibleCats === 'function') window.prRefreshVisibleCats(); }catch(_e){}
    }
    var myFaithExternalSettleUntil = 0;
    function nowMs(){ return Date.now ? Date.now() : new Date().getTime(); }
    function markMyFaithExternalSettling(ms){
      try{
        myFaithExternalSettleUntil = nowMs() + (ms || 1800);
        if(modal && modal.classList) modal.classList.add('return-settling');
        clearTimeout(window.__oaiMyFaithExternalSettleTimer);
        window.__oaiMyFaithExternalSettleTimer = setTimeout(function(){
          try{ if(nowMs() >= myFaithExternalSettleUntil && modal && modal.classList) modal.classList.remove('return-settling'); }catch(_e){}
        }, ms || 1800);
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function isMyFaithExternalSettling(){
      try{ return !!(myFaithExternalSettleUntil && nowMs() < myFaithExternalSettleUntil); }catch(_e){ return false; }
    }
    function updateMyFaithViewport(){
      try{
        var vv = window.visualViewport || null;
        var layoutH = Math.round(document.documentElement.clientHeight || window.innerHeight || 0);
        var innerH = Math.round(window.innerHeight || 0);
        var visibleH = Math.round((vv && vv.height) || innerH || layoutH || 0);
        var stableCandidateH = Math.max(layoutH || 0, innerH || 0);
        if(!stableCandidateH && visibleH) stableCandidateH = visibleH;
        if(stableCandidateH && stableCandidateH > myFaithStableHeight) myFaithStableHeight = stableCandidateH;
        if(!myFaithStableHeight) myFaithStableHeight = stableCandidateH || visibleH || 0;
        var active = document.activeElement || null;
        var focusedInput = !!(active && modal.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName || ''));
        if(isMyFaithExternalSettling() && !focusedInput){
          modal.classList.add('return-settling');
          return;
        }
        var keyboardLikely = focusedInput || !!(myFaithStableHeight && visibleH && visibleH < myFaithStableHeight - 120) || !!(vv && Math.round(vv.offsetTop || 0) > 0);
        var modalH = myFaithStableHeight || stableCandidateH || visibleH || 0;
        if(modalH > 0) modal.style.setProperty('--my-faith-vh', modalH + 'px');
        if(visibleH > 0) modal.style.setProperty('--my-faith-visible-vh', visibleH + 'px');
        modal.classList.toggle('keyboard-open', keyboardLikely);
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function resetCoverBackAfterMyFaith(reason){
      try{ if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed(); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{ if(typeof window._forceNextCoverBackToast === 'function') window._forceNextCoverBackToast(reason || 'my-faith-close'); }catch(e){ console.warn('[가톨릭길동무]', e); }
      try{
        if(typeof window._oaiArmCoverBackTrap === 'function'){
          window._oaiArmCoverBackTrap(reason || 'my-faith-close', {force:true});
        }else{
          var href = location.href.split('#')[0];
          
        }
      }catch(e){ console.warn('[가톨릭길동무]', e); }
    }
    function goFreshCoverAfterMyFaith(reason){
      /*
       * V6-160 확인용: V6-155~159의 fresh location.replace 방식은
       * 안내문구는 살렸지만, 실제 종료 단계에서 이전 문서 history가 남아
       * 안내문구 후 뒤로가기를 두 번 더 눌러야 하는 경우가 있었다.
       * 그래서 나의 신앙생활은 현재 문서 안에서 커버를 보이고,
       * 커버 전용 root+trap만 다시 세운다.
       */
      try{
        reason = reason || 'my-faith-close';
        sessionStorage.setItem('oai_myfaith_return_cover_reason', reason);
        sessionStorage.setItem('oai_myfaith_return_cover_ts', String(Date.now ? Date.now() : new Date().getTime()));
        sessionStorage.setItem('oai_cover_exit_hard_after_first_toast', '1');
        sessionStorage.setItem('oai_cover_exit_long_window_once', '1');
        sessionStorage.removeItem('oai_app_exit_back_steps');
      }catch(_e){}
      try{
        var root = document.documentElement;
        var cover = document.getElementById('cover');
        if(root) root.classList.remove('app-active','parish-mode','retreat-mode');
        if(typeof window.oaiSetMainMapLayerHidden === 'function') window.oaiSetMainMapLayerHidden(false);
        if(cover){
          cover.style.display = '';
          cover.style.opacity = '';
          cover.style.pointerEvents = '';
          try{ cover.scrollTop = 0; }catch(_e){}
        }
        resetCoverBackAfterMyFaith(reason);
        clearGenericCoverToastFlag();
        clearMyFaithExternalLinkFlag();
        return true;
      }catch(e){
        console.warn('[가톨릭길동무]', e);
      }
      return false;
    }
    function clearGenericCoverToastFlag(){
      try{
        sessionStorage.removeItem('oai_cover_toast_on_return');
        sessionStorage.removeItem('oai_cover_toast_on_return_ts');
      }catch(_e){}
    }
    function primeMyFaithCoverExitToast(reason){
      try{
        if(modal && modal.classList && modal.classList.contains('show')) return false;
        var root = document.documentElement;
        var cover = document.getElementById('cover');
        if(root) root.classList.remove('app-active','parish-mode','retreat-mode');
        if(typeof window.oaiSetMainMapLayerHidden === 'function') window.oaiSetMainMapLayerHidden(false);
        if(cover){
          cover.style.display = '';
          cover.style.opacity = '';
          cover.style.pointerEvents = '';
          try{ cover.scrollTop = 0; }catch(_e){}
        }
        resetCoverBackAfterMyFaith(reason || 'my-faith-external-cover');
        clearGenericCoverToastFlag();
        clearMyFaithExternalLinkFlag();
        return true;
      }catch(e){ console.warn('[가톨릭길동무]', e); return false; }
    }
    function closeModal(){
      var fromExternal = hasRecentMyFaithExternalLink();
      var pendingCoverToast = hasPendingCoverToastOnReturn();
      var reason = (fromExternal || pendingCoverToast) ? 'my-faith-external-cover' : 'my-faith-close';
      cancelMyFaithPendingEdit();
      modal.classList.remove('show','keyboard-open','return-settling');
      modal.setAttribute('aria-hidden','true');
      try{ document.body.classList.remove('modal-open'); }catch(_e){}
      try{ modal.style.removeProperty('--my-faith-vh'); modal.style.removeProperty('--my-faith-visible-vh'); }catch(_e){}
      myFaithStableHeight = 0;
      try{ clearMyFaithExternalLinkFlag(); }catch(_e){}
      /*
       * 나의 신앙생활은 커버 위 팝업 상태에서 외부 사이트/설정/뒤로가기 흐름이 섞이면
       * 기존 history state가 root로 남아 첫 뒤로가기가 앱 밖으로 빠지는 경우가 있었다.
       * 매일미사/성가/성경 흐름은 건드리지 않고, 나의 신앙생활을 닫는 순간만
       * index.html로 fresh replace 하여 back-controller 초기 cover trap을 다시 세운다.
       */
      if(goFreshCoverAfterMyFaith(reason)) return;
      primeMyFaithCoverExitToast(reason);
      if(window.requestAnimationFrame) window.requestAnimationFrame(function(){ primeMyFaithCoverExitToast(reason + '-raf'); });
    }
    function openModal(opts){
      opts = opts || {};
      if(!opts.keepContent) renderHome();
      updateMyFaithViewport();
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
      try{ document.body.classList.add('modal-open'); }catch(_e){}
      try{
        if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady();
        if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed();
        if(typeof window._pushCoverOverlayBackTrap === 'function') window._pushCoverOverlayBackTrap('my-faith', 'my-faith-open');
      }catch(e){ console.warn('[가톨릭길동무]', e); }
      setTimeout(updateMyFaithViewport, opts.fromExternal ? 180 : 80);
    }
    window.isMyFaithLifeModalOpen = function(){ try{ return !!(modal && modal.classList.contains('show')); }catch(_e){ return false; } };
    window.closeMyFaithLifeModal = function(){ closeModal(); };
    function normalizeMyFaithExternalUrl(url){
      url = String(url || '').trim();
      if(!url) return '';
      try{
        if(typeof prepareExternalUrl === 'function') url = prepareExternalUrl(url);
        else if(typeof normalizeCatholicExternalUrl === 'function') url = normalizeCatholicExternalUrl(url);
      }catch(_e){}
      return String(url || '').trim();
    }
    var MYFAITH_EXTERNAL_FLAG = 'oai_myfaith_external_link_pending';
    var MYFAITH_EXTERNAL_TS = 'oai_myfaith_external_link_ts';
    function markMyFaithExternalLink(){
      try{
        sessionStorage.setItem(MYFAITH_EXTERNAL_FLAG, '1');
        sessionStorage.setItem(MYFAITH_EXTERNAL_TS, String(Date.now ? Date.now() : new Date().getTime()));
        sessionStorage.setItem('oai_cover_toast_on_return', 'my-faith-external-return-cover');
        sessionStorage.setItem('oai_cover_toast_on_return_ts', String(Date.now ? Date.now() : new Date().getTime()));
      }catch(_e){}
      try{ if(typeof window.oaiPrepareCoverToastOnReturn === 'function') window.oaiPrepareCoverToastOnReturn('my-faith-external-return-cover'); }catch(_e){}
      try{ markMyFaithExternalSettling(2200); }catch(_e){}
      try{ if(typeof window._resetCoverExitReady === 'function') window._resetCoverExitReady(); }catch(_e){}
      try{ if(typeof window._clearCoverExitArmed === 'function') window._clearCoverExitArmed(); }catch(_e){}
      try{
        if(modal && modal.classList.contains('show') && typeof window._pushCoverOverlayBackTrap === 'function'){
          window._pushCoverOverlayBackTrap('my-faith-external', 'my-faith-external-link');
        }
      }catch(_e){}
    }
    try{ window.oaiMarkMyFaithExternalLink = markMyFaithExternalLink; }catch(_e){}
    function clearMyFaithExternalLinkFlag(){
      try{ sessionStorage.removeItem(MYFAITH_EXTERNAL_FLAG); sessionStorage.removeItem(MYFAITH_EXTERNAL_TS); }catch(_e){}
    }
    function hasRecentMyFaithExternalLink(){
      try{
        if(sessionStorage.getItem(MYFAITH_EXTERNAL_FLAG) !== '1') return false;
        var ts = parseInt(sessionStorage.getItem(MYFAITH_EXTERNAL_TS) || '0', 10) || 0;
        if(ts && Date.now && Date.now() - ts > 10 * 60 * 1000){
          clearMyFaithExternalLinkFlag();
          return false;
        }
        return true;
      }catch(_e){ return false; }
    }
    function hasPendingCoverToastOnReturn(){
      try{
        var reason = sessionStorage.getItem('oai_cover_toast_on_return') || '';
        if(!reason) return false;
        var ts = parseInt(sessionStorage.getItem('oai_cover_toast_on_return_ts') || '0', 10) || 0;
        if(ts && Date.now && Date.now() - ts > 10 * 60 * 1000) return false;
        return true;
      }catch(_e){ return false; }
    }
    function forceCoverTrapAfterMyFaithExternal(reason){
      primeMyFaithCoverExitToast(reason || 'my-faith-external-cover');
    }
    function stabilizeCoverAfterMyFaithExternal(reason){
      if(!hasRecentMyFaithExternalLink()) return;
      if(modal && modal.classList && modal.classList.contains('show')) return;
      primeMyFaithCoverExitToast(reason || 'my-faith-external-cover');
    }
    function goExternal(url){
      url = normalizeMyFaithExternalUrl(url);
      if(!url) return;
      try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(_e){}
      markMyFaithExternalLink();
      try{
        if(typeof window.oaiSmoothNavigate === 'function'){
          window.oaiSmoothNavigate(url, 'my-faith-external');
          return;
        }
      }catch(_e){}
      setTimeout(function(){ try{ location.assign(url); }catch(e){ try{ location.href = url; }catch(_e){} } }, 70);
    }
    function bindMyFaithClick(el, fn){
      if(!el || typeof fn !== 'function') return;
      el.addEventListener('click', function(e){
        if(e && e.preventDefault) e.preventDefault();
        if(e && e.stopPropagation) e.stopPropagation();
        try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(_e){}
        fn();
        return false;
      }, false);
    }
    function smallButton(label, fn){
      var b=document.createElement('button');
      b.type='button';
      b.className='my-faith-small-btn';
      b.textContent=label;
      bindMyFaithClick(b, function(){ fn&&fn(); });
      return b;
    }
    function appendMyFaithPrivacyNote(){ var note=document.createElement('div'); note.className='my-faith-inline-privacy-note'; note.textContent='선택한 교구와 본당 정보는 이 기기 안에만 저장되며, 외부로 수집되거나 전송되지 않습니다.'; body.appendChild(note); }
    function appendMyFaithConfirmButton(onConfirm){
      var wrap=document.createElement('div');
      wrap.className='my-faith-inline-confirm';
      var ok=document.createElement('button');
      ok.type='button';
      ok.className='my-faith-confirm-btn';
      ok.textContent='확인';
      bindMyFaithClick(ok, function(){
        var result = true;
        if(typeof onConfirm === 'function') result = onConfirm();
        if(result === false) return;
        if(result === 'stay') return;
        closeModal();
      });
      wrap.appendChild(ok);
      body.appendChild(wrap);
    }
    function settleMyFaithHomeScroll(){ try{ if(!body || !body.classList.contains('my-faith-home-list-body')) return; body.scrollTop=0; body.classList.remove('my-faith-no-scroll'); setTimeout(function(){ try{ body.classList.remove('my-faith-no-scroll'); }catch(_e){} },120); }catch(e){ console.warn('[가톨릭길동무]', e); } }

    function appendInlineDiocesePicker(sec){
      var current=getMyFaithEditName();
      var grid=document.createElement('div');
      grid.className='my-faith-inline-diocese-grid';
      dioceses.forEach(function(name){
        var item=document.createElement('button');
        item.type='button';
        item.className='my-faith-inline-diocese-option'+(current===name?' selected':'');
        item.textContent=name;
        item.setAttribute('aria-pressed', current===name?'true':'false');
        bindMyFaithClick(item, function(){
          setMyFaithEditName(name);
          myFaithExpandedSection = 'parish';
          returnToMyFaithSettingsEdit();
        });
        grid.appendChild(item);
      });
      sec.appendChild(grid);
    }
    function appendParishDisabledHint(sec){
      var wrap=document.createElement('div');
      wrap.className='my-faith-inline-parish-disabled';
      wrap.innerHTML='<div class="my-faith-inline-note">본당 선택은 교구를 먼저 선택한 뒤 가능합니다.</div><div class="my-faith-inline-disabled-input">본당명 또는 주소 검색</div><div class="my-faith-inline-empty">교구를 먼저 선택해 주세요.</div>';
      sec.appendChild(wrap);
    }
    function appendInlineParishSearch(sec){
      var wrap=document.createElement('div');
      wrap.className='my-faith-inline-parish-search';
      var input=document.createElement('input');
      input.type='search';
      input.className='my-faith-search-input my-faith-inline-search-input';
      input.placeholder='본당명 또는 주소 검색';
      var results=document.createElement('div');
      results.className='my-faith-search-results my-faith-inline-search-results';
      var tools=document.createElement('div');
      tools.className='my-faith-tools my-faith-inline-parish-tools';
      tools.appendChild(smallButton('선택 안함', function(){ setMyFaithEditParish(noParishItem(getMyFaithEditName())); myFaithExpandedSection = ''; returnToMyFaithSettingsEdit(); }));
      wrap.appendChild(input);
      wrap.appendChild(results);
      wrap.appendChild(tools);
      sec.appendChild(wrap);
      function draw(){
        var q=String(input.value||'').trim().toLowerCase();
        var items=getParishItems();
        var myDio=getMyFaithEditName();
        if(myDio) items=items.filter(function(p){ return p && p.diocese===myDio; });
        if(q) items=items.filter(function(p){ return String((p.name||'')+' '+(p.addr||'')+' '+(p.diocese||'')).toLowerCase().indexOf(q)>=0; });
        items=sortParishItems(items);
        results.innerHTML='';
        if(!items.length){ results.innerHTML='<div class="my-faith-empty">검색 결과가 없습니다.</div>'; return; }
        items.forEach(function(p){
          var card=document.createElement('button');
          card.type='button';
          card.className='my-faith-parish-result';
          card.innerHTML='<strong>'+safeText(p.name)+'</strong><span>'+safeText(p.diocese||'')+(p.addr?' · '+safeText(p.addr):'')+'</span>';
          bindMyFaithClick(card, function(){ setMyFaithEditParish(p); myFaithExpandedSection = ''; returnToMyFaithSettingsEdit(); });
          results.appendChild(card);
        });
      }
      input.addEventListener('input', draw);
      input.addEventListener('focus', function(){ try{ modal.classList.add('keyboard-open'); updateMyFaithViewport(); }catch(_e){} });
      input.addEventListener('blur', function(){ setTimeout(function(){ try{ updateMyFaithViewport(); }catch(_e){} },180); });
      var selectedDioCode=getSelectedDioceseCode();
      if(selectedDioCode && typeof _ensureParishDioceseDataLoaded === 'function'){
        results.innerHTML='<div class="my-faith-empty">'+safeText(getMyFaithEditName())+' 본당 정보를 불러오는 중입니다...</div>';
        _ensureParishDioceseDataLoaded(selectedDioCode).then(function(){ draw(); }).catch(function(){ draw(); });
      }else if(!_parishRawLoaded && typeof _ensureParishDataLoaded === 'function'){
        results.innerHTML='<div class="my-faith-empty">성당 정보를 불러오는 중입니다...</div>';
        _ensureParishDataLoaded().then(function(){ draw(); }).catch(function(){ draw(); });
      }else{ draw(); }
      setTimeout(function(){ try{ updateMyFaithViewport(); }catch(_e){} },80);
    }

    function renderHome(){
      var name = selectedName(); var info = name ? DIO_INFO[name] : null; var parish = selectedParish();
      setHeader('나의 신앙생활', '설정 상태와 바로가기를 한곳에서 확인');
      setBodyMode('my-faith-body my-faith-home-list-body');
      function rowButton(label, fn, disabled, cls){ var b=document.createElement('button'); b.type='button'; b.className='my-faith-row-btn'+(cls?(' '+cls):''); b.textContent=label; if(disabled){ b.disabled=true; } else { bindMyFaithClick(b, function(){ fn&&fn(); }); } return b; }
      function rowExternalLink(label, url, disabled, cls){
        url = normalizeMyFaithExternalUrl(url);
        if(disabled || !url) return rowButton(label, null, true, cls);
        var a=document.createElement('a');
        a.className='my-faith-row-btn'+(cls?(' '+cls):'');
        a.textContent=label || '열기';
        a.href=url;
        a.target='_blank';
        a.rel='noopener noreferrer external';
        a.setAttribute('aria-label','외부 브라우저에서 열기');
        a.setAttribute('data-myfaith-external-link','1');
        a.onclick=function(){
          markMyFaithExternalLink();
          return true;
        };
        a.addEventListener('click', function(){ markMyFaithExternalLink(); }, true);
        return a;
      }
      function listSection(t,c){ var sec=document.createElement('section'); sec.className='my-faith-section my-faith-list-section '+(c||''); var h=document.createElement('h3'); h.textContent=t; sec.appendChild(h); return sec; }
      function appendRow(sec,label,value,status,buttonLabel,fn,disabled,cls){ var row=document.createElement('div'); row.className='my-faith-list-row'+(disabled?' is-disabled':'')+(status?(' has-status-'+status):''); var main=document.createElement('div'); main.className='my-faith-row-main'; var top=document.createElement('div'); top.className='my-faith-row-top'; var strong=document.createElement('strong'); strong.textContent=label; top.appendChild(strong); if(status){ var badge=document.createElement('span'); badge.className='my-faith-row-status '+status; badge.textContent=status==='done'?'설정됨':'설정 필요'; top.appendChild(badge); } main.appendChild(top); if(value){ var sub=document.createElement('span'); sub.className='my-faith-row-sub'; sub.textContent=value; main.appendChild(sub); } row.appendChild(main); row.appendChild(rowButton(buttonLabel, fn, disabled, cls)); sec.appendChild(row); return row; }
      function appendExternalRow(sec,label,value,status,buttonLabel,url,disabled,cls){ var row=document.createElement('div'); row.className='my-faith-list-row'+(disabled?' is-disabled':'')+(status?(' has-status-'+status):''); var main=document.createElement('div'); main.className='my-faith-row-main'; var top=document.createElement('div'); top.className='my-faith-row-top'; var strong=document.createElement('strong'); strong.textContent=label; top.appendChild(strong); if(status){ var badge=document.createElement('span'); badge.className='my-faith-row-status '+status; badge.textContent=status==='done'?'설정됨':'설정 필요'; top.appendChild(badge); } main.appendChild(top); if(value){ var sub=document.createElement('span'); sub.className='my-faith-row-sub'; sub.textContent=value; main.appendChild(sub); } row.appendChild(main); row.appendChild(rowExternalLink(buttonLabel, url, disabled, cls)); sec.appendChild(row); return row; }
      function renderSettingsEdit(){
        if(!myFaithPendingActive) beginMyFaithPendingEdit();
        setHeader('나의 설정', '교구와 본당을 선택해 주세요');
        setBodyMode('my-faith-body my-faith-home-list-body my-faith-edit-accordion-body');
        var settings=listSection('나의 설정','my-faith-settings-section my-faith-setup-editor');
        var curName = getMyFaithEditName();
        var curParish = getMyFaithEditParish();

        function appendEditStatusRow(label, value, status, buttonLabel, fn){
          var row=document.createElement('div');
          row.className='my-faith-list-row my-faith-edit-status-row'+(status?(' has-status-'+status):'')+(!buttonLabel?' is-static':'');
          var main=document.createElement('div');
          main.className='my-faith-row-main';
          var top=document.createElement('div');
          top.className='my-faith-row-top';
          var strong=document.createElement('strong');
          strong.textContent=label;
          top.appendChild(strong);
          if(status){
            var badge=document.createElement('span');
            badge.className='my-faith-row-status '+status;
            badge.textContent=status==='done'?'선택됨':'선택 필요';
            top.appendChild(badge);
          }
          main.appendChild(top);
          if(value){
            var sub=document.createElement('span');
            sub.className='my-faith-row-sub';
            sub.textContent=value;
            main.appendChild(sub);
          }
          row.appendChild(main);
          if(buttonLabel){ row.appendChild(rowButton(buttonLabel, fn, false, 'my-faith-row-btn-set')); }
          settings.appendChild(row);
          return row;
        }

        var showDiocesePicker = !curName || myFaithExpandedSection === 'diocese';
        appendEditStatusRow('내 교구', curName || '교구를 먼저 선택해 주세요.', curName ? 'done' : 'needed', curName && !showDiocesePicker ? '다시 선택' : '', function(){ myFaithExpandedSection = 'diocese'; renderSettingsEdit(); });
        if(showDiocesePicker) appendInlineDiocesePicker(settings);

        if(!curName){
          appendEditStatusRow('내 본당', '교구 선택 후 본당을 선택할 수 있습니다.', 'needed', '', null);
          appendParishDisabledHint(settings);
        }else{
          var showParishPicker = !curParish || myFaithExpandedSection === 'parish';
          appendEditStatusRow('내 본당', curParish ? curParish.name : '선택하지 않아도 저장할 수 있습니다.', 'done', curParish && !showParishPicker ? '다시 선택' : '', function(){ myFaithExpandedSection = 'parish'; renderSettingsEdit(); });
          if(showParishPicker) appendInlineParishSearch(settings);
        }

        body.appendChild(settings);
        var tools=document.createElement('div');
        tools.className='my-faith-tools my-faith-change-tools';
        var backBtn=smallButton('취소', cancelMyFaithSettingsAndReturn);
        backBtn.classList.add('my-faith-back-small-btn');
        tools.appendChild(backBtn);
        body.appendChild(tools);
        appendMyFaithConfirmButton(function(){
          if(commitMyFaithPendingEdit() === false) return false;
          renderHome();
          return 'stay';
        });
        appendMyFaithPrivacyNote();
        settleMyFaithHomeScroll();
      }
      myFaithRenderSettingsEdit = renderSettingsEdit;
      if(name){
        var quick=listSection('내 교구·본당 정보','my-faith-quick-section');
        appendExternalRow(quick, name+' 홈페이지','', '', '열기', info&&info.home, !(info&&info.home), 'my-faith-row-btn-open');
        appendExternalRow(quick, name+' 사제 찾기','', '', '열기', info&&info.priest, !(info&&info.priest), 'my-faith-row-btn-open');
        if(!parish || isNoParishItem(parish)){
          appendRow(quick, '내 본당', NO_PARISH_NAME, '', '변경', function(){ beginMyFaithPendingEdit(); myFaithExpandedSection = 'parish'; renderSettingsEdit(); }, false, 'my-faith-row-btn-set');
        }
        if(parish && !isNoParishItem(parish) && parish.hp){
          var parishHomeRow = appendExternalRow(quick, parish.name+' 홈페이지','', '', '열기', parish.hp, false, 'my-faith-row-btn-open');
          if(parishHomeRow) parishHomeRow.classList.add('my-faith-parish-info-row');
        }
        if(parish && !isNoParishItem(parish) && parish.url){
          var parishDetailRow = appendExternalRow(quick, parish.name+' 상세정보','', '', '열기', parish.url, false, 'my-faith-row-btn-open');
          if(parishDetailRow) parishDetailRow.classList.add('my-faith-parish-info-row');
        }
        body.appendChild(quick);
        var changeWrap=document.createElement('div');
        changeWrap.className='my-faith-change-settings-wrap';
        var changeBtn=document.createElement('button');
        changeBtn.type='button';
        changeBtn.className='my-faith-change-settings-btn';
        changeBtn.textContent='교구·본당 변경';
        bindMyFaithClick(changeBtn, function(){ beginMyFaithBlankEdit(); renderSettingsEdit(); });
        changeWrap.appendChild(changeBtn);
        body.appendChild(changeWrap);
      }else{
        beginMyFaithBlankEdit();
        renderSettingsEdit();
        return;
      }
      appendMyFaithConfirmButton(); appendMyFaithPrivacyNote(); settleMyFaithHomeScroll();
    }
    function renderDioceseList(){
      var current=getMyFaithEditName(); setHeader('나의 교구 선택','확인을 눌러야 저장됩니다'); setBodyMode('my-diocese-list');
      dioceses.forEach(function(name){ var item=document.createElement('button'); item.type='button'; item.className='my-diocese-option'+(current===name?' selected':''); item.textContent=name; item.setAttribute('aria-pressed', current===name?'true':'false'); bindMyFaithClick(item, function(){ setMyFaithEditName(name); myFaithExpandedSection = 'parish'; returnToMyFaithSettingsEdit(); }); body.appendChild(item); });
      var noneItem=document.createElement('button'); noneItem.type='button'; noneItem.className='my-diocese-option my-diocese-none'+(!current?' selected':''); noneItem.textContent='선택 안함'; noneItem.setAttribute('aria-pressed', !current?'true':'false'); bindMyFaithClick(noneItem, function(){ setMyFaithEditName(''); setMyFaithEditParish(null); myFaithExpandedSection = 'diocese'; returnToMyFaithSettingsEdit(); }); body.appendChild(noneItem);
    }
    function getSelectedDioceseCode(){ var myDio=myFaithPendingActive ? getMyFaithEditName() : selectedName(); if(!myDio) return null; try{ if(typeof _PARISH_DIO_CODE_MAP !== 'undefined' && _PARISH_DIO_CODE_MAP && _PARISH_DIO_CODE_MAP[myDio]) return _PARISH_DIO_CODE_MAP[myDio]; }catch(_e){} try{ for(var code in _DIO){ if(Object.prototype.hasOwnProperty.call(_DIO,code) && _DIO[code]===myDio) return code; } }catch(_e){} return null; }
    function getParishItems(){ try{ if(Array.isArray(PARISHES) && PARISHES.length) return PARISHES; }catch(_e){} return []; }
    function sortParishItems(items){ return items.slice().sort(function(a,b){ return String(a&&a.name||'').localeCompare(String(b&&b.name||''),'ko'); }); }
    function renderParishSearch(query){
      if(!myFaithPendingActive) beginMyFaithPendingEdit();
      query=String(query||''); setHeader('나의 본당 찾기','확인을 눌러야 저장됩니다'); setBodyMode('my-faith-body my-faith-search-body');
      var wrap=document.createElement('section'); wrap.className='my-faith-section my-faith-search-section'; wrap.innerHTML='<h3>성당 검색</h3>';
      var input=document.createElement('input'); input.type='search'; input.className='my-faith-search-input'; input.placeholder='성당명 또는 주소 검색'; input.value=query;
      var results=document.createElement('div'); results.className='my-faith-search-results'; wrap.appendChild(input); wrap.appendChild(results);
      var tools=document.createElement('div'); tools.className='my-faith-tools'; tools.appendChild(smallButton('취소', returnToMyFaithSettingsEdit)); if(getMyFaithEditName()) tools.appendChild(smallButton('선택 안함', function(){ setMyFaithEditParish(noParishItem(getMyFaithEditName())); returnToMyFaithSettingsEdit(); })); wrap.appendChild(tools); body.appendChild(wrap);
      function draw(){
        var q=String(input.value||'').trim().toLowerCase(); var items=getParishItems(); var myDio=getMyFaithEditName();
        if(myDio) items=items.filter(function(p){ return p && p.diocese===myDio; });
        if(q) items=items.filter(function(p){ return String((p.name||'')+' '+(p.addr||'')+' '+(p.diocese||'')).toLowerCase().indexOf(q)>=0; });
        items=sortParishItems(items); results.innerHTML='';
        if(!items.length){ results.innerHTML='<div class="my-faith-empty">검색 결과가 없습니다.</div>'; return; }
        items.forEach(function(p){ var card=document.createElement('button'); card.type='button'; card.className='my-faith-parish-result'; card.innerHTML='<strong>'+safeText(p.name)+'</strong><span>'+safeText(p.diocese||'')+(p.addr?' · '+safeText(p.addr):'')+'</span>'; bindMyFaithClick(card, function(){ setMyFaithEditParish(p); returnToMyFaithSettingsEdit(); }); results.appendChild(card); });
      }
      input.addEventListener('input', draw); input.addEventListener('focus', function(){ try{ modal.classList.add('keyboard-open'); updateMyFaithViewport(); }catch(_e){} }); input.addEventListener('blur', function(){ setTimeout(function(){ try{ updateMyFaithViewport(); }catch(_e){} },180); });
      var selectedDioCode=getSelectedDioceseCode();
      if(selectedDioCode && typeof _ensureParishDioceseDataLoaded === 'function'){
        results.innerHTML='<div class="my-faith-empty">'+safeText(selectedName())+' 본당 정보를 불러오는 중입니다...</div>';
        _ensureParishDioceseDataLoaded(selectedDioCode).then(function(){ draw(); }).catch(function(){ draw(); });
      }else if(!_parishRawLoaded && typeof _ensureParishDataLoaded === 'function'){
        results.innerHTML='<div class="my-faith-empty">성당 정보를 불러오는 중입니다...</div>';
        _ensureParishDataLoaded().then(function(){ draw(); }).catch(function(){ draw(); });
      }else{ draw(); }
      setTimeout(updateMyFaithViewport,80);
    }
    if(window.visualViewport){ window.visualViewport.addEventListener('resize', function(){ if(modal.classList.contains('show')) updateMyFaithViewport(); }, {passive:true}); }
    window.addEventListener('resize', function(){ if(modal.classList.contains('show')) updateMyFaithViewport(); }, {passive:true});
    window.addEventListener('pageshow', function(){ if(hasRecentMyFaithExternalLink()) markMyFaithExternalSettling(2200); if(modal.classList.contains('show') && !isMyFaithExternalSettling()) updateMyFaithViewport(); stabilizeCoverAfterMyFaithExternal('my-faith-pageshow'); }, true);
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible'){ if(hasRecentMyFaithExternalLink()) markMyFaithExternalSettling(2200); if(modal.classList.contains('show') && !isMyFaithExternalSettling()) updateMyFaithViewport(); stabilizeCoverAfterMyFaithExternal('my-faith-visible'); } }, true);
    window.addEventListener('focus', function(){ if(hasRecentMyFaithExternalLink()) markMyFaithExternalSettling(2200); if(modal.classList.contains('show') && !isMyFaithExternalSettling()) updateMyFaithViewport(); stabilizeCoverAfterMyFaithExternal('my-faith-focus'); }, true);

    bindSetupBannerVisibilityWatch();
    updateButton();
    ['beforeinstallprompt','appinstalled','pageshow','load','resize'].forEach(function(ev){
      try{ window.addEventListener(ev, scheduleSetupBannerUpdate, {passive:true}); }catch(_e){ window.addEventListener(ev, scheduleSetupBannerUpdate); }
    });
    setTimeout(scheduleSetupBannerUpdate, 120);
    setTimeout(scheduleSetupBannerUpdate, 600);
    function openFromButton(e){
      if(e && e.preventDefault) e.preventDefault();
      if(e && e.stopPropagation) e.stopPropagation();
      try{ if(typeof window.closeCoverMenuPopup === 'function') window.closeCoverMenuPopup(); }catch(_e){}
      openModal();
    }
    on(btn, 'click', openFromButton);
    if(setupBanner) on(setupBanner, 'click', openFromButton);
    if(menuBtn) on(menuBtn, 'click', openFromButton);
    on('my-diocese-close','click', function(e){ if(e&&e.preventDefault)e.preventDefault(); closeModal(); });
    modal.addEventListener('click', function(e){ if(e && e.target && e.target.getAttribute && e.target.getAttribute('data-my-diocese-close') === 'true') closeModal(); });
    document.addEventListener('keydown', function(e){ if(e && e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });
  };
})();
