// 🐛 파라메트릭 복셀 곤충 생성기 — 설정(cfg)만 바꿔 다양한 곤충을 대량으로 찍어낸다.
// 애니메이션 계약: userData = { body, wings:[Group], legs:[Group], antennae:[Group], glow? }
//  · wings  : 몸통 중심에 피벗 → rotation.z 로 파닥임(날개짓)
//  · legs   : 몸통에 피벗 → 살짝 흔들리는 걸음 / 정지 idle
//  · antennae: 머리에 피벗 → 살랑임
// 아키타입(gen): butterfly · beetle · dragonfly · bee · mantis · grasshopper
//               · cicada · ant · stinkbug · spider · snail
import * as THREE from 'three'
import { ellipsoid, tube, boxShape, voxMesh, hash3 } from './Vox.js'

const BVOX = 0.11 // 곤충용 복셀 해상도 (공룡보다 작고 촘촘하게)
const col = (h) => new THREE.Color(h)
const addV = (parent, shapes, colorFn) => { const m = voxMesh(shapes, colorFn, BVOX); if (m) parent.add(m) }

// 몸통 마디 무늬 헬퍼 (줄무늬/얼룩)
function bandFn(base, dark, freq = 3.2) {
  return (x, y, z) => (Math.sin(z * freq) > 0.35 ? dark : base)
}

// 겹눈 한 쌍 (큰 반구 + 하이라이트)
function addEyes(head, C, ex, ey, ez, r = 0.16) {
  for (const sx of [1, -1]) {
    addV(head, [ellipsoid(sx * ex, ey, ez, r, r, r)], () => C.eye)
    addV(head, [boxShape(sx * (ex + r * 0.4), ey + r * 0.4, ez + r * 0.5, r * 0.3, r * 0.3, r * 0.3)], () => C.white)
  }
}

// 더듬이 한 쌍 (머리 앞 위로 뻗음, 끝에 살짝 굵은 마디). club이면 나비형 곤봉 끝
function addAntennae(head, C, z0, opts = {}) {
  const ant = []
  for (const sx of [1, -1]) {
    const g = new THREE.Group()
    g.position.set(sx * 0.12, 0.14, z0)
    addV(g, [tube(0, 0, 0, sx * 0.28, 0.42, 0.24, 0.06, 0.045)], () => C.antenna || C.dark)
    if (opts.club) addV(g, [ellipsoid(sx * 0.28, 0.44, 0.26, 0.11, 0.09, 0.09)], () => C.antenna || C.dark)
    head.add(g); ant.push(g)
  }
  return ant
}

// 다리 한 쌍 (허벅지+정강이 꺾인 곤충 다리). 몸통에 피벗
function makeLeg(sx, px, py, pz, C, opts = {}) {
  const leg = new THREE.Group()
  leg.position.set(sx * px, py, pz)
  const spread = opts.spread ?? 0.7
  const drop = opts.drop ?? 0.55
  const r = opts.r ?? 0.07
  // 허벅지(바깥·아래로) → 정강이(더 아래로)
  addV(leg, [tube(0, 0, 0, sx * spread, -drop * 0.5, 0, r, r * 0.85)], () => C.leg || C.dark)
  addV(leg, [tube(sx * spread, -drop * 0.5, 0, sx * (spread + 0.12), -drop, 0.02, r * 0.85, r * 0.6)], () => C.leg || C.dark)
  return leg
}

// 6개 다리 표준 배치(앞·중·뒤 × 좌우) → legs[]
function addSixLegs(g, C, zFront, zMid, zBack, py, opts = {}) {
  const legs = []
  for (const [pz, sp] of [[zFront, 0.6], [zMid, 0.72], [zBack, 0.66]]) {
    for (const sx of [1, -1]) {
      const l = makeLeg(sx, 0.34, py, pz, C, { spread: sp, ...opts })
      g.add(l); legs.push(l)
    }
  }
  return legs
}

