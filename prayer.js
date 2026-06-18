

(function(){

const PR_ALL_CATS = ['favorites','wyd','aim','basic','special','etc','bong1','bong2','bong3','bong4'];
let PR_CATS = PR_ALL_CATS.slice();
const PR_CAT_STYLE = {
  favorites:{ label:'⭐ 즐겨찾기', bg:'#FFF0DC', color:'#E8780C', icon:'⭐', accent:'#E8780C' },
  wyd:      { label:'2027 WYD', bg:'#EEF2FF', color:'#4338CA', icon:'🌍', accent:'#4338CA' },
  aim:      { label:'대구대교구 인준', bg:'#E3F0FF', color:'#1565C0', icon:'✝️', accent:'#1565C0' },
  basic:    { label:'주요 기도', bg:'#EFF4FF', color:'#1E40AF', icon:'🏰', accent:'#1E40AF' },
  special:  { label:'특수 기도', bg:'#FFF0F5', color:'#BE185D', icon:'🙏', accent:'#BE185D' },
  etc:      { label:'여러가지 기도', bg:'#F0FDF4', color:'#15803D', icon:'📖', accent:'#15803D' },
  bong1:    { label:'위령기도', bg:'#F1F5F9', color:'#475569', icon:'🕊️', accent:'#475569' },
  bong2:    { label:'레지오 마리애', bg:'#FDF4FF', color:'#7E22CE', icon:'✨', accent:'#7E22CE' },
  bong3:    { label:'십자가의 길', bg:'#FFF7ED', color:'#C2410C', icon:'✞',  accent:'#C2410C' },
  bong4:    { label:'묵주기도', bg:'#EFF6FF', color:'#2563EB', icon:'📿', accent:'#2563EB' },
};

let prSwipeBlockUntil = 0;
let prTabsFirstAlign = true;

const PR_DATA = window.PRAYER_DATA || { favorites: [] };

const PrayerState = {
  curCat:    'wyd',  // 현재 선택된 카테고리 키
  favorites: [],     // 즐겨찾기 기도문 ID 배열
  fontIdx:   3,      // 글자 크기 인덱스
  inited:    false,  // 초기화 여부
  listScroll:0,      // 본문에서 목록으로 돌아올 때 복원할 위치
  listItemId:''      // 선택했던 기도문 위치 보정용
};
(function installPrayerProxy() {
  const map = [
    ['prCurCat',    'curCat'],
    ['prFavorites', 'favorites'],
    ['prFontIdx',   'fontIdx'],
    ['prInited',    'inited'],
  ];
  map.forEach(function([legacyName, key]) {
    Object.defineProperty(window, legacyName, {
      get: function() { return PrayerState[key]; },
      set: function(v) { PrayerState[key] = v; },
      configurable: true,
      enumerable: false,
    });
  });
})();
const PR_FONT_SIZES = [13,14,15,16,17,18,19,20,21,22,24,26,28,30];
const PR_FONT_KEY = 'prayer_font_size';

function prG(id){ return document.getElementById(id); }
function prNorm(t){ return (t||'').replace(/\s+/g,'').toLowerCase(); }

function prLoadPrefs(){
  try{ prFavorites = JSON.parse(localStorage.getItem('pr_favorites')||'[]'); }catch(e){ prFavorites=[]; }
  const saved = (typeof window.__APP_getSharedFontPx === 'function')
    ? window.__APP_getSharedFontPx()
    : parseInt(localStorage.getItem(PR_FONT_KEY), 10);
  const idx = PR_FONT_SIZES.indexOf(saved);
  prFontIdx = idx >= 0 ? idx : 3;
}
function prSaveFavorites(){ try{ localStorage.setItem('pr_favorites', JSON.stringify(prFavorites)); }catch(e){ console.warn("[가톨릭길동무]", e); } }

function prApplyFont(){
  const px = PR_FONT_SIZES[prFontIdx];
  const r = document.getElementById('prayer-view');
  if(r){
    r.style.setProperty('--pr-item-fs',   px+'px');
    r.style.setProperty('--pr-body-fs',   px+'px');
    r.style.setProperty('--pr-detail-fs', (px+1)+'px');
    r.style.setProperty('--pr-icon-sz',   Math.max(34,Math.round(px*2.2))+'px');
    r.style.setProperty('--pr-icon-fs',   Math.max(17,Math.round(px*1.2))+'px');
  }
  try{ localStorage.setItem(PR_FONT_KEY, px); }catch(e){ console.warn("[가톨릭길동무]", e); }
  try{
    if(typeof window.__APP_applyGlobalFont === 'function') window.__APP_applyGlobalFont();
  }catch(e){ console.warn("[가톨릭길동무]", e); }
}

window.prAdjustFont = function(delta){
  if(typeof window.__APP_adjustSharedFont === 'function'){
    const px = window.__APP_adjustSharedFont(delta);
    const idx = PR_FONT_SIZES.indexOf(px);
    if(idx >= 0) prFontIdx = idx;
    prApplyFont();
    return;
  }
  const saved = parseInt(localStorage.getItem(PR_FONT_KEY), 10);
  const savedIdx = PR_FONT_SIZES.indexOf(saved);
  if(savedIdx >= 0) prFontIdx = savedIdx;
  const next = prFontIdx + delta;
  if(next < 0 || next >= PR_FONT_SIZES.length) return;
  prFontIdx = next;
  prApplyFont();
};
window.prApplyFont = prApplyFont;

function prIsDaeguBeliever(){
  try{
    return String(localStorage.getItem('oai_my_diocese_name') || '').trim() === '대구대교구';
  }catch(_e){
    return false;
  }
}

function prVisibleDataCats(){
  const cats = ['wyd'];
  if(prIsDaeguBeliever()) cats.push('aim');
  return cats.concat(['basic','special','etc','bong1','bong2','bong3','bong4']);
}

function prVisibleFavoriteCount(){
  if(!Array.isArray(prFavorites) || !prFavorites.length) return 0;
  const visibleIds = new Set();
  prVisibleDataCats().forEach(function(k){
    (PR_DATA[k] || []).forEach(function(p){ if(p && p.id) visibleIds.add(p.id); });
  });
  return prFavorites.filter(function(id){ return visibleIds.has(id); }).length;
}

function prUpdateVisibleCats(){
  const cats = [];
  if(prVisibleFavoriteCount() > 0) cats.push('favorites');
  prVisibleDataCats().forEach(function(k){ cats.push(k); });
  PR_CATS = cats;
}

function prDefaultCat(){
  prUpdateVisibleCats();
  if(PR_CATS.includes('favorites') && prVisibleFavoriteCount() > 0) return 'favorites';
  return PR_CATS.includes('wyd') ? 'wyd' : (PR_CATS[0] || 'basic');
}

function prEnsureCurrentCat(){
  prUpdateVisibleCats();
  if(!PR_CATS.includes(prCurCat)) prCurCat = prDefaultCat();
}

function prBuildTabs(){
  prUpdateVisibleCats();
  const wrap = prG('prayer-tabs');
  if(!wrap) return;
  wrap.innerHTML='';
  PR_CATS.forEach(cat=>{
    const st = PR_CAT_STYLE[cat];
    const btn = document.createElement('button');
    btn.className = 'pr-tab';
    btn.textContent = st.label;
    btn.dataset.cat = cat;
    btn.onclick = ()=>{ prSwitchCat(cat); };
    wrap.appendChild(btn);
  });
}

function prApplyTabColors(){
  let activeBtn = null;
  document.querySelectorAll('.pr-tab').forEach(btn=>{
    const on = btn.dataset.cat===prCurCat;
    btn.classList.toggle('on', on);
    if(on) activeBtn = btn;
  });
  if(activeBtn){
    var behavior = prTabsFirstAlign ? 'auto' : 'smooth';
    activeBtn.scrollIntoView({behavior:behavior, block:'nearest', inline:'center'});
  }
  prTabsFirstAlign = false;
  try{ if(typeof window.oaiKeepActiveTabsVisible === 'function') window.oaiKeepActiveTabsVisible('prayer'); }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function prEnsureTabsVisible(){
  prEnsureCurrentCat();
  const wrap = prG('prayer-tabs');
  if(!wrap) return;
  if(wrap.children.length < PR_CATS.length) prBuildTabs();
  wrap.style.display = 'flex';
  wrap.style.visibility = 'visible';
  wrap.style.opacity = '1';
  Array.from(wrap.children).forEach(function(btn){
    btn.style.display = 'flex';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
  });
  prApplyTabColors();
}
window.prEnsureTabsVisible = prEnsureTabsVisible;
function prSwitchCat(cat){
  prEnsureCurrentCat();
  if(!PR_CATS.includes(cat)) cat = prDefaultCat();
  prCurCat = cat;
  const inp = prG('prayer-search-inp');
  const listView = prG('prayer-list-view');
  const detail = prG('prayer-detail');
  if(inp) inp.value = '';
  if(detail) detail.classList.remove('show');
  prApplyTabColors();
  prRenderList();
  if(listView){
    listView.style.scrollBehavior = 'auto';
    listView.scrollTop = 0;
    listView.style.scrollBehavior = '';
  }
}

window.prRenderList = function(){
  var currentCats = PR_CATS.join('|');
  prEnsureCurrentCat();
  if(currentCats !== PR_CATS.join('|')) prBuildTabs();
  const ul = prG('pr-list-ul');
  if(!ul) return;
  ul.innerHTML = '';
  const kw = prNorm(prG('prayer-search-inp')?.value||'');
  let data = [];
  if(prCurCat === 'favorites'){
    PR_CATS.forEach(k=>{ if(k!=='favorites') data = data.concat(PR_DATA[k]||[]); });
    data = data.filter(p=>prFavorites.includes(p.id));
  } else if(kw){
    PR_CATS.forEach(k=>{ if(k!=='favorites') data = data.concat(PR_DATA[k]||[]); });
  } else {
    data = PR_DATA[prCurCat] || [];
  }
  const filtered = kw ? data.filter(p=>prNorm(p.title).includes(kw)) : data;
  if(!filtered.length){
    ul.innerHTML = '<li><div class="pr-empty">'+
      (prCurCat==='favorites'?'즐겨찾기한 기도문이 없습니다.':kw?'검색 결과가 없습니다.':'등록된 기도문이 없습니다.')+
      '</div></li>';
    return;
  }
  filtered.forEach(prayer=>{
    const cat2 = (prCurCat==='favorites'||kw) ? prGetCat(prayer.id) : prCurCat;
    const st = PR_CAT_STYLE[cat2] || PR_CAT_STYLE.aim;
    const isFav = prFavorites.includes(prayer.id);
    const li = document.createElement('li');
    li.className = 'pr-item';
    li.style.borderLeftColor = st.accent;
    li.innerHTML = '<div class="pr-item-left">'+
      '<div class="pr-icon-dot" style="background:'+st.bg+';color:'+st.color+'">'+st.icon+'</div>'+
      '<div class="pr-title">'+prayer.title+'</div>'+
      '</div>'+
      '<div class="pr-item-right">'+
      '<button type="button" class="pr-star '+(isFav?'on':'')+'" data-pid="'+prayer.id+'" aria-label="즐겨찾기">'+
        '<i class="fa-solid fa-star"></i></button>'+
      '<i class="fa-solid fa-chevron-right pr-chevron"></i>'+
      '</div>';
    const starBtn = li.querySelector('.pr-star');
    let ignoreListClickUntil = 0;
    if(starBtn){
      let favHandledAt = 0;
      let suppressClickUntil = 0;
      let favTouch = null;
      const FAV_MOVE_X_LIMIT = 5;
      const FAV_MOVE_Y_LIMIT = 7;
      const FAV_MAX_TAP_MS = 450;

      function markFavTouch(ms){
        ignoreListClickUntil = Date.now() + (ms || 700);
        li.dataset.favTouch = '1';
        window.setTimeout(function(){
          if(Date.now() > ignoreListClickUntil) delete li.dataset.favTouch;
        }, (ms || 700) + 80);
      }
      function stopFavEvent(ev, preventDefault){
        if(!ev) return;
        if(preventDefault && typeof ev.preventDefault === 'function') ev.preventDefault();
        if(typeof ev.stopPropagation === 'function') ev.stopPropagation();
        if(typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      }
      function favTouchPoint(ev){
        const t = ev && ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0] :
                  ev && ev.touches && ev.touches[0] ? ev.touches[0] : ev;
        return { x: t && typeof t.clientX === 'number' ? t.clientX : 0,
                 y: t && typeof t.clientY === 'number' ? t.clientY : 0 };
      }
      function runFavToggle(ev){
        const now = Date.now();
        if(now < prSwipeBlockUntil) return;
        if(now - favHandledAt < 350) return;
        favHandledAt = now;
        prToggleFav(prayer.id, ev);
      }

      starBtn.addEventListener('touchstart', function(ev){
        const pt = favTouchPoint(ev);
        favTouch = {x:pt.x, y:pt.y, t:Date.now(), moved:false};
        markFavTouch(700);
        stopFavEvent(ev, false);
      }, {capture:true, passive:false});

      starBtn.addEventListener('touchmove', function(ev){
        if(favTouch){
          const pt = favTouchPoint(ev);
          if(Math.abs(pt.x - favTouch.x) > FAV_MOVE_X_LIMIT ||
             Math.abs(pt.y - favTouch.y) > FAV_MOVE_Y_LIMIT){
            favTouch.moved = true;
          }
        }
        markFavTouch(700);
        stopFavEvent(ev, false);
      }, {capture:true, passive:false});

      starBtn.addEventListener('touchcancel', function(ev){
        favTouch = null;
        suppressClickUntil = Date.now() + 450;
        markFavTouch(700);
        stopFavEvent(ev, false);
      }, {capture:true, passive:false});

      starBtn.addEventListener('touchend', function(ev){
        const now = Date.now();
        const touch = favTouch;
        favTouch = null;
        markFavTouch(700);
        suppressClickUntil = now + 450;
        stopFavEvent(ev, true);
        if(!touch) return;
        const pt = favTouchPoint(ev);
        const moved = touch.moved ||
          Math.abs(pt.x - touch.x) > FAV_MOVE_X_LIMIT ||
          Math.abs(pt.y - touch.y) > FAV_MOVE_Y_LIMIT;
        const tooLong = now - touch.t > FAV_MAX_TAP_MS;
        if(moved || tooLong || now < prSwipeBlockUntil) return;
        runFavToggle(ev);
      }, {capture:true, passive:false});

      starBtn.addEventListener('click', function(ev){
        markFavTouch(700);
        if(Date.now() < suppressClickUntil || Date.now() < prSwipeBlockUntil || Date.now() - favHandledAt < 350){
          stopFavEvent(ev, true);
          return;
        }
        stopFavEvent(ev, true);
        runFavToggle(ev);
      }, {capture:true, passive:false});
    }
    li.addEventListener('click', function(ev){
      if(Date.now() < ignoreListClickUntil || li.dataset.favTouch === '1' ||
         (ev.target && ev.target.closest && ev.target.closest('.pr-star'))){
        if(typeof ev.preventDefault === 'function') ev.preventDefault();
        if(typeof ev.stopPropagation === 'function') ev.stopPropagation();
        return;
      }
      prOpenDetail(prayer);
    });
    ul.appendChild(li);
  });
};

function prGetCat(id){
  for(const k in PR_DATA){ if((PR_DATA[k]||[]).find(p=>p.id===id)) return k; }
  return 'wyd';
}

window.prToggleFav = function(id, e){
  if(e){
    if(typeof e.preventDefault === 'function') e.preventDefault();
    if(typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const lv = prG('prayer-list-view');
  const keepScroll = lv ? (lv.scrollTop || 0) : 0;
  prFavorites = prFavorites.includes(id) ? prFavorites.filter(f=>f!==id) : [...prFavorites,id];
  prSaveFavorites();
  prRenderList();
  if(lv){
    const restoreScroll = function(){
      try{
        lv.style.scrollBehavior = 'auto';
        lv.scrollTop = keepScroll;
        lv.style.scrollBehavior = '';
      }catch(_e){}
    };
    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 80);
    setTimeout(restoreScroll, 220);
  }
}
window.prToggleDetailFav = function(e){
  e.stopPropagation();
  var btn = document.getElementById('pr-detail-star');
  if(!btn) return;
  var id = btn.dataset.pid;
  if(!id) return;
  prFavorites = prFavorites.includes(id) ? prFavorites.filter(f=>f!==id) : [...prFavorites,id];
  prSaveFavorites();
  var isFav = prFavorites.includes(id);
  btn.classList.toggle('on', isFav);
  var listBtn = document.querySelector('.pr-star[data-pid="'+id+'"]');
  if(listBtn) listBtn.classList.toggle('on', isFav);
};

function prSafeText(text){
  return String(text || '').replace(/[&<>"']/g, function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}

function prHideExternalGuide(){
  try{
    window.clearTimeout(window.__prExternalGuideTimer);
    var guide = document.getElementById('pr-external-guide');
    if(!guide){
      try{ document.documentElement.classList.remove('pr-external-guide-active'); }catch(_e){}
      return;
    }
    guide.classList.remove('show');
    window.setTimeout(function(){
      try{ if(guide && guide.parentNode) guide.parentNode.removeChild(guide); }catch(_e){}
      try{ if(!document.getElementById('pr-external-guide')) document.documentElement.classList.remove('pr-external-guide-active'); }catch(_e){}
    }, 180);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function prShowExternalGuide(message, duration, options){
  try{
    options = options || {};
    var old = document.getElementById('pr-external-guide');
    if(old && old.parentNode) old.parentNode.removeChild(old);
    var guide = document.createElement('div');
    guide.id = 'pr-external-guide';
    guide.setAttribute('role','status');
    guide.setAttribute('aria-live','polite');
    guide.innerHTML = '<div class="pr-external-guide-card">' +
      '<div class="pr-external-guide-cross">✝</div>' +
      '<div class="pr-external-guide-text">' + prSafeText(message) + '</div>' +
      '</div>';
    try{ document.documentElement.classList.add('pr-external-guide-active'); }catch(_e){}
    guide.classList.add('show');
    document.body.appendChild(guide);
    window.clearTimeout(window.__prExternalGuideTimer);
    if(options.hold){
      if(options.maxDuration){
        window.__prExternalGuideTimer = window.setTimeout(prHideExternalGuide, Math.max(2500, options.maxDuration));
      }
      return guide;
    }
    window.__prExternalGuideTimer = window.setTimeout(prHideExternalGuide, Math.max(450, duration || 900));
    return guide;
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function prMarkExternalReturnFlag(){
  try{
    sessionStorage.setItem('oai_prayer_external_return_pending','1');
    sessionStorage.setItem('oai_prayer_external_return_ts', String(Date.now ? Date.now() : new Date().getTime()));
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function prMaybeShowExternalReturnGuide(){
  try{
    if(sessionStorage.getItem('oai_prayer_external_return_pending') !== '1') return;
    sessionStorage.removeItem('oai_prayer_external_return_pending');
    sessionStorage.removeItem('oai_prayer_external_return_ts');
    if(typeof window.oaiHoldStabilityVeil === 'function'){
      window.oaiHoldStabilityVeil('prayer-external-return', 900);
      return;
    }
    prShowExternalGuide('앱으로 돌아오는 중입니다.', 900);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}

function prMakeFreshDaeguPrayerUrl(rawUrl, prayer){
  var url = String(rawUrl || '').trim();
  if(!url) return url;
  try{
    if(!/daegu-archdiocese\.or\.kr\/page\/catholic_life\.html/i.test(url) || !/srl=prayer/i.test(url)){
      return url;
    }
    var hash = '';
    var hashIdx = url.indexOf('#');
    if(hashIdx >= 0){
      hash = url.slice(hashIdx);
      url = url.slice(0, hashIdx);
    }
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    url += sep + 'oai_open=' + encodeURIComponent(String(Date.now()));
    if(prayer && prayer.id){
      url += '&oai_pid=' + encodeURIComponent(String(prayer.id));
    }
    return url + hash;
  }catch(e){
    return String(rawUrl || '').trim();
  }
}

function prOpenOfficialPrayer(prayer){
  var url = prayer && prayer.url ? String(prayer.url).trim() : '';
  if(!url){
    prShowExternalGuide('공식 원문 링크를 준비 중입니다.', 900);
    return;
  }
  url = prMakeFreshDaeguPrayerUrl(url, prayer);
  try{
    var lv=prG('prayer-list-view');
    PrayerState.listScroll = lv ? (lv.scrollTop || 0) : 0;
    PrayerState.listItemId = prayer && prayer.id ? String(prayer.id) : '';
    window.__oaiPrayerListRestore = { scroll: PrayerState.listScroll, itemId: PrayerState.listItemId, cat: prCurCat };
    sessionStorage.setItem('oai_prayer_list_restore', JSON.stringify(window.__oaiPrayerListRestore));
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  prMarkExternalReturnFlag();
  try{
    if(typeof window.oaiOpenExternalSite === 'function'){
      window.oaiOpenExternalSite(url, {kind:'prayer-external'});
      return;
    }
    if(typeof window.oaiSmoothNavigate === 'function'){
      window.oaiSmoothNavigate(url, 'prayer-external');
      return;
    }
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  prShowExternalGuide('공식 기도문 페이지로 이동합니다.', 0, { hold:true, maxDuration:6500 });
  window.setTimeout(function(){
    try{ window.location.href = url; }
    catch(e){ location.href = url; }
  }, 650);
}

if(!window.__OAI_PRAYER_EXTERNAL_RETURN_GUIDE__){
  window.__OAI_PRAYER_EXTERNAL_RETURN_GUIDE__ = true;
  window.addEventListener('pageshow', function(){ window.setTimeout(prMaybeShowExternalReturnGuide, 80); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) window.setTimeout(prMaybeShowExternalReturnGuide, 120); });
}

function prOpenDetail(prayer){
  if(prayer && prayer.url){ prOpenOfficialPrayer(prayer); return; }
  try{
    var __lv=prG('prayer-list-view');
    PrayerState.listScroll = __lv ? (__lv.scrollTop || 0) : 0;
    PrayerState.listItemId = prayer && prayer.id ? String(prayer.id) : '';
    window.__oaiPrayerListRestore = { scroll: PrayerState.listScroll, itemId: PrayerState.listItemId, cat: prCurCat };
    sessionStorage.setItem('oai_prayer_list_restore', JSON.stringify(window.__oaiPrayerListRestore));
  }catch(e){ console.warn('[가톨릭길동무]', e); }
  const detail = prG('prayer-detail');
  const ttl = prG('prayer-detail-ttl');
  const content = prG('prayer-detail-content');
  const body = prG('prayer-detail-body');
  if(!detail) return;
  ttl.textContent = prayer.title;
  var rawContent = ((prayer.content||prayer.body||'')+'').replace(/class="symbol"/g,'class="pr-symbol"');
  if(/^bong2_00[123]$/.test(prayer.id || '')){
    rawContent = rawContent
      .replace(/<p[^>]*>\s*(?:1\.\s*)?시작기도\s*<\/p>/gi,'')
      .replace(/<p[^>]*>\s*(?:2\.\s*)?레지오(?:의)?\s*까떼나\s*<\/p>/gi,'')
      .replace(/<p[^>]*>\s*(?:3\.\s*)?레지오(?:의)?\s*기도문\s*\(?마침기도\)?\s*<\/p>/gi,'')
      .replace(/<p[^>]*>\s*마침기도\s*<\/p>/gi,'')
      .replace(/<p[^>]*>\s*까떼나\s*<\/p>/gi,'');
  }
  var safeTitle = (prayer.title || '기도문').replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; });
  content.innerHTML = '<div class="pr-body-title">' + safeTitle + '</div>' + rawContent;
  detail.classList.add('show');
  try{
    if(typeof window._oaiPrayerPushDetailState === 'function') window._oaiPrayerPushDetailState('prayer-detail-open');
    else if(typeof window._oaiArmPrayerBackTrap === 'function') window._oaiArmPrayerBackTrap('prayer-detail-open');
  }catch(e){
    console.warn('[가톨릭길동무]', e);
  }
  detail.dataset.pid = prayer.id || '';
  var starBtn = prG('pr-detail-star');
  if(starBtn){
    var isFav = prFavorites.includes(prayer.id);
    starBtn.classList.toggle('on', isFav);
    starBtn.dataset.pid = prayer.id || '';
  }
  if(body){ body.style.scrollBehavior='auto'; body.scrollTop=0; body.style.scrollBehavior=''; }
  setTimeout(function(){ if(body) body.scrollTop=0; }, 50);
}

function prRestoreListPosition(){
  try{
    const lv = prG('prayer-list-view');
    if(!lv) return;
    var saved = window.__oaiPrayerListRestore || null;
    if(!saved){ try{ saved = JSON.parse(sessionStorage.getItem('oai_prayer_list_restore') || 'null'); }catch(_e){ saved=null; } }
    const y = Number((saved && saved.scroll) || PrayerState.listScroll || 0);
    const itemId = (saved && saved.itemId) || PrayerState.listItemId || '';
    function apply(){
      try{
        lv.style.scrollBehavior = 'auto';
        lv.scrollTop = y;
        if(itemId){
          var item = document.querySelector('[data-pid="'+ itemId.replace(/"/g,'\"') +'"]');
          var li = item && item.closest ? item.closest('li,.pr-item,.pr-card') : null;
          if(li && y <= 2) li.scrollIntoView({block:'center', inline:'nearest'});
        }
        lv.style.scrollBehavior = '';
      }catch(_e){}
    }
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
    setTimeout(apply, 220);
  }catch(e){ console.warn('[가톨릭길동무]', e); }
}
window.prRestoreListPosition = prRestoreListPosition;

window.prCloseDetail = function(opts){
  const detail = prG('prayer-detail');
  if(detail) detail.classList.remove('show');
  prRestoreListPosition();
  if(!(opts && opts.skipTrap)){
    try{
      if(typeof window._oaiPrayerReplaceListState === 'function') window._oaiPrayerReplaceListState('prayer-detail-button-to-list');
      else if(typeof window._oaiArmPrayerBackTrap === 'function') window._oaiArmPrayerBackTrap('prayer-detail-button-to-list');
    }catch(e){
      console.warn('[가톨릭길동무]', e);
    }
  }
};

window.prSwitchCat = prSwitchCat;
window.prOpenDetail = prOpenDetail;
window.prOpenOfficialPrayer = prOpenOfficialPrayer;
window.prRefreshVisibleCats = function(){ prEnsureCurrentCat(); prBuildTabs(); prRenderList(); };
window.prCloseDetail = window.prCloseDetail;

(function(){
  var el = document.getElementById('prayer-list-view');
  if (!el) return;
  var sx = 0, sy = 0;
  var THRESHOLD = 32;
  var HORIZONTAL_RATIO = 1.03;
  var SWIPE_BLOCK_MS = 700;
  var horizontalLocked = false;

  function getIdx(cat) { prEnsureCurrentCat(); return PR_CATS.indexOf(cat); }
  function blockFavAfterSwipe(){ prSwipeBlockUntil = Date.now() + SWIPE_BLOCK_MS; }
  function isHorizontalSwipe(dx, dy){
    return Math.abs(dx) >= THRESHOLD && Math.abs(dx) >= Math.abs(dy) * HORIZONTAL_RATIO;
  }
  function goNext() {
    var idx = getIdx(prCurCat);
    var next = (idx + 1) % PR_CATS.length; // 순환
    prSwitchCat(PR_CATS[next]);
    if(typeof window.oaiSwipeAction === 'function') window.oaiSwipeAction(document.getElementById('pr-list-ul'), 'left');
  }
  function goPrev() {
    var idx = getIdx(prCurCat);
    var prev = (idx - 1 + PR_CATS.length) % PR_CATS.length; // 순환
    prSwitchCat(PR_CATS[prev]);
    if(typeof window.oaiSwipeAction === 'function') window.oaiSwipeAction(document.getElementById('pr-list-ul'), 'right');
  }

  el.addEventListener('touchstart', function(e) {
    if(!e.touches || !e.touches[0]) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    horizontalLocked = false;
  }, { passive: true });
  el.addEventListener('touchmove', function(e) {
    if(!e.touches || !e.touches[0]) return;
    var dx = e.touches[0].clientX - sx;
    var dy = e.touches[0].clientY - sy;
    if(Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO){
      horizontalLocked = true;
      blockFavAfterSwipe();
      if(e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  el.addEventListener('touchend', function(e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if(Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_RATIO) blockFavAfterSwipe();
    if (!isHorizontalSwipe(dx, dy)) return;
    if (dx < 0) goNext(); else goPrev();
  }, { passive: true });
})();

window.initPrayerView = function(){
  prLoadPrefs();
  prCurCat = prDefaultCat();
  prBuildTabs();
  prApplyFont();
  prEnsureTabsVisible();
  prRenderList();
  const detail = prG('prayer-detail');
  const listView = prG('prayer-list-view');
  if(detail) detail.classList.remove('show');
  if(listView){
    listView.style.scrollBehavior = 'auto';
    listView.scrollTop = 0;
    listView.style.scrollBehavior = '';
  }
};

})();
