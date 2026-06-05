/* 가톨릭길동무 app.js — 성지 지도 V1
   §0 설정  §1 상태  §2 지도·마커  §3 인포카드
   §4 검색(성지·지역)  §5 내주변  §6 길찾기  §7 스탬프  §8 코스모드  §9 시작 */
'use strict';

/* §0 설정 */
const KAKAO_KEY      = '07f7989e29fdfb425fff924f36fb3ec0';
const KAKAO_REST_KEY = '86a3b86e6c1b0210b8e4aba5f6c83b00';
const STAMP_KEY      = 'catholic_stamp_visited_v1';
const STAMP_RADIUS   = 300;

/* 타입 매핑: A=성지(빨강), B=순례지(파랑), C=순교사적지(초록) */
const _TY  = { A:'성지', B:'순례지', C:'순교 사적지' };
const _CLR = { '성지':'#c0392b', '순례지':'#1565c0', '순교 사적지':'#1b7a3e' };
const _TC  = (t) => _CLR[t] || '#555';

/* §1 상태 */
let _map, _markers = [], _myMarker = null, _regionMarker = null;
let _LL, _MM, _MI, _SZ, _PT, _PL;   /* Kakao 단축 별칭 */
let _shrines = [], _byseq = {};
let _curShrine = null, _selIdx = -1, _cardOpen = false;
let _searchMode = 'shrine';          /* 'shrine' | 'region' */
let _searchDebounce = null;
let _routeMode = false;
let _rS = null, _rVia = [], _rE = null;  /* 출발 / 경유[] / 도착 */
let _routePolyline = null;
let _courseMode = false, _courseShrines = [], _coursePolyline = null;
let _byseqBuilt = false;

/* §2 지도 · 마커 ─────────────────────────────────── */

/* 구 앱과 동일한 십자가 SVG 마커 */
const _NS = 'xmlns="http://www.w3.org/2000/svg"';
const _EC = encodeURIComponent;
const _svgUrl = s => 'data:image/svg+xml;charset=utf-8,' + _EC(s);

function _mkrImg(color, big) {
  const w = big ? 40 : 28, h = big ? 52 : 36;
  const crossBig   = `<g fill="#fff" opacity="0.96"><rect x="18.45" y="10.5" width="3.1" height="18.5" rx="1.1"/><rect x="13.4" y="16.3" width="13.2" height="3.1" rx="1.1"/></g>`;
  const crossSmall = `<g fill="#fff" opacity="0.96"><rect x="12.85" y="7.8" width="2.3" height="12.8" rx="0.8"/><rect x="9.6" y="11.7" width="8.8" height="2.3" rx="0.8"/></g>`;
  const path = big
    ? `M20 0C8.954 0 0 8.954 0 20c0 14.21 20 32 20 32S40 34.21 40 20C40 8.954 31.046 0 20 0z`
    : `M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z`;
  const svg = `<svg ${_NS} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${path}" fill="${color}" opacity="0.92"/>${big ? crossBig : crossSmall}</svg>`;
  return new _MI(_svgUrl(svg), new _SZ(w, h), { offset: new _PT(w / 2, h) });
}

function _mkrImgRoute(label) {
  const c = label === '출' ? '#FF0000' : '#005BFF';
  const svg = `<svg ${_NS} width="36" height="46" viewBox="0 0 36 46"><ellipse cx="18" cy="43" rx="8" ry="3" fill="rgba(0,0,0,.25)"/><path d="M18 2C9 2 2 9 2 18C2 28 18 42 18 42C18 42 34 28 34 18C34 9 27 2 18 2Z" fill="${c}" stroke="white" stroke-width="2.5"/><circle cx="18" cy="18" r="10" fill="white" opacity="0.9"/><text x="18" y="23" font-size="13" font-weight="900" fill="${c}" text-anchor="middle" font-family="Arial,sans-serif">${label}</text></svg>`;
  return new _MI(_svgUrl(svg), new _SZ(36, 46), { offset: new _PT(18, 44) });
}

function _mkrImgVia(no) {
  const svg = `<svg ${_NS} width="30" height="38" viewBox="0 0 30 38"><path d="M15 0C7 0 0 7 0 15C0 24 15 37 15 37S30 24 30 15C30 7 23 0 15 0Z" fill="#FF8C00" stroke="white" stroke-width="2"/><circle cx="15" cy="15" r="8" fill="white" opacity="0.9"/><text x="15" y="20" font-size="11" font-weight="900" fill="#FF8C00" text-anchor="middle" font-family="Arial,sans-serif">${no}</text></svg>`;
  return new _MI(_svgUrl(svg), new _SZ(30, 38), { offset: new _PT(15, 37) });
}

