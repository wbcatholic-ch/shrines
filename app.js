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
  '서울':'서울대교구','인천':'인천교구','수원':'수원교구','의정부':'의정부교구',
  '춘천':'춘천교구','원주':'원주교구','대전':'대전교구','청주':'청주교구',
  '대구':'대구대교구','안동':'안동교구','부산':'부산교구','마산':'마산교구',
  '광주':'광주대교구','전주':'전주교구','제주':'제주교구','군종':'군종교구'
};

/* §1 상태 */
let _map, _LL, _MM, _MI, _SZ, _PT, _PL;
let _shrines = [], _byseq = {};
let _markers = [];
let _myMk = null, _regionMk = null, _routePolyline = null;
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
    center: new _LL(36.5, 127.8), level: 12
  });
  kakao.maps.event.addListener(_map, 'click', () => _closeCard());
  document.getElementById('map-loading').style.display = 'none';

  if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  _buildMarkers();
  _startGPS();

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
function _resizeMk(idx,big) { if(_markers[idx]) _markers[idx].setImage(_mkr(_CLR[_shrines[idx].type],big)); }

/* §5 탭 전환 */
function switchTab(tab) {
  /* 같은 탭 재클릭 → 닫기 */
  if (_activeTab === tab) { _closeTab(); return; }
  _closeCard();
  _activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
  const sheet = document.getElementById('sheet-' + tab);
  if (sheet) sheet.classList.add('open');

  if (tab === 'nearby') _loadNearby();
  if (tab === 'list')   _renderList('');
}

function _closeTab() {
  _activeTab = '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
  _showAll();
}

/* §6 내주변 */
function _loadNearby() {
  const body = document.getElementById('nearby-body');
  body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">📍 위치 확인 중…</div>';
  if (!navigator.geolocation) { body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">위치 기능을 사용할 수 없습니다.</div>'; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude:lat, longitude:lng} = pos.coords;
    _showMyLoc(lat,lng); _map.setCenter(new _LL(lat,lng)); _map.setLevel(8);
    const list = _shrines.map((s,i)=>({i,d:_dist(lat,lng,s.lat,s.lng)}))
      .filter(o=>o.d<500000).sort((a,b)=>a.d-b.d).slice(0,10);
    _showOnly(list.map(o=>o.i));
    body.innerHTML = list.map((o,n)=>{
      const s=_shrines[o.i], c=_CLR[s.type];
      const dt = o.d<1000?Math.round(o.d)+'m':(o.d/1000).toFixed(1)+'km';
      return `<div class="li" data-i="${o.i}">
        <div class="li-dot" style="background:${c}"></div>
        <div class="li-main"><div class="li-name">${_esc(s.name)}</div><div class="li-sub">${_esc((s.addr||'').slice(0,30))}</div></div>
        <div class="li-dist">${dt}</div>
      </div>`;
    }).join('');
    body.querySelectorAll('[data-i]').forEach(el=>el.addEventListener('click',()=>_openCard(+el.dataset.i)));
  }, ()=>{ body.innerHTML='<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">위치를 가져오지 못했습니다.</div>'; },
  {enableHighAccuracy:true, timeout:12000, maximumAge:10000});
}

/* §7 성지찾기 */
function _renderList(q) {
  const v = _getV();
  const res = q ? _shrines.reduce((a,s,i)=>{ if(s.name.includes(q)||(s.addr&&s.addr.includes(q)))a.push(i); return a; },[]) : _shrines.map((_,i)=>i);
  _showOnly(res);
  const body = document.getElementById('list-body');
  if (!res.length) { body.innerHTML='<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">검색 결과가 없습니다.</div>'; return; }
  body.innerHTML = res.map(i=>{
    const s=_shrines[i], c=_CLR[s.type];
    const cnt = (_getV()[s.seq]||[]).length;
    return `<div class="li" data-i="${i}">
      <div class="li-dot" style="background:${c}"></div>
      <div class="li-main"><div class="li-name">${_esc(s.name)}</div><div class="li-sub">${_esc(_DIOCESE[s.diocese]||s.diocese||'')} · ${_esc((s.addr||'').split(' ').slice(0,3).join(' '))}</div></div>
      ${cnt?`<div class="li-badge" style="background:${c}18;color:${c}">✞${cnt}</div>`:`<div class="li-badge" style="background:#f0f0f0;color:#ccc;font-size:9px">${s.type||''}</div>`}
    </div>`;
  }).join('');
  body.querySelectorAll('[data-i]').forEach(el=>el.addEventListener('click',()=>_openCard(+el.dataset.i)));
}

