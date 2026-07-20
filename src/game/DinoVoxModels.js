// 고해상도 복셀 공룡 모델 (DinoVox 엔진 사용). 파트별 그룹 + userData로 애니메이션 유지
import * as THREE from 'three'
import { ellipsoid, tube, boxShape, voxMesh, hash3 } from './DinoVox.js'

const col = (h) => new THREE.Color(h)
// 파트에 복셀 메쉬 추가 (빈 결과는 건너뜀)
const addV = (parent, shapes, colorFn) => { const m = voxMesh(shapes, colorFn); if (m) parent.add(m) }

// 티라노사우루스 — 참고 이미지 톤(밝은 초록+진초록 얼룩+크림 배+빨간 입안+어두운 등+검은 눈·발톱)
export function makeTrexVox() {
  const C = {
    base: col('#63B341'), dark: col('#367B27'), belly: col('#D3BC84'),
    back: col('#4A564C'), teeth: col('#EFE8CF'), mouth: col('#BB3A30'),
    claw: col('#181818'), eye: col('#101010'), white: col('#f5f5f5'),
  }
  const blotch = (x, y, z, off = 0) => {
    const n = hash3(Math.floor(x * 2.0), Math.floor(y * 1.4), Math.floor((z + off) * 2.0))
    return n > 0.68 ? C.dark : C.base
  }
  const g = new THREE.Group()

  // ---------- 몸통 ----------
  const torso = new THREE.Group()
  addV(torso, [
    ellipsoid(0, 3.55, 0.05, 1.02, 1.22, 2.35), // 배럴 몸통
    ellipsoid(0, 3.45, 2.05, 0.86, 1.0, 0.95),  // 가슴
    ellipsoid(0, 3.62, -1.55, 1.0, 1.12, 1.05), // 엉덩이
  ], (x, y, z) => {
    if (y < 3.05) return C.belly                     // 배
    if (y > 4.25 && Math.abs(x) < 0.7) return C.back // 등 새들(어두운 등, 평평)
    return blotch(x, y, z)
  })
  g.add(torso)

  // ---------- 머리 (목+두개골+주둥이) — 피벗: 목 밑동 ----------
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 3.88, 2.3)
  addV(headGrp, [
    tube(0, 0.0, 0.0, 0, 0.78, 1.0, 0.58, 0.56),   // 굵은 목 (위로)
    ellipsoid(0, 1.12, 1.72, 0.68, 0.78, 0.9),     // 크고 깊은 두개골
    tube(0, 0.92, 1.75, 0, 0.72, 3.55, 0.56, 0.34), // 두툼한 주둥이
    ellipsoid(0, 0.74, 3.5, 0.4, 0.36, 0.3),       // 코끝 뭉툭
  ], (x, y, z) => {
    if (y < 0.52 && z > 1.4) return C.belly
    return hash3(Math.floor(x * 2.1), Math.floor(y * 1.5), Math.floor(z * 2.1)) > 0.72 ? C.dark : C.base
  })
  // 입천장(빨강, 안쪽만) + 윗니(크림 띠)
  addV(headGrp, [boxShape(0, 0.46, 2.8, 0.26, 0.05, 0.82)], () => C.mouth)
  addV(headGrp, [boxShape(0.36, 0.36, 2.75, 0.05, 0.1, 0.98), boxShape(-0.36, 0.36, 2.75, 0.05, 0.1, 0.98)], () => C.teeth)
  // 눈두덩 + 눈 + 하이라이트
  for (const sx of [1, -1]) {
    addV(headGrp, [boxShape(sx * 0.54, 1.5, 1.85, 0.2, 0.14, 0.36)], () => C.dark) // 사나운 눈썹
    addV(headGrp, [ellipsoid(sx * 0.62, 1.18, 1.9, 0.19, 0.26, 0.27)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.72, 1.28, 2.02, 0.08, 0.08, 0.08)], () => C.white)
  }
  addV(headGrp, [boxShape(0.22, 0.92, 3.5, 0.06, 0.06, 0.06), boxShape(-0.22, 0.92, 3.5, 0.06, 0.06, 0.06)], () => C.eye) // 콧구멍

  // ---------- 아래턱 (headGrp 자식) — 피벗: 턱 관절 ----------
  const jaw = new THREE.Group()
  jaw.position.set(0, 0.4, 1.7)
  addV(jaw, [tube(0, -0.2, 0.0, 0, -0.32, 1.75, 0.36, 0.26)], (x, y, z) => (z > 0.5 ? C.belly : C.base))
  addV(jaw, [boxShape(0, -0.06, 0.95, 0.28, 0.05, 0.78)], () => C.mouth)
  addV(jaw, [boxShape(0.26, 0.04, 0.95, 0.06, 0.08, 0.72), boxShape(-0.26, 0.04, 0.95, 0.06, 0.08, 0.72)], () => C.teeth)
  headGrp.add(jaw)
  g.add(headGrp)

  // ---------- 앞발 ----------
  const makeArm = (sx) => {
    const arm = new THREE.Group()
    arm.position.set(sx * 0.82, 3.15, 2.0)
    arm.rotation.x = 0.5
    addV(arm, [tube(0, 0, 0, 0, -0.72, 0.18, 0.17, 0.13)], () => C.base)
    addV(arm, [boxShape(-0.07, -0.9, 0.28, 0.05, 0.11, 0.06), boxShape(0.07, -0.9, 0.28, 0.05, 0.11, 0.06)], () => C.claw)
    return arm
  }
  const armL = makeArm(-1), armR = makeArm(1)
  g.add(armL, armR)

  // ---------- 뒷다리 (근육질) — 허벅지(고관절) + 무릎 관절(정강이·발) ----------
  const makeLeg = (sx) => {
    const leg = new THREE.Group()
    leg.position.set(sx * 0.88, 3.5, -0.5)
    const legCol = (x, y, z) => hash3(Math.floor(x * 2.2), Math.floor(y * 1.4), Math.floor(z * 2.2)) > 0.72 ? C.dark : C.base
    addV(leg, [ellipsoid(0, -0.55, 0.35, 0.55, 0.85, 0.62)], legCol) // 허벅지
    const knee = new THREE.Group(); knee.position.set(0, -1.1, 0.4) // 무릎 피벗
    addV(knee, [
      tube(0, 0.1, 0.05, 0, -1.6, -0.45, 0.34, 0.22),  // 정강이
      tube(0, -1.6, -0.45, 0, -2.15, 0.1, 0.22, 0.2),  // 발목→발
    ], legCol)
    for (const tx of [-0.24, 0, 0.24]) {
      addV(knee, [tube(tx, -2.2, 0.1, tx, -2.24, 0.65, 0.13, 0.1)], legCol)
      addV(knee, [boxShape(tx, -2.26, 0.8, 0.07, 0.07, 0.11)], () => C.claw)
    }
    leg.add(knee)
    leg.userData.knee = knee
    return leg
  }
  const legL = makeLeg(-1), legR = makeLeg(1)
  g.add(legL, legR)

  // ---------- 꼬리 (11마디 매끈한 테이퍼, 등 새들 이어짐) ----------
  const tailSegs = []
  const N = 11
  let parent = g
  let base = new THREE.Vector3(0, 3.58, -2.1)
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const r0 = Math.max(0.12, 1.18 * (1 - t))
    const r1 = Math.max(0.1, 1.18 * (1 - (i + 1) / (N - 1)))
    const len = 0.6 - t * 0.12
    const seg = new THREE.Group()
    seg.position.copy(base)
    addV(seg, [tube(0, 0, 0.05, 0, -0.04, -len, r0, r1)], (x, y, z) => {
      if (y < -r0 * 0.35) return C.belly
      if (y > r0 * 0.35 && Math.abs(x) < 0.4 && i < 4) return C.back
      return hash3(Math.floor(x * 2.2), Math.floor(y * 1.4), Math.floor((z - base.z + i) * 2.2)) > 0.7 ? C.dark : C.base
    })
    parent.add(seg)
    tailSegs.push(seg)
    parent = seg
    base = new THREE.Vector3(0, -0.08, -len)
  }

  g.userData = { torso, headGrp, jaw, arms: [armL, armR], legs: [legL, legR], tailSegs }
  return g
}

