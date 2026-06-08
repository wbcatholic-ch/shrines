/* 가톨릭길동무 — app.js V1
   §0 상수  §1 상태  §2 마커이미지  §3 지도초기화  §4 마커생성
   §5 탭  §6 내주변  §7 성지찾기  §8 지역검색  §9 길찾기
   §10 인포카드  §11 GPS·스탬프  §12 코스모드  §13 시작 */
'use strict';
const APP_BUILD = "B026"; /* ★ 매 수정마다 +1 — SW 캐시 갱신 트리거 ★ */

/* §0 상수 */
const KAKAO_KEY      = '07f7989e29fdfb425fff924f36fb3ec0';
const KAKAO_REST_KEY = '86a3b86e6c1b0210b8e4aba5f6c83b00';
const STAMP_KEY      = 'catholic_stamp_visited_v1';
const STAMP_RADIUS   = 500;
/* ── 구 앱 패턴 데이터 맵 ── */
const _TY  = { A:'성지', B:'순례지', C:'순교 사적지' };           /* 타입 코드 → 한글 */
const _DIO = {                                                      /* 교구 코드 → 한글 풀네임 */
  SE:'서울대교구', IC:'인천교구',  SW:'수원교구',   UJ:'의정부교구',
  CC:'춘천교구',   WJ:'원주교구',  DJ:'대전교구',   CJ:'청주교구',
  DG:'대구대교구', AD:'안동교구',  BS:'부산교구',   MS:'마산교구',
  GJ:'광주대교구', JJ:'전주교구',  JE:'제주교구',   ML:'군종교구'
};
/* TC: 구 앱과 동일 — 한글 타입명 키 */
const TC = { '성지':'#c0392b', '순례지':'#1565c0', '순교 사적지':'#1b7a3e' };
/* _CLR은 A/B/C 직접 참조용 (badge CSS) */
const _CLR = { A:'#c0392b', B:'#1565c0', C:'#1b7a3e' };
/* _typeColor: 구 앱 동일 */
function _typeColor(t){ return TC[t] || '#888'; }
/* 교구 표시 순서 (한글 풀네임) */
const DIO_ORDER = ['서울대교구','인천교구','수원교구','의정부교구','춘천교구','원주교구',
                   '대전교구','청주교구','대구대교구','안동교구','부산교구','마산교구',
                   '광주대교구','전주교구','제주교구','군종교구'];

/* §1 상태 */
let _map, _LL, _MM, _MI, _SZ, _PT, _PL;
let _shrines = [], _byseq = {};
let _markers = [];
let _myMk = null, _myLat = null, _myLng = null;  /* 현재 위치 (인포카드 거리) */
let _regionMk = null, _routeRegionStart = null, _routePolyline = null;
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
  const c = label === '출' ? '#FF0000' : (label === '경' ? '#FF8C00' : '#005BFF');
  return _mi(_EC(`<svg ${_NS} width="36" height="46"><path d="M18 2C9 2 2 9 2 18c0 10 16 26 16 26s16-16 16-26C34 9 27 2 18 2z" fill="${c}" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="10" fill="#fff" opacity=".9"/><text x="18" y="23" font-size="13" font-weight="900" fill="${c}" text-anchor="middle" font-family="Arial,sans-serif">${label}</text></svg>`), 36, 46, 18, 44);
}
function _mkrVia(n) {
  return _mi(_EC(`<svg ${_NS} width="30" height="38"><path d="M15 2C8 2 2 8 2 15c0 9 13 21 13 21s13-12 13-21C28 8 22 2 15 2z" fill="#FF8C00" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="8" fill="#fff" opacity=".9"/><text x="15" y="20" font-size="11" font-weight="900" fill="#FF8C00" text-anchor="middle" font-family="Arial,sans-serif">${n}</text></svg>`), 30, 38, 15, 37);
}
function _mkrRegion() {
  return _mi(_EC(`<svg ${_NS} width="42" height="54"><path d="M21 2C10 2 1 11 1 22c0 13 20 30 20 30s20-17 20-30C41 11 32 2 21 2z" fill="#7B2FBE" stroke="#fff" stroke-width="2"/><circle cx="21" cy="22" r="9" fill="#fff" opacity=".95"/></svg>`), 42, 54, 21, 52);
}
function _mkrMyLoc() {
  return _mi(_EC(`<svg ${_NS} width="20" height="20"><circle cx="10" cy="10" r="8" fill="#1565c0" stroke="#fff" stroke-width="2.5"/></svg>`), 20, 20, 10, 10);
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
      const mk = new _MM({position:new _LL(s.lat,s.lng), image:_mkr(_typeColor(s.type),false), title:s.name});
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
function _resizeMk(idx, big) {
  if (!_markers[idx]) return;
  /* 선택: 노란색 + 큰 사이즈 + z-index 최상위 (다른 마커 위) */
  _markers[idx].setImage(big ? _mkr('#FFE500', true) : _mkr(_typeColor(_shrines[idx].type), false));
  _markers[idx].setZIndex(big ? 100 : 1);
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
  if (tab === 'route')  _restoreRouteMarkers();  /* 길찾기 탭 → 미완성 시 전체 마커 복원 */
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
    <div class="loading-txt">📍 정확한 거리를 계산중입니다.</div>
    <div class="loading-cross">✝</div>
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
      const s = _shrines[o.i], c = _typeColor(s.type);
      const km  = (o.d / 1000 * 1.35).toFixed(1);
      const min = Math.round(o.d / 1000 * 1.35 / 40 * 60);
      const dur = min < 60 ? min+'분' : Math.floor(min/60)+'시간'+(min%60 ? (min%60)+'분' : '');
      return `<div class="nearby-item" onclick="_regionShrineTap(${o.i})">
        <div class="nearby-num" style="background:${c}!important">${n+1}</div>
        <div class="nearby-info">
          <div class="nearby-name">${_esc(s.name)}</div>
          <div class="nearby-addr">${_esc((s.addr||'').substring(0,28))}</div>
        </div>
        <div class="nearby-meta">
          <div class="nearby-type" style="background:${c}18!important;color:${c}!important">${_esc(s.type)}</div>
          <div class="nearby-dist" style="color:${c}!important">🚗${km}km</div>
          <div class="nearby-dur">${dur}</div>
        </div>
      </div>`;
    }).join('');
  }, () => {
    body.innerHTML = `<div class="loading-wrap"><div class="loading-txt">위치를 가져오지 못했습니다.<br><button onclick="_loadNearby()" style="margin-top:12px;padding:8px 20px;border-radius:20px;border:none;background:#1f2a44;color:#d4aa6a;font-weight:700;cursor:pointer;font-family:inherit">다시 시도</button></div></div>`;
  }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 10000});
}

