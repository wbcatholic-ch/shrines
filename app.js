/* 가톨릭길동무 — app.js V1
   §0 상수  §1 상태  §2 마커이미지  §3 지도초기화  §4 마커생성
   §5 탭  §6 내주변  §7 성지찾기  §8 지역검색  §9 길찾기
   §10 인포카드  §11 GPS·스탬프  §12 코스모드  §13 시작 */
'use strict';

/* §0 상수 */
const KAKAO_KEY      = '07f7989e29fdfb425fff924f36fb3ec0';
const KAKAO_REST_KEY = '86a3b86e6c1b0210b8e4aba5f6c83b00';
const STAMP_KEY      = 'catholic_stamp_visited_v1';
const STAMP_RADIUS   = 500;
const _TY  = { A:'성지', B:'순례지', C:'순교 사적지' };
const _CLR = { '성지':'#c0392b', '순례지':'#1565c0', '순교 사적지':'#1b7a3e' };
const _DIOCESE = {
  SE:'서울대교구', IC:'인천교구',  SW:'수원교구',   UJ:'의정부교구',
  CC:'춘천교구',   WJ:'원주교구',  DJ:'대전교구',   CJ:'청주교구',
  DG:'대구대교구', AD:'안동교구',  BS:'부산교구',   MS:'마산교구',
  GJ:'광주대교구', JJ:'전주교구',  JE:'제주교구',   ML:'군종교구'
};

/* §1 상태 */
let _map, _LL, _MM, _MI, _SZ, _PT, _PL;
let _shrines = [], _byseq = {};
let _markers = [];
let _myMk = null, _myLat = null, _myLng = null;  /* 현재 위치 (인포카드 거리) */
let _regionMk = null, _routePolyline = null;
let _curIdx = -1, _cur = null;
let _activeTab = '';
let _rS = null, _rVia = [], _rE = null;
let _watchId = null, _lastPos = null;
let _listTimer = null;
let _courseMode = false;

/* §2 마커 이미지 — 구 앱 동일 십자가 SVG */
const _EC = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const _NS = 'xmlns="http://www.w3.org/2000/svg"';

function _mkr(color, big) {
  const [w, h] = big ? [40, 52] : [28, 36];
  const path = big
    ? 'M20 0C8.954 0 0 8.954 0 20c0 14.21 20 32 20 32S40 34.21 40 20C40 8.954 31.046 0 20 0z'
    : 'M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z';
  const cross = big
    ? '<g fill="#fff" opacity=".96"><rect x="18.45" y="10.5" width="3.1" height="18.5" rx="1.1"/><rect x="13.4" y="16.3" width="13.2" height="3.1" rx="1.1"/></g>'
    : '<g fill="#fff" opacity=".96"><rect x="12.85" y="7.8" width="2.3" height="12.8" rx=".8"/><rect x="9.6" y="11.7" width="8.8" height="2.3" rx=".8"/></g>';
  return _mi(_EC(`<svg ${_NS} width="${w}" height="${h}"><path d="${path}" fill="${color}" opacity=".92"/>${cross}</svg>`), w, h);
}
function _mkrRoute(label) {
  const c = label === '출' ? '#FF0000' : '#005BFF';
  return _mi(_EC(`<svg ${_NS} width="36" height="46"><path d="M18 2C9 2 2 9 2 18c0 10 16 26 16 26s16-16 16-26C34 9 27 2 18 2z" fill="${c}" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="10" fill="#fff" opacity=".9"/><text x="18" y="23" font-size="13" font-weight="900" fill="${c}" text-anchor="middle" font-family="Arial,sans-serif">${label}</text></svg>`), 36, 46, 18, 44);
}
function _mkrVia(n) {
  return _mi(_EC(`<svg ${_NS} width="30" height="38"><path d="M15 2C8 2 2 8 2 15c0 9 13 21 13 21s13-12 13-21C28 8 22 2 15 2z" fill="#FF8C00" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="8" fill="#fff" opacity=".9"/><text x="15" y="20" font-size="11" font-weight="900" fill="#FF8C00" text-anchor="middle" font-family="Arial,sans-serif">${n}</text></svg>`), 30, 38, 15, 37);
}
function _mkrRegion() {
  return _mi(_EC(`<svg ${_NS} width="42" height="54"><path d="M21 2C10 2 1 11 1 22c0 13 20 30 20 30s20-17 20-30C41 11 32 2 21 2z" fill="#7B2FBE" stroke="#fff" stroke-width="2"/><circle cx="21" cy="22" r="9" fill="#fff" opacity=".95"/></svg>`), 42, 54, 21, 52);
}
function _mkrMyLoc() {
  return _mi(_EC(`<svg ${_NS} width="20" height="20"><circle cx="10" cy="10" r="8" fill="#2A8040" stroke="#fff" stroke-width="2.5"/></svg>`), 20, 20, 10, 10);
}
function _mi(url, w, h, ox, oy) { return new _MI(url, new _SZ(w,h), {offset:new _PT(ox??w/2, oy??h)}); }

/* §3 지도 초기화 */
function initMap() {
  _LL = kakao.maps.LatLng; _MM = kakao.maps.Marker; _MI = kakao.maps.MarkerImage;
  _SZ = kakao.maps.Size;  _PT = kakao.maps.Point;  _PL = kakao.maps.Polyline;

  _map = new kakao.maps.Map(document.getElementById('map'), {
    center: new _LL(36.2, 127.9), level: 8   /* 구 앱과 동일 — 전국 중심 */
  });
  kakao.maps.event.addListener(_map, 'click', () => _closeCard());
  document.getElementById('map-loading').style.display = 'none';

  if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  _buildMarkers();
  _startGPS();

  /* 초진입 시 내주변 탭 자동 열기 — 구 앱 동일 */
  switchTab('nearby');

  const p = new URLSearchParams(location.search);
  if (p.get('course')) _loadCourse(p.get('course'), p.get('navi') === '1');
}

/* §4 마커 생성 */
function _buildMarkers() {
  _markers = new Array(_shrines.length).fill(null);
  let i = 0;
  (function next() {
    const end = Math.min(i + 30, _shrines.length);
    for (; i < end; i++) {
      const s = _shrines[i];
      if (!s.lat||!s.lng||s.lat<33||s.lat>38||s.lng<124||s.lng>132) continue;
      const mk = new _MM({position:new _LL(s.lat,s.lng), image:_mkr(_CLR[s.type],false), title:s.name});
      mk.setMap(_map);
      const idx = i;
      kakao.maps.event.addListener(mk, 'click', () => _onMarkerClick(idx));
      _markers[i] = mk;
    }
    if (i < _shrines.length) requestAnimationFrame(next);
  })();
}