// 납작한 날개 하나 (몸통 옆으로 뻗는 얇은 판). 피벗 그룹 반환
// shapeFn(u,v)→반지름 프로파일로 나비/잠자리 날개꼴을 만든다
function makeWing(sx, cfg, C) {
  const w = new THREE.Group()
  w.position.set(0, cfg.y ?? 0.55, cfg.z ?? 0.1)
  const len = cfg.len ?? 1.1        // 날개 길이(바깥 방향)
  const wide = cfg.wide ?? 0.7      // 날개 폭(앞뒤)
  const thick = cfg.thick ?? 0.06   // 두께(얇게)
  const round = cfg.round ?? 1      // 1=둥근 나비, 0.35=길쭉 잠자리
  // 여러 타원을 겹쳐 날개면을 채움
  const shapes = []
  const N = 5
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const cx = sx * len * t
    const rz = wide * (0.5 + 0.5 * Math.sin(t * Math.PI)) * (round + (1 - round) * (1 - t))
    const rx = len / N * 0.9
    shapes.push(ellipsoid(cx, 0, (cfg.zcurve ?? 0) * t, rx, thick, rz))
  }
  w.userData.side = sx // 날개짓 방향(좌우 대칭)
  const edge = C.wingEdge || C.dark
  const spot = C.wingSpot || edge
  const cf = (x, y, z) => {
    const tt = Math.abs(x) / (len + 1e-3)
    if (tt > 0.72 || Math.abs(z) > wide * 0.62) return edge // 가장자리 진하게
    // 무늬 점
    if (cfg.spots && hash3(Math.floor(x * 6), 0, Math.floor(z * 6)) > 0.82) return spot
    if (cfg.eyespot && Math.abs(Math.abs(x) - len * 0.6) < 0.12 && Math.abs(z) < 0.14) return spot
    return C.wing || C.base
  }
  addV(w, shapes, cf)
  return w
}

// ---------------- 나비 / 나방 ----------------
export function makeButterfly(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  // 가늘고 긴 몸통 (머리+가슴+배)
  addV(body, [
    ellipsoid(0, 0.55, 0.5, 0.15, 0.17, 0.2),          // 머리
    tube(0, 0.53, 0.32, 0, 0.5, -0.75, 0.16, 0.09),    // 가슴~배
  ], bandFn(C.base, C.dark, 5))
  addEyes(body, C, 0.12, 0.56, 0.6, 0.09)
  g.add(body)
  const antennae = addAntennae(body, C, 0.62, { club: true })
  // 날개 4장 (앞날개 크게 위·뒤로, 뒷날개 아래)
  const wings = []
  const moth = cfg.moth
  for (const sx of [1, -1]) {
    const fore = makeWing(sx, { y: 0.6, z: 0.34, len: moth ? 1.0 : 1.15, wide: moth ? 0.9 : 0.8, round: moth ? 0.8 : 1, spots: cfg.spots, eyespot: cfg.eyespot, zcurve: 0.1 }, C)
    const hind = makeWing(sx, { y: 0.52, z: -0.35, len: moth ? 0.85 : 0.9, wide: moth ? 0.85 : 0.95, round: 1, spots: cfg.spots, zcurve: -0.15 }, C)
    g.add(fore, hind); wings.push(fore, hind)
  }
  g.userData = { body, wings, legs: [], antennae, wingRest: 0.15, flap: 1.4 }
  return g
}

