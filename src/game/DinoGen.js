// 🦕 파라메트릭 복셀 공룡 생성기 — 설정(cfg)만 바꿔 다양한 종을 대량으로 찍어낸다.
// 애니메이션 계약 준수: userData = { torso, headGrp, jaw?, arms, legs[], tailSegs[] }
//  · biped(수각류): legs [왼,오] · quad(용각/각룡/검룡…): legs [앞왼,앞오,뒤왼,뒤오] 대각선 보행
// 특징 플래그: neck(긴목)·jaw(육식 입)·crest('dome'|'twin'|'tube'|'fin')·brow(눈두덩 뿔)
//            frill(목방패+뿔3)·back('plates'|'spikes'|'sail'|'armor')·club(곤봉꼬리)
import * as THREE from 'three'
import { ellipsoid, tube, boxShape, voxMesh, hash3 } from './DinoVox.js'

const col = (h) => new THREE.Color(h)
const addV = (parent, shapes, colorFn) => { const m = voxMesh(shapes, colorFn); if (m) parent.add(m) }

// 배(아래)=belly, 등=얼룩(base/dark) 스킨
function skinFn(C, midY) {
  return (x, y, z) => {
    if (y < midY) return C.belly
    return hash3(Math.floor(x * 2.1), Math.floor(y * 1.4), Math.floor(z * 2.1)) > 0.72 ? C.dark : C.base
  }
}

// 눈 한 쌍 (검은 눈알 + 흰 하이라이트)
function addEyes(headGrp, C, ex, ey, ez) {
  for (const sx of [1, -1]) {
    addV(headGrp, [ellipsoid(sx * ex, ey, ez, 0.17, 0.22, 0.22)], () => C.eye)
    addV(headGrp, [boxShape(sx * (ex + 0.08), ey + 0.08, ez + 0.1, 0.06, 0.06, 0.06)], () => C.white)
  }
}

// 테이퍼 꼬리 (중첩 그룹 — 뒤로 흔들림 전파). club이면 끝에 뼈곤봉
function buildTail(g, base, r0, segLen, N, C, opts = {}) {
  const tailSegs = []
  let parent = g
  let b = base.clone()
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const ra = Math.max(0.1, r0 * (1 - t * 0.92))
    const rb = Math.max(0.08, r0 * (1 - (i + 1) / (N - 1) * 0.92))
    const len = segLen * (1 - t * 0.15)
    const seg = new THREE.Group()
    seg.position.copy(b)
    addV(seg, [tube(0, 0, 0.02, 0, -0.02, -len, ra, rb)], (x, y, z) =>
      y < -ra * 0.3 ? C.belly : (hash3(Math.floor(x * 2.2), Math.floor(y * 1.4), Math.floor((z + i) * 2.2)) > 0.7 ? C.dark : C.base))
    if (opts.spikes && i >= 1 && i <= N - 3) addV(seg, [boxShape(0, ra + 0.14, -len * 0.4, 0.07, 0.22, 0.1)], () => C.dark)
    if (opts.club && i === N - 1) {
      addV(seg, [ellipsoid(0, 0, -len - 0.35, 0.55, 0.42, 0.55)], () => C.dark)
      for (const sx of [1, -1]) addV(seg, [boxShape(sx * 0.5, 0, -len - 0.35, 0.14, 0.14, 0.18)], () => C.claw)
    }
    parent.add(seg); tailSegs.push(seg); parent = seg
    b = new THREE.Vector3(0, -0.02, -len)
  }
  return tailSegs
}

