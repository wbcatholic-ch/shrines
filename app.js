/* 가톨릭길동무 — app.js V1
   §0 상수  §1 상태  §2 마커이미지  §3 지도  §4 마커생성
   §5 인포카드  §6 검색  §7 내주변  §8 길찾기  §9 GPS·스탬프
   §10 코스모드  §11 유틸  §12 시작 */
'use strict';

/* §0 상수 */
const KAKAO_KEY      = '07f7989e29fdfb425fff924f36fb3ec0';
const KAKAO_REST_KEY = '86a3b86e6c1b0210b8e4aba5f6c83b00';
const STAMP_KEY      = 'catholic_stamp_visited_v1';
const STAMP_RADIUS   = 500;
const _TY  = { A:'성지', B:'순례지', C:'순교 사적지' };
const _CLR = { '성지':'#c0392b', '순례지':'#1565c0', '순교 사적지':'#1b7a3e' };

/* §1 상태 */
let _map, _LL, _MM, _MI, _SZ, _PT, _PL;
let _shrines = [], _byseq = {};
let _markers = [];               /* kakao.maps.Marker | null */
let _myMk = null, _regionMk = null;
let _curIdx = -1, _cur = null;
let _rS = null, _rVia = [], _rE = null;
let _watchId = null, _lastPos = null;
let _searchTimer = null;
let _courseMode = false;

/* §2 마커 이미지 — 구 앱 동일 십자가 SVG */
const _ENC = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const _NS  = 'xmlns="http://www.w3.org/2000/svg"';

function _mkr(color, big) {
  const [w, h] = big ? [40, 52] : [28, 36];
  const path = big
    ? 'M20 0C8.954 0 0 8.954 0 20c0 14.21 20 32 20 32S40 34.21 40 20C40 8.954 31.046 0 20 0z'
    : 'M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z';
  const cross = big
    ? '<g fill="#fff" opacity=".96"><rect x="18.45" y="10.5" width="3.1" height="18.5" rx="1.1"/><rect x="13.4" y="16.3" width="13.2" height="3.1" rx="1.1"/></g>'
    : '<g fill="#fff" opacity=".96"><rect x="12.85" y="7.8" width="2.3" height="12.8" rx=".8"/><rect x="9.6" y="11.7" width="8.8" height="2.3" rx=".8"/></g>';
  return _mi(_ENC(`<svg ${_NS} width="${w}" height="${h}"><path d="${path}" fill="${color}" opacity=".92"/>${cross}</svg>`), w, h);
}
function _mkrRoute(label) {
  const c = label === '출' ? '#FF0000' : '#005BFF';
  return _mi(_ENC(`<svg ${_NS} width="36" height="46"><path d="M18 2C9 2 2 9 2 18c0 10 16 26 16 26s16-16 16-26C34 9 27 2 18 2z" fill="${c}" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="10" fill="#fff" opacity=".9"/><text x="18" y="23" font-size="13" font-weight="900" fill="${c}" text-anchor="middle" font-family="Arial,sans-serif">${label}</text></svg>`), 36, 46, 18, 44);
}
function _mkrVia(n) {
  return _mi(_ENC(`<svg ${_NS} width="30" height="38"><path d="M15 2C8 2 2 8 2 15c0 9 13 21 13 21s13-12 13-21C28 8 22 2 15 2z" fill="#FF8C00" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="8" fill="#fff" opacity=".9"/><text x="15" y="20" font-size="11" font-weight="900" fill="#FF8C00" text-anchor="middle" font-family="Arial,sans-serif">${n}</text></svg>`), 30, 38, 15, 37);
}
function _mkrRegion() {
  return _mi(_ENC(`<svg ${_NS} width="42" height="54"><path d="M21 2C10 2 1 11 1 22c0 13 20 30 20 30s20-17 20-30C41 11 32 2 21 2z" fill="#7B2FBE" stroke="#fff" stroke-width="2"/><circle cx="21" cy="22" r="9" fill="#fff" opacity=".95"/></svg>`), 42, 54, 21, 52);
}
function _mkrMyLoc() {
  return _mi(_ENC(`<svg ${_NS} width="20" height="20"><circle cx="10" cy="10" r="8" fill="#2A8040" stroke="#fff" stroke-width="2.5"/></svg>`), 20, 20, 10, 10);
}
function _mi(url, w, h, ox, oy) {
  return new _MI(url, new _SZ(w, h), { offset: new _PT(ox ?? w/2, oy ?? h) });
}