/* §7 성지찾기 */
/* TYPE_LBL: _TY와 동일 — s.type이 이미 한글로 변환됨 */
/* DIO_ORDER 상단에 정의됨 */
let _filterDio = 'all';

/* 스펙: 토큰 분리 검색 — 띄어쓰기 제거 후 각 토큰이 이름/교구/주소에 포함되면 매칭 */
function _matchShrines(s, q) {
  if (!q) return true;
  const tokens = q.trim().split(/\s+/);
  const name  = s.name, addr = s.addr||'', dioc = s.diocese||'';
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
  /* 교구별 그룹 — 구 앱 동일 (한글 교구명 기준) */
  const groups = {};
  DIO_ORDER.forEach(d => groups[d] = []);
  items.forEach(o => { if (groups[o.s.diocese]) groups[o.s.diocese].push(o); });
  const body2 = document.createElement('div');
  DIO_ORDER.forEach(dioc => {
    const g = groups[dioc]; if (!g||!g.length) return;
    const hd = document.createElement('div');
    hd.className = 'dio-hd'; hd.textContent = dioc;
    body2.appendChild(hd);
    g.forEach(({i,s}) => {
      const c = _typeColor(s.type);
      const d = document.createElement('div');
      d.className = 'list-item';
      d.innerHTML = `<div class="li-dot" style="background:${c}"></div>
        <div class="li-info"><div class="li-name">${_esc(s.name)}</div><div class="li-sub">${_esc((s.addr||'').substring(0,28))}</div></div>
        <span class="li-badge" style="background:${c}18;color:${c}">${_esc(s.type)}</span>`;
      d.onclick = () => _openCard(i);
      body2.appendChild(d);
    });
  });
  body.innerHTML = '';
  body.appendChild(body2);
}

/* 지역검색 근처 성지 탭 — 출발지가 있으면 바로 도착지 설정 */
function _regionShrineTap(idx) {
  const s = _shrines[idx];
  if (_rS && _routeRegionStart) {
    /* 지역이 출발지 → 이 성지를 바로 도착지로 */
    _setEnd({ idx, name: s.name, lat: s.lat, lng: s.lng, isGps: false });
    _ensureRouteTab(); _tryRoute();
  } else {
    _openCard(idx);  /* 일반 컨텍스트: 인포카드 */
  }
}