function _mkrImgRegion() {
  const c = '#7B2FBE';
  const svg = `<svg ${_NS} width="42" height="54" viewBox="0 0 42 54"><ellipse cx="21" cy="51" rx="8" ry="3" fill="rgba(0,0,0,.22)"/><path d="M21 1C9.95 1 1 9.95 1 21c0 14.2 20 31 20 31s20-16.8 20-31C41 9.95 32.05 1 21 1z" fill="${c}" stroke="white" stroke-width="2"/><circle cx="21" cy="21" r="10.5" fill="white" opacity=".95"/><circle cx="21" cy="21" r="5.2" fill="${c}" opacity=".95"/></svg>`;
  return new _MI(_svgUrl(svg), new _SZ(42, 54), { offset: new _PT(21, 52) });
}

function _mkrImgMyLoc() {
  const svg = `<svg ${_NS} width="20" height="20"><circle cx="10" cy="10" r="8" fill="#2A8040" stroke="#fff" stroke-width="2.5"/></svg>`;
  return new _MI(_svgUrl(svg), new _SZ(20, 20), { offset: new _PT(10, 10) });
}

function initMap() {
  _LL = kakao.maps.LatLng;
  _MM = kakao.maps.Marker;
  _MI = kakao.maps.MarkerImage;
  _SZ = kakao.maps.Size;
  _PT = kakao.maps.Point;
  _PL = kakao.maps.Polyline;

  _map = new kakao.maps.Map(document.getElementById('kakao-map'), {
    center: new _LL(36.5, 127.8),
    level: 12
  });

  kakao.maps.event.addListener(_map, 'click', function() {
    hideInfoCard();
    closeNearby();
  });

  document.getElementById('map-loading').style.display = 'none';
  buildMarkers();

  /* 코스 모드 확인 */
  const params = new URLSearchParams(location.search);
  const cid = params.get('course');
  if (cid) {
    _buildByseq();
    loadCourseMode(cid);
    if (params.get('navi') === '1') setTimeout(startRouteNavi, 2500);
  }

  /* Kakao SDK 초기화 (Navi용) */
  if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
}

/* 마커 일괄 생성 — 배치(30개) + requestAnimationFrame */
function buildMarkers() {
  _markers = new Array(_shrines.length).fill(null);
  const BATCH = 30;
  let idx = 0;
  function next() {
    const end = Math.min(idx + BATCH, _shrines.length);
    for (let i = idx; i < end; i++) {
      const s = _shrines[i];
      if (!s.lat || !s.lng || s.lat < 33 || s.lat > 38 || s.lng < 124 || s.lng > 132) continue;
      const mk = new _MM({
        position: new _LL(s.lat, s.lng),
        image: _mkrImg(_TC(s.type), false),
        title: s.name
      });
      mk.setMap(_map);
      (function(index) {
        kakao.maps.event.addListener(mk, 'click', function() {
          if (_routeMode) { selectRouteTarget(index); }
          else { showInfoCard(index); }
        });
      })(i);
      _markers[i] = { marker: mk, shrine: s, index: i };
    }
    idx = end;
    if (idx < _shrines.length) requestAnimationFrame(next);
  }
  requestAnimationFrame(next);
}

function _restoreAllMarkers() {
  _markers.forEach(function(m) { if (m) m.marker.setMap(_map); });
}
function _filterMarkersTo(list) {
  _markers.forEach(function(m) {
    if (!m) return;
    m.marker.setMap(list.indexOf(m.shrine) >= 0 ? _map : null);
  });
}
function _setSelMarker(idx, big) {
  if (idx < 0 || !_markers[idx]) return;
  const s = _markers[idx].shrine;
  _markers[idx].marker.setImage(_mkrImg(_TC(s.type), big));
  _markers[idx].marker.setZIndex(big ? 100 : 0);
}

function _clearRegionMarker() {
  if (_regionMarker) { _regionMarker.setMap(null); _regionMarker = null; }
}
function _showRegionMarker(lat, lng, name) {
  _clearRegionMarker();
  _regionMarker = new _MM({
    position: new _LL(lat, lng),
    image: _mkrImgRegion(),
    title: name || '검색 위치',
    zIndex: 500
  });
  _regionMarker.setMap(_map);
}

/* §3 인포카드 ─────────────────────────────────────── */