/* §3 지도 초기화 */
function initMap() {
  _LL = kakao.maps.LatLng;
  _MM = kakao.maps.Marker;
  _MI = kakao.maps.MarkerImage;
  _SZ = kakao.maps.Size;
  _PT = kakao.maps.Point;
  _PL = kakao.maps.Polyline;

  _map = new kakao.maps.Map(document.getElementById('kakao-map'), {
    center: new _LL(36.5, 127.8), level: 12
  });
  kakao.maps.event.addListener(_map, 'click', () => {
    _closeCard();
    document.getElementById('search-results').style.display = 'none';
  });
  document.getElementById('map-loading').style.display = 'none';

  if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);

  _buildMarkers();
  _startGPS();

  const p = new URLSearchParams(location.search);
  if (p.get('course')) _loadCourse(p.get('course'), p.get('navi') === '1');
}

/* §4 마커 생성 (배치 + rAF) */
function _buildMarkers() {
  _markers = new Array(_shrines.length).fill(null);
  let i = 0;
  (function next() {
    const end = Math.min(i + 30, _shrines.length);
    for (; i < end; i++) {
      const s = _shrines[i];
      if (!s.lat || !s.lng || s.lat < 33 || s.lat > 38 || s.lng < 124 || s.lng > 132) continue;
      const mk = new _MM({ position: new _LL(s.lat, s.lng), image: _mkr(_CLR[s.type], false), title: s.name });
      mk.setMap(_map);
      const idx = i;
      kakao.maps.event.addListener(mk, 'click', () => _openCard(idx));
      _markers[i] = mk;
    }
    if (i < _shrines.length) requestAnimationFrame(next);
  })();
}

function _showOnly(indices) { _markers.forEach((mk, i) => mk && mk.setMap(indices.includes(i) ? _map : null)); }
function _showAll()         { _markers.forEach(mk => mk && mk.setMap(_map)); }
function _resizeMk(idx, big) { if (_markers[idx]) _markers[idx].setImage(_mkr(_CLR[_shrines[idx].type], big)); }

/* §5 인포카드 */
function _openCard(idx) {
  if (_curIdx >= 0 && _curIdx !== idx) _resizeMk(_curIdx, false);
  _curIdx = idx; _cur = _shrines[idx];
  _resizeMk(idx, true);

  const s = _cur;
  _q('#ic-name').textContent = s.name;
  const tb = _q('#ic-type');
  tb.textContent = s.type || ''; tb.style.background = _CLR[s.type] || '#888'; tb.style.display = s.type ? '' : 'none';

  _row('#ic-addr', '#ic-addr-txt', s.addr, s.addr);
  const tel = _q('#ic-tel-a');
  tel.href = 'tel:' + (s.tel || '').replace(/\D/g, ''); tel.textContent = s.tel || '';
  _q('#ic-tel').style.display = s.tel ? '' : 'none';

  const links = [
    s.seq ? `<a href="https://www.cbck.or.kr/page/api/page7330/view.asp?id=${s.seq}" target="_blank">성지 상세</a>` : '',
    s.hp  ? `<a href="${_esc(s.hp)}" target="_blank">홈페이지</a>` : ''
  ].filter(Boolean);
  _q('#ic-links-txt').innerHTML = links.join(' · ');
  _q('#ic-links').style.display = links.length ? '' : 'none';

  _q('#ic-nav').onclick = () => location.href = `https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`;
  _updateStamp(s);
  _map.panTo(new _LL(s.lat, s.lng));
  _q('#info-card').classList.add('open');
}
function _closeCard() {
  if (_curIdx >= 0) { _resizeMk(_curIdx, false); _curIdx = -1; } _cur = null;
  _q('#info-card').classList.remove('open');
}
function _row(rowId, txtId, display, text) {
  _q(rowId).style.display = display ? '' : 'none';
  if (text !== undefined) _q(txtId).textContent = text;
}