function _onMarkerClick(idx) {
  if (_activeTab === 'route') { _setRouteFromMarker(idx); return; }
  _openCard(idx);
}

function _showOnly(indices) { _markers.forEach((mk,i)=>mk&&mk.setMap(indices.includes(i)?_map:null)); }
function _showAll()         { _markers.forEach(mk=>mk&&mk.setMap(_map)); }
function _resizeMk(idx,big) {
  if (!_markers[idx]) return;
  /* 선택 마커 = 노란색(#FFE500) 큰 사이즈 — 구 앱 동일 */
  _markers[idx].setImage(big ? _mkr('#FFE500', true) : _mkr(_CLR[_shrines[idx].type], false));
}

/* §5 탭 전환 */
function switchTab(tab) {
  if (_activeTab === tab) { _closeTab(); return; }
  _closeCard();
  _activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
  const sheet = document.getElementById('sheet-' + tab);
  if (sheet) sheet.classList.add('open');

  /* 길찾기 플로팅 버튼 */
  const fx = document.getElementById('route-float-x');
  const fs = document.getElementById('route-float-swap');
  const isRoute = tab === 'route';
  if (fx) { fx.style.display = isRoute ? 'flex' : 'none'; fx.style.top = 'calc(var(--tab-h) + var(--safe-t) + 10px)'; }
  if (fs) { fs.style.display = isRoute ? 'flex' : 'none'; fs.style.top = 'calc(var(--tab-h) + var(--safe-t) + 62px)'; }

  /* 길찾기 가이드 툴팁 */
  const tip = document.getElementById('rs-guide-tip');
  if (tip) tip.style.display = isRoute ? '' : 'none';

  if (tab === 'nearby') _loadNearby();
  if (tab === 'list')   _renderList('');
}

function _closeTab() {
  _activeTab = '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
  const tip = document.getElementById('rs-guide-tip');
  if (tip) tip.style.display = 'none';
  const fx = document.getElementById('route-float-x');
  const fs = document.getElementById('route-float-swap');
  if (fx) fx.style.display = 'none';
  if (fs) fs.style.display = 'none';
  _showAll();
}

/* §6 내주변 */
/* 구 앱 동일: 최대 거리 기준 지도 레벨 자동 계산 */
function _levelFor(maxM) {
  const km = maxM / 1000;
  if (km <= 1.8) return 5; if (km <= 3.5) return 6; if (km <= 7) return 7;
  if (km <= 14)  return 8; if (km <= 28)  return 9; if (km <= 55) return 10;
  if (km <= 95)  return 11; return 12;
}

function _loadNearby() {
  const body = document.getElementById('nearby-body');
  /* 스펙: 회전 십자가 로딩 스피너 */
  body.innerHTML = `<div class="loading-wrap">
    <div class="loading-cross">✝</div>
    <div class="loading-txt">📍 정확한 거리를 계산 중입니다.</div>
  </div>`;
  if (!navigator.geolocation) {
    body.innerHTML = '<div class="loading-wrap"><div class="loading-txt">위치 기능을 사용할 수 없습니다.</div></div>';
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude:lat, longitude:lng} = pos.coords;
    _myLat = lat; _myLng = lng;   /* 인포카드 거리 계산용 */
    _showMyLoc(lat, lng);
    const list = _shrines
      .map((s,i) => ({i, d:_dist(lat,lng,s.lat,s.lng)}))
      .filter(o => o.d < 500000).sort((a,b) => a.d-b.d).slice(0, 10);
    _showOnly(list.map(o => o.i));
    const maxD = list.reduce((m,o) => Math.max(m, o.d), 0);
    _map.setLevel(_levelFor(maxD));
    _map.setCenter(new _LL(lat, lng));
    const titleEl = document.getElementById('nearby-title');
    if (titleEl) titleEl.textContent = `내 주변 성지 ${list.length}곳`;
    if (!list.length) {
      body.innerHTML = '<div class="loading-wrap"><div class="loading-txt">주변 50km 내 성지가 없습니다.</div></div>';
      return;
    }
    body.innerHTML = list.map((o,n) => {
      const s = _shrines[o.i], c = _CLR[s.type];
      const km  = (o.d / 1000 * 1.35).toFixed(1);
      const min = Math.round(o.d / 1000 * 1.35 / 40 * 60);
      const dur = min < 60 ? min+'분' : Math.floor(min/60)+'시간'+(min%60 ? (min%60)+'분' : '');
      return `<div class="li" data-i="${o.i}">
        <div class="li-num" style="background:${c}">${n+1}</div>
        <div class="li-main">
          <div class="li-name">${_esc(s.name)}</div>
          <div class="li-sub">${_esc(_DIOCESE[s.diocese]||'')} · ${_esc((s.addr||'').split(' ').slice(0,3).join(' '))}</div>
        </div>
        <div class="li-right">
          <span class="li-badge badge-${s.type}">${TYPE_LBL[s.type]||''}</span>
          <span class="li-dist">🚗${km}km</span>
          <span class="li-dur">${dur}</span>
        </div>
      </div>`;
    }).join('');
    body.querySelectorAll('[data-i]').forEach(el =>
      el.addEventListener('click', () => _sabOpen(+el.dataset.i))
    );
  }, () => {
    body.innerHTML = `<div class="loading-wrap"><div class="loading-txt">위치를 가져오지 못했습니다.<br><button onclick="_loadNearby()" style="margin-top:12px;padding:8px 20px;border-radius:20px;border:none;background:#1f2a44;color:#d4aa6a;font-weight:700;cursor:pointer;font-family:inherit">다시 시도</button></div></div>`;
  }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 10000});
}

/* §7 성지찾기 */
const TYPE_LBL = { A:'성지', B:'순례지', C:'순교 사적지' };
const DIO_ORDER = ['SE','IC','SW','UJ','CC','WJ','DJ','CJ','DG','AD','BS','MS','GJ','JJ','JE','ML'];
let _filterDio = 'all';

/* 스펙: 토큰 분리 검색 — 띄어쓰기 제거 후 각 토큰이 이름/교구/주소에 포함되면 매칭 */
function _matchShrines(s, q) {
  if (!q) return true;
  const tokens = q.trim().split(/\s+/);
  const name  = s.name, addr = s.addr||'', dioc = _DIOCESE[s.diocese]||'';
  return tokens.every(t =>
    name.includes(t) || addr.includes(t) || dioc.includes(t) ||
    name.replace(/\s/g,'').includes(t.replace(/\s/g,''))
  );
}