function showInfoCard(idx) {
  if (_selIdx >= 0 && _selIdx !== idx) _setSelMarker(_selIdx, false);
  _selIdx = idx;
  _setSelMarker(idx, true);

  const s = _shrines[idx];
  _curShrine = s;
  _cardOpen = true;

  document.getElementById('ic-name').textContent = s.name;
  const tEl = document.getElementById('ic-type');
  tEl.textContent = s.type || '';
  tEl.style.background = _TC(s.type);
  tEl.style.display = s.type ? '' : 'none';

  const aRow = document.getElementById('ic-addr-row');
  document.getElementById('ic-addr').textContent = s.addr || '';
  aRow.style.display = s.addr ? '' : 'none';

  const telRow = document.getElementById('ic-tel-row');
  const telEl  = document.getElementById('ic-tel');
  if (s.tel) { telEl.href = 'tel:' + s.tel.replace(/[^0-9]/g, ''); telEl.textContent = s.tel; telRow.style.display = ''; }
  else telRow.style.display = 'none';

  const lRow = document.getElementById('ic-links-row');
  const lEl  = document.getElementById('ic-links');
  const links = [];
  if (s.seq) links.push('<a href="https://www.cbck.or.kr/page/api/page7330/view.asp?id=' + s.seq + '" target="_blank">성지 상세</a>');
  if (s.hp)  links.push('<a href="' + s.hp + '" target="_blank">홈페이지</a>');
  if (links.length) { lEl.innerHTML = links.join(' · '); lRow.style.display = ''; }
  else lRow.style.display = 'none';

  /* 카카오맵 길찾기 */
  document.getElementById('ic-btn-nav').onclick = function() {
    location.href = 'https://map.kakao.com/link/to/' + _EC(s.name) + ',' + s.lat + ',' + s.lng;
  };

  /* 길찾기 버튼 가시성 */
  document.getElementById('ic-route-btns').style.display = _routeMode ? '' : 'none';

  updateStampBtn(s);
  document.getElementById('info-card').classList.add('open');
  _map.panTo(new _LL(s.lat, s.lng));
}

function hideInfoCard() {
  if (!_cardOpen) return;
  _cardOpen = false;
  document.getElementById('info-card').classList.remove('open');
  if (_selIdx >= 0) { _setSelMarker(_selIdx, false); _selIdx = -1; }
  _curShrine = null;
}

/* §4 검색 ────────────────────────────────────────── */

function setSearchMode(mode) {
  _searchMode = mode;
  document.getElementById('chip-shrine').classList.toggle('on', mode === 'shrine');
  document.getElementById('chip-region').classList.toggle('on', mode === 'region');
  const inp = document.getElementById('search-input');
  inp.placeholder = mode === 'shrine' ? '성지 이름 검색' : '지역명 검색 (예: 명동, 수원)';
  inp.focus();
  hideSearch();
}

function runSearch(q) {
  q = (q || '').trim();
  if (!q) { hideSearch(); _restoreAllMarkers(); return; }
  document.getElementById('btn-srch-x').style.display = '';
  if (_searchMode === 'shrine') _runShrineSearch(q);
  else _runRegionSearch(q);
}

/* 성지찾기: 이름/주소로 필터 */
function _runShrineSearch(q) {
  const v = getVisited();
  const res = _shrines.filter(function(s) {
    return s.name.includes(q) || (s.addr && s.addr.includes(q));
  }).sort(function(a, b) {
    const an = a.name === q ? 0 : a.name.startsWith(q) ? 1 : 2;
    const bn = b.name === q ? 0 : b.name.startsWith(q) ? 1 : 2;
    return an - bn;
  }).slice(0, 20);

  _filterMarkersTo(res);

  if (!res.length) {
    showSearchBox('<div class="si"><div class="si-body"><div class="si-name" style="color:var(--gray)">검색 결과가 없습니다.</div></div></div>');
    return;
  }
  showSearchBox(res.map(function(s, i) {
    return '<div class="si" data-seq="' + s.seq + '">'
      + '<div class="si-dot" style="background:' + _TC(s.type) + '"></div>'
      + '<div class="si-body"><div class="si-name">' + s.name + '</div>'
      + '<div class="si-sub">' + (s.addr || '') + '</div></div>'
      + '<span class="si-type" style="background:' + _TC(s.type) + '18;color:' + _TC(s.type) + '">' + (s.type || '') + '</span>'
      + '</div>';
  }).join(''));
}

/* 지역검색: Kakao Places */
function _runRegionSearch(q) {
  showSearchBox('<div class="si"><div class="si-body"><div class="si-name" style="color:var(--gray)">검색 중...</div></div></div>');
  try {
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(q, function(data, status) {
      if (status !== kakao.maps.services.Status.OK || !data.length) {
        showSearchBox('<div class="si"><div class="si-body"><div class="si-name" style="color:var(--gray)">검색 결과가 없습니다.</div></div></div>');
        return;
      }
      showSearchBox(data.slice(0, 8).map(function(d) {
        return '<div class="si" data-place-lat="' + d.y + '" data-place-lng="' + d.x + '" data-place-name="' + _escHtml(d.place_name) + '">'
          + '<div class="si-dot" style="background:var(--clr-route)"></div>'
          + '<div class="si-body"><div class="si-name">' + _escHtml(d.place_name) + '</div>'
          + '<div class="si-sub">' + _escHtml(d.address_name || '') + '</div></div>'
          + '</div>';
      }).join(''));
    });
  } catch(e) {
    showSearchBox('<div class="si"><div class="si-body"><div class="si-name" style="color:var(--gray)">지역검색을 사용할 수 없습니다.</div></div></div>');
  }
}