// ============ 익룡 (하늘) ============

// 프테라노돈 — 비행 자세: 수평 몸통 + 앞으로 긴 부리 + 뒤 볏 + 활짝 편 날개(펄럭임) + 뒤로 뻗은 다리
export function makePteranodonVox() {
  const C = {
    body: col('#E08A4A'), dark: col('#A85A2E'), belly: col('#F1CB9E'),
    crest: col('#C1452F'), beak: col('#EBC96A'), mem: col('#E8955A'), memD: col('#CC7940'),
    eye: col('#101010'), white: col('#f5f5f5'), claw: col('#181818'),
  }
  const g = new THREE.Group()

  // 몸통 (수평·날렵) + 뒤로 뻗은 다리 (비행 중)
  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 0.25, 0.15, 0.34, 0.34, 0.95)], (x, y, z) => (y < 0.15 ? C.belly : C.body))
  for (const sx of [1, -1]) {
    addV(torso, [tube(sx * 0.16, 0.12, -0.5, sx * 0.22, -0.05, -1.55, 0.09, 0.05)], () => C.body)
    addV(torso, [boxShape(sx * 0.22, -0.08, -1.62, 0.08, 0.04, 0.14)], () => C.dark)
  }
  g.add(torso)

  // 머리 + 목 + 볏 + 긴 부리 (앞으로)
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 0.34, 0.9)
  addV(headGrp, [
    tube(0, 0, 0, 0, 0.08, 0.4, 0.24, 0.2),      // 목
    ellipsoid(0, 0.12, 0.58, 0.27, 0.29, 0.36),  // 머리
    tube(0, 0.1, 0.75, 0, 0.0, 2.0, 0.14, 0.04), // 긴 부리
  ], (x, y, z) => (z > 0.9 ? C.beak : C.body))
  // 뒤로 솟은 큰 볏
  addV(headGrp, [boxShape(0, 0.44, 0.32, 0.06, 0.4, 0.52), boxShape(0, 0.78, 0.0, 0.05, 0.22, 0.36)], () => C.crest)
  for (const sx of [1, -1]) {
    addV(headGrp, [ellipsoid(sx * 0.22, 0.18, 0.66, 0.08, 0.1, 0.1)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.27, 0.24, 0.7, 0.04, 0.04, 0.04)], () => C.white)
  }
  g.add(headGrp)

  // 날개 (좌우) — 어깨 피벗, 바깥+뒤로 스윕. 펄럭임 애니메이션용 그룹
  const makeWing = (sx) => {
    const w = new THREE.Group()
    w.position.set(sx * 0.32, 0.36, 0.25)
    addV(w, [tube(0, 0, 0, sx * 2.7, 0.05, -0.6, 0.15, 0.06)], () => C.dark)                     // 앞 가장자리 팔뼈
    addV(w, [ellipsoid(sx * 1.35, 0.0, -0.95, 1.55, 0.14, 1.2)], (x) => (Math.abs(x) > 2.3 ? C.memD : C.mem)) // 막(뒤로 스윕)
    for (const c of [0, 1, 2]) addV(w, [boxShape(sx * (0.78 + c * 0.05), 0.12, 0.16 - c * 0.05, 0.035, 0.035, 0.09)], () => C.claw) // 손목 손가락
    return w
  }
  const wingR = makeWing(1), wingL = makeWing(-1)
  torso.add(wingR, wingL)

  g.userData = { torso, headGrp, jaw: null, wings: [wingR, wingL], legs: [], tailSegs: [] }
  return g
}