function _renderList(kw) {
  const body = document.getElementById('list-body');
  const q = (kw||'').trim();
  let items = _shrines.map((s,i) => ({i,s}));
  if (_filterDio !== 'all') items = items.filter(o => o.s.diocese === _filterDio);
  if (q) items = items.filter(o => _matchShrines(o.s, q));
  _showOnly(items.map(o => o.i));
  if (!items.length) {
    body.innerHTML = '<div style="padding:32px;text-align:center;color:#bbb;font-size:13px">검색 결과가 없습니다.</div>';
    return;
  }
  /* 교구별 그룹 — 구 앱 동일 */
  const groups = {};
  DIO_ORDER.forEach(d => groups[d] = []);
  items.forEach(o => { if (groups[o.s.diocese]) groups[o.s.diocese].push(o); });
  let html = '';
  DIO_ORDER.forEach(dioc => {
    const g = groups[dioc]; if (!g||!g.length) return;
    html += `<div class="dio-hdr">${_DIOCESE[dioc]||dioc}</div>`;
    g.forEach(({i,s}) => {
      const c = _CLR[s.type];
      html += `<div class="li" data-i="${i}">
        <div class="li-dot" style="background:${c};width:12px;height:12px;border-radius:50%;flex-shrink:0"></div>
        <div class="li-main">
          <div class="li-name">${_esc(s.name)}</div>
          <div class="li-sub">${_esc((s.addr||'').split(' ').slice(0,4).join(' '))}</div>
        </div>
        <span class="li-badge badge-${s.type}">${TYPE_LBL[s.type]||''}</span>
      </div>`;
    });
  });
  body.innerHTML = html;
  body.querySelectorAll('[data-i]').forEach(el =>
    el.addEventListener('click', () => _sabOpen(+el.dataset.i))
  );
}

/* §8 지역검색
   구 앱 동일 2단계:
   ① 장소 후보 목록 → ② 선택 후 근처 성지 10곳 (직선거리×1.35 자동차 거리 추정) */
function _regionSearch(q) {
  if (!q.trim()) return;
  const body = document.getElementById('region-body');
  body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">🔍 장소 검색 중…</div>';

  if (!kakao.maps.services) {
    body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">지역검색을 사용할 수 없습니다.</div>';
    return;
  }

  new kakao.maps.services.Places().keywordSearch(q, (data, status) => {
    if (status !== kakao.maps.services.Status.OK || !data.length) {
      _regionFallback(q); return;
    }

    /* ① 후보 목록 표시 */
    let html = '<div style="padding:8px 14px 4px;font-size:11px;font-weight:700;color:#888;border-bottom:1px solid #eee">📍 지역을 선택하세요</div>';
    data.forEach(d => {
      const nm = d.place_name||'', ad = d.road_address_name||d.address_name||'';
      html += `<div class="region-place-cand li" data-lat="${d.y}" data-lng="${d.x}" data-nm="${_esc(nm)}">
        <div class="li-dot" style="background:#7c3aed"></div>
        <div class="li-main"><div class="li-name">${_esc(nm)}</div><div class="li-sub">${_esc(ad)}</div></div>
      </div>`;
    });
    body.innerHTML = html;

    /* ② 후보 클릭 → 근처 성지 10곳 */
    body.querySelectorAll('.region-place-cand').forEach(el => {
      el.addEventListener('click', () => {
        const lat = parseFloat(el.dataset.lat), lng = parseFloat(el.dataset.lng);
        const nm  = el.dataset.nm || q;
        _regionShowShrines(lat, lng, nm);
      });
    });
  }, { size: 10 });
}

function _regionShowShrines(lat, lng, placeName) {
  const body = document.getElementById('region-body');
  body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">✝ 거리 계산 중…</div>';

  /* 지역 마커 */
  if (_regionMk) _regionMk.setMap(null);
  _regionMk = new _MM({ map:_map, position:new _LL(lat,lng), image:_mkrRegion(), title:placeName, zIndex:500 });

  /* 근처 성지 정렬 (직선거리 × 1.35 자동차 거리 추정) */
  const sorted = _shrines
    .map((s,i) => ({ i, d: _dist(lat,lng,s.lat,s.lng) }))
    .filter(o => o.d < 200000)
    .sort((a,b) => a.d - b.d)
    .slice(0, 10);

  /* 지도: 10곳만 표시 + 자동 레벨 */
  _showOnly(sorted.map(o => o.i));
  const maxD = sorted.reduce((m,o) => Math.max(m, o.d), 0);
  _map.setLevel(_levelFor(maxD));
  _map.setCenter(new _LL(lat, lng));

  if (!sorted.length) {
    body.innerHTML = `<div style="padding:16px 14px 4px;font-size:13px;font-weight:700;color:#1f2937">📍 ${_esc(placeName)}</div>
      <div style="padding:24px;text-align:center;color:#aaa;font-size:13px">주변에 성지가 없습니다.</div>`;
    return;
  }

  body.innerHTML =
    `<div style="background:var(--navy);color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between">
       <div>
         <div style="font-size:15px;font-weight:800">📍 ${_esc(placeName)}</div>
       </div>
       <button onclick="if(_regionMk)_map.setCenter(_regionMk.getPosition())" style="padding:6px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.3);background:transparent;color:rgba(255,255,255,.85);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">지도 보기</button>
     </div>
     <div style="padding:7px 14px 4px;font-size:11px;font-weight:700;color:#c0392b">† 근처 성지 · 자동차 거리순 ${sorted.length}곳</div>` +
    sorted.map((o,n) => {
      const s=_shrines[o.i], c=_CLR[s.type];
      const km  = (o.d / 1000 * 1.35).toFixed(1);
      const min = Math.round(o.d / 1000 * 1.35 / 40 * 60);
      const dur = min < 60 ? min+'분' : Math.floor(min/60)+'시간'+(min%60 ? (min%60)+'분' : '');
      return `<div class="li" data-i="${o.i}">
        <div class="li-num" style="background:${c}">${n+1}</div>
        <div class="li-main">
          <div class="li-name">${_esc(s.name)}</div>
          <div class="li-sub">${_esc((s.addr||'').split(' ').slice(0,4).join(' '))}</div>
        </div>
        <div class="li-right">
          <span class="li-badge badge-${s.type}">${TYPE_LBL[s.type]||''}</span>
          <span class="li-dist">🚗${km}km</span>
          <span class="li-dur">${dur}</span>
        </div>
      </div>`;
    }).join('');

  body.querySelectorAll('[data-i]').forEach(el =>
    el.addEventListener('click', () => _sabOpen(+el.dataset.i))
  );
}