// 등 특징 — plates(검룡 골판)·spikes(등가시)·sail(스피노 돛)·armor(갑옷 혹)
function addBackFeature(torso, C, kind, y, z0, z1) {
  if (kind === 'plates') {
    let i = 0
    for (let z = z1; z >= z0; z -= 0.62, i++) {
      const s = 0.5 + 0.4 * Math.sin((z - z0) / (z1 - z0) * Math.PI)
      const off = i % 2 ? 0.12 : -0.12
      addV(torso, [boxShape(off, y + s, z, 0.06, s, 0.28)], () => C.accent || C.dark)
    }
  } else if (kind === 'sail') {
    // 🪭 스피노 등돛 — 몸통보다 높이 솟은 큼직한 부채(막) + 진한 테두리 + 부채살
    const PEAK = 2.2 // 돛 최고 높이
    const prof = (z) => PEAK * Math.sin(((z - z0) / (z1 - z0)) * Math.PI) // 가운데가 가장 높은 부채꼴
    // 1) 막(부채면) — 촘촘 세로판으로 꽉 채움(폭 넉넉히 해야 복셀에 잡힘) + 윗선 진하게
    for (let z = z0; z <= z1; z += 0.16) {
      const h = prof(z)
      if (h < 0.2) continue
      addV(torso, [boxShape(0, y + h / 2, z, 0.11, h / 2, 0.11)], () => C.accent) // 부채면
      addV(torso, [boxShape(0, y + h - 0.05, z, 0.12, 0.1, 0.11)], () => C.dark)   // 윗 테두리
    }
    // 2) 부채살(신경돌기) — 살짝 도드라진 진한 세로 막대
    for (let z = z0 + 0.35; z <= z1 - 0.2; z += 0.52) {
      const h = prof(z)
      if (h < 0.35) continue
      addV(torso, [boxShape(0, y + h / 2, z, 0.16, h / 2, 0.07)], () => C.dark)
    }
  } else if (kind === 'spikes') {
    for (let z = z0; z <= z1; z += 0.7) addV(torso, [boxShape(0, y + 0.35, z, 0.09, 0.4, 0.12)], () => C.dark)
  } else if (kind === 'armor') {
    for (let z = z0; z <= z1; z += 0.55)
      for (const sx of [0.5, -0.5]) addV(torso, [ellipsoid(sx, y, z, 0.28, 0.18, 0.28)], () => C.accent || C.dark)
  }
}

