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

  // Supabase (리전 = Northeast Asia / Seoul, ap-northeast-2) — ODEAL과 같은 프로젝트를 쓴다.
  // 표·함수만 ph_ 접두어로 분리했다(ph_product_price · ph_orders · ph-order-create · ph-pay-confirm).
  SUPABASE_URL: "https://rkzcclmcqnyzkyvmovft.supabase.co",
  SUPABASE_ANON: "sb_publishable_3jpxigblPdd5vhdv3nvmCQ_ZBs2nWle",

  // ★판매 방식 스위치. 'reserve' = 예약만 받는다(돈을 안 받는다) / 'live' = 실제 결제.
  //   토스 전자결제 심사가 끝나면 이 한 줄을 'live'로 바꾸고 아래 TOSS_CLIENT를 라이브 키로 갈면 된다.
  //   ★예약으로 두는 이유 = 전상법 24조. 계좌로 미리 돈을 받으면 에스크로 가입 의무가 생긴다.
  //   예약은 돈이 안 오가서 그 의무가 아예 생기지 않는다(2026-08-21 루비 결정).
  SALE_MODE: "live",

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
    GA4: "",                  // GA4 측정 ID (예: G-XXXXXXXXXX) — 아직 속성을 안 만들었다
    // ★구글애즈 계정 259-469-1468 · 전환 액션 「구매」(2026-09-22 개설).
    //   코드 수동 · 이벤트 스니펫 · 전환별 다른 가치 · 매회 — track.js:120~123 과 짝이다.
    //   구글이 준 스니펫 : send_to: 'AW-18437504704/EsbOCMj9joEdEMD919dE'
    GADS: "AW-18437504704",
    GADS_PURCHASE_LABEL: "EsbOCMj9joEdEMD919dE",
  },
};
