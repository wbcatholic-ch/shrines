/* ════════════════════════════════════════════════════════════
   가톨릭길동무 app.js — V1 (map.html 전용)
   §0 설정  §1 상태  §2 지도  §3 마커  §4 인포카드
   §5 내위치  §6 검색  §7 스탬프  §8 내비게이션  §9 시작
   ════════════════════════════════════════════════════════════ */
'use strict';

/* §0 설정 */
const KAKAO_KEY      = '07f7989e29fdfb425fff924f36fb3ec0';
const KAKAO_REST_KEY = '86a3b86e6c1b0210b8e4aba5f6c83b00';
const STAMP_KEY      = 'catholic_stamp_visited_v1';
const STAMP_RADIUS = 300;
const MAP_CENTER   = { lat: 36.5, lng: 127.8 };
const MAP_LEVEL    = 12;
const SHRINE_TYPE  = { A:'국가지정 성지', B:'준성지', C:'사적지' };
const DIOCESE      = {
  SE:'서울대교구', IC:'인천교구', SW:'수원교구', UJ:'의정부교구',
  CC:'춘천교구',  WJ:'원주교구', CJ:'청주교구', DJ:'대전교구',
  JJ:'전주교구',  GJ:'광주대교구',AD:'안동교구',DG:'대구대교구',
  BS:'부산교구',  MS:'마산교구', JE:'제주교구', ML:'군종교구'
};

/* §1 상태 */
let _map, _clusterer, _markers = [], _myMarker = null;
let _curShrine = null, _curMarker = null, _cardOpen = false;
let _shrines = [], _byseq = {};
let _courseMode = false, _courseShrines = [], _coursePolyline = null;

/* §2 지도 */
function initMap() {
  const el = document.getElementById('kakao-map');
  _map = new kakao.maps.Map(el, {
    center: new kakao.maps.LatLng(MAP_CENTER.lat, MAP_CENTER.lng),
    level:  MAP_LEVEL
  });
  _clusterer = new kakao.maps.MarkerClusterer({
    map: _map, averageCenter: true, minLevel: 8,
    styles: [{ width:'46px', height:'46px', background:'rgba(31,42,68,.88)',
      borderRadius:'50%', color:'#fff', textAlign:'center',
      lineHeight:'46px', fontSize:'13px', fontWeight:'700' }]
  });
  kakao.maps.event.addListener(_map, 'click', hideInfoCard);
  document.getElementById('map-loading').style.display = 'none';
  buildMarkers();
}

/* §3 마커 */
function mkImg(color, size) {
  const svg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + (size*1.4) + '">'
    + '<path d="M' + (size/2) + ' ' + (size*1.35) + ' C' + (size/2) + ' ' + (size*1.35)
    + ' 2 ' + (size*.7) + ' 2 ' + (size/2)
    + ' a' + (size/2-2) + ' ' + (size/2-2) + ' 0 1 1 ' + (size-4) + ' 0'
    + ' C' + (size-2) + ' ' + (size*.7) + ' ' + (size/2) + ' ' + (size*1.35) + ' ' + (size/2) + ' ' + (size*1.35) + 'Z"'
    + ' fill="' + color + '" stroke="#fff" stroke-width="1.5"/></svg>'
  );
  return new kakao.maps.MarkerImage(
    'data:image/svg+xml,' + svg,
    new kakao.maps.Size(size, size * 1.4),
    { offset: new kakao.maps.Point(size / 2, size * 1.4) }
  );
}
const IMG_N = mkImg('#1F2A44', 28);
const IMG_V = mkImg('#2A8040', 28);
const IMG_X = mkImg('#B5AFA7', 24);
const IMG_A = mkImg('#C8962A', 34);

function getImg(s) {
  if (!s.stamp) return IMG_X;
  return getVisited()[s.seq] ? IMG_V : IMG_N;
}
function buildMarkers() {
  _markers = _shrines.map(function(s) {
    const m = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(s.lat, s.lng),
      image: getImg(s), title: s.name
    });
    kakao.maps.event.addListener(m, 'click', function() { showInfoCard(s, m); });
    return { marker: m, shrine: s };
  });
  _clusterer.addMarkers(_markers.map(function(x) { return x.marker; }));
}
function refreshMarkers() {
  _markers.forEach(function(x) { x.marker.setImage(getImg(x.shrine)); });
}