// ---------------- 수각류(2족) ----------------
export function makeBipedGen(cfg) {
  const C = { base: col(cfg.base), dark: col(cfg.dark), belly: col(cfg.belly),
    accent: col(cfg.accent || cfg.dark), teeth: col('#EFE8CF'), mouth: col('#B33A30'),
    claw: col('#181818'), eye: col('#101010'), white: col('#f5f5f5') }
  const s = cfg.build || 1 // 몸집 비율
  const g = new THREE.Group()

  // 몸통 (앞으로 기운 배럴)
  const torso = new THREE.Group()
  addV(torso, [
    ellipsoid(0, 3.5, 0.05, 0.98 * s, 1.15 * s, 2.2 * s),
    ellipsoid(0, 3.4, 1.9 * s, 0.82 * s, 0.95 * s, 0.9 * s),
    ellipsoid(0, 3.55, -1.5 * s, 0.95 * s, 1.05 * s, 1.0 * s),
  ], skinFn(C, 3.0))
  if (cfg.back) addBackFeature(torso, C, cfg.back, 4.35, -1.3 * s, 1.7 * s) // 스피노 돛 등
  g.add(torso)

  // 머리 (목+두개골+주둥이) — 피벗: 목 밑동
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 3.85, 2.15 * s)
  const snout = cfg.snout || 3.3 // 주둥이 길이
  addV(headGrp, [
    tube(0, 0, 0, 0, 0.75, 0.95, 0.55 * s, 0.5),
    ellipsoid(0, 1.08, 1.6, 0.62, 0.72, 0.85),
    tube(0, 0.9, 1.6, 0, 0.7, snout, 0.5, cfg.narrowSnout ? 0.22 : 0.32),
    ellipsoid(0, 0.7, snout - 0.05, 0.36, 0.32, 0.28),
  ], skinFn(C, 0.5))
  addEyes(headGrp, C, 0.6, 1.15, 1.78)
  if (cfg.jaw !== false) {
    addV(headGrp, [boxShape(0, 0.44, snout * 0.82, 0.24, 0.05, snout * 0.24)], () => C.mouth)
    addV(headGrp, [boxShape(0.34, 0.34, snout * 0.8, 0.05, 0.1, snout * 0.28), boxShape(-0.34, 0.34, snout * 0.8, 0.05, 0.1, snout * 0.28)], () => C.teeth)
  }
  // 볏/뿔
  if (cfg.crest === 'twin') for (const sx of [0.28, -0.28]) addV(headGrp, [boxShape(sx, 1.7, 1.35, 0.08, 0.34, 0.3)], () => C.accent)
  if (cfg.crest === 'fin') addV(headGrp, [boxShape(0, 1.75, 1.4, 0.07, 0.42, 0.5)], () => C.accent)
  if (cfg.crest === 'tube') addV(headGrp, [tube(0, 1.35, 1.5, 0, 2.1, -0.4, 0.2, 0.16)], () => C.accent)
  if (cfg.brow) for (const sx of [1, -1]) addV(headGrp, [boxShape(sx * 0.5, 1.55, 1.4, 0.14, 0.28, 0.16)], () => C.dark)
  if (cfg.dome) addV(headGrp, [ellipsoid(0, 1.5, 1.25, 0.6, 0.5, 0.62)], () => C.accent) // 파키 돔머리

  let jaw = null
  if (cfg.jaw !== false) {
    jaw = new THREE.Group()
    jaw.position.set(0, 0.4, 1.5)
    addV(jaw, [tube(0, -0.2, 0, 0, -0.3, snout - 1.5, 0.32, 0.22)], (x, y, z) => z > 0.5 ? C.belly : C.base)
    addV(jaw, [boxShape(0, -0.04, (snout - 1.5) * 0.6, 0.24, 0.05, (snout - 1.5) * 0.4)], () => C.mouth)
    headGrp.add(jaw)
  }
  g.add(headGrp)

  // 앞발 (작음)
  const makeArm = (sx) => {
    const arm = new THREE.Group()
    arm.position.set(sx * 0.78, 3.1, 1.85 * s)
    arm.rotation.x = 0.5
    addV(arm, [tube(0, 0, 0, 0, -0.68, 0.16, 0.16, 0.12)], () => C.base)
    for (const tx of [-0.06, 0.06]) addV(arm, [boxShape(tx, -0.86, 0.26, 0.05, 0.11, 0.06)], () => C.claw)
    return arm
  }
  const armL = makeArm(-1), armR = makeArm(1)
  g.add(armL, armR)

  // 뒷다리 (허벅지 + 무릎)
  const makeLeg = (sx) => {
    const leg = new THREE.Group()
    leg.position.set(sx * 0.82, 3.45, -0.45)
    const lc = (x, y, z) => hash3(Math.floor(x * 2.2), Math.floor(y * 1.4), Math.floor(z * 2.2)) > 0.72 ? C.dark : C.base
    addV(leg, [ellipsoid(0, -0.5, 0.3, 0.5, 0.8, 0.58)], lc)
    const knee = new THREE.Group(); knee.position.set(0, -1.05, 0.35)
    addV(knee, [tube(0, 0.1, 0.05, 0, -1.5, -0.4, 0.32, 0.2), tube(0, -1.5, -0.4, 0, -2.0, 0.1, 0.2, 0.18)], lc)
    for (const tx of [-0.22, 0, 0.22]) {
      addV(knee, [tube(tx, -2.05, 0.1, tx, -2.1, 0.6, 0.12, 0.09)], lc)
      addV(knee, [boxShape(tx, -2.12, 0.74, 0.07, 0.07, 0.1)], () => C.claw)
    }
    leg.add(knee); leg.userData.knee = knee
    return leg
  }
  const legL = makeLeg(-1), legR = makeLeg(1)
  g.add(legL, legR)

  const tailSegs = buildTail(g, new THREE.Vector3(0, 3.5, -1.95 * s), 1.05 * s, 0.58, 11, C, { spikes: cfg.tailSpikes })
  g.userData = { torso, headGrp, jaw, arms: [armL, armR], legs: [legL, legR], tailSegs }
  return g
}