/* 카카오 장소 검색 실패 시: 성지명·주소 직접 검색 */
function _regionFallback(q) {
  const body = document.getElementById('region-body');
  const matched = _shrines
    .map((s,i) => ({ i, s }))
    .filter(o => o.s.name.includes(q) || (o.s.addr||'').includes(q) || (_DIOCESE[o.s.diocese]||'').includes(q));
  if (!matched.length) {
    body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">검색 결과가 없습니다.</div>';
    return;
  }
  _showOnly(matched.map(o => o.i));
  body.innerHTML = `<div style="padding:10px 14px 4px;font-size:11px;font-weight:700;color:#aaa">✝ "${_esc(q)}" 검색 결과</div>` +
    matched.slice(0, 20).map(o => {
      const s=o.s, c=_CLR[s.type];
      return `<div class="li" data-i="${o.i}">
        <div class="li-dot" style="background:${c}"></div>
        <div class="li-main"><div class="li-name">${_esc(s.name)}</div><div class="li-sub">${_esc((s.addr||'').split(' ').slice(0,3).join(' '))}</div></div>
      </div>`;
    }).join('');
  body.querySelectorAll('[data-i]').forEach(el =>
    el.addEventListener('click', () => _sabOpen(+el.dataset.i))
  );
}

/* §9 길찾기 (Kakao Mobility API + Kakao Navi JS SDK)
   ─────────────────────────────────────────────────────
   REST  POST https://apis-navi.kakaomobility.com/v1/waypoints/directions
         origin/destination: {name?, x:경도, y:위도}
         waypoints: [{name, x:경도, y:위도}] 최대 30개
         priority: RECOMMEND|TIME|DISTANCE
         응답: summary.distance(m), duration(s), fare.taxi, fare.toll
              sections.roads.vertexes [lng,lat,lng,lat...]
   Navi  Kakao.Navi.start({name, x:경도, y:위도, coordType:'wgs84', viaPoints?})
         → 시작은 항상 현재 GPS 위치
         → 직접 지정 출발지는 viaPoints[0]으로 삽입
   ───────────────────────────────────────────────────── */

let _rPriority = 'RECOMMEND';

/* ── 포인트 설정/해제 ── */
function _setStart(pt) {
  if (_rS?.idx >= 0) _resizeMk(_rS.idx, false);
  _rS = pt;
  const lbl = _q('#rs-start-lbl'); lbl.textContent = pt.name; lbl.classList.remove('empty');
  _q('#rs-start-x').style.display = '';
  if (pt.idx >= 0 && _markers[pt.idx]) _markers[pt.idx].setImage(_mkrRoute('출'));
  window._updateSearchBtn && window._updateSearchBtn();
}
function _setEnd(pt) {
  if (_rE?.idx >= 0) _resizeMk(_rE.idx, false);
  _rE = pt;
  const lbl = _q('#rs-end-lbl'); lbl.textContent = pt.name; lbl.classList.remove('empty');
  _q('#rs-end-x').style.display = '';
  if (pt.idx >= 0 && _markers[pt.idx]) _markers[pt.idx].setImage(_mkrRoute('도'));
  window._updateSearchBtn && window._updateSearchBtn();
}
function _addVia(pt) {
  if (_rVia.some(v => v.idx >= 0 && v.idx === pt.idx)) return;
  _rVia.push(pt);
  if (pt.idx >= 0 && _markers[pt.idx]) _markers[pt.idx].setImage(_mkrVia(_rVia.length));
  _renderViaList();
}
function _removeVia(i) {
  const pt = _rVia[i];
  if (pt?.idx >= 0) _resizeMk(pt.idx, false);
  _rVia.splice(i, 1);
  _rVia.forEach((v, j) => { if (v.idx >= 0 && _markers[v.idx]) _markers[v.idx].setImage(_mkrVia(j + 1)); });
  _renderViaList();
}
function _clearStart() {
  if (_rS?.idx >= 0) _resizeMk(_rS.idx, false);
  _rS = null;
  const lbl = _q('#rs-start-lbl'); lbl.textContent = '출발지를 선택하세요'; lbl.classList.add('empty');
  _q('#rs-start-x').style.display = 'none';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  window._updateSearchBtn && window._updateSearchBtn();
}
function _clearEnd() {
  if (_rE?.idx >= 0) _resizeMk(_rE.idx, false);
  _rE = null;
  const lbl = _q('#rs-end-lbl'); lbl.textContent = '도착지를 선택하세요'; lbl.classList.add('empty');
  _q('#rs-end-x').style.display = 'none';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  window._updateSearchBtn && window._updateSearchBtn();
}
/* 경로 표시 중 — 출/경유/도 마커만 지도에 남김 */
function _showRouteMarkersOnly() {
  const keep = new Set();
  if (_rS?.idx >= 0) keep.add(_rS.idx);
  if (_rE?.idx >= 0) keep.add(_rE.idx);
  _rVia.forEach(v => { if (v.idx >= 0) keep.add(v.idx); });
  if (keep.size === 0) return;
  _markers.forEach((mk, i) => mk && mk.setMap(keep.has(i) ? _map : null));
}

function _clearRoute() {
  [_rS, ..._rVia, _rE].forEach(p => { if (p?.idx >= 0) _resizeMk(p.idx, false); });
  _rS = null; _rVia = []; _rE = null;
  _q('#rs-start-lbl').textContent = '출발지를 선택하세요'; _q('#rs-start-lbl').classList.add('empty');
  _q('#rs-end-lbl').textContent   = '도착지를 선택하세요'; _q('#rs-end-lbl').classList.add('empty');
  _q('#rs-start-x').style.display = 'none'; _q('#rs-end-x').style.display = 'none';
  _q('#rs-via-wrap').innerHTML = '';
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  window._updateSearchBtn && window._updateSearchBtn();
  _showAll();  /* 모든 마커 복원 */
}
function _renderViaList() {
  _q('#rs-via-wrap').innerHTML = _rVia.map((v, i) =>
    `<div class="rs-box" style="margin-bottom:6px">
      <div class="rs-dot" style="background:#FF8C00"></div>
      <span class="rs-lbl">${_esc(v.name)}</span>
      <button class="rs-x-btn" onclick="_removeVia(${i})">×</button>
    </div>`
  ).join('');
}

/* ── 마커 탭 → 자동 출발/도착/경유 할당 ── */
function _setRouteFromMarker(idx) {
  const s = _shrines[idx];
  const pt = { idx, name: s.name, lat: s.lat, lng: s.lng, isGps: false };
  if (!_rS)      { _setStart(pt); switchTab('route'); }
  else if (!_rE) { _setEnd(pt); _tryRoute(); switchTab('route'); }
  else           { _addVia(pt); _tryRoute(); }
}