/* 지역검색 "지도 보기" — 시트 닫고 지역 마커로 지도 이동 */
function _regionMapView() {
  if (!_regionMk) return;
  _closeTab();
  _map.setCenter(_regionMk.getPosition());
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
      html += `<div class="region-place-cand list-item" data-lat="${d.y}" data-lng="${d.x}" data-nm="${_esc(nm)}">
        <div class="li-dot" style="background:#7c3aed"></div>
        <div class="li-info"><div class="li-name">${_esc(nm)}</div><div class="li-sub">${_esc(ad)}</div></div>
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

  /* 지역 기억 — 보라색 마커 나타나면 즉시 출발지로 자동 설정 */
  _routeRegionStart = { lat, lng, name: placeName };

  /* 자동 출발지 설정 (탭 전환 없이 백그라운드로) */
  _rS = { idx:-1, name:placeName, lat, lng, isGps:false };
  const startLbl = document.getElementById('rs-start-lbl');
  if (startLbl) { startLbl.textContent = placeName; startLbl.classList.remove('empty'); }
  const startX = document.getElementById('rs-start-x');
  if (startX) startX.style.display = '';
  window._updateSearchBtn && window._updateSearchBtn();

  /* 보라색 마커 클릭 → 길찾기 탭으로 이동, 출발지 확인 */
  kakao.maps.event.addListener(_regionMk, 'click', () => {
    if (!_routeRegionStart) return;
    if (!_rS || _rS.lat !== lat) {
      _setStart({ idx:-1, name:_routeRegionStart.name, lat:_routeRegionStart.lat, lng:_routeRegionStart.lng, isGps:false });
    }
    _ensureRouteTab();
    const tip = document.getElementById('rs-guide-tip');
    if (tip) { tip.textContent = '도착 성지를 탭하세요'; tip.style.display = ''; }
  });

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
       <button onclick="_regionMapView()" style="padding:6px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">지도 보기</button>
     </div>
     <div style="padding:7px 14px 4px;font-size:11px;font-weight:700;color:#c0392b">† 근처 성지 · 자동차 거리순 ${sorted.length}곳</div>` +
    sorted.map((o,n) => {
      const s=_shrines[o.i], c=_typeColor(s.type);
      const km  = (o.d / 1000 * 1.35).toFixed(1);
      const min = Math.round(o.d / 1000 * 1.35 / 40 * 60);
      const dur = min < 60 ? min+'분' : Math.floor(min/60)+'시간'+(min%60 ? (min%60)+'분' : '');
      return `<div class="nearby-item" onclick="_regionShrineTap(${o.i})">
        <div class="nearby-num" style="background:${c}!important">${n+1}</div>
        <div class="nearby-info">
          <div class="nearby-name">${_esc(s.name)}</div>
          <div class="nearby-addr">${_esc((s.addr||'').substring(0,28))}</div>
        </div>
        <div class="nearby-meta">
          <div class="nearby-type" style="background:${c}18!important;color:${c}!important">${_esc(s.type)}</div>
          <div class="nearby-dist" style="color:${c}!important">🚗${km}km</div>
          <div class="nearby-dur">${dur}</div>
        </div>
      </div>`;
    }).join('');

}

/* 카카오 장소 검색 실패 시: 성지명·주소 직접 검색 */
function _regionFallback(q) {
  const body = document.getElementById('region-body');
  const matched = _shrines
    .map((s,i) => ({ i, s }))
    .filter(o => o.s.name.includes(q) || (o.s.addr||'').includes(q) || (o.s.diocese||'').includes(q));
  if (!matched.length) {
    body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">검색 결과가 없습니다.</div>';
    return;
  }
  _showOnly(matched.map(o => o.i));
  body.innerHTML = `<div style="padding:10px 14px 4px;font-size:11px;font-weight:700;color:#aaa">✝ "${_esc(q)}" 검색 결과</div>` +
    matched.slice(0, 20).map(o => {
      const s=o.s, c=_typeColor(s.type);
      return `<div class="list-item" onclick="_openCard(${o.i})">
        <div class="li-dot" style="background:${c}"></div>
        <div class="li-info"><div class="li-name">${_esc(s.name)}</div><div class="li-sub">${_esc((s.addr||'').substring(0,28))}</div></div>
        <span class="li-badge" style="background:${c}18;color:${c}">${_esc(s.type)}</span>
      </div>`;
    }).join('');
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
  if (pt.idx >= 0 && _markers[pt.idx]) {
    _markers[pt.idx].setMap(_map);
    _markers[pt.idx].setImage(_mkrRoute('경'));
    _markers[pt.idx].setZIndex(50);
  }
  _renderViaList();
}
/* 경로 미완성 시 마커 복원 — 출/도/경 이미지는 유지, 나머지 전체 표시 */
function _restoreRouteMarkers() {
  _showAll();
  if (_myMk) _myMk.setMap(_routePolyline ? null : _map);
  if (_rS?.idx >= 0 && _markers[_rS.idx]) {
    _markers[_rS.idx].setImage(_mkrRoute('출')); _markers[_rS.idx].setZIndex(340);
  }
  if (_rE?.idx >= 0 && _markers[_rE.idx]) {
    _markers[_rE.idx].setImage(_mkrRoute('도')); _markers[_rE.idx].setZIndex(320);
  }
  _rVia.filter(v => !v.pending && v.idx >= 0).forEach(v => {
    if (_markers[v.idx]) { _markers[v.idx].setImage(_mkrRoute('경')); _markers[v.idx].setZIndex(50); }
  });
}

function _removeVia(i) {
  const pt = _rVia[i];
  if (pt?.idx >= 0) _resizeMk(pt.idx, false);
  _rVia.splice(i, 1);
  _rVia.forEach(v => { if (v.idx >= 0 && _markers[v.idx]) _markers[v.idx].setImage(_mkrRoute('경')); });
  _renderViaList();
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _clearRouteTmpMkrs();
  _restoreRouteMarkers();  /* 경유 제거 → 마커 전체 복원 */
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  window._updateSearchBtn && window._updateSearchBtn();
  if (_rS && _rE) _tryRoute();
}
function _clearStart() {
  if (_rS?.idx >= 0) _resizeMk(_rS.idx, false);
  _rS = null;
  const lbl = _q('#rs-start-lbl'); lbl.textContent = '출발지를 선택하세요'; lbl.classList.add('empty');
  _q('#rs-start-x').style.display = 'none';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _clearRouteTmpMkrs();
  _restoreRouteMarkers();  /* 출발 해제 → 마커 전체 복원 */
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  window._updateSearchBtn && window._updateSearchBtn();
}
function _clearEnd() {
  if (_rE?.idx >= 0) _resizeMk(_rE.idx, false);
  _rE = null;
  const lbl = _q('#rs-end-lbl'); lbl.textContent = '도착지를 선택하세요'; lbl.classList.add('empty');
  _q('#rs-end-x').style.display = 'none';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _clearRouteTmpMkrs();
  _restoreRouteMarkers();  /* 도착 해제 → 마커 전체 복원 */
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  window._updateSearchBtn && window._updateSearchBtn();
}
/* 경로 표시 중 — 출/경유/도 마커만 지도에 남김 */
/* GPS 출발지/경유지/도착지 임시 마커 */
let _startTmpMkr = null, _endTmpMkr = null, _viaTmpMkrs = [];