/* §6 검색 */
function _onSearch(q) {
  q = q.trim();
  if (!q) { _clearSearch(); return; }
  _q('#search-clear').style.display = '';
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _doSearch(q), 220);
}
function _doSearch(q) {
  const res = [];
  _shrines.forEach((s, i) => { if (s.name.includes(q) || (s.addr && s.addr.includes(q))) res.push(i); });
  _showOnly(res);
  const rows = res.slice(0, 15).map(i => {
    const s = _shrines[i];
    return `<div class="sr-item" data-i="${i}"><div class="sr-dot" style="background:${_CLR[s.type]}"></div><div class="sr-main"><div class="sr-name">${_esc(s.name)}</div><div class="sr-addr">${_esc(s.addr || '')}</div></div><span class="sr-badge" style="background:${_CLR[s.type]}20;color:${_CLR[s.type]}">${s.type || ''}</span></div>`;
  });
  rows.push(`<div class="sr-region" data-q="${_esc(q)}"><span class="sr-region-ico">🔍</span><span class="sr-region-txt">"${_esc(q)}" 지역 검색</span></div>`);
  const box = _q('#search-results');
  box.innerHTML = rows.join(''); box.style.display = 'block';
  box.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { _clearSearch(); _openCard(+el.dataset.i); }));
  box.querySelectorAll('[data-q]').forEach(el => el.addEventListener('click', () => _regionSearch(el.dataset.q)));
}
function _regionSearch(q) {
  _clearSearch();
  if (!kakao.maps.services) return;
  new kakao.maps.services.Places().keywordSearch(q, (data, status) => {
    if (status !== kakao.maps.services.Status.OK || !data.length) return;
    const lat = +data[0].y, lng = +data[0].x;
    if (_regionMk) _regionMk.setMap(null);
    _regionMk = new _MM({ map: _map, position: new _LL(lat, lng), image: _mkrRegion(), title: data[0].place_name, zIndex: 500 });
    const near = _shrines.reduce((a, s, i) => { if (s.lat && s.lng && _dist(lat, lng, s.lat, s.lng) < 50000) a.push(i); return a; }, []);
    _showOnly(near);
    const maxD = near.reduce((m, i) => Math.max(m, _dist(lat, lng, _shrines[i].lat, _shrines[i].lng)), 0);
    _map.setLevel(maxD < 3500 ? 6 : maxD < 7000 ? 7 : maxD < 14000 ? 8 : maxD < 28000 ? 9 : 10);
    _map.setCenter(new _LL(lat, lng));
  });
}
function _clearSearch() {
  _q('#search-inp').value = ''; _q('#search-clear').style.display = 'none';
  _q('#search-results').style.display = 'none';
  _showAll();
  if (_regionMk) { _regionMk.setMap(null); _regionMk = null; }
}

/* §7 내주변 */
function _openNearby() {
  const list = _q('#nearby-list');
  list.innerHTML = '<div style="padding:22px;text-align:center;color:#999;font-size:13px">📍 위치 확인 중…</div>';
  _q('#nearby-panel').classList.add('open');
  if (!navigator.geolocation) { list.innerHTML = '<div style="padding:22px;text-align:center;color:#999;font-size:13px">위치 기능을 사용할 수 없습니다.</div>'; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    _showMyLoc(lat, lng); _map.setCenter(new _LL(lat, lng)); _map.setLevel(8);
    const sorted = _shrines.map((s, i) => ({ i, d: _dist(lat, lng, s.lat, s.lng) }))
      .filter(o => o.d < 500000).sort((a, b) => a.d - b.d).slice(0, 10);
    list.innerHTML = sorted.map((o, n) => {
      const s = _shrines[o.i], c = _CLR[s.type];
      const dt = o.d < 1000 ? Math.round(o.d) + 'm' : (o.d / 1000).toFixed(1) + 'km';
      return `<div class="ni" data-i="${o.i}"><div class="ni-num" style="background:${c}">${n + 1}</div><div class="ni-info"><div class="ni-name">${_esc(s.name)}</div><div class="ni-addr">${_esc((s.addr || '').slice(0, 26))}</div></div><div class="ni-dist" style="color:${c}">📍${dt}</div></div>`;
    }).join('');
    list.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { _closeNearby(); _openCard(+el.dataset.i); }));
  }, () => { list.innerHTML = '<div style="padding:22px;text-align:center;color:#999;font-size:13px">위치를 가져오지 못했습니다.</div>'; },
  { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
}
function _closeNearby() { _q('#nearby-panel').classList.remove('open'); }
function _showMyLoc(lat, lng) {
  if (!_myMk) _myMk = new _MM({ map: _map, image: _mkrMyLoc(), zIndex: 200 });
  _myMk.setPosition(new _LL(lat, lng));
}