// ---------------- 딱정벌레(무당벌레·반딧불이·풍뎅이·장수풍뎅이·사슴벌레) ----------------
export function makeBeetle(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  const L = cfg.long ? 1.0 : 0.8 // 몸 길이
  // 볼록한 등딱지(겉날개) + 가슴판(pronotum) + 머리
  addV(body, [ellipsoid(0, 0.5, -0.05, 0.52, 0.42, L)], (x, y, z) => {
    if (cfg.spots) { // 무당벌레 점무늬
      if (y > 0.5 && hash3(Math.floor(x * 5 + 8), 0, Math.floor(z * 5 + 8)) > 0.8) return C.dark
    }
    if (Math.abs(x) < 0.05) return C.dark // 겉날개 가운데 봉합선
    return C.base
  })
  addV(body, [ellipsoid(0, 0.52, L * 0.7, 0.34, 0.28, 0.3)], () => C.accent || C.dark) // 가슴판
  addV(body, [ellipsoid(0, 0.46, L * 0.95, 0.24, 0.22, 0.22)], () => C.head || C.dark) // 머리
  addEyes(body, C, 0.2, 0.5, L * 1.0, 0.08)
  // 🌟 반딧불이: 배 끝 발광
  let glow = null
  if (cfg.firefly) { glow = new THREE.Group(); addV(glow, [ellipsoid(0, 0.44, -L * 0.85, 0.22, 0.18, 0.22)], () => C.glow || col('#EBFF6B')); body.add(glow) }
  // 뿔(장수풍뎅이) / 큰턱(사슴벌레)
  if (cfg.horn) addV(body, [tube(0, 0.55, L * 1.0, 0, 1.15, L * 1.25, 0.09, 0.05), tube(0, 1.15, L * 1.25, 0, 1.35, L * 1.05, 0.05, 0.04)], () => C.horn || C.dark)
  if (cfg.mandibles) for (const sx of [1, -1]) addV(body, [tube(sx * 0.12, 0.5, L * 1.1, sx * 0.5, 0.55, L * 1.7, 0.06, 0.04), tube(sx * 0.5, 0.55, L * 1.7, sx * 0.28, 0.6, L * 2.0, 0.05, 0.03)], () => C.horn || C.dark)
  g.add(body)
  const legs = addSixLegs(g, C, L * 0.6, 0.05, -L * 0.6, 0.4, { spread: 0.55, drop: 0.5 })
  const antennae = cfg.mandibles || cfg.horn ? [] : addAntennae(body, C, L * 1.0, {})
  g.userData = { body, wings: [], legs, antennae, glow, flap: 0 }
  return g
}

// ---------------- 잠자리 / 실잠자리 ----------------
export function makeDragonfly(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  const thin = cfg.damsel ? 0.09 : 0.13
  addV(body, [ellipsoid(0, 0.55, 0.75, 0.2, 0.2, 0.22)], () => C.head || C.base) // 머리
  addV(body, [ellipsoid(0, 0.55, 0.45, 0.22, 0.24, 0.28)], () => C.accent || C.dark) // 가슴
  addV(body, [tube(0, 0.55, 0.3, 0, 0.55, -1.35, thin, thin * 0.6)], bandFn(C.base, C.dark, 4)) // 긴 배
  addEyes(body, C, 0.16, 0.6, 0.82, 0.14) // 큰 겹눈
  g.add(body)
  // 길쭉한 날개 4장 (살짝 위로 든 자세로 카메라에 잘 보이게)
  const wings = []
  const wc = { ...C, wing: C.wing || col('#DCEBF2'), wingEdge: C.wingEdge || C.dark }
  for (const sx of [1, -1]) {
    const fw = makeWing(sx, { y: 0.62, z: 0.5, len: 1.5, wide: 0.5, round: 0.28, thick: 0.06 }, wc)
    const hw = makeWing(sx, { y: 0.6, z: 0.15, len: 1.5, wide: 0.52, round: 0.28, thick: 0.06 }, wc)
    g.add(fw, hw); wings.push(fw, hw)
  }
  g.userData = { body, wings, legs: [], antennae: [], wingRest: 0.16, flap: 0.4, hover: true }
  return g
}

// ---------------- 벌 / 말벌 / 등에 ----------------
export function makeBee(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [ellipsoid(0, 0.5, 0.55, 0.22, 0.22, 0.24)], () => C.head || C.dark) // 머리
  addV(body, [ellipsoid(0, 0.52, 0.28, 0.28, 0.3, 0.3)], () => C.accent || C.dark) // 가슴(털)
  addV(body, [ellipsoid(0, 0.5, -0.2, 0.3, 0.3, 0.45)], (x, y, z) => (Math.sin(z * 9) > 0 ? C.base : C.dark)) // 줄무늬 배
  if (cfg.sting) addV(body, [tube(0, 0.5, -0.62, 0, 0.48, -0.82, 0.05, 0.01)], () => C.dark)
  addEyes(body, C, 0.16, 0.54, 0.66, 0.1)
  g.add(body)
  const legs = addSixLegs(g, C, 0.5, 0.1, -0.35, 0.42, { spread: 0.5, drop: 0.5 })
  const antennae = addAntennae(body, C, 0.66, {})
  // 작은 투명한 느낌 날개 2장
  const wings = []
  for (const sx of [1, -1]) {
    const wg = makeWing(sx, { y: 0.72, z: 0.15, len: 0.85, wide: 0.32, round: 0.5, thick: 0.05 }, { ...C, wing: C.wing || col('#DCE8F0'), wingEdge: C.accent || C.dark })
    g.add(wg); wings.push(wg)
  }
  g.userData = { body, wings, legs, antennae, wingRest: 0.1, flap: 2.4, hover: true }
  return g
}

