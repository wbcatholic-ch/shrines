/* ════════════════════════════════════════════════════════════
   가톨릭길동무 app.js — V1
   §0 설정  §1 상태  §2 지도  §3 마커  §4 인포카드
   §5 내위치  §6 검색  §7 스탬프  §8 내비게이션  §9 시작
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ── §0 설정 ──────────────────────────────────────────────── */
const VER          = 'V1';
const KAKAO_KEY    = '07f7989e29fdfb425fff924f36fb3ec0';
const STAMP_KEY    = 'catholic_stamp_visited_v1';
const STAMP_RADIUS = 300;        // 방문 인증 반경 (m)
const MAP_CENTER   = { lat: 36.5, lng: 127.8 };
const MAP_LEVEL    = 12;

const SHRINE_TYPE  = { A: '국가지정 성지', B: '준성지', C: '사적지' };
const DIOCESE      = {
  SE:'서울대교구', IC:'인천교구', SW:'수원교구', UJ:'의정부교구',
  CC:'춘천교구',  WJ:'원주교구', CJ:'청주교구', DJ:'대전교구',
  JJ:'전주교구',  GJ:'광주대교구',AD:'안동교구',DG:'대구대교구',
  BS:'부산교구',  MS:'마산교구', JE:'제주교구', ML:'군종교구'
};

/* ── §1 상태 ──────────────────────────────────────────────── */
let _map        = null;
let _clusterer  = null;
let _markers    = [];        // { marker, shrine } 배열
let _myMarker   = null;
let _myCircle   = null;
let _curShrine  = null;      // 인포카드에 열린 성지
let _cardOpen   = false;
let _shrines    = [];
let _watchId    = null;

/* ── §2 지도 초기화 ────────────────────────────────────────── */
function initMap() {
  const el = document.getElementById('kakao-map');
  _map = new kakao.maps.Map(el, {
    center: new kakao.maps.LatLng(MAP_CENTER.lat, MAP_CENTER.lng),
    level:  MAP_LEVEL
  });

  _clusterer = new kakao.maps.MarkerClusterer({
    map:              _map,
    averageCenter:    true,
    minLevel:         8,
    disableClickZoom: false,
    styles: [{
      width:'46px', height:'46px', background:'rgba(31,42,68,.88)',
      borderRadius:'50%', color:'#fff', textAlign:'center',
      lineHeight:'46px', fontSize:'13px', fontWeight:'700'
    }]
  });

  // 지도 클릭 → 인포카드 닫기
  kakao.maps.event.addListener(_map, 'click', hideInfoCard);

  document.getElementById('map-loading').style.display = 'none';
  buildMarkers();
}

