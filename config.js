// PHARMACIAN 연동 키. ★공개돼도 되는 값만 둔다. secret 키·REST API 키는 절대 여기 두지 않는다.
// 카카오·구글 클라이언트 정보는 여기가 아니라 Supabase 대시보드(Authentication > Providers)에 넣는다.
window.PHARMACIAN = {
  // ★사이트 도메인. 도메인이 정해지면 ★이 한 곳만 바꾼다(다른 파일은 이 값을 참조한다).
  //   같은 값을 deploy/CNAME 에도 적어야 한다(그 파일엔 도메인 한 줄만. www·https:// 없이).
  //   아직 도메인이 없어서 자리표시를 넣어뒀다.
  SITE_DOMAIN: "pharmacian.kr",

  // ★무료배송 문턱(원). 상품합계가 이 값 이상이면 배송비 0.
  //   서버(ph-order-create)의 FREE_SHIP_OVER와 반드시 같아야 화면·결제 금액이 일치한다.
  FREE_SHIP_OVER: 50000,
  // ★첫 구매 쿠폰을 못 쓰는 단품 키(2026-10-01 루비). 묶음(x2·x3)·세트는 원래 제외. 서버 NO_COUPON 과 같아야 한다.
  NO_COUPON: ['p7'],

  // ★구성(옵션). 상세 화면에서 고르면 가격과 담길 품목이 같이 바뀐다(option.js).
  //   ★여기 값은 ★보여주기용이다 — 실제 청구 금액은 서버가 ph_product_price 로 계산한다.
  //   그래서 이 표와 DB 가 어긋나면 안 된다. 값 출처 = 루비 2026-09-22 지시:
  //     7000 단품 22,000 / 3개 58,700 · 멜라리스 단품 22,000 / 3개 58,700
  //     12000 단품 39,000 / 1+1 59,000 · NMN 단품 39,000 / 1+1 59,000
  //   ★2026-09-28 루비 지시 「상품 가격 만원씩 전부 동일하게 올려」 → 8 SKU 전부 +10,000 (단품·묶음 동일 가산). ★같은 날 정정 : p7·mel 단품 39,000 (루비 「7000 크림이랑 멜라리스는 39000원으로」).
  //   ★2026-09-28 묶음 재계산(루비 「기존 요율에 맞춰 변동 · 반올림 안」) : 09-22 비율 유지 — 3개 = 단품×3×(58,700/66,000)=104,059→104,000 · 1+1 = 단품×2×(59,000/78,000)=74,128→74,000.
  //   묶음은 ★첫 구매 15% 쿠폰에서 빠진다(이미 깎은 값이다). 판정은 서버가 한다 — 키가 x2·x3 로 끝나면 제외.
  OPTIONS: {
    // ★2026-10-01 루비 「pdrn 7000만 19800원 배송비무료로 구글광고 · 할인쿠폰은 pdrn 7000만 못쓰도록」 → p7 단품 = 19,800 · 무료배송(ship 0) · 첫 구매 쿠폰 제외.
    //   ship 0 = 이 상품은 혼자 담아도 무료배송. noCoupon = 첫 구매 쿠폰 계산에서 뺀다(서버 ph-order-create NO_COUPON 과 같아야 한다).
    p7:  [{ sku: 'p7',    n: 1, price: 19800, label: '1개', ship: 0, noCoupon: true },
          { sku: 'p7x3',  n: 3, price: 52500, label: '3개' }],   // ★2026-10-01 루비 「3개 52500원으로해」(단품 19,800 뒤 · 1개당 17,500)
    mel: [{ sku: 'mel',   n: 1, price: 39000, label: '1개' },
          { sku: 'melx3', n: 3, price: 104000, label: '3개' }],
    p12: [{ sku: 'p12',   n: 1, price: 49000, label: '1개' },
          { sku: 'p12x2', n: 2, price: 74000, label: '1+1 (2개)' }],
    nmn: [{ sku: 'nmn',   n: 1, price: 49000, label: '1개' },
          { sku: 'nmnx2', n: 2, price: 74000, label: '1+1 (2개)' }],
  },

  // Supabase (리전 = Northeast Asia / Seoul, ap-northeast-2) — ODEAL과 같은 프로젝트를 쓴다.
  // 표·함수만 ph_ 접두어로 분리했다(ph_product_price · ph_orders · ph-order-create · ph-pay-confirm).
  SUPABASE_URL: "https://rkzcclmcqnyzkyvmovft.supabase.co",
  SUPABASE_ANON: "sb_publishable_3jpxigblPdd5vhdv3nvmCQ_ZBs2nWle",

  // ★예약(reserve) 모드는 2026-09-28 루비 지시로 걷어냈다 — 결제단이 붙었으니 예약 흐름은 없다.

  // 토스페이먼츠 클라이언트 키. ★공개 키다(결제창을 띄우는 용도).
  // 시크릿 키는 여기 없다 — Supabase 함수 환경변수(PG_SECRET_KEY)에만 있다.
  // 지금 값 = 토스 공식 문서에 공개된 "문서용 테스트 키". 계약 후 라이브 키로 바꾼다.
  TOSS_CLIENT: "live_gck_vZnjEJeQVxmRzejmJRgqrPmOoBN0",

  // ★결제위젯 UI 이름(variantKey). 토스 상점관리자 「결제 UI 설정」에서 만든 것과 같아야 한다.
  //   2026-09-22 : MID pharmavb1n 전용 라이브 UI 를 따로 만들었다(기존 DEFAULT 는 pharma4maw 것이라 안 건드렸다).
  TOSS_VARIANT: "PHARMACIAN",

  // 광고 전환 추적. ★비워두면 스크립트를 아예 로드하지 않는다(광고 안 켰는데 남 서버로 나가는 일 방지).
  // 여기 값은 전부 공개돼도 되는 식별자다. 서버 전송용 토큰은 함수 환경변수에만 둔다.
  TRACK: {
    META_PIXEL: "1800055334501354",   // ★데이터 세트 「파머시안 웹」(2026-09-22 개설).
                              //   같은 비즈니스의 ODEAL 웹(2298654217651546)과 ★따로 둔다 — 한 픽셀을 같이 쓰면
                              //   두 몰의 전환이 섞여 어느 쪽 광고가 판 건지 못 가른다.
    // ★GA4 속성 「파머시안 공식몰」(2026-09-22 개설) · 웹 스트림 15823724494 · 시간대 KST · 통화 KRW.
    //   track.js 가 이미 쏘고 있던 전자상거래 6종(view_item·add_to_cart·begin_checkout·
    //   purchase·sign_up·add_shipping_info)이 이 칸을 채워야 비로소 어딘가에 쌓인다.
    GA4: "G-C9GSPHXN3E",
    // ★구글애즈 계정 259-469-1468 · 전환 액션 「구매」(2026-09-22 개설).
    //   코드 수동 · 이벤트 스니펫 · 전환별 다른 가치 · 매회 — track.js:120~123 과 짝이다.
    //   구글이 준 스니펫 : send_to: 'AW-18437504704/EsbOCMj9joEdEMD919dE'
    GADS: "AW-18437504704",
    GADS_PURCHASE_LABEL: "EsbOCMj9joEdEMD919dE",
  },
};
