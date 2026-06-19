/*
 * new-back-controller.js  ─ 가톨릭길동무 단일 뒤로가기 컨트롤러
 * ----------------------------------------------------------------------------
 * 설계 원칙(스펙 기준)
 *  1) 뒤로가기는 "이 파일 한 곳"에서만 처리한다.
 *  2) 화면마다 history를 쌓지 않는다. 브라우저 history에는 트랩 1개만 둔다.
 *  3) goToCover() 등은 history를 만지지 않는다(여기서만 만진다).
 *  4) 뒤로가기 = 지금 "가장 위에 열린 것"부터 닫기 (X와 동일 순서).
 *  5) 커버는 최종 바닥: 1회=종료 안내문구, 2회=앱 종료.
 *  6) 빠른 이동/탭 이동/외부사이트 복귀는 기록을 쌓지 않는다(상태 플래그만 사용).
 *
 * 중요: 종료 안내문구·앱 종료는 앱이 이미 가진 _showBackToast()/doExit()에 "위임"한다.
 *       각 화면 닫기도 앱의 자체 닫기 함수(closeMissa·_closePrayerAndReturn 등)에 맡긴다.
 *       (그 함수들이 빠른배너 복귀/커버 복귀를 스스로 처리하므로 중복 호출하지 않는다.)
 */