/* §4 인포카드 */
function showInfoCard(s, marker) {
  _curShrine = s; _curMarker = marker; _cardOpen = true;
  _markers.forEach(function(x) { x.marker.setZIndex(0); });
  if (marker) { marker.setImage(IMG_A); marker.setZIndex(10); }

  document.getElementById('ic-name').textContent = s.name;
  const tEl = document.getElementById('ic-type');
  tEl.textContent = SHRINE_TYPE[s.type] || ''; tEl.style.display = s.type ? '' : 'none';

  const aRow = document.getElementById('ic-addr-row');
  document.getElementById('ic-addr').textContent = s.addr || '';
  aRow.style.display = s.addr ? '' : 'none';

  const tRow = document.getElementById('ic-tel-row');
  const tEl2 = document.getElementById('ic-tel');
  if (s.tel) { tEl2.href = 'tel:' + s.tel.replace(/[^0-9]/g,''); tEl2.textContent = s.tel; tRow.style.display = ''; }
  else tRow.style.display = 'none';

  const lRow = document.getElementById('ic-links-row');
  const lEl  = document.getElementById('ic-links');
  const links = [];
  if (s.seq) links.push('<a href="https://www.cbck.or.kr/page/api/page7330/view.asp?id=' + s.seq + '" target="_blank">성지 상세</a>');
  if (s.hp)  links.push('<a href="' + s.hp + '" target="_blank">홈페이지</a>');
  if (links.length) { lEl.innerHTML = links.join(' &nbsp;·&nbsp; '); lRow.style.display = ''; }
  else lRow.style.display = 'none';

  document.getElementById('ic-btn-nav').onclick = function() {
    location.href = 'https://map.kakao.com/link/to/' + encodeURIComponent(s.name) + ',' + s.lat + ',' + s.lng;
  };
  updateStampBtn(s);
  document.getElementById('info-card').classList.add('open');
  _map.panTo(new kakao.maps.LatLng(s.lat, s.lng));
}
function hideInfoCard() {
  if (!_cardOpen) return;
  _cardOpen = false;
  document.getElementById('info-card').classList.remove('open');
  _markers.forEach(function(x) { x.marker.setImage(getImg(x.shrine)); x.marker.setZIndex(0); });
  _curShrine = null; _curMarker = null;
}
function updateStampBtn(s) {
  var btn = document.getElementById('ic-btn-stamp');
  btn.disabled = false;
  if (!s.stamp) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  var v    = getVisited();
  var cnt  = _visitCount(v, s.seq);
  var last = _lastVisit(v, s.seq);
  if (cnt > 0) {
    btn.textContent = '✅ ' + cnt + '회 방문 · ' + last;
    btn.classList.add('visited');
    btn.onclick = function() { promptUnstamp(s); };
  } else {
    btn.textContent = '🕊 방문 인증 (GPS)';
    btn.classList.remove('visited');
    btn.onclick = function() { verifyAndStamp(s); };
  }
}

/* §5 내위치 */
function getMyLocation() {
  if (!navigator.geolocation) { alert('위치 기능을 사용할 수 없습니다.'); return; }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const la = pos.coords.latitude, ln = pos.coords.longitude;
      const ll = new kakao.maps.LatLng(la, ln);
      if (!_myMarker) {
        const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><circle cx="9" cy="9" r="7" fill="#2A8040" stroke="#fff" stroke-width="2"/></svg>');
        _myMarker = new kakao.maps.Marker({ map: _map, image: new kakao.maps.MarkerImage(svg, new kakao.maps.Size(18,18), {offset:new kakao.maps.Point(9,9)}) });
      }
      _myMarker.setPosition(ll); _map.setCenter(ll);
    },
    function(err) {
      const m={1:'위치 권한이 거부되었습니다.',2:'위치를 찾을 수 없습니다.',3:'시간이 초과되었습니다.'};
      alert(m[err.code] || '위치를 가져오지 못했습니다.');
    },
    { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }
  );
}