// 람포링쿠스 — 비행 자세: 작은 몸 + 활짝 편 날개 + 뒤로 길게 뻗은 꼬리 끝 마름모 방향타
export function makeRhamphorhynchusVox() {
  const C = {
    body: col('#B5763E'), dark: col('#7A5024'), belly: col('#DCC48E'),
    mem: col('#C89A5E'), memD: col('#A97C44'), beak: col('#EBC96A'), vane: col('#8A5E34'),
    eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 0.24, 0.1, 0.26, 0.28, 0.62)], (x, y, z) => (y < 0.12 ? C.belly : C.body))
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 0.3, 0.5)
  addV(headGrp, [
    tube(0, 0, 0, 0, 0.05, 0.3, 0.18, 0.15),
    ellipsoid(0, 0.08, 0.44, 0.2, 0.2, 0.26),
    tube(0, 0.05, 0.6, 0, 0.0, 1.35, 0.09, 0.03),
  ], (x, y, z) => (z > 0.72 ? C.beak : C.body))
  for (const sx of [1, -1]) addV(headGrp, [ellipsoid(sx * 0.16, 0.12, 0.5, 0.06, 0.07, 0.07)], () => C.eye)
  g.add(headGrp)

  const makeWing = (sx) => {
    const w = new THREE.Group()
    w.position.set(sx * 0.24, 0.28, 0.12)
    addV(w, [tube(0, 0, 0, sx * 1.95, 0.04, -0.45, 0.11, 0.05)], () => C.dark)
    addV(w, [ellipsoid(sx * 0.98, 0.0, -0.65, 1.1, 0.12, 0.78)], (x) => (Math.abs(x) > 1.55 ? C.memD : C.mem))
    return w
  }
  const wingR = makeWing(1), wingL = makeWing(-1)
  torso.add(wingR, wingL)

  // 뒤로 길게 뻗은 꼬리 + 끝 마름모 방향타
  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 0.22, -0.5)
  const N = 9
  for (let i = 0; i < N; i++) {
    const len = 0.32
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.02, 0, 0, -len, 0.06, 0.05)], () => C.dark)
    if (i === N - 1) addV(s, [boxShape(0, 0, -len - 0.15, 0.04, 0.3, 0.22)], () => C.vane)
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, 0, -len)
  }

  g.userData = { torso, headGrp, jaw: null, wings: [wingR, wingL], legs: [], tailSegs }
  return g
}

// ============ 수룡 (바다) ============