/* ── 인포카드 "경로검색" ── */
function _icRoute() {
  if (!_cur) return;
  const pt = { idx: _curIdx, name: _cur.name, lat: _cur.lat, lng: _cur.lng, isGps: false };
  /* 도착지 우선 설정, 이미 있으면 출발지, 둘 다 있으면 경유 */
  if (!_rE)      _setEnd(pt);
  else if (!_rS) _setStart(pt);
  else           _addVia(pt);
  if (_rS && _rE) _tryRoute();
  switchTab('route');
}

/* ── GPS 출발지 ── */
function _setGpsStart() {
  if (!navigator.geolocation) return;
  const btn = _q('#rs-myloc'); btn.textContent = '...';
  navigator.geolocation.getCurrentPosition(pos => {
    btn.textContent = '📍현위치';
    _setStart({ idx: -1, name: '내 위치', lat: pos.coords.latitude, lng: pos.coords.longitude, isGps: true });
    _showMyLoc(pos.coords.latitude, pos.coords.longitude);
    if (_rE) _tryRoute();
  }, () => { btn.textContent = '📍현위치'; alert('위치를 가져오지 못했습니다.'); },
  { enableHighAccuracy: true, timeout: 8000 });
}

/* ── 경로 계산 ── */
async function _tryRoute() {
  if (!_rS || !_rE) return;
  _q('#rs-hint').textContent = '경로 계산 중…'; _q('#rs-hint').style.display = '';
  _q('#rs-result').style.display = 'none';
  _drawFallbackLines();  /* 직선으로 임시 표시 */

  try {
    const waypoints = _rVia.map(v => ({ name: v.name, x: v.lng, y: v.lat }));
    const body = {
      origin:      { name: _rS.name, x: _rS.lng, y: _rS.lat },
      destination: { name: _rE.name, x: _rE.lng, y: _rE.lat },
      priority:    _rPriority,
      car_fuel:    'GASOLINE', car_hipass: false, alternatives: false
    };
    if (waypoints.length) body.waypoints = waypoints;

    const res = await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions', {
      method: 'POST',
      headers: { 'Authorization': 'KakaoAK ' + KAKAO_REST_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data  = await res.json();
    const route = data.routes?.[0];
    if (!route || route.result_code !== 0) throw new Error(route?.result_msg || '경로 없음');

    /* 통계 표시 */
    const sum = route.summary;
    _q('#rs-km').textContent   = (sum.distance / 1000).toFixed(1);
    const min = Math.round(sum.duration / 60);
    _q('#rs-time').textContent = min < 60 ? min + '분' : Math.floor(min/60) + '시간 ' + (min%60 ? min%60 + '분' : '');
    const fare = sum.fare || {};
    const fareArr = [];
    if (fare.toll)  fareArr.push('통행료 ' + fare.toll.toLocaleString() + '원');
    if (fare.taxi)  fareArr.push('택시 약 ' + fare.taxi.toLocaleString() + '원');
    _q('#rs-fare').textContent = fareArr.join('  ·  ');

    /* 실제 경로 폴리라인 */
    if (_routePolyline) _routePolyline.setMap(null);
    const pts = [];
    route.sections.forEach(sec => sec.roads.forEach(r => {
      for (let j = 0; j < r.vertexes.length; j += 2) pts.push(new _LL(r.vertexes[j+1], r.vertexes[j]));
    }));
    _routePolyline = new _PL({ map: _map, path: pts, strokeWeight: 5, strokeColor: '#1565c0', strokeOpacity: .85 });

    /* 지도 범위 자동 맞춤 */
    const b = sum.bound;
    if (b) _map.setBounds(new kakao.maps.LatLngBounds(new _LL(b.min_y, b.min_x), new _LL(b.max_y, b.max_x)), 60);

    _showRouteMarkersOnly();  /* 출/도 마커만 남김 */
    _q('#rs-result').style.display = ''; _q('#rs-hint').style.display = 'none';

  } catch (e) {
    console.warn('[경로]', e.message);
    _q('#rs-km').textContent = '—'; _q('#rs-time').textContent = '—';
    _q('#rs-fare').textContent = '경로 데이터를 가져올 수 없습니다. 내비로 확인하세요.';
    _showRouteMarkersOnly();  /* 실패해도 출/도 마커만 표시 */
    _q('#rs-result').style.display = ''; _q('#rs-hint').style.display = 'none';
  }
}

function _drawFallbackLines() {
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  const pts = [_rS, ..._rVia, _rE].filter(Boolean).map(p => new _LL(p.lat, p.lng));
  if (pts.length < 2) return;
  _routePolyline = new _PL({ map: _map, path: pts, strokeWeight: 3, strokeColor: '#1565c0', strokeOpacity: .4, strokeStyle: 'dashed' });
}

/* ── 카카오내비 실행 ──
   Navi.start는 항상 현재 GPS에서 출발.
   직접 지정 출발지(isGps=false)는 viaPoints 맨 앞에 삽입. */
function _startNavi() {
  if (!_rE) return;
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  const via = [];
  if (_rS && !_rS.isGps) via.push({ name: _rS.name, x: String(_rS.lng), y: String(_rS.lat) });
  _rVia.forEach(v => via.push({ name: v.name, x: String(v.lng), y: String(v.lat) }));
  try {
    const params = { name: _rE.name, x: String(_rE.lng), y: String(_rE.lat), coordType: 'wgs84' };
    if (via.length) params.viaPoints = via;
    Kakao.Navi.start(params);
  } catch (e) {
    _openKakaoMapRoute();
  }
}

/* ── 카카오맵 웹 경로 (내비 미설치 fallback) ── */
function _openKakaoMapRoute() {
  if (!_rE) return;
  const url = 'https://map.kakao.com/link/to/' + encodeURIComponent(_rE.name) + ',' + _rE.lat + ',' + _rE.lng;
  window.open(url, '_blank');
}

/* §9-3 성지 액션 배너 (출발지/도착지/상세) */
let _sabIdx = -1;

function _sabOpen(idx) {
  _sabIdx = idx;
  const s = _shrines[idx];
  document.getElementById('sab-name').textContent = s.name;
  document.getElementById('shrine-action-overlay').style.display = '';
  document.getElementById('shrine-action-bar').classList.add('open');
}

function _sabClose() {
  document.getElementById('shrine-action-overlay').style.display = 'none';
  document.getElementById('shrine-action-bar').classList.remove('open');
  _sabIdx = -1;
}

function _initSab() {
  document.getElementById('sab-start').addEventListener('click', () => {
    if (_sabIdx < 0) return;
    const s = _shrines[_sabIdx];
    _setStart({ idx: _sabIdx, name: s.name, lat: s.lat, lng: s.lng, isGps: false });
    _sabClose();
    switchTab('route');
    /* 출발지만 설정 → 나머지 마커 유지, 지도 중심 이동 */
    _map.panTo(new _LL(s.lat, s.lng));
  });
  document.getElementById('sab-end').addEventListener('click', () => {
    if (_sabIdx < 0) return;
    const s = _shrines[_sabIdx];
    _setEnd({ idx: _sabIdx, name: s.name, lat: s.lat, lng: s.lng, isGps: false });
    _sabClose();
    switchTab('route');
    /* 도착지 설정 → 출발지도 있으면 바로 경로 계산 */
    if (_rS) {
      _tryRoute();   /* 성공 시 _showRouteMarkersOnly() 호출됨 */
    } else {
      /* 출발지 없음 → 도착지 마커만 강조 */
      _showOnly([_sabIdx]);
    }
  });
}

/* §9-4 시트 좌우 스와이퍼 (nearby↔list↔region) */
const SWIPE_TABS = ['nearby', 'list', 'region'];

function _initSwiper() {
  let tx = 0, ty = 0, swiping = false;
  document.querySelectorAll('.sheet').forEach(el => {
    el.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX; ty = e.touches[0].clientY; swiping = true;
    }, {passive: true});
    el.addEventListener('touchend', e => {
      if (!swiping) return; swiping = false;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = Math.abs(e.changedTouches[0].clientY - ty);
      if (Math.abs(dx) < 60 || dy > 80 || _activeTab === 'route') return;
      const cur = SWIPE_TABS.indexOf(_activeTab);
      if (cur < 0) return;
      if (dx < 0 && cur < SWIPE_TABS.length - 1) switchTab(SWIPE_TABS[cur + 1]);
      else if (dx > 0 && cur > 0)                 switchTab(SWIPE_TABS[cur - 1]);
    }, {passive: true});
  });
}
let _pickerRole = '';