/* §6 검색 */
function runSearch(q) {
  q = q.trim();
  const box = document.getElementById('search-results');
  const xBtn = document.getElementById('btn-srch-x');
  if (!q) { box.style.display='none'; box.innerHTML=''; xBtn.style.display='none'; return; }
  xBtn.style.display = '';
  const v = getVisited();
  const res = _shrines.filter(function(s) { return s.name.includes(q) || (s.addr && s.addr.includes(q)); })
    .sort(function(a,b) {
      return (a.name===q?0:a.name.startsWith(q)?1:2) - (b.name===q?0:b.name.startsWith(q)?1:2);
    }).slice(0, 20);
  if (!res.length) { box.innerHTML='<div class="si"><div class="si-name" style="color:var(--gray)">검색 결과가 없습니다.</div></div>'; box.style.display='block'; return; }
  box.innerHTML = res.map(function(s) {
    return '<div class="si" data-seq="' + s.seq + '">'
      + '<span class="si-v">' + (v[s.seq] ? '✓' : '') + '</span>'
      + '<div><div class="si-name">' + s.name + '</div><div class="si-addr">' + (s.addr||'') + '</div></div></div>';
  }).join('');
  box.querySelectorAll('.si[data-seq]').forEach(function(el) {
    el.addEventListener('click', function() {
      const s = _shrines.find(function(x) { return x.seq === this.dataset.seq; }, this);
      const m = _markers.find(function(x) { return x.shrine.seq === this.dataset.seq; }, this);
      if (!s) return;
      document.getElementById('search-input').value = '';
      box.style.display = 'none'; box.innerHTML = '';
      document.getElementById('btn-srch-x').style.display = 'none';
      showInfoCard(s, m ? m.marker : null);
    });
  });
  box.style.display = 'block';
}

/* §7 스탬프 */
function getVisited() {
  try {
    var v = JSON.parse(localStorage.getItem(STAMP_KEY) || '{}');
    /* 마이그레이션: 구형 string → 배열로 자동 변환 */
    var changed = false;
    Object.keys(v).forEach(function(seq) {
      if (typeof v[seq] === 'string') { v[seq] = [v[seq]]; changed = true; }
    });
    if (changed) saveVisited(v);
    return v;
  } catch(e) { return {}; }
}
function saveVisited(v) { try { localStorage.setItem(STAMP_KEY, JSON.stringify(v)); } catch(e) {} }

/* 날짜 배열 헬퍼 */
function _today() { return new Date().toISOString().slice(0, 10); }
function _visitDates(v, seq)  { return Array.isArray(v[seq]) ? v[seq] : []; }
function _lastVisit(v, seq)   { var d = _visitDates(v, seq); return d.length ? d[d.length-1] : null; }
function _visitCount(v, seq)  { return _visitDates(v, seq).length; }
function _isVisitedToday(v, seq) { return _visitDates(v, seq).indexOf(_today()) !== -1; }