// 모사사우루스 — 거대한 바다 도마뱀. 큰 턱+이빨, 네 지느러미, 꼬리지느러미
export function makeMosasaurusVox() {
  const C = {
    body: col('#4A6E93'), dark: col('#324F6E'), belly: col('#CFD9E0'),
    teeth: col('#EFE8CF'), mouth: col('#BB3A30'), fin: col('#3A5A7C'),
    eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()
  const skin = (x, y, z) => (y < 0.7 ? C.belly : (hash3(Math.floor(x * 2), Math.floor(y * 1.5), Math.floor(z * 2)) > 0.72 ? C.dark : C.body))

  // 긴 유선형 몸통 (땅/물에 낮게)
  const torso = new THREE.Group()
  addV(torso, [
    ellipsoid(0, 1.0, 0, 0.82, 0.78, 1.5),
    ellipsoid(0, 1.0, 1.35, 0.62, 0.6, 0.9),
  ], skin)
  g.add(torso)

  // 머리 + 큰 턱 + 이빨
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 1.05, 1.85)
  addV(headGrp, [
    ellipsoid(0, 0.05, 0.5, 0.52, 0.5, 0.7),
    tube(0, 0.02, 0.8, 0, -0.05, 2.05, 0.44, 0.26),
  ], (x, y, z) => (y < -0.15 ? C.belly : C.body))
  addV(headGrp, [boxShape(0, -0.22, 1.2, 0.36, 0.05, 0.95)], () => C.teeth)
  addV(headGrp, [boxShape(0, -0.12, 1.2, 0.3, 0.05, 0.88)], () => C.mouth)
  for (const sx of [1, -1]) {
    addV(headGrp, [ellipsoid(sx * 0.42, 0.22, 0.55, 0.1, 0.12, 0.12)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.48, 0.28, 0.62, 0.04, 0.04, 0.04)], () => C.white)
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.2, 0.7)
  addV(jaw, [tube(0, 0, 0, 0, -0.05, 1.35, 0.3, 0.2)], () => C.body)
  addV(jaw, [boxShape(0, 0.06, 0.85, 0.26, 0.05, 0.72)], () => C.teeth)
  headGrp.add(jaw)
  g.add(headGrp)

  // 네 지느러미 (paddle 애니메이션 = legs)
  const flipper = (sx, z) => {
    const f = new THREE.Group()
    f.position.set(sx * 0.6, 0.95, z)
    f.rotation.z = sx * 0.55
    addV(f, [ellipsoid(sx * 0.55, -0.12, 0, 0.7, 0.13, 0.4)], () => C.fin)
    return f
  }
  const legs = [flipper(-1, 0.95), flipper(1, 0.95), flipper(-1, -0.85), flipper(1, -0.85)]
  g.add(...legs)

  // 긴 꼬리 + 꼬리지느러미(세로 플루크)
  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 1.0, -1.45)
  const N = 7
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const r0 = Math.max(0.13, 0.72 * (1 - t))
    const r1 = Math.max(0.11, 0.72 * (1 - (i + 1) / (N - 1)))
    const len = 0.58
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.05, 0, -0.02, -len, r0, r1)], (x, y, z) => (y < -r0 * 0.3 ? C.belly : C.body))
    if (i >= N - 3) addV(s, [boxShape(0, 0.28, -len * 0.5, 0.06, 0.55, len * 0.5)], () => C.fin)
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.02, -len)
  }

  g.userData = { torso, headGrp, jaw, legs, tailSegs }
  return g
}

// 플레시오사우루스 — 긴 목 + 작은 머리 + 둥근 몸통 + 네 큰 지느러미
export function makePlesiosaurusVox() {
  const C = {
    body: col('#3E8C86'), dark: col('#2E6A66'), belly: col('#CFE0DA'),
    fin: col('#357A74'), eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()
  const skin = (x, y, z) => (y < 0.85 ? C.belly : (hash3(Math.floor(x * 2), Math.floor(y * 1.5), Math.floor(z * 2)) > 0.76 ? C.dark : C.body))

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 1.15, 0, 1.02, 0.72, 1.35)], skin)
  g.add(torso)

  // 긴 목 + 작은 머리
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 1.45, 1.05)
  addV(headGrp, [
    tube(0, 0, 0, 0, 1.25, 1.05, 0.3, 0.2),
    ellipsoid(0, 1.35, 1.2, 0.26, 0.26, 0.38),
  ], (x, y, z) => (y < 0.3 ? C.belly : C.body))
  for (const sx of [1, -1]) {
    addV(headGrp, [ellipsoid(sx * 0.22, 1.4, 1.32, 0.08, 0.09, 0.09)], () => C.eye)
    addV(headGrp, [boxShape(0, 1.32, 1.5, 0.12, 0.06, 0.08)], () => C.dark) // 입선
  }
  g.add(headGrp)

  // 네 큰 지느러미
  const flipper = (sx, z) => {
    const f = new THREE.Group()
    f.position.set(sx * 0.88, 1.0, z)
    f.rotation.z = sx * 0.6
    addV(f, [ellipsoid(sx * 0.65, -0.16, 0, 0.8, 0.09, 0.42)], () => C.fin)
    return f
  }
  const legs = [flipper(-1, 0.62), flipper(1, 0.62), flipper(-1, -0.72), flipper(1, -0.72)]
  g.add(...legs)

  // 짧은 꼬리
  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 1.15, -1.25)
  for (let i = 0; i < 4; i++) {
    const t = i / 3
    const r0 = Math.max(0.1, 0.52 * (1 - t))
    const r1 = Math.max(0.08, 0.52 * (1 - (i + 1) / 3))
    const len = 0.46
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.05, 0, -0.02, -len, r0, r1)], (x, y, z) => (y < -r0 * 0.3 ? C.belly : C.body))
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.02, -len)
  }

  g.userData = { torso, headGrp, jaw: null, legs, tailSegs }
  return g
}

// ============ 육상 공룡 복셀 (트리케라·스테고·브라키오·랩터·알로·콤프소) ============