/* §8 지역검색 */
function _regionSearch(q) {
  if (!q.trim()) return;
  const body = document.getElementById('region-body');
  body.innerHTML = '<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">검색 중…</div>';
  if (!kakao.maps.services) { body.innerHTML='<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">지역검색을 사용할 수 없습니다.</div>'; return; }
  new kakao.maps.services.Places().keywordSearch(q, (data,status)=>{
    if (status!==kakao.maps.services.Status.OK||!data.length) {
      body.innerHTML='<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">검색 결과가 없습니다.</div>'; return;
    }
    const lat=+data[0].y, lng=+data[0].x;
    if (_regionMk) _regionMk.setMap(null);
    _regionMk = new _MM({map:_map, position:new _LL(lat,lng), image:_mkrRegion(), title:data[0].place_name, zIndex:500});
    const near = _shrines.reduce((a,s,i)=>{if(s.lat&&s.lng&&_dist(lat,lng,s.lat,s.lng)<50000)a.push({i,d:_dist(lat,lng,s.lat,s.lng)});return a;},[]).sort((a,b)=>a.d-b.d);
    _showOnly(near.map(o=>o.i));
    const maxD = near.reduce((m,o)=>Math.max(m,o.d),0);
    _map.setLevel(maxD<3500?6:maxD<7000?7:maxD<14000?8:maxD<28000?9:10);
    _map.setCenter(new _LL(lat,lng));
    if (!near.length) { body.innerHTML='<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">근처에 성지가 없습니다.</div>'; return; }
    body.innerHTML = `<div style="padding:10px 14px;font-size:11px;color:#aaa;font-weight:700">📍 ${_esc(data[0].place_name)} 주변 성지 ${near.length}곳</div>` +
      near.map(o=>{
        const s=_shrines[o.i], c=_CLR[s.type];
        const dt=o.d<1000?Math.round(o.d)+'m':(o.d/1000).toFixed(1)+'km';
        return `<div class="li" data-i="${o.i}"><div class="li-dot" style="background:${c}"></div><div class="li-main"><div class="li-name">${_esc(s.name)}</div><div class="li-sub">${_esc((s.addr||'').slice(0,30))}</div></div><div class="li-dist">${dt}</div></div>`;
      }).join('');
    body.querySelectorAll('[data-i]').forEach(el=>el.addEventListener('click',()=>_openCard(+el.dataset.i)));
  });
}

/* §9 길찾기 (경유지 포함) */
function _setRouteFromMarker(idx) {
  const s=_shrines[idx];
  if (!_rS) { _setStart({name:s.name,lat:s.lat,lng:s.lng,idx}); }
  else if (!_rE) { _setEnd({name:s.name,lat:s.lat,lng:s.lng,idx}); }
  else { _addVia({name:s.name,lat:s.lat,lng:s.lng,idx}); }
  _tryRoute();
}

