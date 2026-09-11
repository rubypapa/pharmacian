// PHARMACIAN 자체 유입 기록. ★루비 지시 2026-09-11 —
//   "페이스북에서 얼마 들어왔고 구글에서 얼마 유튜브에서얼마 네이버에서 얼마 카카오에서 얼마
//    이런거 분석하던데 그거 만들어줘"
//
// ★track.js 와 다른 것 : track.js 는 메타·구글에게 ★보내는 코드다(남의 대시보드에서 본다).
//   이 파일은 ph_visits 에 ★우리 DB 로 한 줄 남긴다(admin 화면에서 본다). 둘은 서로 독립이다.
//
// ★설계 규칙 넷
//  1. IP·UA 원문을 ★안 보낸다. privacy.html 에 가명정보 처리도 안 한다고 공개해 뒀다.
//     남기는 것은 채널·리퍼러 도메인·UTM·경로·기기구분·랜덤 세션키뿐이다.
//  2. 세션 하나에 ★한 번만 기록한다. 새로고침·페이지 이동으로 숫자가 불지 않게 한다.
//     (경로별로 보고 싶으면 sessionStorage 키를 경로까지 넣으면 되는데, ★유입 분석은
//      "몇 명이 어디서 왔나"라서 첫 진입 한 번이 맞다.)
//  3. ★UTM 이 있으면 UTM 을 믿는다. 우리가 붙인 값이라 리퍼러보다 정확하다.
//  4. 실패해도 화면에 아무 영향이 없다. 통계가 사이트를 망가뜨리면 안 된다.
(function () {
  var C = window.PHARMACIAN || {};
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON) return;

  // ── 세션 하나에 한 번 ─────────────────────────────────────
  var KEY = 'ph_visit_logged';
  var SKEY = 'ph_session_key';
  var ss;
  try { ss = window.sessionStorage; } catch (e) { return; }   // 쿠키 차단 환경이면 조용히 포기
  if (!ss) return;
  if (ss.getItem(KEY)) return;

  var sk = ss.getItem(SKEY);
  if (!sk) {
    // ★난수다. 사람을 식별하지 않고 브라우저를 닫으면 사라진다.
    sk = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
    ss.setItem(SKEY, sk);
  }

  // ── 채널 분류표 ───────────────────────────────────────────
  // ★도메인 조각으로 가른다. 모바일·리다이렉트 도메인이 다 달라서 조각 매칭이 맞다
  //   (facebook 은 l.facebook.com / m.facebook.com / lm.facebook.com 으로도 온다).
  var 규칙 = [
    ['Instagram', ['instagram.com', 'l.instagram.com', 'ig.me']],
    ['Facebook',  ['facebook.com', 'fb.me', 'fb.com', 'fbclid']],
    ['YouTube',   ['youtube.com', 'youtu.be', 'm.youtube.com']],
    ['Naver',     ['naver.com', 'naver.me', 'smartstore.naver.com']],
    ['Kakao',     ['kakao.com', 'kakaocdn.net', 'daum.net', 'kko.to']],
    ['Google',    ['google.com', 'google.co.kr', 'googleadservices.com', 'googlesyndication.com', 'gstatic.com']],
    ['TikTok',    ['tiktok.com', 'bytedance']],
    ['X',         ['twitter.com', 'x.com', 't.co']],
    ['Threads',   ['threads.net', 'threads.com']],
    ['Coupang',   ['coupang.com']],
    ['Cafe24',    ['cafe24.com']],
  ];

  function 도메인(u) {
    try { return new URL(u).hostname.toLowerCase(); } catch (e) { return ''; }
  }
  function 채널찾기(host) {
    for (var i = 0; i < 규칙.length; i++) {
      var 이름 = 규칙[i][0], 조각 = 규칙[i][1];
      for (var j = 0; j < 조각.length; j++) {
        if (host.indexOf(조각[j]) !== -1) return 이름;
      }
    }
    return null;
  }

  var qs = new URLSearchParams(location.search);
  var utm_source   = qs.get('utm_source')   || '';
  var utm_medium   = qs.get('utm_medium')   || '';
  var utm_campaign = qs.get('utm_campaign') || '';
  var utm_content  = qs.get('utm_content')  || '';
  var utm_term     = qs.get('utm_term')     || '';

  var ref = document.referrer || '';
  var refHost = 도메인(ref);

  // ── 검색어 ────────────────────────────────────────────────
  // ★①광고는 utm_term 으로 온다. 구글애즈 {keyword} · 네이버 검색광고 키워드 삽입.
  //   ★②자연 검색어는 ★거의 안 온다 — 구글·네이버가 HTTPS 뒤 질의어를 리퍼러에서 뗀다.
  //     그래도 넘겨주는 경우가 있어 파싱은 해 둔다(오면 잡고, 안 오면 빈 값이다. 손해가 없다).
  //   ★자연 검색어 전체는 서치콘솔·네이버 서치어드바이저에서 봐야 한다. 우리 DB 로는 못 본다.
  var term = '', term_src = '';
  if (utm_term) { term = utm_term; term_src = 'utm'; }
  else if (ref) {
    var 질의키 = ['q', 'query', 'keyword', 'wd', 'search_query', 'text'];
    try {
      var rp = new URL(ref).searchParams;
      for (var qi = 0; qi < 질의키.length; qi++) {
        var v = rp.get(질의키[qi]);
        if (v && v.trim()) { term = v.trim().slice(0, 120); term_src = 'referrer'; break; }
      }
    } catch (e) { /* 리퍼러가 이상하면 그냥 비운다 */ }
  }
  var 우리 = (location.hostname || '').toLowerCase();

  var channel, source;
  if (utm_source) {
    // ★①UTM 우선 — 우리가 붙인 값이라 가장 정확하다
    channel = 채널찾기(utm_source.toLowerCase()) || utm_source;
    source  = utm_source;
  } else if (qs.get('fbclid')) {
    channel = 'Facebook'; source = 'fbclid';        // ★메타 광고는 리퍼러가 비고 이 값만 온다
  } else if (qs.get('gclid') || qs.get('wbraid') || qs.get('gbraid')) {
    channel = 'Google';   source = 'gclid';
  } else if (!ref) {
    channel = 'Direct';   source = '';              // ★주소 직접 입력·즐겨찾기·앱 내 이동
  } else if (refHost === 우리 || refHost.indexOf('pharmacian') !== -1) {
    channel = 'Internal'; source = refHost;         // 우리 안에서 온 것 — 유입이 아니다
  } else {
    channel = 채널찾기(refHost) || 'Referral';
    source  = refHost;
  }

  if (channel === 'Internal') { ss.setItem(KEY, '1'); return; }   // 내부 이동은 안 센다

  // ── 기기 구분 ─────────────────────────────────────────────
  // ★UA 원문은 안 보낸다. mobile/tablet/desktop 세 값으로만 줄인다.
  var ua = (navigator.userAgent || '');
  var device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'tablet'
             : /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua) ? 'mobile'
             : ua ? 'desktop' : 'unknown';

  // ── 봇 표시 ──────────────────────────────────────────────
  // ★지우지 않고 ★표시만 한다. 집계 뷰가 is_bot=false 만 센다.
  //   지워 버리면 "봇이 얼마나 왔나"를 나중에 못 본다.
  var is_bot = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|preview|monitor/i.test(ua)
               || (navigator.webdriver === true);

  var row = {
    channel: channel,
    source: source || null,
    medium: utm_medium || null,
    campaign: utm_campaign || null,
    content: utm_content || null,
    term: term || null,
    term_src: term_src || null,
    path: (location.pathname || '/').slice(0, 200),
    device: device,
    session_key: sk,
    is_bot: is_bot
  };

  // ── 전송 ─────────────────────────────────────────────────
  // ★Prefer: return=minimal — 넣은 줄을 돌려받지 않는다. select 권한이 없어서 받으려 하면 에러가 난다.
  ss.setItem(KEY, '1');   // ★보내기 전에 찍는다. 실패해도 같은 세션에서 다시 안 보낸다
  try {
    fetch(C.SUPABASE_URL + '/rest/v1/ph_visits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': C.SUPABASE_ANON,
        'Authorization': 'Bearer ' + C.SUPABASE_ANON,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row),
      keepalive: true          // ★페이지를 바로 떠나도 전송이 끝난다
    }).catch(function () {});
  } catch (e) { /* 통계가 사이트를 망가뜨리면 안 된다 */ }
})();
