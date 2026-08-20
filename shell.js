// 몰 공용 껍데기. 어느 화면에서도 같은 머리·같은 색이 나오게 한다.
//
// 왜 만들었나: 장바구니나 가입을 누르면 상단 메뉴가 통째로 사라지고 색까지 바뀌었다.
//   홈이 세 벌(브랜드형·영상판·판매형)이라 어디서 왔는지 기억해야 돌아갈 곳과 색이 정해진다.
//
// 홈에서는  PH_SHELL.remember()  를 부르고,
// 하위 화면에서는 <div data-shell></div> 만 두면 여기서 머리를 그린다.
(function (w, d) {
  var HOME_KEY = 'ph_home', SKIN_KEY = 'ph_skin';
  var SKIN = { 'index-a.html': 'a', 'index-v.html': 'a', 'index-b.html': 'b' };

  function file() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }
  function home() {
    try { return localStorage.getItem(HOME_KEY) || 'index-b.html'; } catch (e) { return 'index-b.html'; }
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
  var MENU_B = [
    { t: '오픈특가', f: '오픈특가', hot: true },
    { t: '전 제품', f: '전체' },
    { t: 'PDRN', f: 'PDRN' },
    { t: 'NMN', f: 'NMN' },
    { t: '미백', f: '미백' },
    { t: '이벤트', hash: '#sec-set' }
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

    var band = (s === 'b')
      ? '<div class="sh-band">30,000원 이상 무료배송 · 신규회원 5,000원 쿠폰 즉시 지급</div>' : '';
    var here = file();
    var loginLabel = (s === 'a') ? 'LOGIN' : '로그인';
    var cartLabel = (s === 'a') ? 'CART' : '장바구니';

    host.outerHTML =
      band +
      '<header class="sh-head"><div class="sh-in">' +
        '<a class="sh-logo" href="' + h + '">PHARMACIAN</a>' +
        '<nav class="sh-nav">' + items + '</nav>' +
        '<div class="sh-util">' +
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
    var sb = w.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON);
    function put(u) {
      [].slice.call(d.querySelectorAll('.u-auth')).forEach(function (a) {
        var en = (a.getAttribute('data-login') || '로그인') === 'LOGIN';
        a.textContent = u ? (en ? 'LOGOUT' : '로그아웃') : (en ? 'LOGIN' : '로그인');
        a.setAttribute('href', u ? '#' : 'join.html');
        a.onclick = u ? function (e) { e.preventDefault(); sb.auth.signOut(); } : null;
      });
    }
    sb.auth.getSession().then(function (r) { put(r.data.session && r.data.session.user); });
    sb.auth.onAuthStateChange(function (_e, s) { put(s && s.user); });
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
    if (SKIN[file()]) { remember(); applyFilterFromQuery(); }
    else paint();
  });
})(window, document);