function _onRegionSelect(lat, lng, name) {
  hideSearch();
  _showRegionMarker(lat, lng, name);

  /* 반경 내 성지 필터 + 지도 이동 */
  const haversineKm = function(la1, lo1, la2, lo2) {
    const R = 6371, f1 = la1*Math.PI/180, f2 = la2*Math.PI/180;
    const df = (la2-la1)*Math.PI/180, dl = (lo2-lo1)*Math.PI/180;
    const a = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
    return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  const nearby = _shrines.filter(function(s) { return s.lat && s.lng && haversineKm(lat, lng, s.lat, s.lng) < 50; })
    .sort(function(a, b) { return haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng); })
    .slice(0, 30);
  _filterMarkersTo(nearby);

  /* 줌 레벨 결정 */
  let maxKm = 0;
  nearby.forEach(function(s) { const d = haversineKm(lat, lng, s.lat, s.lng); if (d > maxKm) maxKm = d; });
  let lv = maxKm <= 1.8 ? 5 : maxKm <= 3.5 ? 6 : maxKm <= 7 ? 7 : maxKm <= 14 ? 8 : maxKm <= 28 ? 9 : maxKm <= 55 ? 10 : 11;
  _map.setLevel(lv);
  _map.setCenter(new _LL(lat, lng));
}

function showSearchBox(html) {
  const box = document.getElementById('search-results');
  box.innerHTML = html;
  box.style.display = 'block';
  box.querySelectorAll('.si[data-seq]').forEach(function(el) {
    el.addEventListener('click', function() {
      const seq = this.dataset.seq;
      const idx = _shrines.findIndex(function(s) { return s.seq === seq; });
      if (idx < 0) return;
      hideSearch();
      showInfoCard(idx);
    });
  });
  box.querySelectorAll('.si[data-place-lat]').forEach(function(el) {
    el.addEventListener('click', function() {
      _onRegionSelect(Number(this.dataset.placeLat), Number(this.dataset.placeLng), this.dataset.placeName);
    });
  });
}

function hideSearch() {
  const box = document.getElementById('search-results');
  box.style.display = 'none'; box.innerHTML = '';
  document.getElementById('btn-srch-x').style.display = 'none';
}

/* §5 내주변 ────────────────────────────────────────── */

function openNearby() {
  if (!navigator.geolocation) { alert('이 기기에서는 위치 기능을 사용할 수 없습니다.'); return; }
  document.getElementById('nearby-list').innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray);font-size:13px">📍 위치 확인 중...</div>';
  document.getElementById('nearby-panel').classList.add('open');

  navigator.geolocation.getCurrentPosition(function(pos) {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    _showMyLoc(lat, lng);

    const haversineKm = function(la1, lo1, la2, lo2) {
      const R = 6371, f1 = la1*Math.PI/180, f2 = la2*Math.PI/180;
      const df = (la2-la1)*Math.PI/180, dl = (lo2-lo1)*Math.PI/180;
      const a = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
      return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };
    const sorted = _shrines
      .filter(function(s) { return s.lat && s.lng; })
      .map(function(s) { return { s: s, km: haversineKm(lat, lng, s.lat, s.lng) }; })
      .sort(function(a, b) { return a.km - b.km; })
      .slice(0, 10);

    _map.setCenter(new _LL(lat, lng));
    _map.setLevel(7);

    document.getElementById('nearby-list').innerHTML = sorted.map(function(o, i) {
      const c = _TC(o.s.type);
      const idx = _shrines.indexOf(o.s);
      const distTxt = o.km < 1 ? Math.round(o.km * 1000) + 'm' : o.km.toFixed(1) + 'km';
      return '<div class="ni" data-idx="' + idx + '">'
        + '<div class="ni-no" style="background:' + c + '">' + (i+1) + '</div>'
        + '<div class="ni-info"><div class="ni-name">' + o.s.name + '</div>'
        + '<div class="ni-addr">' + (o.s.addr || '').substring(0, 26) + '</div></div>'
        + '<div class="ni-meta">'
        + '<span class="ni-type" style="background:' + c + '18;color:' + c + '">' + (o.s.type || '') + '</span>'
        + '<div class="ni-dist" style="color:' + c + '">📍' + distTxt + '</div>'
        + '</div></div>';
    }).join('');

    document.getElementById('nearby-list').querySelectorAll('.ni[data-idx]').forEach(function(el) {
      el.addEventListener('click', function() {
        const idx = Number(this.dataset.idx);
        closeNearby();
        showInfoCard(idx);
      });
    });
  }, function(err) {
    const m = { 1:'위치 권한이 거부되었습니다.', 2:'위치를 찾을 수 없습니다.', 3:'시간이 초과되었습니다.' };
    document.getElementById('nearby-list').innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray);font-size:13px">' + (m[err.code] || '위치를 가져오지 못했습니다.') + '</div>';
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 });
}