function _clearRouteTmpMkrs() {
  if (_startTmpMkr) { _startTmpMkr.setMap(null); _startTmpMkr = null; }
  if (_endTmpMkr)   { _endTmpMkr.setMap(null);   _endTmpMkr   = null; }
  _viaTmpMkrs.forEach(mk => mk.setMap(null)); _viaTmpMkrs = [];
}

function _showRouteMarkersOnly() {
  if (_myMk) _myMk.setMap(null);  /* 경로 표시 중 현위치 숨김 */
  /* 출/도/경유 마커 인덱스 수집 */
  const keep = new Set();
  if (_rS?.idx >= 0) keep.add(_rS.idx);
  if (_rE?.idx >= 0) keep.add(_rE.idx);
  _rVia.filter(v => !v.pending && v.idx >= 0).forEach(v => keep.add(v.idx));
  _markers.forEach((mk, i) => mk && mk.setMap(keep.has(i) ? _map : null));

  /* 출/도/경 마커 이미지 강제 적용 */
  if (_rS?.idx >= 0 && _markers[_rS.idx]) {
    _markers[_rS.idx].setMap(_map); _markers[_rS.idx].setImage(_mkrRoute('출')); _markers[_rS.idx].setZIndex(340);
  }
  if (_rE?.idx >= 0 && _markers[_rE.idx]) {
    _markers[_rE.idx].setMap(_map); _markers[_rE.idx].setImage(_mkrRoute('도')); _markers[_rE.idx].setZIndex(320);
  }
  _rVia.filter(v => !v.pending && v.idx >= 0).forEach(v => {
    if (_markers[v.idx]) { _markers[v.idx].setMap(_map); _markers[v.idx].setImage(_mkrRoute('경')); _markers[v.idx].setZIndex(50); }
  });

  /* GPS 임시 마커 */
  _clearRouteTmpMkrs();
  if (_rS?.idx < 0 && _rS?.lat) {
    _startTmpMkr = new _MM({ map:_map, position:new _LL(_rS.lat,_rS.lng), image:_mkrRoute('출'), zIndex:340 });
  }
  if (_rE?.idx < 0 && _rE?.lat) {
    _endTmpMkr = new _MM({ map:_map, position:new _LL(_rE.lat,_rE.lng), image:_mkrRoute('도'), zIndex:320 });
  }
  _rVia.filter(v => !v.pending && v.idx < 0 && v.lat).forEach(v => {
    _viaTmpMkrs.push(new _MM({ map:_map, position:new _LL(v.lat,v.lng), image:_mkrRoute('경'), zIndex:50 }));
  });
}

/* 인포카드 고려한 bounds 맞춤 */
function _fitRouteBounds(bound) {
  if (!bound) return;
  const sw = new _LL(bound.min_y, bound.min_x);
  const ne = new _LL(bound.max_y, bound.max_x);
  const bounds = new kakao.maps.LatLngBounds(sw, ne);

  /* 길찾기 결과 시트 높이만큼 하단 패딩 추가 */
  const sheet = document.getElementById('sheet-route');
  const sheetH = sheet ? sheet.offsetHeight : 240;
  const mapDiv = _map.getNode ? _map.getNode() : document.getElementById('map');
  const mapH   = mapDiv ? mapDiv.offsetHeight : 500;

  /* 하단 패딩 = 결과 시트 높이 + 여유 20px, 상단 = 60px */
  _map.setBounds(bounds, 60, 60, Math.round(sheetH) + 20, 60);
}