// 트리케라톱스 — 넓은 프릴 + 뿔 3개 + 부리, 네 기둥다리
export function makeTriceratopsVox() {
  const C = {
    body: col('#7A6248'), dark: col('#5F4C37'), belly: col('#A08264'),
    frill: col('#C8A06A'), frillD: col('#A9854F'), horn: col('#ECE4CC'), beak: col('#3F3226'),
    eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()
  const skin = (x, y, z) => (y < 1.95 ? C.belly : (hash3(Math.floor(x * 2), Math.floor(y * 1.4), Math.floor(z * 2)) > 0.72 ? C.dark : C.body))

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 2.35, 0.1, 1.05, 1.05, 1.85), ellipsoid(0, 2.3, 1.55, 0.95, 0.95, 0.8)], skin)
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 2.5, 2.1)
  addV(headGrp, [ellipsoid(0, 0.05, 0.7, 0.62, 0.6, 0.72)], () => C.body)                 // 두개골
  addV(headGrp, [ellipsoid(0, 0.5, -0.15, 1.15, 1.1, 0.26)], (x, y) => (Math.abs(x) > 0.85 || y > 1.15 ? C.frillD : C.frill)) // 프릴
  addV(headGrp, [ellipsoid(0, -0.32, 1.35, 0.4, 0.34, 0.42), boxShape(0, -0.52, 1.5, 0.18, 0.2, 0.2)], () => C.beak) // 부리
  for (const sx of [1, -1]) addV(headGrp, [tube(sx * 0.42, 0.45, 0.7, sx * 0.52, 1.2, 1.6, 0.15, 0.06)], () => C.horn) // 눈썹뿔(앞위)
  addV(headGrp, [tube(0, 0.0, 1.2, 0, 0.55, 1.8, 0.15, 0.06)], () => C.horn)              // 코뿔
  for (const sx of [1, -1]) {
    addV(headGrp, [ellipsoid(sx * 0.56, 0.15, 0.88, 0.1, 0.12, 0.12)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.62, 0.22, 0.94, 0.04, 0.04, 0.04)], () => C.white)
  }
  g.add(headGrp)

  const leg = (x, z) => {
    const l = new THREE.Group(); l.position.set(x, 2.05, z)
    addV(l, [tube(0, 0, 0, 0, -0.85, 0.03, 0.42, 0.36)], () => C.dark) // 위 다리
    const knee = new THREE.Group(); knee.position.set(0, -0.83, 0.03)
    addV(knee, [tube(0, -0.02, 0, 0, -0.77, 0.02, 0.36, 0.32)], () => C.dark) // 아래 다리
    addV(knee, [ellipsoid(0, -1.19, 0.13, 0.46, 0.16, 0.52)], () => C.dark)   // 발
    for (const tx of [-0.22, 0, 0.22]) addV(knee, [boxShape(tx, -1.21, 0.49, 0.1, 0.1, 0.14)], () => C.horn)
    l.add(knee); l.userData.knee = knee
    return l
  }
  const legs = [leg(-0.82, 1.4), leg(0.82, 1.4), leg(-0.86, -1.3), leg(0.86, -1.3)]
  g.add(...legs)

  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 2.3, -1.7)
  const N = 4
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r0 = Math.max(0.14, 0.9 * (1 - t)), r1 = Math.max(0.11, 0.9 * (1 - (i + 1) / (N - 1))), len = 0.55
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.05, 0, -0.02, -len, r0, r1)], (x, y) => (y < -r0 * 0.3 ? C.belly : C.body))
    parent.add(s); tailSegs.push(s); parent = s; base = new THREE.Vector3(0, -0.05, -len)
  }

  g.userData = { torso, headGrp, jaw: null, legs, tailSegs }
  return g
}

// 스테고사우루스 — 아치형 등 + 큰 골판 2열 + 꼬리 가시
export function makeStegosaurusVox() {
  const C = {
    body: col('#6F7A48'), dark: col('#55603A'), belly: col('#8B9560'),
    plate: col('#B5643C'), plateD: col('#8F4A2B'), spike: col('#ECE4CC'), eye: col('#101010'),
  }
  const g = new THREE.Group()
  const skin = (x, y, z) => (y < (z > 0.7 ? 1.55 : 2.05) ? C.belly : (hash3(Math.floor(x * 2), Math.floor(y * 1.4), Math.floor(z * 2)) > 0.74 ? C.dark : C.body))

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 2.5, -0.3, 0.95, 1.15, 1.5), ellipsoid(0, 1.95, 1.35, 0.8, 0.85, 0.9)], skin)
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 1.7, 1.85)
  addV(headGrp, [tube(0, 0, 0, 0, -0.15, 0.9, 0.34, 0.26), ellipsoid(0, -0.15, 1.0, 0.3, 0.26, 0.34)], () => C.body)
  addV(headGrp, [boxShape(0, -0.32, 1.25, 0.22, 0.08, 0.2)], () => C.dark)
  for (const sx of [1, -1]) addV(headGrp, [ellipsoid(sx * 0.28, 0.0, 0.7, 0.08, 0.09, 0.09)], () => C.eye)
  g.add(headGrp)

  // 골판 2열 (지그재그, 가운데 큼)
  for (let i = 0; i < 9; i++) {
    const z = 1.9 - i * 0.5, h = 0.5 + Math.sin(i / 8 * Math.PI) * 0.75
    const yb = 2.9 + Math.sin(Math.max(0, (i - 1) / 7) * Math.PI) * 0.28
    const px = i % 2 ? 0.22 : -0.22
    addV(g, [boxShape(px, yb + h / 2, z, 0.09, h / 2, 0.28)], () => C.plate)
    addV(g, [boxShape(px, yb + h * 0.2, z, 0.1, h * 0.2, 0.24)], () => C.plateD)
  }

  const leg = (x, z, hh) => {
    const l = new THREE.Group(); l.position.set(x, hh, z)
    const km = hh * 0.45
    addV(l, [tube(0, 0, 0, 0, -km, 0.025, 0.4, 0.35)], () => C.dark) // 위 다리
    const knee = new THREE.Group(); knee.position.set(0, -km, 0.025)
    addV(knee, [tube(0, 0, 0, 0, -km, 0.025, 0.35, 0.3)], () => C.dark) // 아래 다리
    addV(knee, [ellipsoid(0, -hh * 0.55, 0.075, 0.42, 0.15, 0.46)], () => C.dark) // 발
    l.add(knee); l.userData.knee = knee
    return l
  }
  const legs = [leg(-0.7, 1.5, 1.35), leg(0.7, 1.5, 1.35), leg(-0.78, -1.3, 2.25), leg(0.78, -1.3, 2.25)]
  g.add(...legs)

  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 2.4, -1.7)
  const N = 4
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r0 = Math.max(0.14, 0.85 * (1 - t)), r1 = Math.max(0.11, 0.85 * (1 - (i + 1) / (N - 1))), len = 0.62
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.05, 0, -0.02, -len, r0, r1)], (x, y) => (y < -r0 * 0.3 ? C.belly : C.body))
    if (i === N - 1) for (const sx of [1, -1]) addV(s, [tube(sx * 0.15, 0.12, -len * 0.3, sx * 0.32, 0.62, -len * 0.7, 0.08, 0.03)], () => C.spike)
    parent.add(s); tailSegs.push(s); parent = s; base = new THREE.Vector3(0, -0.06, -len)
  }

  g.userData = { torso, headGrp, jaw: null, legs, tailSegs }
  return g
}