function closeNearby() {
  document.getElementById('nearby-panel').classList.remove('open');
}

function _showMyLoc(lat, lng) {
  if (!_myMarker) {
    _myMarker = new _MM({ map: _map, image: _mkrImgMyLoc(), zIndex: 200 });
  }
  _myMarker.setPosition(new _LL(lat, lng));
}

/* §6 길찾기 ────────────────────────────────────────── */

function toggleRouteMode() {
  _routeMode = !_routeMode;
  const panel = document.getElementById('route-panel');
  const chip  = document.getElementById('chip-route');
  panel.style.display = _routeMode ? 'block' : 'none';
  chip.classList.toggle('on', _routeMode);
  document.getElementById('top-bar').style.display = _routeMode ? 'none' : '';
  document.getElementById('mode-bar').style.display = _routeMode ? 'none' : '';
  if (!_routeMode) clearAllRoute();
  if (_cardOpen) {
    document.getElementById('ic-route-btns').style.display = _routeMode ? '' : 'none';
  }
}

function setRoutePoint(role) {
  if (!_curShrine) return;
  const s = _curShrine;
  const idx = _selIdx;
  if (role === 's') {
    _rS = { idx, name: s.name, lat: s.lat, lng: s.lng };
    document.getElementById('rp-start').innerHTML = '<strong>' + s.name + '</strong>';
    document.getElementById('rp-clear-s').style.display = '';
    _updateRouteMarker('s', idx);
  } else if (role === 'e') {
    _rE = { idx, name: s.name, lat: s.lat, lng: s.lng };
    document.getElementById('rp-end').innerHTML = '<strong>' + s.name + '</strong>';
    document.getElementById('rp-clear-e').style.display = '';
    _updateRouteMarker('e', idx);
  } else if (role === 'v') {
    _rVia.push({ idx, name: s.name, lat: s.lat, lng: s.lng });
    _renderViaList();
    _updateRouteMarker('v', idx, _rVia.length);
  }
  _checkNaviReady();
}

function selectRouteTarget(idx) {
  /* 길찾기 모드에서 마커 클릭 시 자동으로 도착지 지정 */
  if (!_rS) { _rS = { idx, name: _shrines[idx].name, lat: _shrines[idx].lat, lng: _shrines[idx].lng }; document.getElementById('rp-start').innerHTML = '<strong>' + _shrines[idx].name + '</strong>'; document.getElementById('rp-clear-s').style.display = ''; _updateRouteMarker('s', idx); }
  else if (!_rE) { _rE = { idx, name: _shrines[idx].name, lat: _shrines[idx].lat, lng: _shrines[idx].lng }; document.getElementById('rp-end').innerHTML = '<strong>' + _shrines[idx].name + '</strong>'; document.getElementById('rp-clear-e').style.display = ''; _updateRouteMarker('e', idx); }
  else showInfoCard(idx);
  _checkNaviReady();
}

function addViaPoint() {
  alert('지도에서 성지를 탭하거나 인포카드의 "경유지로" 버튼을 눌러 추가하세요.');
}

function _renderViaList() {
  const wrap = document.getElementById('rp-via-wrap');
  wrap.innerHTML = _rVia.map(function(v, i) {
    return '<div class="rp-row"><div class="rp-dot rp-dot-v"></div>'
      + '<div class="rp-txt"><strong>' + (i+1) + '. ' + v.name + '</strong></div>'
      + '<button class="rp-x" onclick="removeVia(' + i + ')">✕</button></div>';
  }).join('');
}

function removeVia(i) {
  if (_rVia[i] && _rVia[i].idx >= 0 && _markers[_rVia[i].idx]) {
    _markers[_rVia[i].idx].marker.setImage(_mkrImg(_TC(_shrines[_rVia[i].idx].type), false));
    _markers[_rVia[i].idx].marker.setZIndex(0);
  }
  _rVia.splice(i, 1);
  _renderViaList();
  _checkNaviReady();
}

