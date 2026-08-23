// 장바구니. 서버를 쓰지 않고 이 브라우저에만 담아둔다.
// 금액은 여기서 정하지 않는다 - 회원 가격표(ph_product_price)와 주문 금액은 서버가 정한다.
// 담는 것은 "무엇을 몇 개"까지다.
(function (w) {
  var KEY = 'ph_cart_v1';
  var OWNER = 'ph_cart_owner';   // 이 장바구니가 누구 것인가(로그인 계정 id)
  var VALID = ['p7', 'p12', 'nmn', 'mel', 'set1', 'set2', 'p7x10'];   // p7x10 = 현대홈쇼핑 10개 구성   // set = 꿀조합SET(20% 적용가 상품)
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

  function add(key, qty) {
    if (VALID.indexOf(key) < 0) return;
    // ★로그인부터 받는다. 담아 놓고 결제에서 막는 것보다 낫다.
    if (!signedIn()) {
      var up = location.pathname.indexOf('/detail/') >= 0 ? '../' : '';
      location.href = up + 'join.html?back=index';
      return;
    }
    var o = read();
    o[key] = Math.min((o[key] || 0) + (qty || 1), MAX);
    write(o);
  }
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
                KEY: KEY, OWNER: OWNER };
})(window);