// 브라키오사우루스 — 긴 목 초식 거인, 앞다리 김
export function makeBrachiosaurusVox() {
  const C = {
    body: col('#7D8A6A'), dark: col('#5F6B4A'), belly: col('#A2B18A'), eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()
  const skin = (x, y, z) => (y < 3.4 ? C.belly : (hash3(Math.floor(x * 1.8), Math.floor(y * 1.3), Math.floor(z * 1.8)) > 0.74 ? C.dark : C.body))

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 4.0, -0.2, 1.1, 1.3, 2.2), ellipsoid(0, 4.15, 1.8, 0.95, 1.05, 0.9)], skin)
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 5.2, 2.0)
  addV(headGrp, [tube(0, 0, 0, 0, 2.8, 1.6, 0.44, 0.3), ellipsoid(0, 3.0, 1.85, 0.34, 0.36, 0.5)], () => C.body)
  addV(headGrp, [boxShape(0, 3.35, 1.5, 0.2, 0.18, 0.18)], () => C.dark) // 코 볏
  for (const sx of [1, -1]) {
    // 눈: 머리 옆 표면에 튀어나온 검은 눈알 + 작은 흰 반짝임
    addV(headGrp, [ellipsoid(sx * 0.42, 3.12, 2.12, 0.16, 0.19, 0.19)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.5, 3.2, 2.22, 0.1, 0.1, 0.1)], () => C.white)
  }
  g.add(headGrp)

  const leg = (x, z, hh) => {
    const l = new THREE.Group(); l.position.set(x, hh, z)
    const km = hh * 0.45
    addV(l, [tube(0, 0, 0, 0, -km, 0.025, 0.5, 0.44)], () => C.dark) // 위 다리
    const knee = new THREE.Group(); knee.position.set(0, -km, 0.025)
    addV(knee, [tube(0, 0, 0, 0, -km, 0.025, 0.44, 0.4)], () => C.dark) // 아래 다리
    addV(knee, [ellipsoid(0, -hh * 0.55, 0.075, 0.55, 0.18, 0.6)], () => C.dark) // 발
    l.add(knee); l.userData.knee = knee
    return l
  }
  const legs = [leg(-1.0, 1.7, 3.5), leg(1.0, 1.7, 3.5), leg(-1.05, -1.6, 3.0), leg(1.05, -1.6, 3.0)]
  g.add(...legs)

  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 3.9, -2.2)
  const N = 8
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r0 = Math.max(0.14, 1.15 * (1 - t)), r1 = Math.max(0.1, 1.15 * (1 - (i + 1) / (N - 1))), len = 0.7
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.05, 0, -0.03, -len, r0, r1)], (x, y) => (y < -r0 * 0.3 ? C.belly : C.body))
    parent.add(s); tailSegs.push(s); parent = s; base = new THREE.Vector3(0, -0.08, -len)
  }

  g.userData = { torso, headGrp, jaw: null, legs, tailSegs }
  return g
}