function clearRoutePoint(role) {
  if (role === 's' && _rS) {
    if (_rS.idx >= 0 && _markers[_rS.idx]) { _markers[_rS.idx].marker.setImage(_mkrImg(_TC(_shrines[_rS.idx].type), false)); _markers[_rS.idx].marker.setZIndex(0); }
    _rS = null; document.getElementById('rp-start').innerHTML = '<span class="rp-empty">출발지</span>'; document.getElementById('rp-clear-s').style.display = 'none';
  } else if (role === 'e' && _rE) {
    if (_rE.idx >= 0 && _markers[_rE.idx]) { _markers[_rE.idx].marker.setImage(_mkrImg(_TC(_shrines[_rE.idx].type), false)); _markers[_rE.idx].marker.setZIndex(0); }
    _rE = null; document.getElementById('rp-end').innerHTML = '<span class="rp-empty">도착지</span>'; document.getElementById('rp-clear-e').style.display = 'none';
  }
  _checkNaviReady();
}

function clearAllRoute() {
  [_rS].concat(_rVia).concat([_rE]).forEach(function(p) {
    if (p && p.idx >= 0 && _markers[p.idx]) { _markers[p.idx].marker.setImage(_mkrImg(_TC(_shrines[p.idx].type), false)); _markers[p.idx].marker.setZIndex(0); }
  });
  _rS = null; _rVia = []; _rE = null;
  document.getElementById('rp-start').innerHTML = '<span class="rp-empty">출발지</span>';
  document.getElementById('rp-end').innerHTML = '<span class="rp-empty">도착지</span>';
  document.getElementById('rp-via-wrap').innerHTML = '';
  document.getElementById('rp-clear-s').style.display = 'none';
  document.getElementById('rp-clear-e').style.display = 'none';
  if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
  _checkNaviReady();
}

function _updateRouteMarker(role, idx, viaNo) {
  if (idx < 0 || !_markers[idx]) return;
  const img = role === 's' ? _mkrImgRoute('출') : role === 'e' ? _mkrImgRoute('도') : _mkrImgVia(viaNo);
  _markers[idx].marker.setImage(img);
  _markers[idx].marker.setZIndex(role === 's' ? 340 : role === 'e' ? 330 : 300 + (viaNo || 0));
}

function _checkNaviReady() {
  const btn = document.getElementById('rp-navi-btn');
  const ready = _rS && _rE;
  btn.style.opacity = ready ? '1' : '.5';
  btn.style.pointerEvents = ready ? '' : 'none';
}