/* §8 길찾기 */
function setRoute(role) {  /* map.html 인라인에서 호출 */
  if (!_cur) return;
  const { name, lat, lng } = _cur, i = _curIdx;
  if (role === 's') {
    if (_rS) _resizeMk(_rS.i, false);
    _rS = { i, name, lat, lng }; _markers[i]?.setImage(_mkrRoute('출'));
  } else if (role === 'e') {
    if (_rE) _resizeMk(_rE.i, false);
    _rE = { i, name, lat, lng }; _markers[i]?.setImage(_mkrRoute('도'));
  } else {
    if (_rVia.some(v => v.i === i)) return;
    _rVia.push({ i, name, lat, lng }); _markers[i]?.setImage(_mkrVia(_rVia.length));
  }
  _updateRouteBar();
}
function _updateRouteBar() {
  const bar = _q('#route-bar');
  if (!_rS && !_rE && !_rVia.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const via = _rVia.map((v, i) => `경유${i + 1}: ${v.name}`).join(' · ');
  _q('#rb-summary').innerHTML =
    (_rS ? `<strong>출발</strong> ${_esc(_rS.name)}<br>` : '') +
    (via ? `<span style="font-size:10px">${_esc(via)}</span><br>` : '') +
    (_rE ? `<strong>도착</strong> ${_esc(_rE.name)}` : '<span style="opacity:.5">도착지를 선택하세요</span>');
  const nb = _q('#rb-navi');
  nb.style.opacity = (_rS && _rE) ? '1' : '.4';
  nb.style.pointerEvents = (_rS && _rE) ? '' : 'none';
}
function _clearRoute() {
  [_rS, ..._rVia, _rE].forEach(p => { if (p) _resizeMk(p.i, false); });
  _rS = null; _rVia = []; _rE = null; _q('#route-bar').style.display = 'none';
}
function _startNavi() {
  if (!_rS || !_rE) return;
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  try {
    Kakao.Navi.start({ name: _rE.name, x: String(_rE.lng), y: String(_rE.lat), coordType: 'wgs84',
      viaPoints: [_rS, ..._rVia].map(p => ({ name: p.name, x: String(p.lng), y: String(p.lat) })) });
  } catch { location.href = `https://map.kakao.com/link/to/${encodeURIComponent(_rE.name)},${_rE.lat},${_rE.lng}`; }
}

/* §9 GPS 자동 순례 기록 */
function _startGPS() {
  if (!navigator.geolocation) return;
  _watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    if (_map) _showMyLoc(lat, lng);
    if (_lastPos && _dist(_lastPos.lat, _lastPos.lng, lat, lng) < 20) return;
    _lastPos = { lat, lng }; _autoStamp(lat, lng);
  }, null, { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 });
}
function _autoStamp(lat, lng) {
  const v = _getV(), today = _today(); let changed = false;
  _shrines.forEach(s => {
    if (!s.stamp || !s.lat || !s.lng) return;
    const arr = Array.isArray(v[s.seq]) ? v[s.seq] : [];
    if (arr.includes(today) || _dist(lat, lng, s.lat, s.lng) > STAMP_RADIUS) return;
    arr.push(today); v[s.seq] = arr; changed = true;
    _toast(`✝ ${s.name} 순례 기록!` + (arr.length > 1 ? ` · ${arr.length}번째 순례` : ''));
    if (_cur?.seq === s.seq) _updateStamp(s);
  });
  if (changed) _saveV(v);
}
function _toast(msg) {
  const t = _q('#stamp-toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3500);
}
function _updateStamp(s) {
  const btn = _q('#ic-stamp');
  if (!s.stamp) { btn.style.display = 'none'; return; }
  btn.style.display = ''; btn.style.fontSize = '';
  const arr = Array.isArray(_getV()[s.seq]) ? _getV()[s.seq] : [];
  if (arr.length) {
    btn.textContent = `✞ ${arr.length}회 순례 · ${arr[arr.length - 1]}`;
    btn.classList.add('on'); btn.disabled = false;
    btn.onclick = () => {
      const v = _getV(), a = Array.isArray(v[s.seq]) ? v[s.seq] : [];
      if (!confirm(`${s.name}\n순례 이력: ${a.join(', ')}\n\n마지막 기록을 삭제할까요?`)) return;
      a.pop(); if (a.length) v[s.seq] = a; else delete v[s.seq];
      _saveV(v); _updateStamp(s);
    };
  } else {
    btn.textContent = '📍 성지에 가까워지면 자동으로 기록됩니다';
    btn.classList.remove('on'); btn.disabled = true; btn.style.fontSize = '11px'; btn.onclick = null;
  }
}
function _getV() {
  try { const v = JSON.parse(localStorage.getItem(STAMP_KEY) || '{}'); Object.keys(v).forEach(k => { if (typeof v[k] === 'string') v[k] = [v[k]]; }); return v; } catch { return {}; }
}
function _saveV(v) { try { localStorage.setItem(STAMP_KEY, JSON.stringify(v)); } catch {} }
function _today() { return new Date().toISOString().slice(0, 10); }

/* §10 코스 모드 */
async function _loadCourse(id, autoNavi) {
  const course = (window._COURSES || []).find(c => c.id === id);
  if (!course) return;
  _courseMode = true;
  _markers.forEach(mk => mk && mk.setMap(null));
  _shrines.forEach(s => { _byseq[s.seq] = s; });

  const v = _getV(), pts = course.seqs.map(seq => _byseq[seq]).filter(Boolean);
  const bounds = new kakao.maps.LatLngBounds();
  pts.forEach((s, n) => {
    const visited = (Array.isArray(v[s.seq]) ? v[s.seq] : []).length > 0;
    const bg = visited ? '#2A8040' : '#1B7FD8';
    const svg = `<svg ${_NS} width="34" height="42"><path d="M17 41C17 41 2 26 2 17a15 15 0 1 1 30 0C32 26 17 41 17 41Z" fill="${bg}" stroke="#fff" stroke-width="1.5"/><circle cx="17" cy="17" r="9" fill="#fff"/><text x="17" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="${bg}" font-family="sans-serif">${n + 1}</text></svg>`;
    const mk = new _MM({ map: _map, position: new _LL(s.lat, s.lng), image: new _MI(_ENC(svg), new _SZ(34, 42), { offset: new _PT(17, 42) }), zIndex: 10 });
    kakao.maps.event.addListener(mk, 'click', () => _openCard(_shrines.indexOf(s)));
    bounds.extend(new _LL(s.lat, s.lng));
  });
  _map.setBounds(bounds, 60);

  /* 코스 정보 route-bar에 표시 */
  const bar = _q('#route-bar'); bar.style.display = 'flex';
  _q('#rb-clear').onclick = () => location.href = 'map.html';
  _q('#rb-summary').innerHTML = `<strong>${_esc(course.title)}</strong><br>${_esc(course.type)} · ${pts.length}곳 · 약 ${course.km}km`;
  const nb = _q('#rb-navi'); nb.style.opacity = '1'; nb.style.pointerEvents = ''; nb.onclick = _startCourseNavi;

  /* 경로 API */
  try {
    const org = pts[0], dst = pts[pts.length - 1];
    const res = await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions', {
      method: 'POST',
      headers: { 'Authorization': 'KakaoAK ' + KAKAO_REST_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: { x: String(org.lng), y: String(org.lat) }, destination: { x: String(dst.lng), y: String(dst.lat) }, priority: 'RECOMMEND', waypoints: pts.slice(1, -1).map(s => ({ name: s.name, x: String(s.lng), y: String(s.lat) })) })
    });
    const data = await res.json();
    const route = data.routes?.[0];
    if (route?.result_code === 0) {
      const path = [];
      route.sections.forEach(sec => sec.roads.forEach(r => { for (let j = 0; j < r.vertexes.length; j += 2) path.push(new _LL(r.vertexes[j + 1], r.vertexes[j])); }));
      new _PL({ map: _map, path, strokeWeight: 5, strokeColor: '#1B7FD8', strokeOpacity: .88 });
      if (autoNavi) setTimeout(_startCourseNavi, 2500);
      return;
    }
  } catch {}
  new _PL({ map: _map, path: pts.map(s => new _LL(s.lat, s.lng)), strokeWeight: 4, strokeColor: '#1B7FD8', strokeOpacity: .5, strokeStyle: 'dashed' });
  if (autoNavi) setTimeout(_startCourseNavi, 2500);
}
function _startCourseNavi() {
  const course = (window._COURSES || []).find(c => c.id === new URLSearchParams(location.search).get('course'));
  if (!course) return;
  const pts = course.seqs.map(seq => _byseq[seq]).filter(Boolean);
  const dst = pts[pts.length - 1];
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  try {
    Kakao.Navi.start({ name: dst.name, x: String(dst.lng), y: String(dst.lat), coordType: 'wgs84', viaPoints: pts.slice(0, -1).map(s => ({ name: s.name, x: String(s.lng), y: String(s.lat) })) });
  } catch { location.href = `https://map.kakao.com/link/to/${encodeURIComponent(dst.name)},${dst.lat},${dst.lng}`; }
}