function verifyAndStamp(s) {
  if (!s || !s.lat || !s.lng) return;
  var v = getVisited();
  if (_isVisitedToday(v, s.seq)) {
    alert('오늘 이미 방문 인증하셨습니다.\n(' + _today() + ')');
    return;
  }
  var btn = document.getElementById('ic-btn-stamp');
  var orig = btn.textContent;
  btn.disabled = true; btn.textContent = '📍 위치 확인 중…';
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var d = haversineM(pos.coords.latitude, pos.coords.longitude, s.lat, s.lng);
      if (d <= STAMP_RADIUS) {
        var v2 = getVisited();
        var dates = _visitDates(v2, s.seq);
        dates.push(_today());
        v2[s.seq] = dates;
        saveVisited(v2);
        updateStampBtn(s); refreshMarkers();
        var cnt = _visitCount(v2, s.seq);
        alert('🕊 ' + s.name + '\n방문이 인증되었습니다!' + (cnt > 1 ? '\n(누적 ' + cnt + '회 방문)' : ''));
      } else {
        btn.disabled = false; btn.textContent = orig;
        var km = d >= 1000 ? (d/1000).toFixed(1)+'km' : Math.round(d)+'m';
        alert('성지에서 약 ' + km + ' 떨어져 있습니다.\n반경 ' + STAMP_RADIUS + 'm 안에서 시도해 주세요.');
      }
    },
    function(err) {
      btn.disabled = false; btn.textContent = orig;
      var m = {1:'위치 권한이 거부되었습니다.',2:'위치를 찾을 수 없습니다.',3:'시간이 초과되었습니다.'};
      alert(m[err.code] || '위치를 가져오지 못했습니다.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function promptUnstamp(s) {
  var v = getVisited();
  var dates = _visitDates(v, s.seq);
  var msg = s.name + '\n방문 이력: ' + dates.join(', ') + '\n\n마지막 기록을 삭제할까요?';
  if (!confirm(msg)) return;
  dates.pop();
  if (dates.length) v[s.seq] = dates; else delete v[s.seq];
  saveVisited(v);
  updateStampBtn(s); refreshMarkers();
}

/* §8 내비게이션 */
window.history.replaceState({ v:'map' }, '');
window.addEventListener('popstate', function() {
  if (_cardOpen) {
    hideInfoCard();
    history.pushState({ v:'map' }, '');
  }
});

window.addEventListener('pageshow', function(e) {
  if (e.persisted && _map) refreshMarkers();
});

/* §9 시작 */
document.addEventListener('DOMContentLoaded', function() {
  _shrines = (window._SH_RAW || []).filter(function(s) { return s.lat && s.lng; });

  // 버튼 바인딩
  document.getElementById('btn-back').addEventListener('click', function() {
    if (_cardOpen) hideInfoCard();
    else location.href = 'index.html';
  });
  document.getElementById('ic-close').addEventListener('click', hideInfoCard);
  document.getElementById('btn-loc').addEventListener('click', function() { if (_map) getMyLocation(); });
  document.getElementById('btn-stamp').addEventListener('click', function() { location.href = 'stamp.html'; });

  /* 코스 내비 버튼 */
  var cpNavi = document.getElementById('cp-navi');
  if (cpNavi) cpNavi.addEventListener('click', startCourseNavi);

  let _t = null;
  document.getElementById('search-input').addEventListener('input', function() {
    clearTimeout(_t); _t = setTimeout(function() { runSearch(document.getElementById('search-input').value); }, 200);
  });
  document.getElementById('btn-srch-x').addEventListener('click', function() {
    document.getElementById('search-input').value = '';
    runSearch('');
  });

  // Kakao SDK 동적 로드
  const sc = document.createElement('script');
  sc.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_KEY + '&autoload=false&libraries=services,clusterer';
  sc.onerror = function() {
    document.getElementById('map-loading').innerHTML =
      '<div style="padding:20px;text-align:center;color:#888">카카오맵을 불러올 수 없습니다.<br>인터넷 연결을 확인해 주세요.</div>';
  };
  sc.onload = function() {
    kakao.maps.load(function() {
      initMap();
      /* 코스 모드: URL에 ?course=ID 있으면 실행 */
      var params   = new URLSearchParams(location.search);
      var courseId = params.get('course');
      if (courseId) {
        /* byseq 맵 생성 */
        _shrines.forEach(function(s) { _byseq[s.seq] = s; });
        /* 상단 바에 코스 이름 표시 */
        var si = document.getElementById('search-input');
        if (si) { si.placeholder = ''; si.style.display = 'none'; }
        var bsrx = document.getElementById('btn-srch-x');
        if (bsrx) bsrx.style.display = 'none';
        loadCourseMode(courseId);
        /* navi=1 이면 지도 로드 후 자동으로 내비 시작 */
        if (params.get('navi') === '1') {
          setTimeout(startCourseNavi, 2000);
        }
      }
    });
  };
  document.head.appendChild(sc);
});

/* ══ 코스 모드 ═════════════════════════════════════════════════
   URL 파라미터: map.html?course=SE-1[&navi=1]
   - 코스 성지를 번호 마커로 표시
   - Kakao 경로 API로 실제 도로 경로 그리기 (실패 시 직선)
   - 카카오내비 앱 연동
   ════════════════════════════════════════════════════════════ */

/* 코스 번호 마커 이미지 */
function courseMkImg(no, visited) {
  var bg = visited ? '#2A8040' : '#1B7FD8';
  var svg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42">'
    + '<path d="M17 41 C17 41 2 26 2 17 a15 15 0 1 1 30 0 C32 26 17 41 17 41Z"'
    + ' fill="' + bg + '" stroke="#fff" stroke-width="1.5"/>'
    + '<circle cx="17" cy="17" r="9" fill="#fff"/>'
    + '<text x="17" y="22" text-anchor="middle" font-size="11" font-weight="800"'
    + ' fill="' + bg + '" font-family="sans-serif">' + no + '</text>'
    + '</svg>'
  );
  return new kakao.maps.MarkerImage(
    'data:image/svg+xml,' + svg,
    new kakao.maps.Size(34, 42),
    { offset: new kakao.maps.Point(17, 42) }
  );
}