function _clearRoute(fresh = false) {
  [_rS, ..._rVia, _rE].forEach(p => { if (p?.idx >= 0) _resizeMk(p.idx, false); });
  _rS = null; _rVia = []; _rE = null;
  _q('#rs-start-lbl').textContent = '출발지를 선택하세요'; _q('#rs-start-lbl').classList.add('empty');
  _q('#rs-end-lbl').textContent   = '도착지를 선택하세요'; _q('#rs-end-lbl').classList.add('empty');
  _q('#rs-start-x').style.display = 'none'; _q('#rs-end-x').style.display = 'none';
  _q('#rs-via-wrap').innerHTML = '';
  _q('#rs-result').style.display = 'none'; _q('#rs-hint').style.display = '';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _clearRouteTmpMkrs();
  if (_myMk) _myMk.setMap(_map);   /* 현위치 마커 복원 */
  window._updateSearchBtn && window._updateSearchBtn();
  _showAll();  /* 모든 마커 복원 */

  /* 지역검색 컨텍스트 — fresh(다시선택)이면 자동 출발지 복원 안 함 */
  if (_routeRegionStart && _regionMk) _regionMk.setMap(_map);  /* 보라색 마커는 항상 복원 */
  if (!fresh && _routeRegionStart) {
    setTimeout(() => {
      _setStart({ idx:-1, name:_routeRegionStart.name,
        lat:_routeRegionStart.lat, lng:_routeRegionStart.lng, isGps:false });
    }, 50);
  }
}
function _renderViaList() {
  const wrap = _q('#rs-via-wrap');
  wrap.innerHTML = _rVia.map((v, i) => {
    if (v.pending) {
      /* 빈 경유 슬롯 — 탭하면 모달 열림, 지도 마커 탭으로도 채울 수 있음 */
      return `<div class="rs-input-row" style="margin-bottom:4px">
        <div class="rs-box" style="cursor:pointer;border-style:dashed;border-color:#FF8C00;opacity:.7" onclick="_openViaEdit(${i})">
          <div class="rs-dot" style="background:#FF8C00;opacity:.5"></div>
          <span class="rs-lbl empty" style="color:#FF8C00">경유지를 선택하세요</span>
        </div>
        <div class="rs-side-col">
          <button class="rs-x-btn" onclick="_removeVia(${i})" style="font-size:16px;color:#aaa">×</button>
        </div>
      </div>`;
    }
    return `<div class="rs-input-row" style="margin-bottom:4px">
      <div class="rs-box" style="cursor:pointer" onclick="_openViaEdit(${i})">
        <div class="rs-dot" style="background:#FF8C00"></div>
        <span class="rs-lbl" style="color:#FF8C00;font-weight:800">${_esc(v.name)}</span>
      </div>
      <div class="rs-side-col">
        <button class="rs-x-btn" onclick="_removeVia(${i})" style="font-size:16px;color:#aaa">×</button>
      </div>
    </div>`;
  }).join('');
}

/* 출발/도착 마커 재클릭 안내 (실수 방지) */
function _showMarkerConfirm(role, idx, name) {
  const label = role === 'start' ? '출발지' : role === 'end' ? '도착지' : '경유지';
  const color = role === 'start' ? '#1565c0' : role === 'end' ? '#c0392b' : '#FF8C00';
  const toast = document.createElement('div');
  toast.id = 'marker-confirm-toast';
  toast.style.cssText = `
    position:fixed; bottom:calc(var(--safe-b,0px) + 60px); left:50%; transform:translateX(-50%);
    background:#1f2a44; color:#fff; border-radius:16px; padding:14px 18px;
    z-index:1100; box-shadow:0 4px 20px rgba(0,0,0,.35);
    font-size:13px; text-align:center; min-width:240px; max-width:320px;
    animation: fadeInUp .2s ease;
  `;
  toast.innerHTML = `
    <div style="font-size:12px;color:rgba(255,255,255,.6);margin-bottom:6px">
      ✋ <b style="color:#d4aa6a">${label}</b>로 지정된 마커입니다
    </div>
    <div style="font-weight:700;margin-bottom:12px;font-size:14px">${_esc(name)}</div>
    <div style="display:flex;gap:8px">
      <button onclick="_dismissMarkerConfirm()" style="flex:1;height:36px;border:1.5px solid rgba(255,255,255,.3);border-radius:10px;background:transparent;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">유지</button>
      <button onclick="_confirmMarkerCancel('${role}',${idx})" style="flex:1;height:36px;border:none;border-radius:10px;background:${color};color:#fff;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">${label} 취소</button>
    </div>`;
  const prev = document.getElementById('marker-confirm-toast');
  if (prev) prev.remove();
  document.body.appendChild(toast);
  clearTimeout(window._markerConfirmTimer);
  window._markerConfirmTimer = setTimeout(_dismissMarkerConfirm, 5000);
}
function _confirmMarkerCancel(role, idx) {
  _dismissMarkerConfirm();
  if (role === 'start') _clearStart();
  else if (role === 'end') _clearEnd();
  else if (role === 'via') {
    const i = _rVia.findIndex(v => !v.pending && v.idx === idx);
    if (i >= 0) _removeVia(i);
  }
}
function _dismissMarkerConfirm() {
  clearTimeout(window._markerConfirmTimer);
  const t = document.getElementById('marker-confirm-toast');
  if (t) t.remove();
}

function _openViaEdit(i) {
  _pickerViaIdx = i;
  _openPicker('via-edit');
}

/* 경로 탭 열기 — 이미 열려있으면 유지 (switchTab은 토글이라 사용 불가) */
function _ensureRouteTab() {
  if (_activeTab === 'route') return;
  switchTab('route');
}