/* §11 유틸 */
function _q(sel) { return document.querySelector(sel); }
function _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _dist(la1, lo1, la2, lo2) {
  const R = 6371000, f1 = la1*Math.PI/180, f2 = la2*Math.PI/180, df = (la2-la1)*Math.PI/180, dl = (lo2-lo1)*Math.PI/180;
  return R * 2 * Math.atan2(Math.sqrt(Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2), Math.sqrt(1 - (Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2)));
}

/* §12 시작 */
window.addEventListener('pagehide', () => { if (_watchId !== null) { navigator.geolocation.clearWatch(_watchId); _watchId = null; } });
window.addEventListener('pageshow', () => { if (_map && !_courseMode) _startGPS(); });

document.addEventListener('DOMContentLoaded', () => {
  _shrines = (window._SH_RAW || []).map(s => { const r = { ...s }; if (_TY[r.type]) r.type = _TY[r.type]; return r; }).filter(s => s.lat && s.lng);

  _q('#btn-back').addEventListener('click', () => {
    if (_q('#info-card').classList.contains('open'))   { _closeCard(); return; }
    if (_q('#nearby-panel').classList.contains('open')){ _closeNearby(); return; }
    location.href = 'index.html';
  });
  _q('#ic-close').addEventListener('click', _closeCard);
  _q('#search-inp').addEventListener('input', e => _onSearch(e.target.value));
  _q('#search-clear').addEventListener('click', _clearSearch);
  _q('#btn-nearby').addEventListener('click', _openNearby);
  _q('#btn-nearby-close').addEventListener('click', _closeNearby);
  _q('#btn-stamp-p').addEventListener('click', () => location.href = 'stamp.html');
  _q('#rb-clear').addEventListener('click', _clearRoute);
  _q('#rb-navi').addEventListener('click', _startNavi);

  const sc = document.createElement('script');
  sc.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
  sc.onerror = () => { _q('#map-loading').innerHTML = '<p style="color:#999;padding:20px;text-align:center">지도를 불러올 수 없습니다.<br>인터넷 연결을 확인해 주세요.</p>'; };
  sc.onload = () => kakao.maps.load(initMap);
  document.head.appendChild(sc);
});