function startRouteNavi() {
  if (!_rS || !_rE) return;
  if (!window.Kakao || !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  const viaPoints = _rVia.map(function(v) { return { name: v.name, x: String(v.lng), y: String(v.lat) }; });
  try {
    Kakao.Navi.start({
      name: _rE.name, x: String(_rE.lng), y: String(_rE.lat), coordType: 'wgs84', viaPoints
    });
  } catch(e) {
    location.href = 'https://map.kakao.com/link/to/' + _EC(_rE.name) + ',' + _rE.lat + ',' + _rE.lng;
  }
}

/* §7 스탬프 ─────────────────────────────────────────── */

function getVisited() {
  try {
    const v = JSON.parse(localStorage.getItem(STAMP_KEY) || '{}');
    let chg = false;
    Object.keys(v).forEach(function(seq) { if (typeof v[seq] === 'string') { v[seq] = [v[seq]]; chg = true; } });
    if (chg) saveVisited(v);
    return v;
  } catch(e) { return {}; }
}
function saveVisited(v) { try { localStorage.setItem(STAMP_KEY, JSON.stringify(v)); } catch(e) {} }
function _today() { return new Date().toISOString().slice(0, 10); }
function _visitCnt(v, seq)  { return (Array.isArray(v[seq]) ? v[seq] : []).length; }
function _lastVisit(v, seq) { const d = Array.isArray(v[seq]) ? v[seq] : []; return d.length ? d[d.length-1] : ''; }
function _isVisitedToday(v, seq) { return (Array.isArray(v[seq]) ? v[seq] : []).indexOf(_today()) !== -1; }

function updateStampBtn(s) {
  const btn = document.getElementById('ic-btn-stamp');
  btn.disabled = false;
  if (!s.stamp) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  const v = getVisited();
  const cnt = _visitCnt(v, s.seq), last = _lastVisit(v, s.seq);
  if (cnt > 0) {
    btn.textContent = '✅ ' + cnt + '회 · ' + last;
    btn.classList.add('visited');
    btn.onclick = function() { _promptUnstamp(s); };
  } else {
    btn.textContent = '🕊 방문 인증 (GPS)';
    btn.classList.remove('visited');
    btn.onclick = function() { _verifyAndStamp(s); };
  }
}

function _verifyAndStamp(s) {
  if (!navigator.geolocation) { alert('위치 기능을 사용할 수 없습니다.'); return; }
  const v = getVisited();
  if (_isVisitedToday(v, s.seq)) { alert('오늘 이미 방문 인증하셨습니다.\n(' + _today() + ')'); return; }
  const btn = document.getElementById('ic-btn-stamp');
  const orig = btn.textContent; btn.disabled = true; btn.textContent = '📍 위치 확인 중…';
  navigator.geolocation.getCurrentPosition(function(pos) {
    const d = _haversineM(pos.coords.latitude, pos.coords.longitude, s.lat, s.lng);
    if (d <= STAMP_RADIUS) {
      const v2 = getVisited();
      const dates = Array.isArray(v2[s.seq]) ? v2[s.seq] : [];
      dates.push(_today()); v2[s.seq] = dates; saveVisited(v2);
      updateStampBtn(s);
      alert('🕊 ' + s.name + '\n방문이 인증되었습니다!' + (dates.length > 1 ? '\n(누적 ' + dates.length + '회)' : ''));
    } else {
      btn.disabled = false; btn.textContent = orig;
      alert('성지에서 약 ' + (d >= 1000 ? (d/1000).toFixed(1)+'km' : Math.round(d)+'m') + ' 떨어져 있습니다.\n반경 ' + STAMP_RADIUS + 'm 안에서 시도해 주세요.');
    }
  }, function(err) {
    btn.disabled = false; btn.textContent = orig;
    alert({ 1:'위치 권한이 거부되었습니다.', 2:'위치를 찾을 수 없습니다.', 3:'시간이 초과되었습니다.' }[err.code] || '위치를 가져오지 못했습니다.');
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

function _promptUnstamp(s) {
  const v = getVisited();
  const dates = Array.isArray(v[s.seq]) ? v[s.seq] : [];
  if (!confirm(s.name + '\n방문 이력: ' + dates.join(', ') + '\n\n마지막 기록을 삭제할까요?')) return;
  dates.pop(); if (dates.length) v[s.seq] = dates; else delete v[s.seq];
  saveVisited(v); updateStampBtn(s);
}

function _haversineM(la1, lo1, la2, lo2) {
  const R=6371000, f1=la1*Math.PI/180, f2=la2*Math.PI/180, df=(la2-la1)*Math.PI/180, dl=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* §8 코스 모드 ──────────────────────────────────────── */

function _buildByseq() {
  if (_byseqBuilt) return;
  _shrines.forEach(function(s) { _byseq[s.seq] = s; }); _byseqBuilt = true;
}

function _courseMkImg(no, visited) {
  const bg = visited ? '#2A8040' : '#1B7FD8';
  const svg = `<svg ${_NS} width="34" height="42"><path d="M17 41C17 41 2 26 2 17a15 15 0 1 1 30 0C32 26 17 41 17 41Z" fill="${bg}" stroke="#fff" stroke-width="1.5"/><circle cx="17" cy="17" r="9" fill="#fff"/><text x="17" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="${bg}" font-family="sans-serif">${no}</text></svg>`;
  return new _MI(_svgUrl(svg), new _SZ(34, 42), { offset: new _PT(17, 42) });
}

async function loadCourseMode(courseId) {
  const courses = window._COURSES || [];
  const course  = courses.find(function(c) { return c.id === courseId; });
  if (!course) return;
  _courseMode = true;
  _markers.forEach(function(m) { if (m) m.marker.setMap(null); });
  _courseShrines = course.seqs.map(function(seq) { return _byseq[seq]; }).filter(Boolean);
  const visited = getVisited();
  const bounds  = new kakao.maps.LatLngBounds();
  _courseShrines.forEach(function(s, i) {
    const isV = _visitCnt(visited, s.seq) > 0;
    const mk  = new _MM({ map: _map, position: new _LL(s.lat, s.lng), image: _courseMkImg(i+1, isV), zIndex: 10, title: (i+1)+'. '+s.name });
    kakao.maps.event.addListener(mk, 'click', function() { showInfoCard(_shrines.indexOf(s)); });
    bounds.extend(new _LL(s.lat, s.lng));
  });
  _map.setBounds(bounds, 60);

  const panel = document.getElementById('route-panel');
  if (panel && panel.style.display !== 'block') {
    const cp = document.createElement('div');
    cp.id = 'course-info-bar';
    cp.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:var(--card);border-radius:18px 18px 0 0;box-shadow:0 -4px 20px rgba(31,42,68,.14);padding:12px 16px calc(env(safe-area-inset-bottom,0px)+14px);z-index:20;';
    cp.innerHTML = '<div style="font-size:15px;font-weight:800;color:var(--d);margin-bottom:4px">' + course.title + '</div>'
      + '<div style="font-size:12px;color:var(--gray);margin-bottom:10px">' + course.type + ' · ' + course.seqs.length + '곳 · 약 ' + course.km + 'km</div>'
      + '<button onclick="startCourseNavi()" style="width:100%;height:44px;background:var(--d);color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🧭 카카오내비 시작</button>';
    document.body.appendChild(cp);
  }

  try {
    const origin = _courseShrines[0], dest = _courseShrines[_courseShrines.length-1];
    const viaPoints = _courseShrines.slice(1,-1).map(function(s){ return {name:s.name,x:String(s.lng),y:String(s.lat)}; });
    const body = JSON.stringify({ origin:{x:String(origin.lng),y:String(origin.lat)}, destination:{x:String(dest.lng),y:String(dest.lat)}, priority:'RECOMMEND', waypoints: viaPoints });
    const res = await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions', { method:'POST', headers:{'Authorization':'KakaoAK '+KAKAO_REST_KEY,'Content-Type':'application/json'}, body });
    if (res.ok) {
      const data = await res.json();
      const route = data.routes && data.routes[0];
      if (route && route.result_code === 0) {
        const pts = [];
        route.sections.forEach(function(sec){ sec.roads.forEach(function(road){ const v=road.vertexes; for(let i=0;i<v.length;i+=2) pts.push(new _LL(v[i+1],v[i])); }); });
        _coursePolyline = new _PL({ map:_map, path:pts, strokeWeight:5, strokeColor:'#1B7FD8', strokeOpacity:.88 });
        return;
      }
    }
  } catch(_e) {}
  /* fallback: 직선 */
  _coursePolyline = new _PL({ map:_map, path:_courseShrines.map(function(s){ return new _LL(s.lat,s.lng); }), strokeWeight:4, strokeColor:'#1B7FD8', strokeOpacity:.55, strokeStyle:'dashed' });
}

function startCourseNavi() {
  if (!_courseShrines.length) return;
  if (!window.Kakao || !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  const dest = _courseShrines[_courseShrines.length-1];
  try {
    Kakao.Navi.start({ name:dest.name, x:String(dest.lng), y:String(dest.lat), coordType:'wgs84',
      viaPoints: _courseShrines.slice(0,-1).map(function(s){ return {name:s.name,x:String(s.lng),y:String(s.lat)}; }) });
  } catch(e) { location.href = 'https://map.kakao.com/link/to/' + _EC(dest.name) + ',' + dest.lat + ',' + dest.lng; }
}

/* §9 시작 ──────────────────────────────────────────── */

function _escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.history.replaceState({ v:'map' }, '');
window.addEventListener('popstate', function() {
  if (_cardOpen) { hideInfoCard(); history.pushState({ v:'map' }, ''); }
  else if (_routeMode) { toggleRouteMode(); history.pushState({ v:'map' }, ''); }
});
window.addEventListener('pageshow', function(e) { if (e.persisted && _map) {} });

document.addEventListener('DOMContentLoaded', function() {
  /* 타입 변환: A→성지, B→순례지, C→순교사적지 */
  _shrines = (window._SH_RAW || []).map(function(s) {
    const r = Object.assign({}, s);
    if (_TY[r.type]) r.type = _TY[r.type];
    return r;
  }).filter(function(s) { return s.lat && s.lng; });

  /* 버튼 바인딩 */
  document.getElementById('btn-back').addEventListener('click', function() {
    if (_cardOpen) hideInfoCard();
    else if (_routeMode) toggleRouteMode();
    else location.href = 'index.html';
  });
  document.getElementById('ic-close').addEventListener('click', hideInfoCard);
  document.getElementById('btn-loc').addEventListener('click', function() {
    if (!navigator.geolocation || !_map) return;
    navigator.geolocation.getCurrentPosition(function(pos) {
      _showMyLoc(pos.coords.latitude, pos.coords.longitude);
      _map.setCenter(new _LL(pos.coords.latitude, pos.coords.longitude));
    });
  });
  document.getElementById('btn-stamp').addEventListener('click', function() { location.href = 'stamp.html'; });

  /* 검색 */
  document.getElementById('search-input').addEventListener('input', function() {
    clearTimeout(_searchDebounce);
    const val = this.value;
    _searchDebounce = setTimeout(function() { runSearch(val); }, 220);
  });
  document.getElementById('btn-srch-x').addEventListener('click', function() {
    document.getElementById('search-input').value = '';
    hideSearch(); _restoreAllMarkers();
  });

  /* Kakao SDK 동적 로드 */
  const sc = document.createElement('script');
  sc.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_KEY + '&autoload=false&libraries=services,clusterer';
  sc.onerror = function() {
    document.getElementById('map-loading').innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray)">카카오맵을 불러올 수 없습니다.<br>인터넷 연결을 확인해 주세요.</div>';
  };
  sc.onload = function() { kakao.maps.load(initMap); };
  document.head.appendChild(sc);
});
