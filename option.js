// 구성 고르기. 「1개 / 3개」 같은 단추를 만들고, 고르면 ★가격 표시와 ★담길 품목이 같이 바뀐다.
// 값은 config.js 의 PHARMACIAN.OPTIONS 한 곳에만 있다 — 화면에 값을 또 적지 않는다.
// ★실제 청구 금액은 서버(ph-order-create)가 ph_product_price 로 정한다. 여기 숫자는 보여주기다.
(function (w, d) {
  var CSS = '.phopt{display:flex;gap:8px;margin:22px auto 0;max-width:460px;flex-wrap:wrap}' +
    '.phopt-b{flex:1 1 140px;padding:12px 10px;border-radius:10px;cursor:pointer;font:inherit;' +
    'border:1.5px solid rgba(255,255,255,.34);background:transparent;color:#fff;' +
    'display:flex;flex-direction:column;gap:4px;align-items:center;transition:border-color .15s,background .15s}' +
    '.phopt-b b{font-size:16px;font-weight:800;letter-spacing:-.01em}' +
    '.phopt-b span{font-size:12.5px;opacity:.82;line-height:1.35;text-align:center}' +
    '.phopt-b.on{border-color:#fff;background:rgba(255,255,255,.15)}';

  function 원(n) { return n.toLocaleString('ko-KR'); }

  w.PH_OPTION = {
    // base   = 이 상품의 기본 키(p7·p12·nmn·mel)
    // o.before = 단추 줄을 이 요소 ★앞에 끼운다
    // o.price  = 큰 가격 글자 / o.priceTail = 그 뒤에 붙는 「원」 조각
    // o.rows   = 판매가·배송비·실결제 세 줄  / o.sub = 배송 안내 한 줄
    mount: function (base, o) {
      var C = w.PHARMACIAN || {}, list = (C.OPTIONS || {})[base];
      if (!list || list.length < 2) return;
      var FREE = C.FREE_SHIP_OVER || 50000, SHIP = 3000;
      var anchor = d.querySelector(o.before);
      if (!anchor) return;

      var st = d.createElement('style'); st.textContent = CSS; d.head.appendChild(st);

      var box = d.createElement('div');
      box.className = 'phopt';
      // ★배치는 ★인라인으로 박는다. 상세 페이지마다 「이 구역 안 요소는 margin 0」 같은 규칙이 있어서
      //   나중에 붙인 <style> 이 특이도에서 밀린다(실측 : margin-top 22px → 0 이 돼 글자에 붙었다).
      box.style.cssText = 'display:flex;gap:8px;margin:22px auto 0;max-width:460px;flex-wrap:wrap';
      box.innerHTML = list.map(function (v, i) {
        return '<button type="button" class="phopt-b' + (i ? '' : ' on') + '" data-i="' + i + '">' +
          '<b>' + v.label + '</b><span>' + 원(v.price) + '원' +
          (v.n > 1 ? '<br>1개당 ' + 원(Math.floor(v.price / v.n)) + '원' : '') + '</span></button>';
      }).join('');
      anchor.parentNode.insertBefore(box, anchor);

      function 고른다(i) {
        var v = list[i], 배송 = v.price >= FREE ? 0 : SHIP;
        [].forEach.call(box.children, function (b, j) { b.classList.toggle('on', i === j); });
        // ★담길 품목을 바꾼다. 가격 옆 단추와 하단 고정바가 같이 바뀐다.
        [].forEach.call(d.querySelectorAll('[data-buy]'), function (b) { b.setAttribute('data-buy', v.sku); });

        var el = o.price && d.querySelector(o.price);
        if (el) el.innerHTML = 원(v.price) + (o.priceTail || '<small>원</small>');

        var r = o.rows ? d.querySelectorAll(o.rows) : [];
        if (r.length >= 3) {
          r[0].lastElementChild.textContent = 원(v.price) + '원';
          r[1].lastElementChild.textContent = 배송 ? 원(배송) + '원' : '무료';
          r[2].lastElementChild.textContent = 원(v.price + 배송) + '원';
        }
        var s = o.sub && d.querySelector(o.sub);
        if (s) s.textContent = 배송 ? ('배송비 ' + 원(배송) + '원 · ' + 원(FREE) + '원 이상 무료배송')
                                    : '무료배송';
        // ★묶음은 이미 깎인 값이라 첫 구매 쿠폰이 안 붙는다. 손님이 결제창에서 처음 알면 안 된다.
        var nt = o.note && d.querySelector(o.note);
        if (nt) nt.textContent = v.n > 1
          ? '무료배송입니다. 이미 값을 낮춘 구성이라 첫 구매 15% 쿠폰은 함께 쓰지 않습니다.'
          : '50,000원 이상 무료배송 · 첫 구매 15% 쿠폰은 장바구니에서 적용하십니다.';
      }

      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.phopt-b');
        if (b) 고른다(+b.getAttribute('data-i'));
      });
      고른다(0);
    }
  };
})(window, document);