// ---------------- 사마귀 ----------------
export function makeMantis(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [tube(0, 0.7, 0.1, 0, 0.5, -0.9, 0.15, 0.12)], () => C.base) // 길쭉한 가슴~배
  addV(body, [boxShape(0, 0.78, 0.3, 0.18, 0.14, 0.14)], () => C.head || C.base) // 삼각 머리
  addEyes(body, C, 0.16, 0.86, 0.36, 0.1)
  g.add(body)
  // 앞다리(낫) — 접힌 자세
  const arms = []
  for (const sx of [1, -1]) {
    const a = new THREE.Group(); a.position.set(sx * 0.14, 0.62, 0.28)
    addV(a, [tube(0, 0, 0, sx * 0.32, 0.12, 0.34, 0.07, 0.06)], () => C.base) // 위팔
    addV(a, [tube(sx * 0.32, 0.12, 0.34, sx * 0.12, 0.34, 0.62, 0.06, 0.04)], () => C.dark) // 낫(가시)
    body.add(a); arms.push(a)
  }
  const legs = [
    makeLeg(1, 0.24, 0.5, -0.1, C, { spread: 0.8, drop: 0.7 }), makeLeg(-1, 0.24, 0.5, -0.1, C, { spread: 0.8, drop: 0.7 }),
    makeLeg(1, 0.22, 0.5, -0.55, C, { spread: 0.75, drop: 0.7 }), makeLeg(-1, 0.22, 0.5, -0.55, C, { spread: 0.75, drop: 0.7 }),
  ]
  legs.forEach((l) => g.add(l))
  const antennae = addAntennae(body, C, 0.42, {})
  g.userData = { body, wings: [], legs, antennae, arms, flap: 0 }
  return g
}

// ---------------- 메뚜기 / 여치 / 귀뚜라미 ----------------
export function makeGrasshopper(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [ellipsoid(0, 0.5, 0.45, 0.2, 0.22, 0.26)], () => C.head || C.base) // 머리
  addV(body, [tube(0, 0.5, 0.3, 0, 0.48, -0.85, 0.22, 0.14)], bandFn(C.base, C.dark, 5)) // 몸통
  addEyes(body, C, 0.15, 0.56, 0.56, 0.1)
  g.add(body)
  // 큰 뒷다리(도약) + 앞·중간 작은 다리
  const legs = []
  for (const sx of [1, -1]) {
    const hind = new THREE.Group(); hind.position.set(sx * 0.18, 0.42, -0.55)
    addV(hind, [tube(0, 0, 0, sx * 0.28, 0.35, -0.35, 0.15, 0.09)], () => C.base) // 굵은 넓적다리
    addV(hind, [tube(sx * 0.28, 0.35, -0.35, sx * 0.44, -0.3, -0.15, 0.06, 0.05)], () => C.dark) // 긴 정강이
    body.add(hind); legs.push(hind)
    legs.push(makeLeg(sx, 0.2, 0.42, 0.35, C, { spread: 0.5, drop: 0.5 }))
    legs.push(makeLeg(sx, 0.2, 0.42, -0.05, C, { spread: 0.5, drop: 0.5 }))
  }
  legs.slice(1).forEach((l) => { if (!l.parent) g.add(l) })
  g.add(legs[1], legs[2], legs[4], legs[5])
  const antennae = addAntennae(body, C, 0.5, {})
  g.userData = { body, wings: [], legs, antennae, flap: 0 }
  return g
}

