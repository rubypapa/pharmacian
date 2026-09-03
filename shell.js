// ★Supabase 클라이언트는 한 페이지에 ★하나만 만든다.
//   페이지마다 createClient 를 부르면 같은 storage key 를 여러 인스턴스가 잡고,
//   그 상태에서 getSession() 이 ★영영 안 끝난다(2026-09-01 실측: orders.html 이 "불러오는 중…"에서 멈췄고
//   getSession 이 6초 넘게 응답하지 않았다. 콘솔 경고 "Multiple GoTrueClient instances detected").
//   ★어느 페이지든 PH_SB() 로 받아 쓴다.
(function (w) {
  var _sb = null;
  w.PH_SB = function () {
    if (_sb) return _sb;
    var C = w.PHARMACIAN || {};
    if (!(w.supabase && C.SUPABASE_URL && C.SUPABASE_ANON)) return null;
    _sb = w.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON);
    return _sb;
  };
})(window);

// 몰 공용 껍데기. 어느 화면에서도 같은 머리·같은 색이 나오게 한다.
//
// 왜 만들었나: 장바구니나 가입을 누르면 상단 메뉴가 통째로 사라지고 색까지 바뀌었다.
//   홈이 세 벌(브랜드형·영상판·판매형)이라 어디서 왔는지 기억해야 돌아갈 곳과 색이 정해진다.
//
// 홈에서는  PH_SHELL.remember()  를 부르고,
// 하위 화면에서는 <div data-shell></div> 만 두면 여기서 머리를 그린다.
(function (w, d) {
  var HOME_KEY = 'ph_home', SKIN_KEY = 'ph_skin';
  // ★루트(index.html)가 판매형이다(2026-08-21 대표 결정). 나머지 둘은 주소로만 남는다.
  var SKIN = { 'index.html': 'b', 'index-b.html': 'b', 'index-a.html': 'a', 'index-v.html': 'a' };

  function file() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }
  function home() {
    try { return localStorage.getItem(HOME_KEY) || './'; } catch (e) { return './'; }
  }
  function skin() {
    try { return localStorage.getItem(SKIN_KEY) || 'b'; } catch (e) { return 'b'; }
  }

  // 홈이 자기를 기록한다. 하위 화면이 이걸 보고 돌아갈 곳과 색을 정한다.
  function remember() {
    var f = file(), s = SKIN[f];
    if (!s) return;
    try { localStorage.setItem(HOME_KEY, f); localStorage.setItem(SKIN_KEY, s); } catch (e) {}
    d.documentElement.setAttribute('data-skin', s);
  }

  // 판매형 메뉴는 분류 필터다. 홈으로 돌아가면서 그 분류를 켜야 하므로 ?f= 로 넘긴다.
  // ★홈(index.html)의 메뉴와 ★같아야 한다. 2026-09-03 루비 지시로 홈에서 「10개 특가」·「이벤트」를 뺐고
  //   「미백」을 제품 영문명 MELALESS 로 바꿨다. 여기만 옛 메뉴로 남아 있으면 서브페이지에서 딴 메뉴가 뜬다.
  var MENU_B = [
    { t: '오픈특가💥', f: '전체', hot: true },
    { t: 'PDRN', f: 'PDRN' },
    { t: 'NMN', f: 'NMN' },
    { t: 'MELALESS', f: '미백' }        // ★필터 키는 카드의 data-tag 와 짝이라 '미백' 그대로다
  ];
  var MENU_A = [
    { t: 'COLLECTION', hash: '#collection' },
    { t: 'RITUAL', hash: '#sec-ritual' }
  ];

  function paint() {
    var host = d.querySelector('[data-shell]');
    if (!host) return;
    var s = skin(), h = home();
    d.documentElement.setAttribute('data-skin', s);

    var items = (s === 'b' ? MENU_B : MENU_A).map(function (m) {
      var href = m.hash ? (h + m.hash) : (h + '?f=' + encodeURIComponent(m.f) + '#sec-all');
      return '<a href="' + href + '"' + (m.hot ? ' class="hot"' : '') + '>' + m.t + '</a>';
    }).join('');

    // ★맨 위 띠는 2026-09-03 루비 지시로 홈에서 걷어냈다. 서브페이지에만 남으면 화면마다 달라 보인다.
    var band = '';
    var here = file();
    var loginLabel = (s === 'a') ? 'LOGIN' : '로그인';
    var cartLabel = (s === 'a') ? 'CART' : '장바구니';

    host.outerHTML =
      band +
      '<header class="sh-head"><div class="sh-in">' +
        '<a class="sh-logo" href="' + h + '">PHARMACIAN</a>' +
        '<nav class="sh-nav">' + items + '</nav>' +
        '<div class="sh-util">' +
          // ★로그인한 사람에게만 보인다. auth() 가 hidden 을 푼다.
          '<a class="u-orders" href="orders.html" hidden' + (here === 'orders.html' ? ' aria-current="page"' : '') + '>' +
            ((s === 'a') ? 'MY ORDERS' : '내 주문') + '</a>' +
          '<a class="u-auth" data-login="' + loginLabel + '" href="join.html">' + loginLabel + '</a>' +
          '<a href="cart.html"' + (here === 'cart.html' ? ' aria-current="page"' : '') + '>' +
            cartLabel + ' <b data-cart-count hidden></b></a>' +
        '</div>' +
      '</div></header>';

    if (w.PH_CART) PH_CART.paint();
    auth();
  }

  // 로그인 상태를 머리에 반영한다. 로그인했으면 같은 자리가 로그아웃이 된다.
  function auth() {
    var C = w.PHARMACIAN || {};
    if (!(w.supabase && C.SUPABASE_URL)) return;
    var sb = PH_SB();
    function put(u) {
      // ★화면을 열 때마다 장바구니 주인을 맞춰 본다. 로그아웃 이벤트를 놓쳐도 여기서 정리된다.
      if (w.PH_CART && PH_CART.syncOwner) PH_CART.syncOwner(u ? u.id : null);
      // 이미 로그인한 사람에게 "1초 가입"을 보여줄 이유가 없다
      var cta = d.getElementById('joincta');
      if (cta) cta.hidden = !!u;
        // ★내 주문은 로그인한 사람에게만. 비로그인에게 보여주면 눌러도 로그인 화면만 나온다.
        [].slice.call(d.querySelectorAll('.u-orders')).forEach(function (a) { a.hidden = !u; });
      [].slice.call(d.querySelectorAll('.u-auth')).forEach(function (a) {
        var en = (a.getAttribute('data-login') || '로그인') === 'LOGIN';
        a.textContent = u ? (en ? 'LOGOUT' : '로그아웃') : (en ? 'LOGIN' : '로그인');
        a.setAttribute('href', u ? '#' : 'join.html');
        a.onclick = u ? function (e) { e.preventDefault(); sb.auth.signOut(); } : null;
      });
    }
    sb.auth.getSession().then(function (r) { put(r.data.session && r.data.session.user); });
    sb.auth.onAuthStateChange(function (e, s) {
      // ★로그아웃하면 담아둔 것도 지운다(2026-08-23 루비 지시).
      //   공용 PC에서 다음 사람에게 앞사람 장바구니가 남으면 안 된다.
      //   SIGNED_OUT 은 실제로 로그아웃할 때만 온다 — 비로그인 손님이 담아둔 것은 건드리지 않는다.
      if (e === 'SIGNED_OUT' && w.PH_CART) PH_CART.clear();   // 즉시 반응(주인 대조는 put 이 또 한다)
      put(s && s.user);
    });
  }

  // 홈으로 돌아왔을 때 ?f= 가 있으면 그 분류를 켠다
  function applyFilterFromQuery() {
    var m = /[?&]f=([^&#]+)/.exec(location.search);
    if (!m) return;
    var f = decodeURIComponent(m[1]);
    var btn = d.querySelector('.tabs button[data-f="' + f + '"]');
    if (btn) btn.click();
  }

  w.PH_SHELL = { remember: remember, paint: paint, home: home, skin: skin,
                 applyFilterFromQuery: applyFilterFromQuery };

  d.addEventListener('DOMContentLoaded', function () {
    if (SKIN[file()]) { remember(); applyFilterFromQuery(); auth(); }
    else paint();
  });
})(window, document);