(function(){
  'use strict';
  if (window.__OAI_NEW_BACK_CTRL__) return;
  window.__OAI_NEW_BACK_CTRL__ = true;
  window.__OAI_FULL_BACK_CTRL_ACTIVE__ = true;

  var GUARD = '__oaiBackGuard';
  var DEBOUNCE_MS = 300;     // 단일 제스처 중복 popstate 흡수(Android Predictive Back)

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function byId(id){ return document.getElementById(id); }
  function hasCls(id, cls){ var el = byId(id); return !!(el && el.classList && el.classList.contains(cls)); }
  function fn(name){ return (typeof window[name] === 'function') ? window[name] : null; }
  function callFn(name, arg){ var f = fn(name); if (f){ try{ return f(arg); }catch(e){ console.warn('[가톨릭길동무]', e); } } }
  function removeOpen(id){ var v = byId(id); if (v) v.classList.remove('open'); }
  function hideShow(id){ var v = byId(id); if (v){ v.classList.remove('show'); v.setAttribute('aria-hidden','true'); } }

  /* ── 단일 history 트랩 ────────────────────────────────────────────── */
  function isArmed(){ try{ return !!(history.state && history.state[GUARD]); }catch(_e){ return false; } }
  function arm(){
    try{
      if (isArmed()) return;
      var here = location.href;                 // URL/해시는 바꾸지 않는다
      var root = {}; root.__oaiBackRoot = 1;
      history.replaceState(root, '', here);
      var g = {}; g[GUARD] = 1;
      history.pushState(g, '', here);
    }catch(_e){}
  }

  /* ── 커버 가시성 ─────────────────────────────────────────────────── */
  function coverVisible(){
    var f = fn('_isCoverScreenVisible');
    if (f){ try{ return !!f(); }catch(_e){} }
    var c = byId('cover');
    if (!c) return !document.documentElement.classList.contains('app-active');
    if (document.documentElement.classList.contains('app-active')) return false;
    try{ var s = getComputedStyle(c); if (s && (s.display === 'none' || s.visibility === 'hidden')) return false; }catch(_e){}
    return true;
  }

  /* ── 나의 신앙생활: 안쪽 선택화면이면 첫화면, 아니면 모달 닫기 ────── */
  function myFaithBack(){
    var f = fn('oaiMyFaithStepBack');
    if (f){ try{ if (f() === 'home') return true; }catch(_e){} }
    callFn('closeMyFaithLifeModal');
    return true;
  }

  /* ── 주요기도문: 상세→목록, 목록→(앱 자체 복귀함수가 빠른배너/커버 처리) ── */
  function prayerBack(){
    if (hasCls('prayer-detail','show')){
      callFn('showPrayerListOnly');     // 상세 닫고 목록 복원
      return true;
    }
    if (fn('_closePrayerAndReturn')){ callFn('_closePrayerAndReturn'); return true; }
    removeOpen('prayer-view'); callFn('goToCover'); return true;
  }

  /* ── 매일미사/성가/성경(미사뷰): closeMissa가 빠른배너/커버 복귀를 스스로 처리 ── */
  function missaBack(){
    if (fn('closeMissa')){ callFn('closeMissa'); return true; }
    removeOpen('missa-view'); callFn('goToCover'); return true;
  }

  function closeGeneralModule(id){ removeOpen(id); callFn('goToCover'); return true; }

  /* ── 우선순위 사다리: 맨 위 1개만 닫는다. 닫았으면 true ───────────── */
  function step(){
    /* 1) 입력창 / 작은 팝업 / 안내 모달 */
    if (hasCls('exit-dlg','open'))              { callFn('closeExitDlg'); return true; }
    if (hasCls('route-choice-modal','open'))    { callFn('_closeInfoRouteChoice'); return true; }
    if (hasCls('guide-manual-modal','show'))    { hideShow('guide-manual-modal'); return true; }   // 주요기능 안내
    if (hasCls('ios-safari-guide-modal','show')){ hideShow('ios-safari-guide-modal'); return true; }
    var refreshDlg = byId('oai-refresh-content-dialog');
    if (refreshDlg){ try{ refreshDlg.remove(); }catch(_e){} return true; }

    /* 2) 순례등록 / 순례기록 (성지방문) ─ 위에서부터 */
    if (fn('_isShrineVisitModalOpen') && window._isShrineVisitModalOpen())            { callFn('_closeShrineVisitModal', {fromPopstate:true}); return true; }
    if (fn('_isShrineVisitDetailOpen') && window._isShrineVisitDetailOpen())          { callFn('_closeShrineVisitDetail', {fromPopstate:true}); return true; }
    if (fn('_isShrineVisitCardsModalOpen') && window._isShrineVisitCardsModalOpen())  { callFn('_closeShrineVisitCardsModal', {fromPopstate:true}); return true; }

    /* 3) 상세 정보 카드 */
    if (hasCls('info-card','open')){ callFn('closeInfoCard'); return true; }

    /* 4) 검색창 / 길찾기 시트 / 순례길 시트 */
    if (hasCls('srch-modal','open')){ callFn('closeSearchModal'); return true; }
    if (hasCls('sheet-route','open')){
      if (fn('oaiResetRouteThenClose')) callFn('oaiResetRouteThenClose');
      else callFn('closeRouteSheetByX');
      return true;
    }
    if (document.querySelector && document.querySelector('.trail-sheet.open')){ callFn('trailCloseSheet'); return true; }

    /* 5) 모달 */
    if (hasCls('my-diocese-modal','show')){ return myFaithBack(); }
    if (hasCls('cover-menu-modal','show')){ callFn('closeCoverMenuPopup'); return true; }

    /* 6) 카테고리 화면 */
    if (hasCls('prayer-view','open')) { return prayerBack(); }
    if (hasCls('missa-view','open'))  { return missaBack(); }
    if (hasCls('diocese-view','open')){ removeOpen('diocese-view'); callFn('closeDioceseView'); callFn('goToCover'); return true; }
    if (hasCls('web-view','open'))    { return closeGeneralModule('web-view'); }
    if (hasCls('trail-view','open'))  { return closeGeneralModule('trail-view'); }
    if (hasCls('qna-view','open'))    { return closeGeneralModule('qna-view'); }

    /* 7) 빠른 배너 */
    if (hasCls('mass-quick-modal','show')){ callFn('closeMassQuickMenu'); return true; }

    /* 8) 앱 지도 화면 (성지/성당/피정) */
    if (!coverVisible() && document.documentElement.classList.contains('app-active')){ callFn('goToCover'); return true; }
    if (fn('_hasOpenAppSurface') && window._hasOpenAppSurface()){ callFn('goToCover'); return true; }

    /* 9) 위에 닫을 게 없음 → 커버 바닥 */
    return false;
  }

  /* ── 커버 바닥 처리: 앱 자체 종료 토스트/종료에 위임 ───────────────
   *  _showBackToast(): 1회=토스트(false 반환) / 2회=종료(doExit, true 반환).
   *  기도문 first-toast·force-toast·hard-exit 플래그까지 이 함수가 다 처리한다.
   */
  var fbExitReady = false, fbTimer = 0;
  function fallbackCoverBack(){           // _showBackToast 부재 시에만 사용
    if (fbExitReady){
      fbExitReady = false; try{ clearTimeout(fbTimer); }catch(_e){}
      var b = byId('_bt'); if (b && b.parentNode) b.parentNode.removeChild(b);
      if (fn('attemptAppExit')) callFn('attemptAppExit'); else { try{ history.back(); }catch(_e){} }
      return true;
    }
    fbExitReady = true;
    try{
      var old = byId('_bt'); if (old && old.parentNode) old.parentNode.removeChild(old);
      var t = document.createElement('div'); t.id = '_bt';
      t.textContent = '한 번 더 누르면 앱이 종료됩니다';
      t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(14,21,53,.94);color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:800;z-index:99999;white-space:nowrap;pointer-events:none;box-shadow:0 14px 36px rgba(0,0,0,.32);';
      document.body.appendChild(t);
    }catch(_e){}
    fbTimer = setTimeout(function(){ fbExitReady = false; var b = byId('_bt'); if (b && b.parentNode) b.parentNode.removeChild(b); }, 2500);
    return false;
  }
  function coverBack(){
    if (fn('_showBackToast')){
      var exited = false;
      try{ exited = (window._showBackToast() === true); }catch(e){ console.warn('[가톨릭길동무]', e); }
      return exited;   // true=종료됨(트랩 재설치 안 함)
    }
    return fallbackCoverBack();
  }

  /* ── 뒤로가기 진입점 ─────────────────────────────────────────────── */
  var lastHandled = 0;
  function onBack(){
    var t = now();
    if (t - lastHandled < DEBOUNCE_MS){ arm(); return; }  // 중복 popstate 흡수
    lastHandled = t;

    var handled = false;
    try{ handled = step(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    if (handled){ arm(); return; }

    /* 커버 바닥 */
    var exited = coverBack();
    if (!exited) arm();
  }

  /* ── 이벤트 ──────────────────────────────────────────────────────── */
  window.addEventListener('popstate', function(){ onBack(); });
  document.addEventListener('backbutton', function(e){
    try{ if (e && e.preventDefault) e.preventDefault(); }catch(_e){}
    onBack();
  });
  window.addEventListener('pageshow', function(){ arm(); });
  window.addEventListener('focus', function(){ setTimeout(arm, 0); });

  /* ── 기존 코드 호환용 훅 ───────────────────────────────────────────
   *  주의: 앱의 "종료 상태 관리" 함수(_resetCoverExitReady, _clearCoverExitArmed,
   *        _forceNextCoverBackToast, _consumePrayerCoverNeedsFirstToast 등)는
   *        절대 덮어쓰지 않는다 — _showBackToast()가 그 값들을 읽어 카운트를 맞춘다.
   *  여기서는 (a) 옛 트랩 stub 들을 "트랩 재설치"로 바꾸고,
   *           (b) goToCover/myfaith가 부르는 arm 훅만 정의한다.
   */
  window.OAI_BACK = {
    arm: arm,
    handleBack: onBack,
    enterCover: function(){ arm(); }
  };
  window.oaiArmBackBlocker           = function(){ arm(); return true; };
  window.__oaiArmEarlyCoverBackGuard = window.oaiArmBackBlocker;
  window._oaiArmCoverBackTrap        = function(){ arm(); return true; };  // myfaith의 history fallback 차단
  window._ensureCoverBackTrap        = function(){ arm(); };
  window._resetCoverBackTrap         = function(){ arm(); };
  window._ensureAppBackTrap          = function(){ arm(); };
  window._resetAppBackTrap           = function(){ arm(); };
  window._pushCoverOverlayBackTrap   = function(){ arm(); };
  window._armMassQuickHistoryTrap    = function(){ arm(); };

  /* ── 초기화: 첫 트랩 설치 ────────────────────────────────────────── */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm, {once:true});
  else arm();
  window.addEventListener('load', arm, {once:true});
})();
