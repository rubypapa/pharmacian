// 장바구니. 서버를 쓰지 않고 이 브라우저에만 담아둔다.
// 금액은 여기서 정하지 않는다 - 회원 가격표(ph_product_price)와 주문 금액은 서버가 정한다.
// 담는 것은 "무엇을 몇 개"까지다.
(function (w) {
  var KEY = 'ph_cart_v1';
  var VALID = ['p7', 'p12', 'nmn', 'mel'];

  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}');
      var out = {};
      VALID.forEach(function (k) {
        var n = parseInt(o[k], 10);
        if (n > 0) out[k] = Math.min(n, 99);       // 상한을 둬야 이상한 값이 결제로 안 넘어간다
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
    var o = read();
    o[key] = Math.min((o[key] || 0) + (qty || 1), 99);
    write(o);
  }
  function set(key, qty) {
    var o = read();
    if (qty > 0) o[key] = Math.min(qty, 99); else delete o[key];
    write(o);
  }
  function clear() { write({}); }

  // 헤더의 장바구니 개수를 칠한다
  function paint() {
    var n = count();
    [].slice.call(document.querySelectorAll('[data-cart-count]')).forEach(function (e) {
      e.textContent = n ? String(n) : '';
      e.hidden = !n;
    });
  }

  // 다른 탭에서 담아도 이 탭 숫자가 따라간다
  w.addEventListener('storage', function (e) { if (e.key === KEY) paint(); });
  document.addEventListener('DOMContentLoaded', paint);

  w.PH_CART = { read: read, add: add, set: set, clear: clear, count: count, paint: paint, KEY: KEY };
})(window);