// 벨로시랩터 — 날렵한 육식, 낫발톱 + 뻣뻣한 긴 꼬리
export function makeVelociraptorVox() {
  const C = {
    base: col('#8A6F3E'), dark: col('#5E4A28'), belly: col('#C2A86A'), stripe: col('#4A3A1E'),
    teeth: col('#F4F1E4'), claw: col('#181818'), eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()
  const bodyCol = (x, y, z) => (y > 2.25 && Math.abs(x) < 0.24 ? C.stripe : (y < 1.7 ? C.belly : (hash3(Math.floor(x * 2.2), Math.floor(y * 1.5), Math.floor(z * 2.2)) > 0.74 ? C.dark : C.base)))

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 1.95, 0.0, 0.4, 0.48, 1.15)], bodyCol)
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 2.02, 1.05)
  addV(headGrp, [tube(0, 0, -0.1, 0, 0.2, 0.5, 0.22, 0.18), ellipsoid(0, 0.24, 0.82, 0.22, 0.22, 0.32), tube(0, 0.2, 1.0, 0, 0.08, 2.0, 0.14, 0.05)], (x, y, z) => (y < 0.1 && z > 0.7 ? C.belly : C.base))
  addV(headGrp, [boxShape(0.15, 0.12, 1.35, 0.04, 0.05, 0.55), boxShape(-0.15, 0.12, 1.35, 0.04, 0.05, 0.55)], () => C.teeth)
  for (const sx of [1, -1]) {
    addV(headGrp, [ellipsoid(sx * 0.2, 0.34, 0.82, 0.08, 0.09, 0.09)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.16, 0.44, 0.8, 0.09, 0.05, 0.2)], () => C.stripe)
  }
  const jaw = new THREE.Group(); jaw.position.set(0, 0.08, 0.9)
  addV(jaw, [tube(0, -0.04, 0, 0, -0.12, 1.05, 0.13, 0.06)], () => C.dark)
  addV(jaw, [boxShape(0.12, 0.02, 0.5, 0.03, 0.04, 0.45), boxShape(-0.12, 0.02, 0.5, 0.03, 0.04, 0.45)], () => C.teeth)
  headGrp.add(jaw)
  g.add(headGrp)

  const arm = (sx) => {
    const a = new THREE.Group(); a.position.set(sx * 0.34, 1.95, 0.55); a.rotation.x = 0.7
    addV(a, [tube(0, 0, 0, 0, -0.5, 0.1, 0.1, 0.07)], () => C.base)
    addV(a, [boxShape(0, -0.6, 0.16, 0.05, 0.1, 0.06)], () => C.claw)
    return a
  }
  g.add(arm(-1), arm(1))

  const leg = (sx) => {
    const l = new THREE.Group(); l.position.set(sx * 0.3, 1.85, -0.1)
    addV(l, [ellipsoid(0, -0.5, 0.25, 0.24, 0.5, 0.32)], () => C.base) // 허벅지
    const knee = new THREE.Group(); knee.position.set(0, -0.85, 0.35)
    addV(knee, [
      tube(0, -0.05, 0.05, 0, -0.75, -0.4, 0.16, 0.12),
      tube(0, -0.75, -0.4, 0, -1.0, 0.0, 0.12, 0.1),
    ], () => C.base)
    addV(knee, [boxShape(0, -0.65, 0.17, 0.06, 0.16, 0.08)], () => C.claw) // 낫발톱
    l.add(knee); l.userData.knee = knee
    return l
  }
  const legL = leg(-1), legR = leg(1)
  g.add(legL, legR)

  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 1.95, -0.7)
  const N = 8
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r0 = Math.max(0.07, 0.42 * (1 - t)), r1 = Math.max(0.06, 0.42 * (1 - (i + 1) / (N - 1))), len = 0.4
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.02, 0, 0, -len, r0, r1)], () => (i % 2 ? C.dark : C.base))
    parent.add(s); tailSegs.push(s); parent = s; base = new THREE.Vector3(0, 0, -len)
  }

  g.userData = { torso, headGrp, jaw, legs: [legL, legR], tailSegs }
  return g
}

