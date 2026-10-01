// 장바구니. 서버를 쓰지 않고 이 브라우저에만 담아둔다.
// 금액은 여기서 정하지 않는다 - 회원 가격표(ph_product_price)와 주문 금액은 서버가 정한다.
// 담는 것은 "무엇을 몇 개"까지다.
(function (w) {
  var KEY = 'ph_cart_v1';
  var OWNER = 'ph_cart_owner';   // 이 장바구니가 누구 것인가(로그인 계정 id)
  var VALID = ['p7', 'p12', 'nmn', 'mel', 'set1', 'set2',
               'p7x3', 'melx3', 'p12x2', 'nmnx2'];   // x2·x3 = 구성(1+1·3개)   // set = 꿀조합SET(20% 적용가 상품)
  // ★상한은 서버(ph-order-create 의 qty 1~20)와 같은 값이어야 한다.
  //   전에는 여기만 훨씬 커서, 담을 땐 되고 결제에서 막혔다
  //   (+를 누르면 수량이 도리어 20으로 줄어드는 일도 있었다).
  var MAX = 20;

  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}');
      var out = {};
      VALID.forEach(function (k) {
        var n = parseInt(o[k], 10);
        if (n > 0) out[k] = Math.min(n, MAX);       // 상한을 둬야 이상한 값이 결제로 안 넘어간다
      });
      return out;
    } catch (e) { return {}; }
  }
  function write(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    paint();
    w.dispatchEvent(new CustomEvent('ph:cart', { detail: o }));
  }
  function count() { var o = read(), n = 0; for (var k in o) n += o[k]; return n; }

  // ★추적에 실을 상품 이름·가격. 가격은 config.js OPTIONS(화면 표시가)에서 찾는다.
  //   세트(set1·set2)는 가격이 서버 가격표에만 있어서 0 → 금액 없이 보낸다. 실제 결제 금액은 서버가 정한다.
  var NAMES = { p7: 'PDRN 7000 크림', p12: 'PDRN 12000 크림', nmn: 'NMN 30,000 크림', mel: '멜라리스 100,000 크림',
                set1: '꿀조합SET · PDRN 라인 2종', set2: '꿀조합SET · 아침밤 2종',
                p7x3: 'PDRN 7000 크림 3개 구성', melx3: '멜라리스 100,000 크림 3개 구성',
                p12x2: 'PDRN 12000 크림 1+1', nmnx2: 'NMN 30,000 크림 1+1' };
  function info(key, qty) {
    var opts = ((w.PHARMACIAN || {}).OPTIONS || {})[key.replace(/x\d$/, '')] || [];
    var price = 0;
    opts.forEach(function (x) { if (x.sku === key) price = x.price; });
    return { key: key, name: NAMES[key] || key, price: price, qty: qty || 1 };
  }
  function track(fn, it) {
    if (w.PHARMACIAN_TRACK && w.PHARMACIAN_TRACK[fn]) { try { w.PHARMACIAN_TRACK[fn](it); } catch (e) {} }
  }

  // ★비회원이 담으려던 상품. 가입·로그인이 끝나면 그 페이지로 돌아가 자동으로 담는다(2026-10-02).
  //   전에는 가입 뒤 홈으로 가고 장바구니가 비어 있어서, 광고로 온 손님이 상품을 다시 찾아야 했다.
  //   ★복귀 주소(join.html?back=index)는 그대로 둔다 — 카카오·Supabase 허용 주소를 건드리지 않으려고.
  var PEND = 'ph_cart_pending';
  var PEND_TTL = 30 * 60 * 1000;   // 30분. 길면 한참 뒤 상관없는 로그인에 옛 상품이 붙는다.
  function pending() {
    try {
      var p = JSON.parse(localStorage.getItem(PEND) || 'null');
      if (p && VALID.indexOf(p.key) >= 0 && Date.now() - p.t < PEND_TTL) return p;
    } catch (e) {}
    return null;
  }

  // opt.stay = 담고 계속 둘러보는 단추(홈 「담기」). 없으면 구매하기 = 담고 결제 화면으로.
  function add(key, qty, opt) {
    if (VALID.indexOf(key) < 0) return;
    var it = info(key, qty);
    // ★로그인부터 받는다. 담아 놓고 결제에서 막는 것보다 낫다.
    if (!signedIn()) {
      // ★비회원 = 담기를 눌렀지만 아직 담기지 않은 사람. 리타게팅 모수에서 빠지면 안 된다(2026-09-22 루비 지적).
      track('addToCartGuest', it);
      try { localStorage.setItem(PEND, JSON.stringify({ key: key, qty: qty || 1, page: location.pathname,
        go: (opt && opt.stay) ? 'stay' : 'checkout', t: Date.now() })); } catch (e) {}
      var up = location.pathname.indexOf('/detail/') >= 0 ? '../' : '';
      // 이동하면 추적 요청이 끊길 수 있어 아주 잠깐 기다린다
      setTimeout(function () { location.href = up + 'join.html?back=index'; }, 300);
      return;
    }
    var o = read();
    o[key] = Math.min((o[key] || 0) + (qty || 1), MAX);
    write(o);
    // ★회원 = 실제로 장바구니에 들어간 뒤에 보낸다
    track('addToCart', it);
  }
  // 가입·로그인을 마친 join.html 이 부른다. 대기 상품이 있으면 담고 'checkout'(구매하기) 또는 'stay'(홈 담기)를 돌려준다.
  //   ★join.html 한 곳에서만 부른다. 상세에서 또 담으면 손님이 단추를 다시 눌렀을 때 수량이 2가 된다.
  //   ★대기 상품은 실제로 담긴 뒤에만 지운다 — 세션을 아직 못 읽으면 다음 기회에 담는다.
  function applyPending() {
    var p = pending();
    if (!p) { discardPending(); return false; }       // 없거나 30분 지남
    if (!signedIn()) return false;
    add(p.key, p.qty);
    if (!read()[p.key]) return false;
    discardPending();
    return p.go === 'stay' ? 'stay' : 'checkout';
  }
  function discardPending() { try { localStorage.removeItem(PEND); } catch (e) {} }
  function set(key, qty) {
    var o = read();
    if (qty > 0) o[key] = Math.min(qty, MAX); else delete o[key];
    write(o);
  }
  function clear() { try { localStorage.removeItem(OWNER); } catch (e) {} write({}); }

  // ★로그인한 사람이 담으면 그 사람 것이 된다. 비로그인으로 담은 것은 주인이 없다.
  //   주인이 있던 장바구니인데 지금 그 사람이 아니면(로그아웃·계정 바뀜) 비운다.
  //   ★이벤트가 아니라 상태를 대조하므로, 다른 탭에서 로그아웃해도·세션이 만료돼도 정리된다.
  function syncOwner(userId) {
    var owner = null;
    try { owner = localStorage.getItem(OWNER); } catch (e) {}
    if (userId) {
      if (owner && owner !== userId) { clear(); }          // 다른 사람이 쓰던 것
      try { localStorage.setItem(OWNER, userId); } catch (e) {}
      return;
    }
    if (owner) { clear(); }                                 // 주인이 있었는데 지금 로그아웃 상태다
  }

  // 헤더의 장바구니 개수를 칠한다
  function paint() {
    var n = count();
    [].slice.call(document.querySelectorAll('[data-cart-count]')).forEach(function (e) {
      e.textContent = n ? String(n) : '';
      e.hidden = !n;
    });
  }

  // ★로그인했는지를 여기서 직접 본다.
  //   전에는 shell.js 가 supabase 라이브러리로 판정했는데, ★상세페이지에는 그 둘이 아예 없어서
  //   상세에서 새로고침하면 대조가 안 돌았다(로그아웃했는데 숫자가 남아 있던 이유).
  //   세션은 localStorage 의 sb-<프로젝트>-auth-token 에 있으니 라이브러리 없이도 확인된다.
  function signedIn() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('sb-') !== 0 || k.indexOf('-auth-token') < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if (v && v.access_token) return true;
      }
    } catch (e) {}
    return false;
  }

  // 화면을 열 때마다 본다. ★로그인 상태가 아니면 장바구니는 비어 있다.
  //   비회원은 구매를 못 하므로 담아 두는 것 자체가 의미가 없고,
  //   로그인 안 한 화면에 숫자만 남아 있으면 손님이 헷갈린다.
  function ownerGate() {
    if (!signedIn()) { clear(); return; }
    var owner = null;
    try { owner = localStorage.getItem(OWNER); } catch (e) {}
    if (owner && owner !== currentUserId()) clear();   // 다른 사람이 쓰던 것
  }

  // 세션 안에 들어 있는 계정 id. 라이브러리 없이 localStorage 에서 직접 읽는다.
  function currentUserId() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('sb-') !== 0 || k.indexOf('-auth-token') < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if (v && v.user && v.user.id) return v.user.id;
      }
    } catch (e) {}
    return null;
  }

  // 다른 탭에서 담아도 이 탭 숫자가 따라간다
  w.addEventListener('storage', function (e) { if (e.key === KEY) paint(); });
  document.addEventListener('DOMContentLoaded', function () { ownerGate(); paint(); });

  w.PH_CART = { read: read, add: add, set: set, clear: clear, count: count, paint: paint,
                syncOwner: syncOwner, ownerGate: ownerGate, signedIn: signedIn,
                pending: pending, applyPending: applyPending, discardPending: discardPending, info: info,
                KEY: KEY, OWNER: OWNER };
})(window);