// ---------------- 초식(4족: 용각류·각룡·검룡·곡룡·조각류) ----------------
export function makeQuadGen(cfg) {
  const C = { base: col(cfg.base), dark: col(cfg.dark), belly: col(cfg.belly),
    accent: col(cfg.accent || cfg.dark), horn: col(cfg.horn || '#C9B79A'),
    claw: col('#2a2a2a'), eye: col('#101010'), white: col('#f5f5f5') }
  const s = cfg.build || 1
  const g = new THREE.Group()
  const bodyY = 2.6 // 등 높이 기준

  // 몸통 (긴 배럴)
  const torso = new THREE.Group()
  addV(torso, [
    ellipsoid(0, bodyY, 0, 1.15 * s, 1.15 * s, 2.6 * s),
    ellipsoid(0, bodyY, 1.9 * s, 0.95 * s, 0.98 * s, 0.95 * s),
    ellipsoid(0, bodyY + 0.05, -1.8 * s, 1.05 * s, 1.05 * s, 1.0 * s),
  ], skinFn(C, bodyY - 0.55))
  addBackFeature(torso, C, cfg.back, bodyY + 1.0, -1.6 * s, 2.0 * s)
  g.add(torso)

  // 머리 — 긴목(용각) 또는 짧은목+머리
  const headGrp = new THREE.Group()
  const neckLen = cfg.neck || 0
  if (neckLen > 0) {
    headGrp.position.set(0, bodyY + 0.6, 2.3 * s)
    addV(headGrp, [tube(0, 0, 0, 0, neckLen, neckLen * 0.35, 0.42, 0.3)], skinFn(C, -99))
    const hx = 0, hy = neckLen, hz = neckLen * 0.35 + 0.4
    addV(headGrp, [ellipsoid(hx, hy, hz, 0.4, 0.42, 0.6), tube(hx, hy - 0.05, hz, hx, hy - 0.1, hz + 0.55, 0.28, 0.22)], skinFn(C, -99))
    addEyes(headGrp, C, 0.36, hy + 0.12, hz)
  } else {
    headGrp.position.set(0, bodyY + 0.35, 2.5 * s)
    addV(headGrp, [ellipsoid(0, 0.35, 0.7, 0.62, 0.6, 0.78), tube(0, 0.2, 0.9, 0, 0.05, 1.85, 0.5, cfg.beak ? 0.26 : 0.34)], skinFn(C, -0.1))
    if (cfg.beak) addV(headGrp, [boxShape(0, -0.02, 1.9, 0.28, 0.14, 0.2)], () => C.horn)
    addEyes(headGrp, C, 0.56, 0.5, 0.85)
    // 각룡: 목방패(프릴) + 코뿔 + 눈뿔 2
    if (cfg.frill) {
      addV(headGrp, [ellipsoid(0, 0.95, -0.35, 1.15, 1.0, 0.35)], () => C.accent)
      addV(headGrp, [tube(0, 0.45, 1.55, 0, 1.15, 2.3, 0.14, 0.05)], () => C.horn) // 코뿔
      for (const sx of [1, -1]) addV(headGrp, [tube(sx * 0.5, 0.75, 0.9, sx * 0.62, 1.85, 1.35, 0.13, 0.05)], () => C.horn)
    }
    if (cfg.dome) addV(headGrp, [ellipsoid(0, 0.85, 0.4, 0.62, 0.55, 0.62)], () => C.accent) // 돔머리(파키)
    if (cfg.crest === 'tube') addV(headGrp, [tube(0, 0.6, 0.3, -0.1, 1.7, -0.7, 0.2, 0.15)], () => C.accent)
  }
  g.add(headGrp)

  // 다리 4개 (앞왼,앞오,뒤왼,뒤오) — 기둥 다리 + 무릎
  const legDefs = [[-1, 1.9 * s, 'front'], [1, 1.9 * s, 'front'], [-1, -1.7 * s, 'back'], [1, -1.7 * s, 'back']]
  const legs = legDefs.map(([sx, lz, kind]) => {
    const leg = new THREE.Group()
    const thick = kind === 'front' ? 0.42 : 0.5
    leg.position.set(sx * 0.9 * s, bodyY - 0.4, lz)
    const lc = (x, y, z) => hash3(Math.floor(x * 2.2), Math.floor(y * 1.4), Math.floor(z * 2.2)) > 0.72 ? C.dark : C.base
    addV(leg, [tube(0, 0.2, 0, 0, -0.9, 0, thick + 0.08, thick)], lc)
    const knee = new THREE.Group(); knee.position.set(0, -0.95, 0)
    addV(knee, [tube(0, 0, 0, 0, -1.0, 0.05, thick, thick * 0.85), ellipsoid(0, -1.05, 0.12, thick, 0.2, thick + 0.08)], lc)
    for (const tx of [-0.2, 0.2]) addV(knee, [boxShape(tx, -1.15, 0.35, 0.09, 0.07, 0.1)], () => C.claw)
    leg.add(knee); leg.userData.knee = knee
    return leg
  })
  g.add(...legs)

  const tOpts = { club: cfg.club, spikes: cfg.back === 'spikes' || cfg.tailSpikes }
  const tailSegs = buildTail(g, new THREE.Vector3(0, bodyY + 0.05, -2.2 * s), 0.95 * s, cfg.neck > 0 ? 0.75 : 0.6, cfg.neck > 0 ? 13 : 10, C, tOpts)
  g.userData = { torso, headGrp, jaw: null, arms: [], legs, tailSegs }
  return g
}

// cfg.gen('biped'|'quad') 로 분기하는 팩토리 (dinoData에서 make로 사용)
export function makeGen(cfg) {
  return cfg.gen === 'quad' ? makeQuadGen(cfg) : makeBipedGen(cfg)
}