/* ── §3 마커 ───────────────────────────────────────────────── */
function markerImage(color, size) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size*1.4}">
      <path d="M${size/2} ${size*1.35} C${size/2} ${size*1.35} 2 ${size*.7} 2 ${size/2}
               a${size/2-2} ${size/2-2} 0 1 1 ${size-4} 0 C${size-2} ${size*.7} ${size/2} ${size*1.35} ${size/2} ${size*1.35}Z"
            fill="${color}" stroke="#fff" stroke-width="1.5"/>
    </svg>`
  );
  return new kakao.maps.MarkerImage(
    'data:image/svg+xml,' + svg,
    new kakao.maps.Size(size, size * 1.4),
    { offset: new kakao.maps.Point(size / 2, size * 1.4) }
  );
}

const IMG_NORMAL  = markerImage('#1F2A44', 28);
const IMG_VISITED = markerImage('#2A8040', 28);
const IMG_NOSTAMP = markerImage('#B5AFA7', 24);
const IMG_ACTIVE  = markerImage('#C8962A', 34);

function getMarkerImg(shrine) {
  if (!shrine.stamp) return IMG_NOSTAMP;
  const visited = getVisited();
  return visited[shrine.seq] ? IMG_VISITED : IMG_NORMAL;
}

function buildMarkers() {
  const visited = getVisited();
  _markers = _shrines.map(function(s) {
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(s.lat, s.lng),
      image:    getMarkerImg(s),
      title:    s.name
    });
    kakao.maps.event.addListener(marker, 'click', function() {
      showInfoCard(s, marker);
    });
    return { marker, shrine: s };
  });
  _clusterer.addMarkers(_markers.map(function(m) { return m.marker; }));
}

function refreshMarkers() {
  _markers.forEach(function(m) {
    m.marker.setImage(getMarkerImg(m.shrine));
  });
}

/* ── §4 인포카드 ───────────────────────────────────────────── */
function showInfoCard(s, marker) {
  _curShrine = s;
  _cardOpen  = true;

  // 마커 활성화 (이전 활성 복원)
  _markers.forEach(function(m) { m.marker.setZIndex(0); });
  if (marker) { marker.setImage(IMG_ACTIVE); marker.setZIndex(10); }

  // 기본 정보
  document.getElementById('ic-name').textContent = s.name;
  const typeEl = document.getElementById('ic-type');
  typeEl.textContent = SHRINE_TYPE[s.type] || '';
  typeEl.style.display = s.type ? '' : 'none';

  const addrRow = document.getElementById('ic-addr-row');
  document.getElementById('ic-addr').textContent = s.addr || '';
  addrRow.style.display = s.addr ? '' : 'none';

  const telRow = document.getElementById('ic-tel-row');
  const telEl  = document.getElementById('ic-tel');
  if (s.tel) {
    telEl.href = 'tel:' + s.tel.replace(/[^0-9]/g, '');
    telEl.textContent = s.tel;
    telRow.style.display = '';
  } else {
    telRow.style.display = 'none';
  }

  // 링크 (주교회의 성지 상세 + 홈페이지)
  const linksRow = document.getElementById('ic-links-row');
  const linksEl  = document.getElementById('ic-links');
  const links    = [];
  if (s.seq) links.push('<a href="https://www.cbck.or.kr/page/api/page7330/view.asp?id='+ s.seq +'" target="_blank">성지 상세</a>');
  if (s.hp)  links.push('<a href="'+ s.hp +'" target="_blank">홈페이지</a>');
  if (links.length) {
    linksEl.innerHTML = links.join(' &nbsp;·&nbsp; ');
    linksRow.style.display = '';
  } else {
    linksRow.style.display = 'none';
  }

  // 카카오맵 길찾기
  const navBtn = document.getElementById('ic-btn-nav');
  navBtn.onclick = function() {
    const url = 'https://map.kakao.com/link/to/' + encodeURIComponent(s.name) + ',' + s.lat + ',' + s.lng;
    location.href = url;
  };

  // GPS 방문 인증 버튼
  updateStampBtn(s);

  document.getElementById('info-card').classList.add('open');

  // 지도 중심 이동 (카드가 가리는 높이 고려해서 조금 위로)
  const pos = new kakao.maps.LatLng(s.lat, s.lng);
  _map.panTo(pos);
}

function hideInfoCard() {
  if (!_cardOpen) return;
  _cardOpen  = false;
  _curShrine = null;
  document.getElementById('info-card').classList.remove('open');
  // 활성 마커 복원
  _markers.forEach(function(m) {
    m.marker.setImage(getMarkerImg(m.shrine));
    m.marker.setZIndex(0);
  });
}

function updateStampBtn(s) {
  const btn     = document.getElementById('ic-btn-stamp');
  const visited = getVisited();
  btn.disabled  = false;
  if (!s.stamp) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  if (visited[s.seq]) {
    btn.textContent = '✅ 방문 완료 · ' + visited[s.seq];
    btn.classList.add('visited');
    btn.onclick = function() { promptUnstamp(s); };
  } else {
    btn.textContent = '🕊 방문 인증 (GPS)';
    btn.classList.remove('visited');
    btn.onclick = function() { verifyAndStamp(s); };
  }
}

/* ── §5 내 위치 ────────────────────────────────────────────── */
function getMyLocation(onSuccess) {
  if (!navigator.geolocation) {
    alert('이 기기에서는 위치 기능을 사용할 수 없습니다.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const latlng = new kakao.maps.LatLng(lat, lng);

      if (_myMarker) _myMarker.setMap(null);
      _myMarker = new kakao.maps.Marker({
        position: latlng,
        image: (function(){
          const svg = encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18">' +
            '<circle cx="9" cy="9" r="7" fill="#2A8040" stroke="#fff" stroke-width="2"/>' +
            '</svg>'
          );
          return new kakao.maps.MarkerImage(
            'data:image/svg+xml,' + svg,
            new kakao.maps.Size(18, 18),
            { offset: new kakao.maps.Point(9, 9) }
          );
        })()
      });
      _myMarker.setMap(_map);
      _map.setCenter(latlng);
      if (typeof onSuccess === 'function') onSuccess(lat, lng);
    },
    function(err) {
      const msg = { 1:'위치 권한이 거부되었습니다.', 2:'위치를 찾을 수 없습니다.', 3:'위치 요청 시간이 초과되었습니다.' };
      alert(msg[err.code] || '위치를 가져오지 못했습니다.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  );
}

/* ── §6 검색 ───────────────────────────────────────────────── */
const _searchInput   = function() { return document.getElementById('map-search-input'); };
const _searchResults = function() { return document.getElementById('search-results'); };

function runSearch(q) {
  q = q.trim();
  if (!q) { hideSearch(); return; }
  const visited = getVisited();
  const lower   = q.toLowerCase();
  const results = _shrines.filter(function(s) {
    return s.name.includes(q) || (s.addr && s.addr.includes(q));
  }).sort(function(a, b) {
    const an = a.name === q ? 0 : a.name.startsWith(q) ? 1 : 2;
    const bn = b.name === q ? 0 : b.name.startsWith(q) ? 1 : 2;
    return an - bn;
  }).slice(0, 20);

  if (!results.length) {
    _searchResults().innerHTML = '<div class="search-item"><div class="si-name" style="color:var(--gray)">검색 결과가 없습니다.</div></div>';
  } else {
    _searchResults().innerHTML = results.map(function(s) {
      const v = visited[s.seq] ? '<span class="si-visited">✓</span>' : '<span class="si-visited" style="visibility:hidden">✓</span>';
      return '<div class="search-item" data-seq="'+s.seq+'">'
        + v
        + '<div><div class="si-name">'+ s.name +'</div>'
        + '<div class="si-addr">'+ (s.addr||'') +'</div></div></div>';
    }).join('');
    _searchResults().querySelectorAll('.search-item[data-seq]').forEach(function(el) {
      el.addEventListener('click', function() {
        const seq = this.dataset.seq;
        const s   = _shrines.find(function(x) { return x.seq === seq; });
        if (!s) return;
        const found = _markers.find(function(m) { return m.shrine.seq === seq; });
        hideSearch();
        showInfoCard(s, found ? found.marker : null);
      });
    });
  }
  _searchResults().style.display = 'block';
  document.getElementById('btn-search-clear').style.display = '';
}

function hideSearch() {
  _searchResults().style.display  = 'none';
  _searchResults().innerHTML       = '';
  document.getElementById('btn-search-clear').style.display = 'none';
}

/* ── §7 순례 스탬프 ────────────────────────────────────────── */
function getVisited() {
  try { return JSON.parse(localStorage.getItem(STAMP_KEY) || '{}'); } catch(e) { return {}; }
}
function saveVisited(v) {
  try { localStorage.setItem(STAMP_KEY, JSON.stringify(v)); } catch(e) {}
}

function verifyAndStamp(s) {
  if (!s || !s.lat || !s.lng) return;
  const btn = document.getElementById('ic-btn-stamp');
  const orig = btn.textContent;
  btn.disabled    = true;
  btn.textContent = '📍 위치 확인 중…';

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const distM = haversineM(pos.coords.latitude, pos.coords.longitude, s.lat, s.lng);
      if (distM <= STAMP_RADIUS) {
        const v     = getVisited();
        v[s.seq]    = new Date().toISOString().slice(0, 10);
        saveVisited(v);
        updateStampBtn(s);
        refreshMarkers();
        alert('🕊 ' + s.name + '\n방문이 인증되었습니다!');
      } else {
        btn.disabled    = false;
        btn.textContent = orig;
        const km = distM >= 1000 ? (distM/1000).toFixed(1)+'km' : Math.round(distM)+'m';
        alert('성지에서 약 ' + km + ' 떨어져 있습니다.\n반경 ' + STAMP_RADIUS + 'm 안에서 다시 시도해 주세요.');
      }
    },
    function(err) {
      btn.disabled    = false;
      btn.textContent = orig;
      const msg = { 1:'위치 권한이 거부되었습니다.', 2:'위치를 찾을 수 없습니다.', 3:'시간이 초과되었습니다.' };
      alert(msg[err.code] || '위치를 가져오지 못했습니다.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function promptUnstamp(s) {
  if (!confirm(s.name + '\n방문 인증을 취소할까요?')) return;
  const v = getVisited();
  delete v[s.seq];
  saveVisited(v);
  updateStampBtn(s);
  refreshMarkers();
}

function haversineM(la1, lo1, la2, lo2) {
  const R = 6371000;
  const f1 = la1 * Math.PI / 180, f2 = la2 * Math.PI / 180;
  const df = (la2-la1) * Math.PI / 180, dl = (lo2-lo1) * Math.PI / 180;
  const a  = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ── §8 내비게이션 ─────────────────────────────────────────── */
function showCover() {
  document.getElementById('map-view').classList.remove('active');
  document.getElementById('cover').classList.add('active');
  hideInfoCard();
}

function showMap() {
  document.getElementById('cover').classList.remove('active');
  document.getElementById('map-view').classList.add('active');
  history.pushState({ v: 'map' }, '');

  if (_map) {
    refreshMarkers();
    if (_curShrine) updateStampBtn(_curShrine);
    return;
  }

  // Kakao SDK가 이미 로드됐으면 바로 초기화
  if (typeof kakao !== 'undefined' && kakao.maps) {
    kakao.maps.load(initMap);
    return;
  }

  // 처음 지도를 열 때 동적으로 SDK 로드 (blocking 방지)
  const sc = document.createElement('script');
  sc.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_KEY
           + '&autoload=false&libraries=services,clusterer';
  sc.onerror = function() {
    const el = document.getElementById('map-loading');
    if (el) el.innerHTML = '<div style="padding:20px;text-align:center;color:#888">'
      + '카카오맵을 불러올 수 없습니다.<br>인터넷 연결을 확인해 주세요.</div>';
  };
  sc.onload = function() { kakao.maps.load(initMap); };
  document.head.appendChild(sc);
}

// 외부 페이지(stamp.html 등) → index.html 복귀 시 지도 복원
window.addEventListener('pageshow', function(e) {
  if (e.persisted && _map) refreshMarkers();
});

// 하드웨어 뒤로가기
window.history.replaceState({ v: 'cover' }, '');
window.addEventListener('popstate', function(e) {
  const v = e.state && e.state.v;
  if (v === 'map') {
    if (_cardOpen) {
      hideInfoCard();
      history.pushState({ v: 'map' }, '');   // 다시 map 상태 유지
    } else {
      showCover();
    }
  }
  // v === 'cover': 커버에서 더 뒤로 → TWA가 앱 종료 처리
});

/* ── §9 시작 ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  // 성지 데이터 로드
  _shrines = (window._SH_RAW || []).filter(function(s) { return s.lat && s.lng; });

  // 버전 표시
  document.getElementById('cover-ver').textContent = '가톨릭길동무 ' + VER;

  // 커버 버튼
  document.getElementById('cc-map').addEventListener('click', showMap);

  document.getElementById('cc-stamp').addEventListener('click', function() {
    location.href = 'stamp.html?v=V2-81';
  });

  document.getElementById('cc-prayer').addEventListener('click', function() {
    location.href = 'prayer.html?v=V1';
  });

  document.getElementById('cc-route').addEventListener('click', function() {
    location.href = 'route.html?v=V1';
  });

  // 지도 화면 버튼
  document.getElementById('btn-back').addEventListener('click', function() {
    if (_cardOpen) { hideInfoCard(); }
    else { history.back(); }
  });

  document.getElementById('ic-close').addEventListener('click', hideInfoCard);

  document.getElementById('btn-my-loc').addEventListener('click', function() {
    if (!_map) { showMap(); return; }
    getMyLocation();
  });

  document.getElementById('btn-stamp-page').addEventListener('click', function() {
    location.href = 'stamp.html?v=V2-81';
  });

  // 검색
  let _searchTimer = null;
  document.getElementById('map-search-input').addEventListener('input', function() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function() { runSearch(document.getElementById('map-search-input').value); }, 200);
  });
  document.getElementById('map-search-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { runSearch(this.value); this.blur(); }
  });
  document.getElementById('btn-search-clear').addEventListener('click', function() {
    document.getElementById('map-search-input').value = '';
    hideSearch();
  });

  // SW 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js').catch(function() {});
  }
});