function _setStart(pt) {
  if (_rS?.idx>=0) _resizeMk(_rS.idx,false);
  _rS=pt;
  _q('#rs-start-lbl').textContent=pt.name; _q('#rs-start-lbl').classList.remove('empty');
  _q('#rs-start-x').style.display='';
  if (pt.idx>=0&&_markers[pt.idx]) _markers[pt.idx].setImage(_mkrRoute('출'));
  _updateRouteHint();
}
function _setEnd(pt) {
  if (_rE?.idx>=0) _resizeMk(_rE.idx,false);
  _rE=pt;
  _q('#rs-end-lbl').textContent=pt.name; _q('#rs-end-lbl').classList.remove('empty');
  _q('#rs-end-x').style.display='';
  if (pt.idx>=0&&_markers[pt.idx]) _markers[pt.idx].setImage(_mkrRoute('도'));
  _updateRouteHint();
}
function _addVia(pt) {
  if (_rVia.some(v=>v.idx===pt.idx)) return;
  _rVia.push(pt);
  if (pt.idx>=0&&_markers[pt.idx]) _markers[pt.idx].setImage(_mkrVia(_rVia.length));
  _renderViaList(); _updateRouteHint();
}
function _removeVia(i) {
  const pt=_rVia[i];
  if (pt?.idx>=0) _resizeMk(pt.idx,false);
  _rVia.splice(i,1);
  /* 경유지 번호 마커 재설정 */
  _rVia.forEach((v,j)=>{ if(v.idx>=0&&_markers[v.idx]) _markers[v.idx].setImage(_mkrVia(j+1)); });
  _renderViaList(); _updateRouteHint();
}
function _renderViaList() {
  _q('#rs-via-wrap').innerHTML = _rVia.map((v,i)=>
    `<div class="rs-row" style="margin-bottom:6px">
      <div class="rs-dot" style="background:#FF8C00"></div>
      <span class="rs-lbl">${_esc(v.name)}</span>
      <button class="rs-x-btn" onclick="_removeVia(${i})">×</button>
    </div>`
  ).join('');
}
function _clearRoute() {
  if(_rS?.idx>=0)_resizeMk(_rS.idx,false);
  if(_rE?.idx>=0)_resizeMk(_rE.idx,false);
  _rVia.forEach(v=>{if(v.idx>=0)_resizeMk(v.idx,false);});
  _rS=null; _rVia=[]; _rE=null;
  _q('#rs-start-lbl').textContent='출발지를 선택하세요'; _q('#rs-start-lbl').classList.add('empty');
  _q('#rs-end-lbl').textContent='도착지를 선택하세요';   _q('#rs-end-lbl').classList.add('empty');
  _q('#rs-start-x').style.display='none'; _q('#rs-end-x').style.display='none';
  _q('#rs-via-wrap').innerHTML=''; _q('#rs-result').style.display='none'; _q('#rs-hint').style.display='';
  if(_routePolyline){_routePolyline.setMap(null);_routePolyline=null;}
}
function _updateRouteHint() {
  _q('#rs-hint').style.display = (_rS&&_rE)?'none':'';
  _q('#rs-result').style.display = 'none';
}

async function _tryRoute() {
  if (!_rS || !_rE) return;
  _q('#rs-hint').textContent='경로 계산 중…'; _q('#rs-hint').style.display='';
  try {
    const via = _rVia.map(v=>({name:v.name,x:String(v.lng),y:String(v.lat)}));
    const body = {origin:{x:String(_rS.lng),y:String(_rS.lat)},destination:{x:String(_rE.lng),y:String(_rE.lat)},priority:'RECOMMEND'};
    if (via.length) body.waypoints=via;
    const res = await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions',{
      method:'POST', headers:{'Authorization':'KakaoAK '+KAKAO_REST_KEY,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const data = await res.json();
    const route = data.routes?.[0];
    if (route?.result_code===0) {
      const s=route.summary;
      _q('#rs-km').textContent=(s.distance/1000).toFixed(1);
      const min=Math.round(s.duration/60);
      _q('#rs-time').textContent=min<60?min+'분':Math.floor(min/60)+'시간'+(min%60?min%60+'분':'');
      _q('#rs-result').style.display=''; _q('#rs-hint').style.display='none';
      /* 경로 폴리라인 */
      if(_routePolyline){_routePolyline.setMap(null);}
      const pts=[];
      route.sections.forEach(sec=>sec.roads.forEach(r=>{for(let j=0;j<r.vertexes.length;j+=2)pts.push(new _LL(r.vertexes[j+1],r.vertexes[j]));}));
      _routePolyline=new _PL({map:_map,path:pts,strokeWeight:5,strokeColor:'#1565c0',strokeOpacity:.8});
      return;
    }
  } catch {}
  _q('#rs-hint').textContent='경로를 가져오지 못했습니다. 카카오내비로 이동합니다.'; _q('#rs-hint').style.display='';
  _q('#rs-result').style.display='';
  _q('#rs-km').textContent='—'; _q('#rs-time').textContent='—';
}

function _startNavi() {
  if (!_rS||!_rE) return;
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_KEY);
  try {
    Kakao.Navi.start({
      name:_rE.name, x:String(_rE.lng), y:String(_rE.lat), coordType:'wgs84',
      viaPoints:[_rS,..._rVia].map(p=>({name:p.name,x:String(p.lng),y:String(p.lat)}))
    });
  } catch { location.href=`https://map.kakao.com/link/to/${encodeURIComponent(_rE.name)},${_rE.lat},${_rE.lng}`; }
}

