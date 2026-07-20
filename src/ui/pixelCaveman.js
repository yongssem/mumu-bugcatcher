// 도스게임풍 픽셀 원시인 — 삐죽 머리 + 큰 웃음 + 근육질 + 몽둥이 + 나뭇잎 팬티
// 저해상도 그리드(GRID_W×GRID_H)에 fillRect로 그리고, 캔버스는 NearestNeighbor로 확대해 픽셀감 유지
export const GRID_W = 70
export const GRID_H = 82

const PAL = {
  out: '#2a1608',   // 외곽선(짙은 갈색)
  sk: '#E7A86E', skD: '#C6844C', skL: '#F5C892', // 피부
  hair: '#241608', hairL: '#4a2e14',
  eyeW: '#fbf6ea', pup: '#1a120a',
  mouth: '#7a2320', tooth: '#fbf6ea', tongue: '#d1685f',
  loin: '#F2C14E', loinD: '#C99A22', loinL: '#FBD87A',
  wood: '#8a5a30', woodD: '#67421f', woodL: '#a9793f',
  nail: '#efe6cf',
}

// 원시인 한 마리를 그리드 좌표에 그린다 (ctx는 1유닛=1픽셀 좌표계)
export function drawCaveman(ctx) {
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }

  // ---------- 몽둥이 (오른손 위로) ----------
  // 자루(대각) — 손에서 위로
  for (let i = 0; i < 12; i++) P(44 + i, 30 - i, 4, 4, PAL.wood)
  for (let i = 0; i < 12; i++) P(45 + i, 30 - i, 2, 2, PAL.woodL)
  // 뭉툭한 머리(옹이)
  P(52, 6, 14, 16, PAL.wood)
  P(54, 4, 10, 4, PAL.wood)
  P(50, 10, 4, 10, PAL.wood)
  P(64, 9, 3, 9, PAL.wood)
  P(54, 8, 5, 5, PAL.woodL); P(60, 14, 4, 4, PAL.woodL) // 하이라이트
  P(55, 16, 4, 3, PAL.woodD); P(51, 12, 3, 4, PAL.woodD) // 옹이 음영
  ctxOutline(ctx, 50, 4, 17, 19) // 몽둥이 외곽 대략

  // ---------- 머리카락 (삐죽삐죽) ----------
  P(17, 8, 30, 10, PAL.hair)
  // 위 스파이크
  const spikes = [[16, 3], [21, 1], [27, 0], [33, 1], [39, 2], [44, 4]]
  for (const [x, y] of spikes) { P(x, y, 5, 9, PAL.hair) }
  // 옆 스파이크
  P(13, 12, 5, 10, PAL.hair); P(46, 12, 5, 9, PAL.hair)
  P(20, 4, 3, 4, PAL.hairL); P(32, 3, 3, 4, PAL.hairL)

  // ---------- 머리(피부) ----------
  P(18, 14, 28, 20, PAL.sk)
  P(16, 18, 4, 12, PAL.sk); P(44, 18, 4, 12, PAL.sk) // 볼
  P(18, 30, 28, 5, PAL.skD) // 턱 밑 음영
  P(42, 16, 4, 14, PAL.skD) // 오른뺨 음영
  // 귀
  P(14, 22, 4, 6, PAL.sk); P(46, 22, 4, 6, PAL.sk)
  P(14, 24, 2, 3, PAL.skD); P(48, 24, 2, 3, PAL.skD)

  // ---------- 눈썹 ----------
  P(20, 15, 9, 3, PAL.hair); P(35, 15, 9, 3, PAL.hair)

  // ---------- 눈(큰 만화눈) ----------
  P(21, 18, 9, 8, PAL.eyeW); P(34, 18, 9, 8, PAL.eyeW)
  P(25, 20, 4, 5, PAL.pup); P(35, 20, 4, 5, PAL.pup) // 동공(안쪽 몰림)
  P(26, 21, 1, 1, PAL.eyeW); P(36, 21, 1, 1, PAL.eyeW) // 반짝

  // ---------- 코 ----------
  P(30, 24, 4, 4, PAL.skD); P(31, 24, 2, 2, PAL.skL)

  // ---------- 큰 웃음(입) ----------
  P(23, 28, 18, 6, PAL.mouth)      // 입 안(빨강)
  P(23, 28, 18, 2, PAL.tooth)      // 윗니 줄
  P(26, 32, 12, 2, PAL.tooth)      // 아랫니
  P(30, 31, 6, 2, PAL.tongue)      // 혀
  P(22, 28, 2, 6, PAL.skD); P(40, 28, 2, 6, PAL.skD) // 입가

  // ---------- 목 ----------
  P(27, 34, 10, 5, PAL.sk); P(27, 37, 10, 2, PAL.skD)

  // ---------- 몸통(근육질) ----------
  P(16, 39, 32, 20, PAL.sk)
  // 가슴근(2덩이) + 음영
  P(18, 41, 12, 8, PAL.skL); P(34, 41, 12, 8, PAL.skL)
  P(30, 41, 4, 10, PAL.skD) // 가운데 골
  P(18, 48, 28, 2, PAL.skD) // 가슴 밑선
  // 복근
  P(24, 51, 16, 8, PAL.sk)
  P(31, 51, 2, 8, PAL.skD); P(24, 54, 16, 1, PAL.skD)
  P(16, 44, 3, 12, PAL.skD); P(45, 44, 3, 12, PAL.skD) // 옆구리 음영

  // ---------- 왼팔(뻗음, 관객 왼쪽) ----------
  P(8, 42, 10, 8, PAL.sk)         // 어깨~위팔
  P(4, 46, 8, 8, PAL.sk)          // 아래팔
  P(2, 50, 6, 6, PAL.sk)          // 주먹
  P(8, 42, 3, 8, PAL.skD); P(3, 51, 5, 2, PAL.skD)
  P(11, 43, 4, 4, PAL.skL)        // 이두 하이라이트

  // ---------- 오른팔(몽둥이 들어올림, 관객 오른쪽) ----------
  P(44, 34, 9, 9, PAL.sk)         // 어깨
  for (let i = 0; i < 7; i++) P(46 + i, 34 - i, 7, 6, PAL.sk) // 위팔 대각 위로
  P(50, 28, 7, 7, PAL.sk)         // 주먹(몽둥이 자루 감쌈)
  P(45, 34, 3, 8, PAL.skD)
  P(47, 33, 4, 4, PAL.skL)        // 이두 하이라이트

  // ---------- 나뭇잎 팬티 ----------
  P(16, 58, 32, 8, PAL.loin)
  P(16, 58, 32, 2, PAL.loinL)     // 윗단
  // 톱니 아랫단(나뭇잎)
  for (let x = 16; x < 48; x += 4) P(x, 66, 3, 3, PAL.loin)
  for (let x = 18; x < 48; x += 4) P(x, 66, 3, 5, PAL.loinD)
  // 점무늬
  P(22, 61, 2, 2, PAL.loinD); P(30, 62, 2, 2, PAL.loinD); P(38, 61, 2, 2, PAL.loinD)

  // ---------- 다리(성큼) ----------
  // 왼다리(앞)
  P(20, 66, 9, 14, PAL.sk)
  P(20, 66, 3, 14, PAL.skD)
  P(18, 79, 12, 3, PAL.skD)       // 발
  // 오른다리(뒤, 약간 굽힘)
  P(35, 66, 9, 13, PAL.sk)
  P(35, 66, 3, 13, PAL.skD)
  P(35, 79, 12, 3, PAL.skD)       // 뒷발
}

// 아주 단순한 외곽 강조(생략 가능) — 몽둥이 덩어리 테두리만 살짝
function ctxOutline() { /* no-op: 픽셀 블록 자체로 충분 */ }

// 캔버스에 원시인을 픽셀 확대해 그린다. dpr 고려, 그림자 옵션
export function renderCavemanCanvas(canvas, scale = 6) {
  const w = GRID_W * scale, h = GRID_H * scale
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, GRID_W, GRID_H)
  drawCaveman(ctx)
}