/* Kakao Mobility API로 실제 도로 경로 가져오기 */
async function fetchRouteFromKakao(shrines) {
  if (shrines.length < 2) return null;
  try {
    var origin      = shrines[0];
    var destination = shrines[shrines.length - 1];
    var waypoints   = shrines.slice(1, -1).map(function(s) {
      return { name: s.name, x: String(s.lng), y: String(s.lat) };
    });

    var body = {
      origin:      { x: String(origin.lng),      y: String(origin.lat) },
      destination: { x: String(destination.lng), y: String(destination.lat) },
      priority:    'RECOMMEND'
    };
    if (waypoints.length) body.waypoints = waypoints;

    var res = await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions', {
      method:  'POST',
      headers: {
        'Authorization': 'KakaoAK ' + KAKAO_REST_KEY,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error('API ' + res.status);
    var data  = await res.json();
    var route = data.routes && data.routes[0];
    if (!route || route.result_code !== 0) throw new Error('no route');

    /* vertexes: [lng, lat, lng, lat, ...] → LatLng 배열 */
    var pts = [];
    route.sections.forEach(function(sec) {
      sec.roads.forEach(function(road) {
        var v = road.vertexes;
        for (var i = 0; i < v.length; i += 2) {
          pts.push(new kakao.maps.LatLng(v[i + 1], v[i]));
        }
      });
    });
    return pts;
  } catch (e) {
    console.warn('[코스경로] API 실패 → 직선 표시:', e.message);
    return null;
  }
}

/* 코스 모드 진입 */
async function loadCourseMode(courseId) {
  var courses  = window._COURSES || [];
  var course   = courses.find(function(c) { return c.id === courseId; });
  if (!course) return;

  _courseMode = true;
  var visited  = getVisited();

  /* 기존 마커 숨김 */
  _markers.forEach(function(x) { x.marker.setMap(null); });
  if (_clusterer) _clusterer.clear();

  /* 코스 성지 로드 */
  _courseShrines = course.seqs.map(function(seq) {
    return _byseq[seq];
  }).filter(Boolean);

  /* 번호 마커 생성 */
  var bounds = new kakao.maps.LatLngBounds();
  _courseShrines.forEach(function(s, i) {
    var isV = !!visited[s.seq];
    var mk  = new kakao.maps.Marker({
      map:      _map,
      position: new kakao.maps.LatLng(s.lat, s.lng),
      image:    courseMkImg(i + 1, isV),
      title:    (i + 1) + '. ' + s.name,
      zIndex:   10
    });
    kakao.maps.event.addListener(mk, 'click', function() { showInfoCard(s, mk); });
    bounds.extend(new kakao.maps.LatLng(s.lat, s.lng));
  });
  _map.setBounds(bounds, 60);

  /* 코스 패널 표시 */
  var panel = document.getElementById('course-panel');
  if (panel) {
    document.getElementById('cp-title').textContent = course.title;
    document.getElementById('cp-meta').textContent  =
      course.type + ' · ' + course.seqs.length + '곳 · 총 이동 약 ' + course.km + 'km';
    panel.style.display = 'block';

    /* FAB 위치 올리기 (패널이 생겼으므로) */
    var fabs = document.getElementById('fabs');
    if (fabs) fabs.style.bottom = 'calc(env(safe-area-inset-bottom,0px) + 170px)';
  }

  /* 경로 그리기: Kakao API 시도 → 실패 시 직선 */
  var routePts = await fetchRouteFromKakao(_courseShrines);
  if (_coursePolyline) { _coursePolyline.setMap(null); _coursePolyline = null; }

  if (routePts && routePts.length) {
    _coursePolyline = new kakao.maps.Polyline({
      map: _map, path: routePts,
      strokeWeight: 5, strokeColor: '#1B7FD8', strokeOpacity: 0.88
    });
  } else {
    /* 직선 fallback (점선) */
    var fallbackPts = _courseShrines.map(function(s) {
      return new kakao.maps.LatLng(s.lat, s.lng);
    });
    _coursePolyline = new kakao.maps.Polyline({
      map: _map, path: fallbackPts,
      strokeWeight: 4, strokeColor: '#1B7FD8',
      strokeOpacity: 0.55, strokeStyle: 'dashed'
    });
  }
}

/* 카카오내비 시작 */
function startCourseNavi() {
  if (!_courseShrines.length) return;

  /* Kakao JS SDK 초기화 */
  if (window.Kakao && !Kakao.isInitialized()) {
    Kakao.init(KAKAO_KEY);
  }

  var dest = _courseShrines[_courseShrines.length - 1];
  var via  = _courseShrines.slice(0, -1).map(function(s) {
    return { name: s.name, x: String(s.lng), y: String(s.lat) };
  });

  try {
    Kakao.Navi.start({
      name:       dest.name,
      x:          String(dest.lng),
      y:          String(dest.lat),
      coordType:  'wgs84',
      viaPoints:  via
    });
  } catch (e) {
    /* 내비 앱 없으면 카카오맵으로 */
    location.href = 'https://map.kakao.com/link/to/' +
      encodeURIComponent(dest.name) + ',' + dest.lat + ',' + dest.lng;
  }
}
