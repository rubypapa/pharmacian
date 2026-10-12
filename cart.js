// 장바구니. ★원본은 서버(ph_cart · 계정당 한 줄), 이 브라우저의 localStorage 는 화면용 거울이다(2026-10-12 루비 「B로 해 한번에 깔끔하게」).
//   전에는 브라우저에만 담겨서, 로그아웃하면 지워지고(08-23 규칙) 다시 로그인해도 돌아오지 않았다.
//   이제 로그아웃은 ★거울만 비운다. 서버 줄은 남아서 어느 기기·어느 브라우저에서 로그인해도 따라온다.
// 금액은 여기서 정하지 않는다 - 회원 가격표(ph_product_price)와 주문 금액은 서버가 정한다.
// 담는 것은 "무엇을 몇 개"까지다.
(function (w) {
  var KEY = 'ph_cart_v1';
  var OWNER = 'ph_cart_owner';   // 이 거울이 누구 것인가(로그인 계정 id)
  var DIRTY = 'ph_cart_dirty';   // 거울에는 있는데 서버에 아직 못 올린 변경이 있다(통신 실패·화면 이동으로 끊김)
  var VALID = ['p7', 'p12', 'nmn', 'mel', 'set1', 'set2',
               'p7x3', 'melx3', 'p12x2', 'nmnx2'];   // x2·x3 = 구성(1+1·3개)   // set = 꿀조합SET(20% 적용가 상품)
  // ★상한은 서버(ph-order-create 의 qty 1~20 · ph_cart 의 check)와 같은 값이어야 한다.
  //   전에는 여기만 훨씬 커서, 담을 땐 되고 결제에서 막혔다
  //   (+를 누르면 수량이 도리어 20으로 줄어드는 일도 있었다).
  var MAX = 20;

  function clean(o) {
    var out = {};
    if (!o || typeof o !== 'object') return out;
    VALID.forEach(function (k) {
      var n = parseInt(o[k], 10);
      if (n > 0) out[k] = Math.min(n, MAX);       // 상한을 둬야 이상한 값이 결제로 안 넘어간다
    });
    return out;
  }
  function read() {
    try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return {}; }
  }
  // 거울에 적고 화면을 칠한다. opt.local 이 아니면 서버에도 올린다.
  //   ★로그아웃·주인 바뀜으로 비울 때는 반드시 local 로 — 안 그러면 서버의 남은 장바구니를 빈 것으로 덮어쓴다.
  function write(o, opt) {
    o = clean(o);
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    paint();
    w.dispatchEvent(new CustomEvent('ph:cart', { detail: o }));
    if (!(opt && opt.local)) push(o);
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
  // 거울을 비운다. 서버는 그대로 — 로그아웃(shell.js)·주인 바뀜이 부른다.
  //   server=true 면 서버 줄도 지운다 — 결제가 끝난 자리(pay-done.html)에서만.
  function clear(server) {
    try { localStorage.removeItem(OWNER); localStorage.removeItem(DIRTY); } catch (e) {}
    write({}, { local: true });
    if (server) remove();
  }

  // ★로그인한 사람이 담으면 그 사람 것이 된다. 비로그인으로 담은 것은 주인이 없다.
  //   주인이 있던 거울인데 지금 그 사람이 아니면(로그아웃·계정 바뀜) 비운다. 서버 줄은 각자 것이라 안 건드린다.
  //   ★이벤트가 아니라 상태를 대조하므로, 다른 탭에서 로그아웃해도·세션이 만료돼도 정리된다.
  //   로그인 상태면 끝에 서버 것을 끌어온다(sync) — 로그아웃 뒤 다시 로그인한 사람·다른 기기에서 온 사람의 장바구니가 여기서 돌아온다.
  function syncOwner(userId) {
    var owner = null;
    try { owner = localStorage.getItem(OWNER); } catch (e) {}
    if (userId) {
      if (owner && owner !== userId) { clear(); }          // 다른 사람이 쓰던 것
      try { localStorage.setItem(OWNER, userId); } catch (e) {}
      return sync();
    }
    if (owner) { clear(); }                                 // 주인이 있었는데 지금 로그아웃 상태다
    return Promise.resolve(false);
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
  function session() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('sb-') !== 0 || k.indexOf('-auth-token') < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if (v && v.access_token) {
          return { token: v.access_token, uid: v.user && v.user.id, exp: v.expires_at || 0 };
        }
      }
    } catch (e) {}
    return null;
  }
  function signedIn() { return !!session(); }
  function currentUserId() { var s = session(); return s ? (s.uid || null) : null; }

  // 화면을 열 때마다 본다. ★로그인 상태가 아니면 거울은 비어 있다.
  //   비회원은 구매를 못 하므로 담아 두는 것 자체가 의미가 없고,
  //   로그인 안 한 화면에 숫자만 남아 있으면 손님이 헷갈린다.
  function ownerGate() {
    if (!signedIn()) { clear(); return; }
    var owner = null;
    try { owner = localStorage.getItem(OWNER); } catch (e) {}
    if (owner && owner !== currentUserId()) clear();   // 다른 사람이 쓰던 것
  }

  // ───────── 서버(ph_cart) ─────────
  //   라이브러리 없이 PostgREST 를 바로 부른다 — 상세페이지에는 supabase-js 가 없다.
  //   토큰은 세션 저장값의 access_token. 만료돼 있으면 올리지 않고 DIRTY 만 남긴다
  //   (supabase-js 가 있는 화면(홈·장바구니·결제)에서 토큰이 새로 발급되면 shell.js → syncOwner → sync 가 그때 올린다).
  var C = function () { return w.PHARMACIAN || {}; };
  function hdr(s) {
    return { apikey: C().SUPABASE_ANON, Authorization: 'Bearer ' + s.token, 'Content-Type': 'application/json' };
  }
  function live(s) { return !!(s && s.uid && C().SUPABASE_URL && C().SUPABASE_ANON && (!s.exp || s.exp * 1000 > Date.now() + 5000)); }
  function isDirty() { try { return localStorage.getItem(DIRTY) === '1'; } catch (e) { return false; } }
  function dirty(on) { try { if (on) localStorage.setItem(DIRTY, '1'); else localStorage.removeItem(DIRTY); } catch (e) {} }
  var seq = 0;        // 올리기·끌어오기 순번. 끌어온 답이 돌아왔을 때 그 사이 올린 게 있으면 그 답은 버린다(옛 것).
  var inflight = 0;   // 지금 올라가는 중인 요청 수

  // 거울 전체를 서버 줄로 올린다(upsert). 실패하면 DIRTY — 다음 sync 가 다시 올린다.
  //   keepalive : 담고 바로 결제 화면으로 넘어가는 자리(index·상세)에서 화면이 바뀌어도 요청이 살아남게.
  function push(o) {
    var s = session();
    dirty(true);
    if (!live(s)) return Promise.resolve(false);
    seq++; inflight++;
    var done = function (ok) { inflight--; if (ok) dirty(false); return ok; };
    try {
      return fetch(C().SUPABASE_URL + '/rest/v1/ph_cart?on_conflict=user_id', {
        method: 'POST', keepalive: true,
        headers: (function (h) { h.Prefer = 'resolution=merge-duplicates,return=minimal'; return h; })(hdr(s)),
        body: JSON.stringify({ user_id: s.uid, items: o })
      }).then(function (r) { return done(r.ok); }, function () { return done(false); });
    } catch (e) { return Promise.resolve(done(false)); }
  }
  // 서버 줄을 지운다(결제 끝). 실패해도 결제 확인 함수(ph-pay-confirm)가 서버에서 한 번 더 지운다.
  function remove() {
    var s = session();
    if (!live(s)) return Promise.resolve(false);
    seq++;
    try {
      return fetch(C().SUPABASE_URL + '/rest/v1/ph_cart?user_id=eq.' + encodeURIComponent(s.uid), {
        method: 'DELETE', keepalive: true, headers: hdr(s)
      }).then(function (r) { return r.ok; }, function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }
  // 서버 줄을 끌어와 거울에 적는다.
  //   DIRTY 면(서버에 못 올린 변경이 있으면) 합친다 — 거울의 수량이 이기고, 서버에만 있는 상품은 살린다 — 그리고 올린다.
  //   아니면 서버 것이 거울을 대신한다(다른 기기에서 바꾼 것이 여기 온다).
  function pull() {
    var s = session();
    if (!live(s)) return Promise.resolve(false);
    var my = ++seq;
    return fetch(C().SUPABASE_URL + '/rest/v1/ph_cart?select=items&user_id=eq.' + encodeURIComponent(s.uid), { headers: hdr(s) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!Array.isArray(rows)) return false;                 // 못 읽었다(401 등). 거울은 그대로.
        if (my !== seq || inflight > 0) return false;           // 그 사이 올린 게 있다 — 그쪽이 더 새 것
        var srv = clean(rows[0] && rows[0].items);
        if (isDirty()) {
          var loc = read(), merged = srv;
          for (var k in loc) merged[k] = loc[k];
          write(merged);                                        // 합친 것을 올린다(push 가 DIRTY 를 푼다)
          return true;
        }
        write(srv, { local: true });
        return true;
      }, function () { return false; });
  }
  // 로그인 상태면 서버와 맞춘다. 장바구니·결제 화면은 그리기 전에 이걸 기다린다.
  function sync() {
    if (!signedIn()) { clear(); return Promise.resolve(false); }
    return pull();
  }

  // 다른 탭에서 담아도 이 탭 숫자가 따라간다
  w.addEventListener('storage', function (e) { if (e.key === KEY) paint(); });
  document.addEventListener('DOMContentLoaded', function () { ownerGate(); paint(); if (signedIn()) sync(); });

  w.PH_CART = { read: read, add: add, set: set, clear: clear, count: count, paint: paint,
                syncOwner: syncOwner, ownerGate: ownerGate, signedIn: signedIn, sync: sync,
                pending: pending, applyPending: applyPending, discardPending: discardPending, info: info,
                KEY: KEY, OWNER: OWNER, DIRTY: DIRTY };
})(window);
