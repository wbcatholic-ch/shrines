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
  var DEBOUNCE_MS = 350;     // 일반 중복 popstate 흡수(Android Predictive Back)
  var EXIT_GUARD_MS = 700;   // 종료 안내문구 직후 중복 뒤로가기 흡수(Predictive Back 재발생 대비)

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function byId(id){ return document.getElementById(id); }
  function hasCls(id, cls){ var el = byId(id); return !!(el && el.classList && el.classList.contains(cls)); }
  function fn(name){ return (typeof window[name] === 'function') ? window[name] : null; }
  function callFn(name, arg){ var f = fn(name); if (f){ try{ return f(arg); }catch(e){ console.warn('[가톨릭길동무]', e); } } }
  function removeOpen(id){ var v = byId(id); if (v) v.classList.remove('open'); }
  function hideShow(id){ var v = byId(id); if (v){ v.classList.remove('show'); v.setAttribute('aria-hidden','true'); } }

  /* ── 디버그 HUD (화면 좌하단에 버전 + 뒤로가기 결정 표시) ─────────────
   * 문제 진단이 끝나면 OAI_BACK_DEBUG 를 false 로 바꾸면 사라진다. */
  var VERSION = 'V7-6-SELF-EXIT';
  var OAI_BACK_DEBUG = true;
  function snapshot(){
    var map = [['미사','missa-view','open'],['기도목록','prayer-view','open'],['기도본문','prayer-detail','show'],
      ['교구','diocese-view','open'],['웹','web-view','open'],['순례길','trail-view','open'],['문의','qna-view','open'],
      ['빠른배너','mass-quick-modal','show'],['메뉴','cover-menu-modal','show'],['나의신앙','my-diocese-modal','show'],
      ['주요기능','guide-manual-modal','show'],['카드','info-card','open'],['검색','srch-modal','open'],['길찾기','sheet-route','open']];
    var s = [];
    for (var i=0;i<map.length;i++){ if (hasCls(map[i][1], map[i][2])) s.push(map[i][0]); }
    try{ if (document.documentElement.classList.contains('app-active')) s.push('지도'); }catch(_e){}
    if (faithPortalActive && faithPortalActive()) s.push('외부iframe');
    s.push(coverVisible() ? '커버✓' : '커버✗');
    return s.join(',') || '(없음)';
  }
  function dbg(action){
    if (!OAI_BACK_DEBUG) return;
    try{
      var el = byId('__oai_back_hud');
      if (!el){
        el = document.createElement('div'); el.id = '__oai_back_hud';
        el.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:2147483647;background:rgba(0,0,0,.6);color:#9ad;font:600 9px/1.3 monospace;padding:2px 5px;border-radius:5px;pointer-events:none;max-width:70vw;white-space:pre-wrap;word-break:break-all;opacity:.7;';
        document.body.appendChild(el);
      }
      el.textContent = '뒤로 ' + VERSION + '\n열림: ' + snapshot() + '\n결정: ' + action;
    }catch(_e){}
  }

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

  /* 외부사이트(매일미사/성가/성경) iframe 이 아직 살아있는가 */
  function faithPortalActive(){
    var fr = byId('missa-frame');
    if (!fr) return false;
    var s = '';
    try{ s = (fr.getAttribute('src') || fr.src || '').trim(); }catch(_e){}
    return !!(s && s !== 'about:blank');
  }

  /* 지금 진짜 "커버 바닥"이라 종료해도 되는 상태인가
   * 대원칙: 카테고리 안에서는 절대 종료하지 않는다.
   * 커버가 보이고 + 외부 iframe 도 죽어있을 때만 종료 허용. */
  function safeToExit(){
    if (!coverVisible()) return false;
    if (faithPortalActive()) return false;
    if (document.documentElement.classList.contains('app-active')) return false;
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

  /* ── 커버 바닥 처리: 앱 종료-상태 시스템에 의존하지 않는 자체 카운터 ───
   *  1회 = 종료 안내문구, 2회(가드 후~유효시간 내) = 앱 종료.
   *  _showBackToast/_exitReady/armed 플래그를 일절 쓰지 않아 잔재로 인한 오종료가 없다. */
  var EXIT_DUP_GUARD_MS = 1000;   // 같은 누름의 중복(Predictive Back) 흡수: 이 시간 내 재입력은 무시
  var EXIT_TOAST_MS     = 2500;   // 종료 안내문구 유효시간
  var exitArmed = false, exitArmedAt = 0, exitTimer = 0;

  function showExitToast(){
    try{
      var old = byId('_bt'); if (old && old.parentNode) old.parentNode.removeChild(old);
      var t = document.createElement('div'); t.id = '_bt';
      t.textContent = '한 번 더 누르면 앱이 종료됩니다';
      t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(14,21,53,.94);color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;font-weight:800;z-index:99999;white-space:nowrap;pointer-events:none;box-shadow:0 14px 36px rgba(0,0,0,.32);';
      document.body.appendChild(t);
    }catch(_e){}
  }
  function clearExitToast(){ var b = byId('_bt'); if (b && b.parentNode) b.parentNode.removeChild(b); }
  function disarmExit(){ exitArmed = false; try{ clearTimeout(exitTimer); }catch(_e){} clearExitToast(); }

  /* 반환: 'exit' | 'toast' | 'dup' */
  function coverBack(){
    var t = now();
    if (exitArmed){
      var dt = t - exitArmedAt;
      if (dt < EXIT_DUP_GUARD_MS) return 'dup';        // 같은 누름 중복 → 무시(종료 안 함)
      if (dt < EXIT_TOAST_MS){                          // 진짜 두 번째 누름 → 종료
        disarmExit();
        if (fn('attemptAppExit')) callFn('attemptAppExit');
        else { try{ history.back(); }catch(_e){} }
        return 'exit';
      }
      // 유효시간 지남 → 처음부터 다시
    }
    exitArmed = true; exitArmedAt = t;
    showExitToast();
    try{ clearTimeout(exitTimer); }catch(_e){}
    exitTimer = setTimeout(disarmExit, EXIT_TOAST_MS);
    return 'toast';
  }

  /* ── 뒤로가기 진입점 ─────────────────────────────────────────────────
   * 대원칙(이 함수가 보장):
   *   ① 카테고리 안에서는 절대 앱을 종료하지 않는다. (종료는 safeToExit + 2회 누름일 때만)
   *   ② 닫을 게 없는데 커버가 아니면 → 무조건 커버로 보낸다.
   *   ③ 커버가 확실하고 외부 iframe 도 죽었을 때만 → 종료문구 → (2회) 앱 종료.
   * 재무장(arm)은 "처리 끝에서만" 한다 — 종료 분기에서는 재무장하지 않아야 history.back() 종료가 먹는다. */
  var lastHandled = 0;
  function onBack(){
    if (window._appExiting) return;                        // 종료 진행 중이면 간섭 금지
    var t = now();
    if (t - lastHandled < DEBOUNCE_MS){ arm(); dbg('중복흡수(디바운스)'); return; }
    lastHandled = t;

    var handled = false;
    try{ handled = step(); }catch(e){ console.warn('[가톨릭길동무]', e); }
    if (handled){ disarmExit(); arm(); dbg('한겹 닫음'); return; }   // 맨 위 한 겹 닫음 → 커버 벗어남

    /* step 이 닫을 게 없다고 판단 */
    if (!safeToExit()){
      /* ② 커버가 아니거나 외부 iframe 이 살아있음 → 절대 종료 금지, 커버로 정리 */
      disarmExit();
      if (faithPortalActive() && fn('closeMissa')){ callFn('closeMissa'); dbg('외부iframe 정리(closeMissa)'); }
      else { callFn('goToCover'); dbg('커버로 강제(safe아님)'); }
      arm();
      return;
    }

    /* ③ 진짜 커버 바닥 */
    var r = coverBack();
    if (r === 'exit'){ dbg('★ 앱 종료'); return; }          // 종료 → 재무장 금지(트랩 비워 history.back 종료 허용)
    arm();                                                  // toast/dup → 트랩 유지
    dbg(r === 'dup' ? '종료가드(중복흡수)' : '종료문구 표시');
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
  function boot(){ arm(); dbg('로드됨'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  window.addEventListener('load', function(){ arm(); dbg('로드됨'); }, {once:true});
})();