function _openPicker(role) {
  _pickerRole = role;
  const titles = { start:'🔵 출발지 선택', end:'🔴 도착지 선택', via:'🟠 경유지 추가' };
  _q('#rp-title').textContent = titles[role] || '성지 선택';
  _q('#rp-input').value = '';
  _renderPickerList('');
  _q('#route-picker').classList.add('open');
  setTimeout(() => _q('#rp-input').focus(), 200);
}

function _closePicker() {
  _q('#route-picker').classList.remove('open');
}

function _renderPickerList(kw) {
  const clr = { A:'#c0392b', B:'#1565c0', C:'#1b7a3e' };
  const q   = kw.trim();
  const list = q
    ? _shrines.filter(s => s.name.includes(q) || (s.addr||'').includes(q))
    : _shrines;

  let html = '';
  if (_pickerRole === 'start') {
    html += `<div class="rp-myloc" id="rp-myloc-btn">
      <span style="font-size:20px">📍</span><span>현재 내 위치</span>
    </div>`;
  }
  if (!list.length) {
    html += `<div class="rp-empty">검색 결과가 없습니다</div>`;
  } else {
    html += list.map(s => {
      const idx  = _shrines.indexOf(s);
      const dioc = _DIOCESE[s.diocese] || s.diocese || '';
      return `<div class="rp-item" data-idx="${idx}">
        <div class="rp-dot" style="background:${clr[s.type]||'#888'}"></div>
        <div class="rp-info">
          <div class="rp-name">${_esc(s.name)}</div>
          <div class="rp-addr">${_esc(dioc)} · ${_esc((s.addr||'').split(' ').slice(0,4).join(' '))}</div>
        </div>
      </div>`;
    }).join('');
  }
  _q('#rp-list').innerHTML = html;

  const myBtn = document.getElementById('rp-myloc-btn');
  if (myBtn) myBtn.addEventListener('click', () => { _closePicker(); _setGpsStart(); });
}

function _initPicker() {
  _q('#rp-close').addEventListener('click', _closePicker);
  _q('#rp-input').addEventListener('input', e => _renderPickerList(e.target.value));
  _q('#rp-list').addEventListener('click', e => {
    const item = e.target.closest('[data-idx]');
    if (!item) return;
    const idx = parseInt(item.dataset.idx);
    const s   = _shrines[idx];
    if (!s) return;
    const pt  = { idx, name: s.name, lat: s.lat, lng: s.lng, isGps: false };
    _closePicker();
    if      (_pickerRole === 'start') { _setStart(pt); if (_rE) _tryRoute(); }
    else if (_pickerRole === 'end')   { _setEnd(pt);   if (_rS) _tryRoute(); }
    else if (_pickerRole === 'via')   { _addVia(pt);   if (_rS && _rE) _tryRoute(); }
  });
}


/* §10 인포카드 */
function _hpUrl(hp) { /* hp 필드 https:// 보정 */
  if (!hp) return '';
  return hp.startsWith('http') ? hp : 'https://' + hp;
}