// ---------------- 매미 ----------------
export function makeCicada(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [ellipsoid(0, 0.5, 0.4, 0.32, 0.26, 0.3)], () => C.head || C.base) // 넓은 머리
  addV(body, [tube(0, 0.48, 0.2, 0, 0.46, -0.7, 0.26, 0.14)], bandFn(C.base, C.dark, 6)) // 통통한 몸
  addEyes(body, C, 0.28, 0.52, 0.5, 0.11)
  g.add(body)
  // 지붕형 날개 (몸 위로 접힘) 2장
  const wings = []
  for (const sx of [1, -1]) {
    const wg = makeWing(sx, { y: 0.6, z: -0.1, len: 1.05, wide: 0.4, round: 0.4, thick: 0.05 }, { ...C, wing: C.wing || col('#CFE0D8'), wingEdge: C.dark })
    g.add(wg); wings.push(wg)
  }
  const legs = addSixLegs(g, C, 0.4, 0.05, -0.4, 0.38, { spread: 0.45, drop: 0.45 })
  g.userData = { body, wings, legs, antennae: [], wingRest: 0.5, flap: 0.3 }
  return g
}

// ---------------- 개미 (일개미/여왕개미) ----------------
export function makeAnt(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [ellipsoid(0, 0.42, 0.5, 0.2, 0.2, 0.22)], () => C.head || C.base)   // 머리
  addV(body, [ellipsoid(0, 0.42, 0.2, 0.17, 0.18, 0.2)], () => C.base)            // 가슴
  addV(body, [ellipsoid(0, 0.42, -0.2, 0.24, 0.24, 0.3)], () => C.base)           // 배(gaster)
  addEyes(body, C, 0.13, 0.46, 0.6, 0.06)
  if (cfg.mandibles) for (const sx of [1, -1]) addV(body, [tube(sx * 0.1, 0.4, 0.68, sx * 0.22, 0.4, 0.9, 0.04, 0.02)], () => C.dark)
  g.add(body)
  const legs = addSixLegs(g, C, 0.35, 0.15, -0.05, 0.34, { spread: 0.5, drop: 0.42, r: 0.05 })
  const antennae = addAntennae(body, C, 0.6, {})
  g.userData = { body, wings: [], legs, antennae, flap: 0 }
  return g
}

// ---------------- 노린재 (방패벌레) ----------------
export function makeStinkbug(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  // 방패꼴 납작한 등
  addV(body, [ellipsoid(0, 0.48, -0.05, 0.5, 0.24, 0.6)], (x, y, z) => (z > 0.4 ? (C.accent || C.dark) : (Math.abs(x) < 0.06 ? C.dark : C.base)))
  addV(body, [boxShape(0, 0.46, 0.62, 0.16, 0.12, 0.14)], () => C.head || C.dark) // 작은 머리
  addEyes(body, C, 0.16, 0.5, 0.7, 0.06)
  g.add(body)
  const legs = addSixLegs(g, C, 0.4, 0.0, -0.4, 0.4, { spread: 0.55, drop: 0.42 })
  const antennae = addAntennae(body, C, 0.66, {})
  g.userData = { body, wings: [], legs, antennae, flap: 0 }
  return g
}

// ---------------- 거미 (곤충은 아니지만 인기!) ----------------
export function makeSpider(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [ellipsoid(0, 0.5, 0.28, 0.24, 0.2, 0.24)], () => C.head || C.base) // 두흉부
  addV(body, [ellipsoid(0, 0.5, -0.15, 0.34, 0.32, 0.4)], (x, y, z) => (cfg.spots && hash3(Math.floor(x * 6 + 3), 0, Math.floor(z * 6 + 3)) > 0.8 ? (C.accent || C.dark) : C.base)) // 배
  addEyes(body, C, 0.1, 0.6, 0.44, 0.05)
  addEyes(body, C, 0.2, 0.56, 0.42, 0.04)
  g.add(body)
  // 8개 다리 (4쌍)
  const legs = []
  for (const pz of [0.34, 0.14, -0.06, -0.26]) for (const sx of [1, -1]) {
    const l = makeLeg(sx, 0.26, 0.5, pz, C, { spread: 0.95, drop: 0.55, r: 0.06 })
    g.add(l); legs.push(l)
  }
  g.userData = { body, wings: [], legs, antennae: [], flap: 0 }
  return g
}