/* ── 마커 탭 → 자동 출발/도착/경유 할당 ── */
function _setRouteFromMarker(idx) {
  const s = _shrines[idx];
  const pt = { idx, name: s.name, lat: s.lat, lng: s.lng, isGps: false };

  /* 같은 마커 재클릭 → 확인 배너 (출/도/경 모두) */
  if (_rS?.idx === idx) { _showMarkerConfirm('start', idx, _rS.name); return; }
  if (_rE?.idx === idx) { _showMarkerConfirm('end',   idx, _rE.name); return; }
  const assignedVia = _rVia.findIndex(v => !v.pending && v.idx === idx);
  if (assignedVia >= 0) { _showMarkerConfirm('via', idx, _rVia[assignedVia].name); return; }

  /* 빈 경유 슬롯(pending)이 있으면 채우기 */
  const pendingIdx = _rVia.findIndex(v => v.pending);
  if (pendingIdx >= 0) {
    _rVia[pendingIdx] = { ...pt, pending:false };
    if (_markers[idx]) { _markers[idx].setMap(_map); _markers[idx].setImage(_mkrRoute('경')); _markers[idx].setZIndex(50); }
    _renderViaList();
    /* 경유 채워졌으면 경로 재계산 → 마커 정리 */
    if (_rS && _rE) { _showRouteMarkersOnly(); _tryRoute(); }
    else _restoreRouteMarkers();
    return;
  }

  /* 지역 컨텍스트: 지역 출발 → 마커를 도착지로 */
  if (!_rS && _routeRegionStart) {
    _setStart({ idx:-1, name:_routeRegionStart.name, lat:_routeRegionStart.lat, lng:_routeRegionStart.lng, isGps:false });
    _setEnd(pt); _ensureRouteTab(); _tryRoute();
  } else if (!_rS) {
    _setStart(pt); _ensureRouteTab();
  } else if (!_rE) {
    _setEnd(pt); _ensureRouteTab(); _tryRoute();
  } else {
    _addVia(pt); _tryRoute();
  }
}

/* ── 인포카드 "경로검색" ── */
function _icRoute() {
  if (_curIdx < 0) return;
  _sabOpen(_curIdx);   /* 인포카드 경로검색 → 같은 모달 다이얼로그 */
}