function _openCard(idx) {
  if (_curIdx >= 0 && _curIdx !== idx) _resizeMk(_curIdx, false);
  _curIdx = idx; _cur = _shrines[idx];
  _resizeMk(idx, true);
  const s = _cur;

  _q('#ic-name').textContent = s.name;
  _q('#ic-sub').textContent  = _DIOCESE[s.diocese] || s.diocese || '';
  const tb = _q('#ic-type');
  /* 스펙: 타입 배지 = 한글 레이블 (성지/순례지/순교 사적지) */
  tb.textContent = TYPE_LBL[s.type] || s.type || '';
  tb.style.background = _CLR[s.type] || '#888'; tb.style.color = s.type ? '#fff' : '#555';

  _q('#ic-addr').textContent = s.addr || '';
  _q('#ic-addr-row').style.display = s.addr ? '' : 'none';

  /* 스펙: 내위치에서 거리 표시 */
  const distCol = document.getElementById('ic-dist-col');
  if (distCol) {
    if (_myLat && s.lat && s.lng) {
      const d = _dist(_myLat, _myLng, s.lat, s.lng);
      const km = d < 1000 ? Math.round(d)+'m' : (d/1000).toFixed(1)+'km';
      const distVal = document.getElementById('ic-dist');
      if (distVal) distVal.textContent = km;
      distCol.style.display = '';
    } else {
      distCol.style.display = 'none';
    }
  }

  /* 전화 */
  const tel = _q('#ic-tel');
  if (s.tel) {
    _q('#ic-tel-num').textContent = s.tel;
    tel.href = 'tel:' + s.tel.replace(/[^0-9+]/g, '');
    tel.style.display = '';
  } else tel.style.display = 'none';

  /* 홈페이지 + 성지 상세 링크 */
  const hp    = _q('#ic-hp');
  const guide = _q('#ic-guide');
  const links = _q('#ic-links');

  if (s.hp) {
    hp.href = s.hp;          /* 이미 https:// 포함 */
    hp.style.display = '';
  } else {
    hp.style.display = 'none';
  }

  if (s.cbck || s.seq) {
    /* cbck = 전체 CBCK URL (diocese 파라미터 포함), 없으면 seq로 구성 */
    guide.href = s.cbck || ('https://www.cbck.or.kr/Catholic/Shrine/Read?seq=' + s.seq);
    guide.style.display = '';
  } else {
    guide.style.display = 'none';
  }

  links.style.display = (s.hp || s.cbck || s.seq) ? '' : 'none';

  /* 카카오맵 — kurl(place 직링크) 우선, 없으면 kw 검색, 최후 좌표 링크 */
  _q('#ic-kakao-nav').onclick = () => {
    const url = s.kurl
      ? s.kurl
      : s.kw
        ? 'https://map.kakao.com/link/search/' + encodeURIComponent(s.kw)
        : 'https://map.kakao.com/link/to/' + encodeURIComponent(s.name) + ',' + s.lat + ',' + s.lng;
    location.href = url;
  };

  _updateStamp(s);
  _map.panTo(new _LL(s.lat, s.lng));
  _q('#info-card').classList.add('open');
}
function _closeCard() {
  if (_curIdx>=0){_resizeMk(_curIdx,false);_curIdx=-1;} _cur=null;
  _q('#info-card').classList.remove('open');
}

/* §11 GPS 자동 순례 기록 */
function _startGPS() {
  if (!navigator.geolocation) return;
  _watchId=navigator.geolocation.watchPosition(pos=>{
    const {latitude:lat,longitude:lng}=pos.coords;
    if(_map)_showMyLoc(lat,lng);
    if(_lastPos&&_dist(_lastPos.lat,_lastPos.lng,lat,lng)<20)return;
    _lastPos={lat,lng}; _autoStamp(lat,lng);
  },null,{enableHighAccuracy:true,timeout:20000,maximumAge:15000});
}
function _autoStamp(lat, lng) {
  const v = _getV(), today = _today(); let changed = false;
  _shrines.forEach(s => {
    if (!s.lat || !s.lng) return;  /* stamp 필드 체크 제거 — 모든 성지 대상 */
    const arr = Array.isArray(v[s.seq]) ? v[s.seq] : [];
    if (arr.includes(today) || _dist(lat, lng, s.lat, s.lng) > STAMP_RADIUS) return;
    arr.push(today); v[s.seq] = arr; changed = true;
    _toast('✝ ' + s.name + ' 순례 기록!' + (arr.length > 1 ? ' · ' + arr.length + '번째 순례' : ''));
    if (_cur?.seq === s.seq) _updateStamp(s);
  });
  if (changed) _saveV(v);
}
function _toast(msg){
  const t=_q('#stamp-toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3500);
}
function _updateStamp(s) {
  const btn = _q('#ic-stamp');
  const arr  = Array.isArray(_getV()[s.seq]) ? _getV()[s.seq] : [];
  if (arr.length) {
    btn.style.display = ''; btn.style.cssText = '';
    btn.textContent = `✞ ${arr.length}회 순례 · ${arr[arr.length-1]}`;
    btn.className = 'ic-stamp-btn stamped'; btn.disabled = false;
    btn.onclick = () => {
      const v = _getV(), a = Array.isArray(v[s.seq]) ? v[s.seq] : [];
      if (!confirm(`${s.name}\n순례 이력: ${a.join(', ')}\n\n마지막 기록을 삭제할까요?`)) return;
      a.pop(); if (a.length) v[s.seq] = a; else delete v[s.seq]; _saveV(v); _updateStamp(s);
    };
  } else {
    /* 방문 기록 없음 — 안내 문구 없이 완전히 숨김 */
    btn.style.display = 'none'; btn.onclick = null;
  }
}
function _showMyLoc(lat, lng) {
  _myLat = lat; _myLng = lng;
  if (!_myMk) _myMk = new _MM({map:_map, image:_mkrMyLoc(), zIndex:200});
  _myMk.setPosition(new _LL(lat, lng));
}
function _getV(){
  try{const v=JSON.parse(localStorage.getItem(STAMP_KEY)||'{}');Object.keys(v).forEach(k=>{if(typeof v[k]==='string')v[k]=[v[k]];});return v;}catch{return{};}
}
function _saveV(v){try{localStorage.setItem(STAMP_KEY,JSON.stringify(v));}catch{}}
function _today(){return new Date().toISOString().slice(0,10);}

/* §12 코스 모드 */
async function _loadCourse(id,autoNavi){
  const course=(window._COURSES||[]).find(c=>c.id===id);if(!course)return;
  _courseMode=true; _markers.forEach(mk=>mk&&mk.setMap(null));
  _shrines.forEach(s=>{_byseq[s.seq]=s;});
  const v=_getV(),pts=course.seqs.map(seq=>_byseq[seq]).filter(Boolean);
  const bounds=new kakao.maps.LatLngBounds();
  pts.forEach((s,n)=>{
    const visited=(Array.isArray(v[s.seq])?v[s.seq]:[]).length>0,bg=visited?'#2A8040':'#1B7FD8';
    const svg=`<svg ${_NS} width="34" height="42"><path d="M17 41C17 41 2 26 2 17a15 15 0 1 1 30 0C32 26 17 41 17 41Z" fill="${bg}" stroke="#fff" stroke-width="1.5"/><circle cx="17" cy="17" r="9" fill="#fff"/><text x="17" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="${bg}" font-family="sans-serif">${n+1}</text></svg>`;
    const mk=new _MM({map:_map,position:new _LL(s.lat,s.lng),image:new _MI(_EC(svg),new _SZ(34,42),{offset:new _PT(17,42)}),zIndex:10});
    kakao.maps.event.addListener(mk,'click',()=>_openCard(_shrines.indexOf(s)));
    bounds.extend(new _LL(s.lat,s.lng));
  });
  _map.setBounds(bounds,60);
  try{
    const org=pts[0],dst=pts[pts.length-1];
    const res=await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions',{
      method:'POST',headers:{'Authorization':'KakaoAK '+KAKAO_REST_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({origin:{x:String(org.lng),y:String(org.lat)},destination:{x:String(dst.lng),y:String(dst.lat)},priority:'RECOMMEND',waypoints:pts.slice(1,-1).map(s=>({name:s.name,x:String(s.lng),y:String(s.lat)}))})
    });
    const data=await res.json(),route=data.routes?.[0];
    if(route?.result_code===0){
      const path=[];route.sections.forEach(sec=>sec.roads.forEach(r=>{for(let j=0;j<r.vertexes.length;j+=2)path.push(new _LL(r.vertexes[j+1],r.vertexes[j]));}));
      new _PL({map:_map,path,strokeWeight:5,strokeColor:'#1B7FD8',strokeOpacity:.88});
    }
  }catch{}
  if(autoNavi)setTimeout(()=>{
    if(!Kakao.isInitialized())Kakao.init(KAKAO_KEY);
    const dst=pts[pts.length-1];
    try{Kakao.Navi.start({name:dst.name,x:String(dst.lng),y:String(dst.lat),coordType:'wgs84',viaPoints:pts.slice(0,-1).map(s=>({name:s.name,x:String(s.lng),y:String(s.lat)}))});}
    catch{location.href=`https://map.kakao.com/link/to/${encodeURIComponent(dst.name)},${dst.lat},${dst.lng}`;}
  },2500);
}

