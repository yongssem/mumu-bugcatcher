// 복셀 월드 — 시드 기반 기본 지형 + 사용자가 바꾼 블록 델타만 관리
// 운동장(서쪽, 평지) + 파밍 월드(동쪽, 산·언덕) + 전 맵 지하 8층. 저장은 델타만

// 농촌 밭 구역 (World가 farmland 흙을, FieldDecor가 십자 작물을 배치)
// 🦕 동물원 연못 (수상공룡 서식지) — 수면 y=0
export const ZOO_POND = { x: 46, z: 22, r: 6, surfaceY: 0 }

export const FIELD_PLOTS = {
  wheat: { x0: 19, x1: 31, z0: 4, z1: 10 },   // 물가 옆 밀밭 (황금)
  corn: { x0: 40, x1: 58, z0: 8, z1: 20 },     // 옥수수밭 (키 큰 초록)
}

export const WORLD = {
  SIZE: 32,      // 운동장 32x32
  WALL_H: 3,     // 테두리 벽 높이
  FARM_X0: 33,   // 파밍 월드 시작 x
  FARM_X1: 64,   // 파밍 월드 끝 x
  X_MIN: -1,
  X_MAX: 65,     // 동쪽 바깥 벽
  Z_MIN: -1,
  Z_MAX: 32,
  GATE_Z0: 14,   // 운동장↔파밍 통로 (x=32 벽의 개구부)
  GATE_Z1: 17,
  DEPTH: 8,      // 지하 깊이 — y=-8이 기반암(안 부서짐)
  MAX_H: 6,      // 산 최고 높이
}

// 🗺️ 동물원 부지 확장 — 한 단계마다 동쪽으로 이만큼(기본 섬 폭)씩 땅이 늘어남
export const ZOO_EXPAND_W = 64

const key = (x, y, z) => `${x}_${y}_${z}`