// ---------------- 달팽이 (부드러운 몸 + 소용돌이 껍데기) ----------------
export function makeSnail(cfg) {
  const C = colors(cfg)
  const g = new THREE.Group()
  const body = new THREE.Group()
  addV(body, [tube(0, 0.2, 0.6, 0, 0.28, -0.5, 0.2, 0.14)], () => C.base) // 미끄러지는 몸
  addV(body, [ellipsoid(0, 0.34, 0.62, 0.2, 0.2, 0.24)], () => C.base)     // 머리
  // 눈자루 2개
  const antennae = []
  for (const sx of [1, -1]) {
    const s = new THREE.Group(); s.position.set(sx * 0.1, 0.44, 0.66)
    addV(s, [tube(0, 0, 0, sx * 0.12, 0.34, 0.1, 0.05, 0.04), ellipsoid(sx * 0.12, 0.36, 0.12, 0.07, 0.07, 0.07)], () => C.base)
    body.add(s); antennae.push(s)
  }
  // 소용돌이 껍데기 (점점 작아지는 타원 나선)
  const shell = []
  for (let i = 0; i < 8; i++) {
    const a = i * 0.9, rr = 0.42 - i * 0.045
    shell.push(ellipsoid(Math.cos(a) * (0.06 + i * 0.015), 0.55 + Math.sin(a) * 0.14, -0.05 - i * 0.02, rr, rr, rr * 0.6))
  }
  addV(body, shell, (x, y) => (hash3(Math.floor(x * 4), Math.floor(y * 4), 0) > 0.6 ? (C.accent || C.dark) : (C.shell || C.head || C.dark)))
  g.add(body)
  g.userData = { body, wings: [], legs: [], antennae, flap: 0 }
  return g
}

// cfg → 색 팔레트
function colors(cfg) {
  return {
    base: col(cfg.base), dark: col(cfg.dark || '#222'),
    accent: cfg.accent ? col(cfg.accent) : null, head: cfg.head ? col(cfg.head) : null,
    leg: cfg.leg ? col(cfg.leg) : null, antenna: cfg.antenna ? col(cfg.antenna) : null,
    horn: cfg.horn ? col(cfg.horn) : null, glow: cfg.glow ? col(cfg.glow) : null,
    shell: cfg.shell ? col(cfg.shell) : null,
    wing: cfg.wing ? col(cfg.wing) : null, wingEdge: cfg.wingEdge ? col(cfg.wingEdge) : null,
    wingSpot: cfg.wingSpot ? col(cfg.wingSpot) : null,
    eye: col(cfg.eye || '#101010'), white: col('#f5f5f5'),
  }
}

const MAKERS = {
  butterfly: makeButterfly, moth: (c) => makeButterfly({ ...c, moth: true }),
  beetle: makeBeetle, dragonfly: makeDragonfly, damselfly: (c) => makeDragonfly({ ...c, damsel: true }),
  bee: makeBee, mantis: makeMantis, grasshopper: makeGrasshopper,
  cicada: makeCicada, ant: makeAnt, stinkbug: makeStinkbug, spider: makeSpider, snail: makeSnail,
}

// cfg.gen 으로 분기하는 팩토리 (bugData 에서 make로 사용)
export function makeBug(cfg) {
  const fn = MAKERS[cfg.gen] || makeBeetle
  return fn(cfg)
}

// 곤충 애니메이션 — 날개짓·더듬이 살랑임·발광 깜빡임. 도감 뷰어와 채집 매니저 공용
// t: 누적 시간(초). model.userData 계약(wings/antennae/glow/flap/wingRest)을 읽는다
export function animateBug(model, t) {
  const u = model.userData
  if (!u) return
  const flap = u.flap || 0
  if (flap > 0 && u.wings?.length) {
    const speed = u.hover ? 22 : 11
    const sw = flap * (0.5 + 0.5 * Math.sin(t * speed))
    const rest = u.wingRest ?? 0.12
    for (const w of u.wings) {
      const side = w.userData.side || 1
      w.rotation.z = side * (rest + sw)
    }
  }
  if (u.antennae?.length) {
    u.antennae.forEach((a, i) => { a.rotation.x = Math.sin(t * 2.2 + i * 1.3) * 0.14 })
  }
  // 🌟 반딧불이 발광 깜빡임
  if (u.glow) {
    const on = 0.5 + 0.5 * Math.sin(t * 4)
    u.glow.scale.setScalar(0.7 + on * 0.5)
    u.glow.visible = on > 0.25
  }
}