/* §13 유틸 */
function _q(sel){return document.querySelector(sel);}
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _dist(a,b,c,d){const R=6371000,f1=a*Math.PI/180,f2=c*Math.PI/180,df=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180,x=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

/* §14 시작 */
window.addEventListener('pagehide',()=>{if(_watchId!==null){navigator.geolocation.clearWatch(_watchId);_watchId=null;}});
window.addEventListener('pageshow',()=>{if(_map&&!_courseMode)_startGPS();});

document.addEventListener('DOMContentLoaded',()=>{
  _shrines = (window._SH_RAW||[]).filter(s => s.lat && s.lng);

  /* 탭 버튼 */
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));

  /* 시트 닫기 — × 버튼은 onclick="switchTab(...)"으로 처리 */

  /* 내위치 */
  _q('#loc-btn').addEventListener('click',()=>{
    if(!navigator.geolocation||!_map)return;
    navigator.geolocation.getCurrentPosition(pos=>{
      _showMyLoc(pos.coords.latitude,pos.coords.longitude);
      _map.setCenter(new _LL(pos.coords.latitude,pos.coords.longitude));
    });
  });

  /* 성지찾기 */
  /* 경로검색 버튼 표시 갱신 */
  window._updateSearchBtn = function() {
    const btn = document.getElementById('rs-search-btn');
    if (!btn) return;
    btn.style.display = (_rS && _rE) ? '' : 'none';
  };

  _q('#rs-start-x').addEventListener('click', () => { _clearStart(); window._updateSearchBtn && window._updateSearchBtn(); });
  _q('#rs-end-x').addEventListener('click',   () => { _clearEnd();   window._updateSearchBtn && window._updateSearchBtn(); });

  /* 출발/도착 박스 탭 → picker */
  _q('#rs-start-lbl').addEventListener('click', () => _openPicker('start'));
  _q('#rs-end-lbl').addEventListener('click',   () => _openPicker('end'));
  _q('#rs-add-via').addEventListener('click',   () => _openPicker('via'));

  /* 경로 검색 버튼 (수동 트리거) */
  _q('#rs-search-btn').addEventListener('click', _tryRoute);

  _q('#rs-navi-btn').addEventListener('click', _startNavi);
  _q('#rs-reset-btn').addEventListener('click', () => { _clearRoute(); window._updateSearchBtn && window._updateSearchBtn(); });

  /* 플로팅 스왑 버튼 */
  document.getElementById('route-float-swap').addEventListener('click', () => {
    const tmpS = _rS, tmpE = _rE;
    if (tmpS) _setEnd({...tmpS}); else _clearEnd();
    if (tmpE) _setStart({...tmpE}); else _clearStart();
    window._updateSearchBtn && window._updateSearchBtn();
    _q('#rs-result').style.display = 'none';
    _q('#rs-hint').style.display = '';
  });

  /* 우선순위 버튼 */
  _q('#rs-priority-bar').addEventListener('click', e => {
    const btn = e.target.closest('[data-pri]');
    if (!btn) return;
    _rPriority = btn.dataset.pri;
    _q('#rs-priority-bar').querySelectorAll('.rs-pri-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
  _initPicker();
  _initSab();
  _initSwiper();

  /* 성지찾기 필터 pill */
  _q('#list-filter-bar').addEventListener('click', e => {
    const pill = e.target.closest('[data-dio]');
    if (!pill) return;
    _filterDio = pill.dataset.dio;
    _q('#list-filter-bar').querySelectorAll('.filter-pill').forEach(p =>
      p.classList.toggle('active', p === pill));
    _renderList(_q('#list-inp').value);
  });
  _q('#list-inp').addEventListener('input', e => {
    clearTimeout(_listTimer);
    _listTimer = setTimeout(() => _renderList(e.target.value), 220);
  });
  _q('#list-inp-x').addEventListener('click', () => { _q('#list-inp').value=''; _renderList(''); });

  /* 지역검색 */
  _q('#region-inp').addEventListener('keydown', e => { if(e.key==='Enter') _regionSearch(_q('#region-inp').value); });
  _q('#region-srch-btn').addEventListener('click', () => _regionSearch(_q('#region-inp').value));
  _q('#region-inp-x').addEventListener('click', () => {
    _q('#region-inp').value = '';
    _q('#region-body').innerHTML = '<div style="padding:32px;text-align:center;color:#bbb;font-size:13px;line-height:1.9">🏞 여행지나 숙소 지역을 검색하면<br>근처 성지 목록이 나타납니다</div>';
    if (_regionMk) { _regionMk.setMap(null); _regionMk = null; }
    _showAll();
  });

  /* 인포카드 */
  _q('#ic-close').addEventListener('click',_closeCard);
  _q('#ic-route-btn').addEventListener('click',_icRoute);

  /* 스탬프 페이지 이동 — 탭바에 없으므로 ic-stamp 탭 장기탭 혹은 추가버튼으로 */

  /* Kakao Maps SDK */
  const sc=document.createElement('script');
  sc.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
  sc.onerror=()=>{_q('#map-loading').innerHTML='<p style="color:#aaa;padding:20px;text-align:center">지도를 불러올 수 없습니다.<br>인터넷 연결을 확인해 주세요.</p>';};
  sc.onload=()=>kakao.maps.load(initMap);
  document.head.appendChild(sc);
});