// 시드 고정 PRNG — 같은 시드면 배치가 항상 동일
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class World {
  /**
   * @param seed 지형 시드
   * @param variant 'classic'(운동장+파밍) | 'village'(마을) | 'field'(농촌 사냥터)
   */
  constructor(seed, variant = 'classic', zooExpand = 0) {
    this.seed = seed
    this.variant = variant
    this.delta = new Map() // key → 블록타입 문자열 | null(부순 기본블록)
    this.onChange = null   // 블록 변경 콜백 (엔진이 메시 재생성 + 자동저장에 사용)
    this._hCache = new Map() // 지형 높이 캐시 (충돌 검사 핫패스)
    // 🗺️ 동물원 부지 확장 단계 — 동쪽 경계가 ZOO_EXPAND_W씩 늘어남 (땅이 실제로 넓어짐)
    this.zooExpand = variant === 'zoo' ? (zooExpand || 0) : 0
    this.zooEast = WORLD.X_MAX + this.zooExpand * ZOO_EXPAND_W
    this.extra =
      variant === 'village' ? this._genVillage()
        : variant === 'field' ? this._genField()
          : variant === 'zoo' ? this._genZoo()
            : this._genFarmFeatures()
  }

  // 동쪽 경계 — 동물원은 확장 단계에 따라 늘어나고, 그 외 변형은 고정
  xMax() {
    return this.variant === 'zoo' ? this.zooEast : WORLD.X_MAX
  }

  // 🗺️ 부지 확장 반영 — 동쪽 땅을 늘리고 해변·장식 재생성 후 메시 재빌드
  setZooExpand(n) {
    if (this.variant !== 'zoo') return false
    n = Math.max(0, n | 0)
    if (n === this.zooExpand) return false
    this.zooExpand = n
    this.zooEast = WORLD.X_MAX + n * ZOO_EXPAND_W
    this._hCache.clear()
    this.extra = this._genZoo() // 새 동쪽 해변 반영 (연못·야자수는 시드 고정이라 그대로)
    if (this.onChange) this.onChange() // 메시 재생성 + 저장 + 미니맵
    return true
  }

  // ---------- 시드 결정론 노이즈 ----------
  _hash2(x, z) {
    let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + (this.seed | 0)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }

  _hash3(x, y, z) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 2246822519) + Math.imul(z, 668265263) + (this.seed | 0)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }

  // 격자 보간 노이즈 (부드러운 언덕 모양)
  _smooth(x, z, cell) {
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell)
    const fx = x / cell - gx, fz = z / cell - gz
    const sx = fx * fx * (3 - 2 * fx) // smoothstep
    const sz = fz * fz * (3 - 2 * fz)
    const a = this._hash2(gx, gz), b = this._hash2(gx + 1, gz)
    const c = this._hash2(gx, gz + 1), d = this._hash2(gx + 1, gz + 1)
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz
  }

  // 지형 높이: 운동장 0(평지), 파밍 월드는 동쪽으로 갈수록 산 (통로 근처는 평평)
  // village 변형은 전체 평지. field(농촌)는 완만한 들판 + 물가 저지대
  _height(x, z) {
    if (this.variant === 'village' || this.variant === 'zoo') return 0 // 마을·동물원은 평지
    if (this.variant === 'field') {
      const k = `f${x}_${z}`
      if (this._hCache.has(k)) return this._hCache.get(k)
      // 남쪽 강가(z<4)는 낮게, 나머지는 완만한 둔덕(0~2)
      let h
      if (z <= 2) h = -1 // 강바닥
      else {
        const n = 0.6 * this._smooth(x, z, 16) + 0.4 * this._smooth(x + 50, z, 8)
        h = n > 0.72 ? 2 : n > 0.5 ? 1 : 0
        if (z <= 4) h = 0 // 강둑은 평평
      }
      this._hCache.set(k, h)
      return h
    }
    const k = `${x}_${z}`
    if (this._hCache.has(k)) return this._hCache.get(k)
    let h = 0
    const inFarm = x >= WORLD.FARM_X0 && x <= WORLD.FARM_X1 && z >= 0 && z < WORLD.SIZE
    if (inFarm) {
      const n = 0.65 * this._smooth(x, z, 9) + 0.35 * this._smooth(x, z, 5)
      // 가장자리(벽 근처)는 낮게
      const edge = Math.min(x - WORLD.FARM_X0, WORLD.FARM_X1 - x, z, WORLD.SIZE - 1 - z)
      let f = Math.max(0, Math.min(1, edge / 5))
      // 통로 앞은 평평하게 (진입로)
      if (z >= WORLD.GATE_Z0 - 2 && z <= WORLD.GATE_Z1 + 2) {
        f *= Math.max(0, Math.min(1, (x - 36) / 6))
      }
      h = Math.round(n * WORLD.MAX_H * f)
    }
    this._hCache.set(k, h)
    return h
  }

  // 지하 골드 광석: 깊을수록 확률 증가 (y=-1: 4.8% → y=-7: 9.6%)
  _isOre(x, y, z) {
    return this._hash3(x, y, z) < 0.04 + -y * 0.008
  }

  // ---------- 파밍 월드 지형지물 (나무·바위·모래·유적) ----------
  _genFarmFeatures() {
    const rand = mulberry32(this.seed)
    const extra = new Map()
    const put = (x, y, z, t) => extra.set(key(x, y, z), t)
    const occupied = new Set()

    const pick = (margin = 2) => {
      for (let i = 0; i < 20; i++) {
        const x = WORLD.FARM_X0 + 2 + Math.floor(rand() * (WORLD.FARM_X1 - WORLD.FARM_X0 - 3))
        const z = 2 + Math.floor(rand() * (WORLD.SIZE - 4))
        let ok = true
        for (let dx = -margin; dx <= margin && ok; dx++)
          for (let dz = -margin; dz <= margin; dz++)
            if (occupied.has(`${x + dx}_${z + dz}`)) { ok = false; break }
        if (!ok) continue
        for (let dx = -margin; dx <= margin; dx++)
          for (let dz = -margin; dz <= margin; dz++) occupied.add(`${x + dx}_${z + dz}`)
        return [x, z]
      }
      return null
    }

    // 나무 8그루 — 지형 높이 위에 심음
    for (let i = 0; i < 8; i++) {
      const p = pick(2); if (!p) continue
      const [x, z] = p
      const gh = this._height(x, z)
      const h = 3 + Math.floor(rand() * 2)
      for (let y = 1; y <= h; y++) put(x, gh + y, z, 'wood')
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) put(x + dx, gh + h + 1, z + dz, 'leaves')
      put(x, gh + h + 2, z, 'leaves')
    }

    // 바위 더미 5곳 — 가운데 돌 밑에 골드가 숨어있음 (캐는 재미)
    for (let i = 0; i < 5; i++) {
      const p = pick(1); if (!p) continue
      const [x, z] = p
      const gh = this._height(x, z)
      put(x, gh + 1, z, 'gold')
      put(x, gh + 2, z, 'stone')
      const n = 2 + Math.floor(rand() * 3)
      for (let j = 0; j < n; j++) {
        const dx = Math.floor(rand() * 3) - 1
        const dz = Math.floor(rand() * 3) - 1
        if (dx || dz) put(x + dx, this._height(x + dx, z + dz) + 1, z + dz, 'stone')
      }
    }

    // 모래밭 4곳 — 표면 잔디를 모래로 교체 (칸마다 지형 높이 반영)
    for (let i = 0; i < 4; i++) {
      const p = pick(1); if (!p) continue
      const [x, z] = p
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          if (rand() < 0.75) put(x + dx, this._height(x + dx, z + dz), z + dz, 'sand')
    }

    // 흙 언덕 3곳
    for (let i = 0; i < 3; i++) {
      const p = pick(1); if (!p) continue
      const [x, z] = p
      put(x, this._height(x, z) + 1, z, 'dirt')
      if (rand() < 0.6) put(x + 1, this._height(x + 1, z) + 1, z, 'dirt')
      if (rand() < 0.6) put(x, this._height(x, z + 1) + 1, z + 1, 'dirt')
    }

    // 무너진 벽돌 유적 1곳
    const p = pick(2)
    if (p) {
      const [x, z] = p
      for (const [dx, dz] of [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [2, 1]])
        put(x + dx, this._height(x + dx, z + dz) + 1, z + dz, 'brick')
      put(x, this._height(x, z) + 2, z, 'brick')
      put(x + 2, this._height(x + 2, z) + 2, z, 'brick')
    }

    return extra
  }

  // ---------- 마을 지형지물 (마인크래프트 마을풍) ----------
  // 흙길 · 돌기단+판자 박공지붕 집 · 울타리 친 밭(작물+물길) · 연못 · 건초 · 가로등 · 모닥불
  _genVillage() {
    const extra = new Map()
    const put = (x, y, z, t) => extra.set(key(x, y, z), t)
    const carve = (x, y, z) => extra.set(key(x, y, z), null) // 공기 (파내기)

    // 집 한 채 — 돌 모서리 + 나무 벽 + 창문 구멍 + 판자 계단식 지붕 (반너비 hw, 반깊이 hd)
    const house = (cx, cz, door = 'south', hw = 2, hd = 2) => {
      for (let dx = -hw; dx <= hw; dx++)
        for (let dz = -hd; dz <= hd; dz++) {
          const edge = Math.abs(dx) === hw || Math.abs(dz) === hd
          if (!edge) continue
          const corner = Math.abs(dx) === hw && Math.abs(dz) === hd
          const isDoor =
            (door === 'south' && dz === hd && dx === 0) ||
            (door === 'north' && dz === -hd && dx === 0) ||
            (door === 'east' && dx === hw && dz === 0) ||
            (door === 'west' && dx === -hw && dz === 0)
          // 창문: 문 없는 벽의 가운데 y2 한 칸 비움
          const isWindow =
            !corner && !isDoor && ((Math.abs(dz) === hd && dx === 0) || (Math.abs(dx) === hw && dz === 0))
          if (isDoor) continue
          put(cx + dx, 1, cz + dz, corner ? 'stone' : 'wood')
          if (!isWindow) put(cx + dx, 2, cz + dz, corner ? 'stone' : 'wood')
        }
      // 판자 지붕 — 계단식 (오버행 → 본체 → 능선)
      for (let dx = -hw - 1; dx <= hw + 1; dx++)
        for (let dz = -hd - 1; dz <= hd + 1; dz++) put(cx + dx, 3, cz + dz, 'plank')
      for (let dx = -hw + 1; dx <= hw - 1; dx++)
        for (let dz = -hd + 1; dz <= hd - 1; dz++) put(cx + dx, 4, cz + dz, 'plank')
      if (hw >= 2 && hd >= 2) for (let dz = -hd + 2; dz <= hd - 2; dz++) put(cx, 5, cz + dz, 'plank')
    }
    house(8, 8, 'south')          // 박사네
    house(24, 7, 'south', 3, 2)   // 대장간 (넓음)
    house(10, 24, 'north')
    house(26, 25, 'north', 2, 3)  // 촌장집 (깊음)
    house(42, 8, 'south')
    house(44, 24, 'north')

    // 흙길 — 동서 큰길(대문까지) + 남북 샛길 + 광장
    for (let x = 8; x < WORLD.X_MAX; x++) {
      put(x, 0, 15, 'path')
      put(x, 0, 16, 'path')
    }
    for (let z = 6; z <= 27; z++) {
      put(15, 0, z, 'path')
      put(16, 0, z, 'path')
    }
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -3; dz <= 3; dz++)
        if (Math.abs(dx) + Math.abs(dz) <= 4) put(16 + dx, 0, 16 + dz, 'path')

    // 모닥불 (광장 남쪽) — 돌 화덕 + 장작
    put(16, 1, 20, 'wood')
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(16 + dx, 1, 20 + dz, 'stone')

    // 🌾 밭 2곳 — 울타리 링 + 작물 줄 + 가운데 물길 (레퍼런스 무드)
    const farm = (x0, z0, w, d) => {
      for (let x = x0; x < x0 + w; x++)
        for (let z = z0; z < z0 + d; z++) {
          const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1
          if (edge) {
            put(x, 1, z, 'wood') // 울타리
          } else if (z === z0 + Math.floor(d / 2)) {
            carve(x, 0, z)
            put(x, -1, z, 'water') // 물길 (한 칸 아래)
          } else {
            put(x, 0, z, 'crop') // 갈아엎은 밭 + 새싹
          }
        }
    }
    farm(30, 20, 8, 5)
    farm(33, 8, 7, 5)

    // 💧 연못 (남서쪽) — 1칸 깊이 물 + 모래 테두리
    for (let x = 3; x <= 9; x++)
      for (let z = 21; z <= 27; z++) {
        const dx = x - 6, dz = z - 24
        const r = dx * dx + dz * dz
        if (r <= 6) {
          carve(x, 0, z)
          put(x, -1, z, 'water')
        } else if (r <= 10) {
          put(x, 0, z, 'sand')
        }
      }

    // 건초 더미 (밭 옆)
    put(28, 1, 22, 'hay'); put(28, 1, 23, 'hay'); put(28, 2, 22, 'hay')
    put(41, 1, 12, 'hay'); put(41, 2, 12, 'hay')

    // 🏮 가로등 — 큰길 양옆 (나무 기둥 + 금빛 등)
    for (const x of [26, 38, 50, 58]) {
      for (const z of [13, 18]) {
        put(x, 1, z, 'wood')
        put(x, 2, z, 'wood')
        put(x, 3, z, 'gold')
      }
    }

    // 나무 + 덤불
    const tree = (x, z) => {
      for (let y = 1; y <= 3; y++) put(x, y, z, 'wood')
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) put(x + dx, 4, z + dz, 'leaves')
      put(x, 5, z, 'leaves')
    }
    for (const [x, z] of [[3, 4], [3, 15], [16, 3], [22, 29], [32, 3], [50, 27], [54, 5], [58, 22], [47, 18]])
      tree(x, z)
    for (const [x, z] of [[12, 12], [20, 22], [36, 18], [52, 14], [29, 12], [6, 18]])
      put(x, 1, z, 'leaves') // 덤불

    // 🌳 생울타리 경계 (돌담 대신) — 잔디밭 가장자리, 동쪽 대문만 개방
    const W = WORLD.X_MAX - 1 // 64 (마지막 잔디 칸)
    const D = WORLD.SIZE - 1  // 31
    for (let x = 0; x <= W; x++) {
      for (const z of [0, D]) { put(x, 1, z, 'leaves'); put(x, 2, z, 'leaves') }
    }
    for (let z = 0; z <= D; z++) {
      put(0, 1, z, 'leaves'); put(0, 2, z, 'leaves') // 서쪽
      if (z < WORLD.GATE_Z0 || z > WORLD.GATE_Z1) {   // 동쪽 (대문 제외)
        put(W, 1, z, 'leaves'); put(W, 2, z, 'leaves')
      }
    }

    // 🚪 대문 (동쪽 개구부 양옆) — 벽돌 기둥 + 상단 아치 + 금장식
    const gx = WORLD.X_MAX - 1 // 64
    for (let y = 1; y <= 4; y++) {
      put(gx, y, WORLD.GATE_Z0 - 1, 'brick')
      put(gx, y, WORLD.GATE_Z1 + 1, 'brick')
    }
    for (let z = WORLD.GATE_Z0 - 1; z <= WORLD.GATE_Z1 + 1; z++) put(gx, 5, z, 'brick')
    put(gx, 6, Math.floor((WORLD.GATE_Z0 + WORLD.GATE_Z1) / 2), 'gold')
    put(gx, 6, Math.ceil((WORLD.GATE_Z0 + WORLD.GATE_Z1) / 2), 'gold')

    return extra
  }

  // ---------- 농촌 사냥터 (field) — 허허벌판 + 논/옥수수밭 + 물가 + 약한 고저차 ----------
  _genField() {
    const extra = new Map()
    const put = (x, y, z, t) => extra.set(key(x, y, z), t)
    const carve = (x, y, z) => extra.set(key(x, y, z), null)
    const H = (x, z) => this._height(x, z)

    const W = WORLD.X_MAX - 1 // 64
    const D = WORLD.SIZE - 1  // 31

    // 생울타리 경계 (덤불 2단) — 사방
    for (let x = 0; x <= W; x++)
      for (const z of [0, D]) { put(x, H(x, z) + 1, z, 'leaves'); put(x, H(x, z) + 2, z, 'leaves') }
    for (let z = 0; z <= D; z++)
      for (const x of [0, W]) { put(x, H(x, z) + 1, z, 'leaves'); put(x, H(x, z) + 2, z, 'leaves') }

    // 💧 개울/연못 (남서 내부) — 물 + 모래 둑 (물가·고저차)
    for (let x = 4; x <= 17; x++)
      for (let z = 4; z <= 13; z++) {
        const dx = x - 10, dz = z - 8
        const r = dx * dx * 0.55 + dz * dz
        if (r <= 16) { carve(x, 0, z); carve(x, 1, z); put(x, -1, z, 'water') }
        else if (r <= 27) put(x, 0, z, 'sand')
      }
    for (const [x, z] of [[3, 7], [18, 6], [11, 3], [16, 14], [6, 14]]) put(x, H(x, z) + 1, z, 'leaves') // 갈대

    // 🌾 밭 — 갈아엎은 흙(farmland). 십자 작물은 FieldDecor가 얹음 (마인크래프트식)
    // 밀밭 (물가 옆) — 사이사이 물골(관개)
    for (let x = FIELD_PLOTS.wheat.x0; x <= FIELD_PLOTS.wheat.x1; x++)
      for (let z = FIELD_PLOTS.wheat.z0; z <= FIELD_PLOTS.wheat.z1; z++) {
        if ((z - FIELD_PLOTS.wheat.z0) % 4 === 3) { carve(x, 0, z); put(x, -1, z, 'water') } // 물골
        else put(x, H(x, z), z, 'soil')
      }
    // 옥수수밭 — 세로 물골 2줄
    for (let x = FIELD_PLOTS.corn.x0; x <= FIELD_PLOTS.corn.x1; x++)
      for (let z = FIELD_PLOTS.corn.z0; z <= FIELD_PLOTS.corn.z1; z++) {
        if (x === 46 || x === 52) { carve(x, 0, z); put(x, -1, z, 'water') } // 물골
        else put(x, H(x, z), z, 'soil')
      }

    // 건초 더미
    put(35, 1, 11, 'hay'); put(35, 2, 11, 'hay'); put(36, 1, 11, 'hay')
    put(50, 1, 24, 'hay'); put(50, 2, 24, 'hay')

    // 허수아비 (기둥 + 가로대 + 건초 머리)
    const sx = 25, sz = 15, sg = H(sx, sz)
    put(sx, sg + 1, sz, 'wood'); put(sx, sg + 2, sz, 'wood')
    put(sx - 1, sg + 2, sz, 'plank'); put(sx + 1, sg + 2, sz, 'plank')
    put(sx, sg + 3, sz, 'hay')

    // 드문드문 나무
    const tree = (x, z) => {
      const g = H(x, z)
      for (let y = 1; y <= 3; y++) put(x, g + y, z, 'wood')
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) put(x + dx, g + 4, z + dz, 'leaves')
      put(x, g + 5, z, 'leaves')
    }
    for (const [x, z] of [[8, 25], [33, 27], [55, 6], [46, 4], [60, 26]]) tree(x, z)

    return extra
  }

  // ---------- 🦕 공룡 동물원 (zoo) — 넓은 평지 무인도 (바깥은 Environment 바다) ----------
  // 넓은 잔디 섬 + 바깥 테두리 모래 해변 + 야자수·바위 몇 개. 파밍 구역 없음
  _genZoo() {
    const extra = new Map()
    const put = (x, y, z, t) => extra.set(key(x, y, z), t)
    const rand = mulberry32((this.seed ^ 0x2a) >>> 0)
    const W = this.zooEast - 1 // 동쪽 잔디 끝 (확장 시 늘어남)
    const D = WORLD.SIZE - 1  // 31

    // 모래 해변 — 바깥 2칸 테두리 (섬 가장자리)
    for (let x = 0; x <= W; x++)
      for (let z = 0; z <= D; z++) {
        const edge = Math.min(x, W - x, z, D - z)
        if (edge <= 1) put(x, 0, z, 'sand')
      }

    // 야자수 느낌 나무 몇 그루 (해변 안쪽 모서리) — 관상용
    const palm = (x, z) => {
      for (let y = 1; y <= 3; y++) put(x, y, z, 'wood')
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + dx, 4, z + dz, 'leaves')
    }
    for (const [x, z] of [[6, 6], [58, 7], [8, 26], [56, 25]]) palm(x, z)

    // 💧 연못 (수상공룡 서식지) — 모래 둑 + 물 (수면 y=0)
    const carve = (x, y, z) => extra.set(key(x, y, z), null)
    for (let x = ZOO_POND.x - ZOO_POND.r - 1; x <= ZOO_POND.x + ZOO_POND.r + 1; x++)
      for (let z = ZOO_POND.z - ZOO_POND.r - 1; z <= ZOO_POND.z + ZOO_POND.r + 1; z++) {
        const d = Math.hypot(x - ZOO_POND.x, (z - ZOO_POND.z) * 1.15)
        if (d <= ZOO_POND.r) { carve(x, 0, z); put(x, -1, z, 'water') }
        else if (d <= ZOO_POND.r + 1.3) put(x, 0, z, 'sand')
      }

    // 바위 더미 몇 곳 (꾸미기용, 연못 피함)
    for (const [x, z] of [[16, 6], [12, 24], [58, 15]]) {
      put(x, 1, z, 'stone')
      if (rand() < 0.7) put(x + 1, 1, z, 'stone')
    }

    return extra
  }

  // ---------- 기본 지형 ----------
  baseBlock(x, y, z) {
    const k = key(x, y, z)
    if (this.extra.has(k)) return this.extra.get(k)

    const S = WORLD.SIZE
    const eastX = this.xMax() // 동물원 확장 시 늘어난 동쪽 경계
    const inBounds = x >= WORLD.X_MIN && x <= eastX && z >= WORLD.Z_MIN && z <= WORLD.Z_MAX
    if (!inBounds) return null

    // 지하 (전 맵 공통): 흙 한 층 → 돌(+골드 광석) → 기반암
    if (y === -WORLD.DEPTH) return 'bedrock'
    if (y === -1) return 'dirt' // 잔디 바로 밑은 흙 (마인크래프트 감성)
    if (y < 0 && y > -WORLD.DEPTH) return this._isOre(x, y, z) ? 'gold' : 'stone'

    // 테두리 벽 (지상) — 운동장/파밍만 돌담 (마을·농촌은 생울타리로 대체)
    if (y >= 0 && y < WORLD.WALL_H && this.variant === 'classic') {
      const zIn = z >= WORLD.Z_MIN && z <= WORLD.Z_MAX
      if (x === WORLD.X_MIN && zIn) return 'stone'
      if (x === 32 && zIn) {
        if (z >= WORLD.GATE_Z0 && z <= WORLD.GATE_Z1) return null // 통로
        return 'stone'
      }
      if (x === WORLD.X_MAX && zIn) return 'stone'
      if ((z === WORLD.Z_MIN || z === WORLD.Z_MAX) && x >= WORLD.X_MIN && x <= WORLD.X_MAX)
        return 'stone'
    }

    // 지상 지형 (운동장 평지 / 파밍 산 / 마을·농촌 전체)
    const inPlay = x >= 0 && x < S && z >= 0 && z < S
    const inFarm = x >= WORLD.FARM_X0 && x <= WORLD.FARM_X1 && z >= 0 && z < S
    const inWide = (this.variant === 'village' || this.variant === 'field' || this.variant === 'zoo') &&
      x >= 0 && x < eastX && z >= 0 && z < S
    if ((inPlay || inFarm || inWide) && y >= 0) {
      const h = this._height(x, z)
      if (y > h) return null
      if (y === h) return 'grass'
      if (y >= h - 1) return 'dirt'
      return this._isOre(x, y, z) ? 'gold' : 'stone'
    }
    return null
  }

  getBlock(x, y, z) {
    const k = key(x, y, z)
    if (this.delta.has(k)) return this.delta.get(k)
    return this.baseBlock(x, y, z)
  }

  isSolid(x, y, z) {
    return !!this.getBlock(x, y, z)
  }

  // type=null 이면 부수기. 기본 지형과 같아지면 델타에서 제거
  setBlock(x, y, z, type) {
    const k = key(x, y, z)
    const base = this.baseBlock(x, y, z)
    if (type === base) this.delta.delete(k)
    else this.delta.set(k, type)
    if (this.onChange) this.onChange()
  }

  // 렌더링용: 노출된 블록만 순회 (완전히 묻힌 블록은 그리지 않음 — 지하 대응)
  forEachBlock(cb) {
    const visited = new Set()
    // 기반암 아래(맵 밖 바닥)는 막힌 것으로 간주 — 바닥면 낭비 렌더 방지
    const solid = (x, y, z) => (y < -WORLD.DEPTH ? true : this.isSolid(x, y, z))
    const exposed = (x, y, z) =>
      !solid(x + 1, y, z) || !solid(x - 1, y, z) ||
      !solid(x, y + 1, z) || !solid(x, y - 1, z) ||
      !solid(x, y, z + 1) || !solid(x, y, z - 1)
    const emit = (x, y, z) => {
      const k = key(x, y, z)
      if (visited.has(k)) return
      visited.add(k)
      const b = this.getBlock(x, y, z) // 델타 우선
      if (b && exposed(x, y, z)) cb(x, y, z, b)
    }
    // 1) 기본 지형 (지하~산꼭대기) — 동물원 확장 시 동쪽 경계까지
    for (let x = WORLD.X_MIN; x <= this.xMax(); x++)
      for (let z = WORLD.Z_MIN; z <= WORLD.Z_MAX; z++)
        for (let y = -WORLD.DEPTH; y <= WORLD.MAX_H; y++)
          if (this.baseBlock(x, y, z)) emit(x, y, z)
    // 2) 파밍 지형지물 (나무 꼭대기 등 MAX_H 위 포함)
    for (const k of this.extra.keys()) {
      const [x, y, z] = k.split('_').map(Number)
      emit(x, y, z)
    }
    // 3) 델타로 새로 생긴 블록
    for (const [k, type] of this.delta) {
      if (!type) continue
      const [x, y, z] = k.split('_').map(Number)
      emit(x, y, z)
    }
  }

  // 표면 y 찾기 (스폰·미니맵용): 가장 높은 solid 블록 위 칸
  groundY(x, z) {
    for (let y = WORLD.MAX_H + 6; y >= -WORLD.DEPTH; y--) {
      if (this.isSolid(x, y, z)) return y + 1
    }
    return null
  }

  // 저장용 델타 직렬화
  getDeltaObject() {
    return Object.fromEntries(this.delta)
  }

  loadDelta(obj) {
    this.delta = new Map(Object.entries(obj || {}))
  }
}