/* ── GPS 출발지 ── */
function _setGpsStart() {
  if (!navigator.geolocation) return;
  const btn = _q('#rs-myloc');

  /* ① 이미 위치가 있으면 즉시 사용 (가장 빠름) */
  if (_myLat && _myLng) {
    _setStart({ idx:-1, name:'내 위치', lat:_myLat, lng:_myLng, isGps:true });
    if (_rE) _tryRoute();
    return;
  }

  btn.textContent = '...';
  /* ② maximumAge=30s, 정확도 낮춤으로 빠른 응답 우선 */
  navigator.geolocation.getCurrentPosition(pos => {
    btn.textContent = '📍현위치';
    _myLat = pos.coords.latitude; _myLng = pos.coords.longitude;
    _setStart({ idx:-1, name:'내 위치', lat:_myLat, lng:_myLng, isGps:true });
    _showMyLoc(_myLat, _myLng);
    if (_rE) _tryRoute();
  }, () => { btn.textContent = '📍현위치'; alert('위치를 가져오지 못했습니다.'); },
  { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 });
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
    /* 택시비 삭제 */

    /* 실제 경로 폴리라인 */
    if (_routePolyline) _routePolyline.setMap(null);
    const pts = [];
    route.sections.forEach(sec => sec.roads.forEach(r => {
      for (let j = 0; j < r.vertexes.length; j += 2) pts.push(new _LL(r.vertexes[j+1], r.vertexes[j]));
    }));
    _routePolyline = new _PL({ map: _map, path: pts, strokeWeight: 5, strokeColor: '#1565c0', strokeOpacity: .85 });

    /* 지도 범위: 길찾기 결과 시트 높이 고려 */
    _fitRouteBounds(sum.bound);

    _showRouteMarkersOnly();
    /* 결과카드가 항상 보이도록 시트 스크롤 */
    const _sh = document.getElementById('sheet-route');
    if (_sh) requestAnimationFrame(() => { _sh.scrollTop = _sh.scrollHeight; });
    _q('#rs-result').style.display = 'block'; _q('#rs-hint').style.display = 'none';
    const sb=document.getElementById('rs-search-btn');if(sb)sb.style.display='none';

  } catch (e) {
    console.warn('[경로]', e.message);
    _q('#rs-km').textContent = '—'; _q('#rs-time').textContent = '—';
    _q('#rs-fare').style.display = 'none';
    _showRouteMarkersOnly();
    /* 결과카드가 항상 보이도록 시트 스크롤 */
    const _sh = document.getElementById('sheet-route');
    if (_sh) requestAnimationFrame(() => { _sh.scrollTop = _sh.scrollHeight; });
    _q('#rs-result').style.display = 'block'; _q('#rs-hint').style.display = 'none';
    const sb=document.getElementById('rs-search-btn');if(sb)sb.style.display='none';
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
  /* 구 앱 동일: 을(를) 조사 */
  const last = s.name.charCodeAt(s.name.length - 1);
  const particle = (last >= 0xAC00 && (last - 0xAC00) % 28 !== 0) ? '을(를)' : '를(을)';
  document.getElementById('sab-name').textContent =
    `${s.name}${particle} 출발지 또는 도착지로 설정하세요.`;
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
    if (_rS) {
      switchTab('route'); _tryRoute();
    } else if (_routeRegionStart) {
      /* 지역검색 컨텍스트 — 지역이 자동 출발지 */
      _setStart({ idx:-1, name:_routeRegionStart.name, lat:_routeRegionStart.lat, lng:_routeRegionStart.lng, isGps:false });
      switchTab('route'); _tryRoute();
    } else {
      switchTab('route');
      _setGpsStart();   /* 기타 경우: 현위치 자동 설정 */
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
let _pickerRole = '', _pickerViaIdx = -1;

function _openPicker(role) {
  _pickerRole = role;
  const titles = { start:'🔵 출발지 선택', end:'🔴 도착지 선택', via:'🟠 경유지 추가', 'via-edit':'🟠 경유지 변경' };
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
  const q = kw.trim();
  const list = q
    ? _shrines.filter(s => s.name.includes(q) || (s.addr||'').includes(q) || (s.diocese||'').includes(q))
    : _shrines;

  let html = '';
  /* 현재 내 위치 항목 삭제 — 출발지 없으면 도착지 설정 시 자동 GPS */
  if (!list.length) {
    html += `<div class="rp-empty">검색 결과가 없습니다</div>`;
  } else {
    /* 성지찾기 list-item 디자인과 통일 */
    html += list.map(s => {
      const idx = _shrines.indexOf(s);
      const c   = _typeColor(s.type);
      return `<div class="list-item" data-idx="${idx}">
        <div class="li-dot" style="background:${c}"></div>
        <div class="li-info">
          <div class="li-name">${_esc(s.name)}</div>
          <div class="li-sub">${_esc(s.diocese||'')} · ${_esc((s.addr||'').substring(0,28))}</div>
        </div>
        <span class="li-badge" style="background:${c}18;color:${c}">${_esc(s.type)}</span>
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
    if (!item) return;    const idx = parseInt(item.dataset.idx);
    const s   = _shrines[idx];
    if (!s) return;
    const pt  = { idx, name: s.name, lat: s.lat, lng: s.lng, isGps: false };
    _closePicker();
    if (_pickerRole === 'start') {
      _setStart(pt);
      /* 도착지 이미 있으면 자동 경로 계산 */
      if (_rE) _tryRoute();
    } else if (_pickerRole === 'end') {
      _setEnd(pt);
      /* 출발지 이미 있으면 자동 경로 계산 */
      if (_rS) _tryRoute();
    } else if (_pickerRole === 'via') {
      _addVia(pt);
      if (_rS && _rE) _tryRoute();
    } else if (_pickerRole === 'via-edit') {
      /* 기존 경유지 교체 (pending 포함) */
      if (_pickerViaIdx >= 0 && _pickerViaIdx < _rVia.length) {
        const old = _rVia[_pickerViaIdx];
        if (old?.idx >= 0) _resizeMk(old.idx, false);
        _rVia[_pickerViaIdx] = { ...pt, pending:false };
        if (_markers[pt.idx]) { _markers[pt.idx].setMap(_map); _markers[pt.idx].setImage(_mkrRoute('경')); _markers[pt.idx].setZIndex(50); }
        _renderViaList();
        if (_rS && _rE) _tryRoute();
      }
    }
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
  _q('#ic-sub').textContent  = s.diocese || '';
  const tb = _q('#ic-type');
  /* 스펙: 타입 배지 = 한글 레이블 (성지/순례지/순교 사적지) */
  tb.textContent = s.type || '';  /* 이미 한글 변환됨 */
  tb.style.background = _typeColor(s.type); tb.style.color = '#fff';

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

  /* 전화 — 없으면 display:none → 경로검색이 행 전체 차지 */
  const tel = _q('#ic-tel');
  if (s.tel) {
    _q('#ic-tel-num').textContent = s.tel;
    tel.href = 'tel:' + s.tel.replace(/[^0-9+]/g, '');
    tel.style.display = '';
  } else {
    tel.style.display = 'none';
  }

  /* 홈페이지 + 성지 상세 링크 */
  const hp    = _q('#ic-hp');
  const guide = _q('#ic-guide');
  const row2  = document.getElementById('ic-row-2');
  const links = _q('#ic-links');

  if (s.hp) {
    hp.href = s.hp;
    hp.style.display = '';
  } else {
    hp.style.display = 'none';
  }

  if (s.cbck || s.seq) {
    guide.href = s.cbck || ('https://www.cbck.or.kr/Catholic/Shrine/Read?seq=' + s.seq);
    guide.style.display = '';
  } else {
    guide.style.display = 'none';
  }

  /* 홈페이지+성지상세 둘 다 없으면 2행 전체 숨김 */
  if (row2) row2.style.display = (s.hp || s.cbck || s.seq) ? '' : 'none';
  links.style.display = '';

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

  /* 시트 닫기 — 인포카드 열 때 목록 시트 닫힘 */
  document.querySelectorAll('.sheet').forEach(sh => sh.classList.remove('open'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  _activeTab = '';
  _showAll();         /* 모든 마커 복원 */
  _resizeMk(idx, true); /* 선택 마커 노랑 + z-index 최상위 재적용 */

  /* 지도 중심: 마커를 지도 중앙에 두고, 인포카드 높이/2 만큼 위로 보정
     panBy(0, n): n>0 → 지도 아래로 → 마커는 위로 */
  _map.setCenter(new _LL(s.lat, s.lng));
  requestAnimationFrame(() => {
    const ic = document.getElementById('info-card');
    const icH = ic ? ic.offsetHeight : 260;
    _map.panBy(0, Math.round(icH / 2));
  });

  _q('#info-card').classList.add('open');
}
function _closeCard() {
  if (_curIdx >= 0) {
    /* 경로 마커(출/도/경유)이면 이미지 유지 — 일반 마커만 복원 */
    const isStart = _rS?.idx === _curIdx;
    const isEnd   = _rE?.idx === _curIdx;
    const isVia   = _rVia.some(v => !v.pending && v.idx === _curIdx);
    if (isStart) { _markers[_curIdx]?.setImage(_mkrRoute('출')); _markers[_curIdx]?.setZIndex(340); }
    else if (isEnd) { _markers[_curIdx]?.setImage(_mkrRoute('도')); _markers[_curIdx]?.setZIndex(320); }
    else if (isVia) { _markers[_curIdx]?.setImage(_mkrRoute('경')); _markers[_curIdx]?.setZIndex(50); }
    else _resizeMk(_curIdx, false);
    _curIdx = -1;
  }
  _cur = null;
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
    kakao.maps.event.addListener(mk,'click',()=>{
      const i = _shrines.indexOf(s);
      if (_activeTab === 'route') _setRouteFromMarker(i);
      else _openCard(i);
    });
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
  /* 구 앱 패턴: _buildShrineList — type/diocese 코드→한글 변환 */
  _shrines = (window._SH_RAW||[]).map(function(src){
    const s = Object.assign({}, src);
    if (_TY[s.type])   s.type   = _TY[s.type];    /* A→성지, B→순례지, C→순교 사적지 */
    if (_DIO[s.diocese]) s.diocese = _DIO[s.diocese]; /* SE→서울대교구 등 */
    return s;
  }).filter(function(s){ return s.lat && s.lng; });

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
    btn.style.display = (_rS && _rE) ? 'block' : 'none';  /* '' 아닌 'block' — CSS display:none 방지 */
  };

  _q('#rs-myloc').addEventListener('click', _setGpsStart);  /* 현위치 버튼 */
  _q('#rs-start-x').addEventListener('click', () => { _clearStart(); window._updateSearchBtn && window._updateSearchBtn(); });
  _q('#rs-end-x').addEventListener('click',   () => { _clearEnd();   window._updateSearchBtn && window._updateSearchBtn(); });

  /* 출발/도착 박스 탭 → picker */
  _q('#rs-start-lbl').addEventListener('click', () => _openPicker('start'));
  _q('#rs-end-lbl').addEventListener('click',   () => _openPicker('end'));
  _q('#rs-add-via').addEventListener('click', () => {
    /* 빈 경유 슬롯 추가 + 지도에 마커 전체 표시 (경유 선택하기 위해) */
    _rVia.push({ idx:-1, name:'', lat:null, lng:null, pending:true });
    _renderViaList();
    _restoreRouteMarkers();  /* 모든 마커 표시 — 경유 선택 가능하게 */
  });

  /* 경로 검색 버튼 (수동 트리거) */
  _q('#rs-search-btn').addEventListener('click', _tryRoute);

  _q('#rs-navi-btn').addEventListener('click', _startNavi);
  _q('#rs-reset-btn').addEventListener('click', () => {
    /* 다시선택: 지도 중심/줌 유지하면서 경로만 제거 */
    const savedCenter = _map.getCenter();
    const savedLevel  = _map.getLevel();
    _clearRoute(true);  /* fresh=true: 완전 초기화, 첫클릭=출발 두번째=도착 */
    window._updateSearchBtn && window._updateSearchBtn();
    /* 지도 위치 복원 */
    requestAnimationFrame(() => {
      _map.setCenter(savedCenter);
      _map.setLevel(savedLevel);
    });
  });

  /* 플로팅 스왑 버튼 */
  /* 인라인 스왑 버튼 (rs-swap-inline) + 레거시 플로팅 스왑 모두 처리 */
  ['route-float-swap','rs-swap-inline'].forEach(id => {
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('click', () => {
    const tmpS = _rS, tmpE = _rE;
    if (tmpS) _setEnd({...tmpS}); else _clearEnd();
    if (tmpE) _setStart({...tmpE}); else _clearStart();
    window._updateSearchBtn && window._updateSearchBtn();
    _q('#rs-result').style.display = 'none';
    _q('#rs-hint').style.display = '';
    });
  });

  /* 우선순위 버튼 삭제됨 — RECOMMEND 고정 */
  _rPriority = 'RECOMMEND';
  _initPicker();
  _initSab();
  _initSwiper();

  /* 성지찾기 필터 pill */
  _q('#list-filter-bar').addEventListener('click', e => {
    const pill = e.target.closest('[data-dio]');
    if (!pill) return;
    _filterDio = pill.dataset.dio;  /* 한글 교구명 또는 'all' */
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
    _routeRegionStart = null;   /* 지역 컨텍스트 초기화 */
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