// 알로사우루스 — 쥐라기 사냥꾼, 눈 위 붉은 볏 + 3발가락 앞발
export function makeAllosaurusVox() {
  const C = {
    base: col('#8A5A3C'), dark: col('#5E3C24'), belly: col('#B58A5E'), crest: col('#A34A34'),
    teeth: col('#F4F1E4'), claw: col('#181818'), eye: col('#101010'), white: col('#f5f5f5'),
  }
  const g = new THREE.Group()
  const skin = (x, y, z) => (y < 2.55 ? C.belly : (hash3(Math.floor(x * 2), Math.floor(y * 1.4), Math.floor(z * 2)) > 0.72 ? C.dark : C.base))

  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 3.0, 0.1, 0.7, 0.9, 1.65), ellipsoid(0, 3.0, 1.65, 0.6, 0.72, 0.8), ellipsoid(0, 3.05, -1.15, 0.68, 0.82, 0.85)], skin)
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 3.35, 2.0)
  addV(headGrp, [tube(0, 0, 0, 0, 0.55, 0.9, 0.4, 0.34), ellipsoid(0, 0.6, 1.25, 0.42, 0.42, 0.6), tube(0, 0.5, 1.4, 0, 0.35, 2.45, 0.36, 0.2)], (x, y, z) => (y < 0.2 && z > 1.2 ? C.belly : C.base))
  addV(headGrp, [boxShape(0.3, 0.26, 1.7, 0.05, 0.08, 0.78), boxShape(-0.3, 0.26, 1.7, 0.05, 0.08, 0.78)], () => C.teeth)
  for (const sx of [1, -1]) {
    addV(headGrp, [boxShape(sx * 0.34, 0.85, 1.05, 0.09, 0.16, 0.32)], () => C.crest)
    addV(headGrp, [ellipsoid(sx * 0.42, 0.6, 1.2, 0.1, 0.13, 0.13)], () => C.eye)
    addV(headGrp, [boxShape(sx * 0.5, 0.66, 1.28, 0.04, 0.04, 0.04)], () => C.white)
  }
  const jaw = new THREE.Group(); jaw.position.set(0, 0.3, 1.1)
  addV(jaw, [tube(0, -0.16, 0, 0, -0.22, 1.35, 0.28, 0.16)], () => C.dark)
  addV(jaw, [boxShape(0.24, -0.02, 0.7, 0.04, 0.06, 0.62), boxShape(-0.24, -0.02, 0.7, 0.04, 0.06, 0.62)], () => C.teeth)
  headGrp.add(jaw)
  g.add(headGrp)

  const arm = (sx) => {
    const a = new THREE.Group(); a.position.set(sx * 0.5, 2.75, 1.6); a.rotation.x = 0.75
    addV(a, [tube(0, 0, 0, 0, -0.7, 0.12, 0.15, 0.1)], () => C.base)
    for (const cx of [-0.08, 0, 0.08]) addV(a, [boxShape(cx, -0.82, 0.2, 0.04, 0.12, 0.06)], () => C.claw)
    return a
  }
  g.add(arm(-1), arm(1))

  const leg = (sx) => {
    const l = new THREE.Group(); l.position.set(sx * 0.62, 3.0, -0.4)
    addV(l, [ellipsoid(0, -0.55, 0.35, 0.4, 0.8, 0.5)], () => C.base) // 허벅지
    const knee = new THREE.Group(); knee.position.set(0, -1.05, 0.4)
    addV(knee, [
      tube(0, 0.05, 0.05, 0, -1.45, -0.45, 0.26, 0.18),
      tube(0, -1.45, -0.45, 0, -1.9, 0.05, 0.18, 0.16),
    ], () => C.base)
    for (const tx of [-0.18, 0, 0.18]) {
      addV(knee, [tube(tx, -1.95, 0.05, tx, -1.97, 0.5, 0.1, 0.08)], () => C.base)
      addV(knee, [boxShape(tx, -1.99, 0.65, 0.06, 0.06, 0.1)], () => C.claw)
    }
    l.add(knee); l.userData.knee = knee
    return l
  }
  const legL = leg(-1), legR = leg(1)
  g.add(legL, legR)

  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 3.0, -1.1)
  const N = 9
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r0 = Math.max(0.12, 0.9 * (1 - t)), r1 = Math.max(0.1, 0.9 * (1 - (i + 1) / (N - 1))), len = 0.62
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.05, 0, -0.03, -len, r0, r1)], (x, y) => (y < -r0 * 0.3 ? C.belly : C.base))
    parent.add(s); tailSegs.push(s); parent = s; base = new THREE.Vector3(0, -0.07, -len)
  }

  g.userData = { torso, headGrp, jaw, legs: [legL, legR], tailSegs }
  return g
}

// 콤프소그나투스 — 작은 육식(서브 몹), 긴 꼬리
export function makeCompyVox() {
  const C = {
    base: col('#9AA84E'), dark: col('#6E7A34'), belly: col('#C7D089'), stripe: col('#57612A'),
    claw: col('#181818'), eye: col('#101010'),
  }
  const g = new THREE.Group()
  const torso = new THREE.Group()
  addV(torso, [ellipsoid(0, 1.15, 0.1, 0.28, 0.32, 0.6)], (x, y, z) => (y > 1.4 && Math.abs(x) < 0.18 ? C.stripe : (y < 1.0 ? C.belly : C.base)))
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 1.28, 0.6)
  addV(headGrp, [tube(0, 0, 0, 0, 0.15, 0.25, 0.16, 0.14), ellipsoid(0, 0.2, 0.4, 0.18, 0.18, 0.24), tube(0, 0.14, 0.55, 0, 0.1, 0.95, 0.09, 0.04)], () => C.base)
  for (const sx of [1, -1]) addV(headGrp, [ellipsoid(sx * 0.13, 0.28, 0.45, 0.06, 0.07, 0.07)], () => C.eye)
  const jaw = new THREE.Group(); jaw.position.set(0, 0.08, 0.5)
  addV(jaw, [tube(0, -0.02, 0, 0, -0.04, 0.5, 0.09, 0.05)], () => C.dark)
  headGrp.add(jaw)
  g.add(headGrp)

  const leg = (sx) => {
    const l = new THREE.Group(); l.position.set(sx * 0.15, 1.0, -0.05)
    addV(l, [tube(0, 0, 0.05, 0, -0.55, 0, 0.1, 0.07)], () => C.base) // 허벅지
    const knee = new THREE.Group(); knee.position.set(0, -0.5, 0.02)
    addV(knee, [tube(0, -0.05, -0.02, 0, -0.35, 0.13, 0.07, 0.05)], () => C.base)
    addV(knee, [boxShape(0, -0.37, 0.26, 0.05, 0.04, 0.1)], () => C.claw)
    l.add(knee); l.userData.knee = knee
    return l
  }
  const legL = leg(-1), legR = leg(1)
  g.add(legL, legR)

  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 1.14, -0.5)
  const N = 6
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), r0 = Math.max(0.05, 0.28 * (1 - t)), r1 = Math.max(0.045, 0.28 * (1 - (i + 1) / (N - 1))), len = 0.34
    const s = new THREE.Group(); s.position.copy(base)
    addV(s, [tube(0, 0, 0.02, 0, 0, -len, r0, r1)], () => (i % 2 ? C.dark : C.base))
    parent.add(s); tailSegs.push(s); parent = s; base = new THREE.Vector3(0, 0, -len)
  }

  g.userData = { torso, headGrp, jaw, legs: [legL, legR], tailSegs }
  return g
}