function _setGpsStart() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos=>{
    _setStart({name:'내 위치',lat:pos.coords.latitude,lng:pos.coords.longitude,idx:-1});
    _showMyLoc(pos.coords.latitude,pos.coords.longitude);
    _tryRoute();
  },null,{enableHighAccuracy:true,timeout:8000});
}

function _icRoute() {
  if (!_cur) return;
  const pt={name:_cur.name,lat:_cur.lat,lng:_cur.lng,idx:_curIdx};
  if (!_rS) { _setStart(pt); }
  else if (!_rE) { _setEnd(pt); _tryRoute(); }
  else { _addVia(pt); _tryRoute(); }
  switchTab('route');
}

/* §10 인포카드 */
function _openCard(idx) {
  if (_curIdx>=0&&_curIdx!==idx) _resizeMk(_curIdx,false);
  _curIdx=idx; _cur=_shrines[idx];
  _resizeMk(idx,true);
  const s=_cur;

  _q('#ic-name').textContent=s.name;
  _q('#ic-sub').textContent=(_DIOCESE[s.diocese]||s.diocese||'');
  const tb=_q('#ic-type');
  tb.textContent=s.type||''; tb.style.background=_CLR[s.type]||'#eee'; tb.style.color=_CLR[s.type]?'#fff':'#555';
  _q('#ic-addr').textContent=s.addr||'주소 정보 없음';
  _q('#ic-addr-row').style.display=s.addr?'':'none';

  const tel=_q('#ic-tel');
  if(s.tel){_q('#ic-tel-num').textContent=s.tel;tel.href='tel:'+s.tel.replace(/\D/g,'');tel.style.display='';}
  else tel.style.display='none';

  const hp=_q('#ic-hp'), guide=_q('#ic-guide'), links=_q('#ic-links');
  if(s.hp){hp.href=s.hp;hp.style.display='';}else hp.style.display='none';
  if(s.seq){guide.style.display='';guide.onclick=()=>window.open(`https://www.cbck.or.kr/page/api/page7330/view.asp?id=${s.seq}`,'_blank');}else guide.style.display='none';
  links.style.display=(s.hp||s.seq)?'':'none';

  _q('#ic-kakao-nav').onclick=()=>location.href=`https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`;
  _updateStamp(s);
  _map.panTo(new _LL(s.lat,s.lng));
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
function _autoStamp(lat,lng) {
  const v=_getV(),today=_today(); let changed=false;
  _shrines.forEach(s=>{
    if(!s.stamp||!s.lat||!s.lng)return;
    const arr=Array.isArray(v[s.seq])?v[s.seq]:[];
    if(arr.includes(today)||_dist(lat,lng,s.lat,s.lng)>STAMP_RADIUS)return;
    arr.push(today);v[s.seq]=arr;changed=true;
    _toast(`✝ ${s.name} 순례 기록!`+(arr.length>1?` · ${arr.length}번째 순례`:''));
    if(_cur?.seq===s.seq)_updateStamp(s);
  });
  if(changed)_saveV(v);
}
function _toast(msg){
  const t=_q('#stamp-toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3500);
}
function _updateStamp(s){
  const btn=_q('#ic-stamp');
  if(!s.stamp){btn.style.display='none';return;} btn.style.display=''; btn.style.fontSize='';
  const arr=Array.isArray(_getV()[s.seq])?_getV()[s.seq]:[];
  if(arr.length){
    btn.textContent=`✞ ${arr.length}회 순례 · ${arr[arr.length-1]}`;
    btn.className='ic-stamp-btn stamped';
    btn.onclick=()=>{
      const v=_getV(),a=Array.isArray(v[s.seq])?v[s.seq]:[];
      if(!confirm(`${s.name}\n순례 이력: ${a.join(', ')}\n\n마지막 기록을 삭제할까요?`))return;
      a.pop();if(a.length)v[s.seq]=a;else delete v[s.seq];_saveV(v);_updateStamp(s);
    };
  }else{
    btn.textContent='📍 성지에 가까워지면 자동으로 기록됩니다';
    btn.className='ic-stamp-btn auto'; btn.style.fontSize='11px'; btn.onclick=null;
  }
}
function _showMyLoc(lat,lng){
  if(!_myMk)_myMk=new _MM({map:_map,image:_mkrMyLoc(),zIndex:200});
  _myMk.setPosition(new _LL(lat,lng));
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
  _shrines=(window._SH_RAW||[]).map(s=>{const r={...s};if(_TY[r.type])r.type=_TY[r.type];return r;}).filter(s=>s.lat&&s.lng);

  /* 탭 버튼 */
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));

  /* 시트 닫기 */
  _q('#nearby-close').addEventListener('click',_closeTab);
  _q('#list-close').addEventListener('click',_closeTab);
  _q('#region-close').addEventListener('click',_closeTab);
  _q('#route-close').addEventListener('click',_closeTab);

  /* 내위치 */
  _q('#loc-btn').addEventListener('click',()=>{
    if(!navigator.geolocation||!_map)return;
    navigator.geolocation.getCurrentPosition(pos=>{
      _showMyLoc(pos.coords.latitude,pos.coords.longitude);
      _map.setCenter(new _LL(pos.coords.latitude,pos.coords.longitude));
    });
  });

  /* 성지찾기 */
  _q('#list-inp').addEventListener('input',e=>{clearTimeout(_listTimer);_listTimer=setTimeout(()=>_renderList(e.target.value.trim()),220);});
  _q('#list-inp-x').addEventListener('click',()=>{_q('#list-inp').value='';_renderList('');});

  /* 지역검색 */
  _q('#region-inp').addEventListener('keydown',e=>{if(e.key==='Enter')_regionSearch(e.target.value);});
  _q('#region-inp-x').addEventListener('click',()=>{_q('#region-inp').value='';_q('#region-body').innerHTML='<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">검색할 지역명을 입력하세요</div>';if(_regionMk){_regionMk.setMap(null);_regionMk=null;}_showAll();});

  /* 길찾기 */
  _q('#rs-myloc').addEventListener('click',_setGpsStart);
  _q('#rs-start-x').addEventListener('click',()=>{if(_rS?.idx>=0)_resizeMk(_rS.idx,false);_rS=null;_q('#rs-start-lbl').textContent='출발지를 선택하세요';_q('#rs-start-lbl').classList.add('empty');_q('#rs-start-x').style.display='none';_q('#rs-result').style.display='none';_q('#rs-hint').style.display='';if(_routePolyline){_routePolyline.setMap(null);_routePolyline=null;}});
  _q('#rs-end-x').addEventListener('click',()=>{if(_rE?.idx>=0)_resizeMk(_rE.idx,false);_rE=null;_q('#rs-end-lbl').textContent='도착지를 선택하세요';_q('#rs-end-lbl').classList.add('empty');_q('#rs-end-x').style.display='none';_q('#rs-result').style.display='none';_q('#rs-hint').style.display='';if(_routePolyline){_routePolyline.setMap(null);_routePolyline=null;}});
  _q('#rs-add-via').addEventListener('click',()=>{if(!_cur){alert('지도에서 성지를 먼저 선택하세요.');return;}_addVia({name:_cur.name,lat:_cur.lat,lng:_cur.lng,idx:_curIdx});_tryRoute();});
  _q('#rs-navi-btn').addEventListener('click',_startNavi);
  _q('#rs-reset-btn').addEventListener('click',_clearRoute);

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
