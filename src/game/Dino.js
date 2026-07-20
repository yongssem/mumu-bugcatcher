// 공룡 복셀 메쉬 — 박스 조립 + userData 파트 참조 (CLAUDE.md §3)
// makeTrexMesh: 실제 비율(1유닛=1m, 몸길이 ~12m)·수평 자세·5단 테이퍼 꼬리·
// 굽은 발끝보행 뒷다리·짧은 앞발. 게임 투입 시 scale로 축소해서 사용
import * as THREE from 'three'

const COLORS = {
  body: '#5F7A3A',   // 공룡 올리브 (디자인 토큰)
  belly: '#8FA96B',
  dark: '#4C6330',
  teeth: '#F2EFE2',
  eye: '#C9A227',    // 공룡 눈 호박색 (디자인 토큰)
  claw: '#E8E0C8',
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

// 티라노사우루스 — 고해상도(작은 박스). 원점: 두 발 사이 지면, 정면: +Z
export function makeTrexMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#5F7A3A' }),
    side: new THREE.MeshLambertMaterial({ color: '#516A32' }), // 측면 음영(둥근 느낌)
    dorsal: new THREE.MeshLambertMaterial({ color: '#455A2A' }), // 등 짙은 능선
    belly: new THREE.MeshLambertMaterial({ color: '#94AE6F' }),
    teeth: new THREE.MeshLambertMaterial({ color: '#F4F1E4' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
    claw: new THREE.MeshLambertMaterial({ color: '#E4DAC0' }),
    dark: new THREE.MeshLambertMaterial({ color: '#33270f' }), // 콧구멍·입안
  }
  const g = new THREE.Group()

  // ---------- 몸통: z를 따라 얇은 단면 슬랩을 쌓아 둥근 실루엣 ----------
  const torso = new THREE.Group()
  // [z, y중심, 폭, 높이]
  const slabs = [
    [2.25, 3.72, 1.05, 1.35], [1.7, 3.72, 1.4, 1.75], [1.15, 3.7, 1.62, 2.05],
    [0.55, 3.66, 1.72, 2.2], [-0.05, 3.62, 1.72, 2.25], [-0.65, 3.58, 1.62, 2.2],
    [-1.25, 3.54, 1.42, 1.95], [-1.8, 3.5, 1.15, 1.6],
  ]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.68, M.body, 0, y, z))
    torso.add(box(w * 0.78, 0.46, 0.66, M.belly, 0, y - h / 2 + 0.26, z)) // 배(밝게)
    torso.add(box(0.16, h * 0.8, 0.64, M.side, w / 2 - 0.02, y + 0.05, z)) // 측면 음영
    torso.add(box(0.16, h * 0.8, 0.64, M.side, -w / 2 + 0.02, y + 0.05, z))
  }
  // 등줄기 능선 (짙은 돌기 줄)
  for (let i = 0; i < 8; i++) torso.add(box(0.4, 0.26, 0.4, M.dorsal, 0, 4.82 - i * 0.02, 2.1 - i * 0.52))
  g.add(torso)

  // ---------- 머리+목 (포효 시 통째로 들림) — 피벗: 목 밑동 ----------
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 3.95, 2.4)
  // 목 (아래→위 S자, 앞으로) 세 마디
  headGrp.add(box(1.0, 1.1, 0.9, M.body, 0, 0.2, 0.35))
  headGrp.add(box(0.92, 0.98, 0.85, M.body, 0, 0.5, 0.95))
  headGrp.add(box(0.88, 0.9, 0.8, M.body, 0, 0.72, 1.5))
  // 두개골 (뒤통수 넓고 주둥이로 좁아짐) — 3단 테이퍼
  headGrp.add(box(0.95, 0.92, 0.75, M.body, 0, 0.95, 2.0))   // 뒤통수
  headGrp.add(box(0.82, 0.78, 0.7, M.body, 0, 0.9, 2.65))    // 눈 부위
  headGrp.add(box(0.66, 0.6, 0.7, M.body, 0, 0.82, 3.3))     // 주둥이 앞
  headGrp.add(box(0.56, 0.46, 0.4, M.body, 0, 0.78, 3.72))   // 코끝
  // 눈두덩(브로우) + 눈 + 동공
  headGrp.add(box(0.22, 0.16, 0.42, M.dorsal, 0.42, 1.18, 2.55))
  headGrp.add(box(0.22, 0.16, 0.42, M.dorsal, -0.42, 1.18, 2.55))
  for (const sx of [1, -1]) {
    headGrp.add(box(0.12, 0.28, 0.28, M.eye, sx * 0.44, 0.98, 2.6))
    headGrp.add(box(0.06, 0.14, 0.14, M.pupil, sx * 0.5, 0.98, 2.66))
  }
  // 콧구멍
  headGrp.add(box(0.1, 0.1, 0.1, M.dark, 0.2, 0.92, 3.78))
  headGrp.add(box(0.1, 0.1, 0.1, M.dark, -0.2, 0.92, 3.78))
  // 윗입술/잇몸 + 윗니 (개별 이빨 여러 개)
  headGrp.add(box(0.7, 0.16, 1.7, M.body, 0, 0.5, 3.0))
  for (let i = 0; i < 7; i++) {
    const z = 2.35 + i * 0.22
    for (const sx of [1, -1]) headGrp.add(box(0.09, 0.22 - (i > 4 ? 0.06 : 0), 0.1, M.teeth, sx * 0.3, 0.34, z))
  }
  // 아래턱 그룹 — 피벗: 턱 관절 (벌리면 rotation.x +)
  const jaw = new THREE.Group()
  jaw.position.set(0, 0.42, 2.15)
  jaw.add(box(0.62, 0.34, 1.7, M.body, 0, -0.22, 0.75))       // 턱뼈
  jaw.add(box(0.5, 0.18, 1.5, M.dark, 0, -0.08, 0.8))         // 입안
  for (let i = 0; i < 6; i++) {
    const z = 0.35 + i * 0.24
    for (const sx of [1, -1]) jaw.add(box(0.08, 0.18, 0.1, M.teeth, sx * 0.24, 0.02, z))
  }
  headGrp.add(jaw)
  g.add(headGrp)

  // ---------- 짧은 앞발 (두 손가락) — 피벗: 어깨 ----------
  const makeArm = (sx) => {
    const arm = new THREE.Group()
    arm.position.set(sx * 0.78, 3.15, 2.05)
    arm.rotation.x = 0.5
    arm.add(box(0.26, 0.5, 0.28, M.body, 0, -0.22, 0.02))   // 상완
    arm.add(box(0.2, 0.42, 0.22, M.body, 0, -0.6, 0.1))     // 전완
    arm.add(box(0.08, 0.26, 0.1, M.claw, -0.06, -0.86, 0.16))
    arm.add(box(0.08, 0.26, 0.1, M.claw, 0.06, -0.86, 0.16))
    return arm
  }
  const armL = makeArm(-1), armR = makeArm(1)
  g.add(armL, armR)

  // ---------- 뒷다리 (발끝보행) — 피벗: 고관절 ----------
  const makeLeg = (sx) => {
    const leg = new THREE.Group()
    leg.position.set(sx * 0.86, 3.5, -0.5)
    // 허벅지 (두 박스로 근육 볼륨)
    const thigh = box(0.72, 1.75, 1.15, M.body, 0, -0.78, 0.2); thigh.rotation.x = 0.32
    const thighF = box(0.6, 1.2, 0.55, M.side, 0, -0.6, 0.75); thighF.rotation.x = 0.32
    // 정강이
    const shin = box(0.44, 1.55, 0.62, M.body, 0, -2.05, 0.12); shin.rotation.x = -0.5
    const shinM = box(0.3, 1.3, 0.4, M.side, 0.02, -2.05, 0.32); shinM.rotation.x = -0.5
    // 발목→중족골 (발꿈치 들림)
    const meta = box(0.34, 1.0, 0.4, M.body, 0, -3.0, -0.05); meta.rotation.x = 0.26
    const foot = box(0.58, 0.32, 0.9, M.body, 0, -3.32, 0.32)
    leg.add(thigh, thighF, shin, shinM, meta, foot)
    // 앞 발가락 3개 (2마디 + 발톱)
    for (const tx of [-0.2, 0, 0.2]) {
      leg.add(box(0.17, 0.24, 0.4, M.body, tx, -3.34, 0.72))
      leg.add(box(0.15, 0.2, 0.32, M.body, tx, -3.36, 1.05))
      leg.add(box(0.11, 0.16, 0.22, M.claw, tx, -3.38, 1.28))
    }
    // 뒤 며느리발톱
    leg.add(box(0.1, 0.14, 0.2, M.claw, 0, -3.3, -0.05))
    return leg
  }
  const legL = makeLeg(-1), legR = makeLeg(1)
  g.add(legL, legR)

  // ---------- 꼬리: 8단 매끄러운 테이퍼 (중첩 그룹) ----------
  const tailSegs = []
  const lens = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]
  const hs = [1.75, 1.5, 1.25, 1.0, 0.78, 0.58, 0.4, 0.24]
  const ws = [1.35, 1.15, 0.95, 0.76, 0.58, 0.42, 0.28, 0.16]
  let parent = g
  let base = new THREE.Vector3(0, 3.5, -2.15)
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Group()
    seg.position.copy(base)
    seg.add(box(ws[i], hs[i], lens[i] + 0.06, M.body, 0, 0, -lens[i] / 2))
    seg.add(box(ws[i] * 0.7, 0.4, lens[i], M.belly, 0, -hs[i] / 2 + 0.22, -lens[i] / 2)) // 배쪽 밝게
    if (i < 5) seg.add(box(0.28, 0.22, lens[i], M.dorsal, 0, hs[i] / 2 - 0.05, -lens[i] / 2)) // 등 능선
    parent.add(seg)
    tailSegs.push(seg)
    parent = seg
    base = new THREE.Vector3(0, -0.09, -lens[i])
  }

  g.userData = { torso, headGrp, jaw, arms: [armL, armR], legs: [legL, legR], tailSegs }
  return g
}

// 브라키오사우루스 — 목이 긴 초식 거인 (고해상도). 앞다리 길어 등이 앞으로 솟음
export function makeBrachiosaurusMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#7d8a6a' }),
    side: new THREE.MeshLambertMaterial({ color: '#6d7a5c' }),
    belly: new THREE.MeshLambertMaterial({ color: '#a2b18a' }),
    dark: new THREE.MeshLambertMaterial({ color: '#5f6b4a' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
  }
  const g = new THREE.Group()

  // 배럴 몸통 — 단면 슬랩 (가슴 앞이 높고 큼)
  const torso = new THREE.Group()
  const slabs = [[2.4, 4.5, 1.9, 2.4], [1.6, 4.35, 2.1, 2.6], [0.7, 4.2, 2.15, 2.65], [-0.2, 4.05, 2.05, 2.5], [-1.1, 3.9, 1.8, 2.2], [-1.9, 3.75, 1.45, 1.75]]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.85, M.body, 0, y, z))
    torso.add(box(w * 0.82, 0.5, 0.82, M.belly, 0, y - h / 2 + 0.28, z))
    torso.add(box(0.18, h * 0.8, 0.8, M.side, w / 2 - 0.02, y, z))
    torso.add(box(0.18, h * 0.8, 0.8, M.side, -w / 2 + 0.02, y, z))
  }
  g.add(torso)

  // 긴 목 + 작은 머리 — 계단식으로 위·앞으로 뻗음 (피벗: 어깨 위)
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 5.6, 2.5)
  const neck = [[0, 0.55, 0.86], [0.15, 1.35, 0.8], [0.32, 2.15, 0.74], [0.52, 2.9, 0.68], [0.75, 3.55, 0.6]]
  for (const [z, y, w] of neck) {
    headGrp.add(box(w, 0.9, w, M.body, 0, y, z))
    headGrp.add(box(0.16, 0.8, w * 0.85, M.side, w / 2 - 0.02, y, z))
    headGrp.add(box(0.16, 0.8, w * 0.85, M.side, -w / 2 + 0.02, y, z))
  }
  // 작은 머리 + 특유의 콧등 볏
  headGrp.add(box(0.62, 0.55, 0.95, M.body, 0, 4.05, 1.15))
  headGrp.add(box(0.5, 0.34, 0.5, M.body, 0, 3.95, 1.65))   // 주둥이
  headGrp.add(box(0.4, 0.42, 0.34, M.dark, 0, 4.4, 1.05))   // 코 볏(아치)
  for (const sx of [1, -1]) {
    headGrp.add(box(0.1, 0.16, 0.16, M.eye, sx * 0.32, 4.1, 1.35))
    headGrp.add(box(0.05, 0.09, 0.09, M.pupil, sx * 0.35, 4.1, 1.4))
  }
  g.add(headGrp)

  // 네 기둥다리 (앞다리 길어 등 경사) + 발
  const legPillar = (x, z, h) => {
    const leg = new THREE.Group()
    leg.position.set(x, h, z)
    leg.add(box(0.88, h * 0.55, 0.95, M.body, 0, -h * 0.28, 0))
    leg.add(box(0.72, h * 0.5, 0.78, M.dark, 0, -h * 0.72, 0.02))
    leg.add(box(0.98, 0.34, 1.05, M.dark, 0, -h, 0.06))
    return leg
  }
  const legs = [legPillar(-1.0, 1.95, 3.5), legPillar(1.0, 1.95, 3.5), legPillar(-1.05, -1.7, 2.95), legPillar(1.05, -1.7, 2.95)]
  g.add(...legs)

  // 긴 꼬리 (7단 매끈한 테이퍼)
  const tailSegs = []
  const lens = [1.15, 1.1, 1.05, 1.0, 0.9, 0.8, 0.7], hs = [1.7, 1.45, 1.2, 0.95, 0.7, 0.48, 0.28], ws = [1.5, 1.25, 1.0, 0.78, 0.56, 0.38, 0.22]
  let parent = g, base = new THREE.Vector3(0, 4.0, -2.5)
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Group(); s.position.copy(base)
    s.add(box(ws[i], hs[i], lens[i] + 0.06, M.body, 0, 0, -lens[i] / 2))
    s.add(box(ws[i] * 0.75, 0.42, lens[i], M.belly, 0, -hs[i] / 2 + 0.22, -lens[i] / 2))
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.08, -lens[i])
  }

  g.userData = { torso, headGrp, legs, tailSegs }
  return g
}

// 벨로시랩터 — 작고 빠른 육식공룡. 낫 발톱 + 뻣뻣한 긴 꼬리 (고해상도)
export function makeVelociraptorMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#8a6f3e' }),
    side: new THREE.MeshLambertMaterial({ color: '#79602f' }),
    belly: new THREE.MeshLambertMaterial({ color: '#c2a86a' }),
    dark: new THREE.MeshLambertMaterial({ color: '#5e4a28' }),
    stripe: new THREE.MeshLambertMaterial({ color: '#4a3a1e' }),
    teeth: new THREE.MeshLambertMaterial({ color: '#F4F1E4' }),
    claw: new THREE.MeshLambertMaterial({ color: '#E4DAC0' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
  }
  const g = new THREE.Group()

  // 몸통 (수평, 날렵) — 슬랩
  const torso = new THREE.Group()
  const slabs = [[0.95, 1.95, 0.62, 0.78], [0.4, 1.92, 0.72, 0.92], [-0.2, 1.88, 0.72, 0.92], [-0.75, 1.86, 0.6, 0.76]]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.6, M.body, 0, y, z))
    torso.add(box(w * 0.8, 0.28, 0.58, M.belly, 0, y - h / 2 + 0.15, z))
    torso.add(box(w + 0.02, 0.14, 0.56, M.stripe, 0, y + h / 2 - 0.06, z)) // 등 줄무늬
  }
  g.add(torso)

  // 머리+목 (S자 세운 목)
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 2.1, 1.05)
  headGrp.add(box(0.36, 0.5, 0.5, M.body, 0, 0.28, 0.12)) // 목
  headGrp.add(box(0.34, 0.42, 0.55, M.body, 0, 0.5, 0.5)) // 두개골 뒤
  headGrp.add(box(0.36, 0.36, 0.66, M.body, 0, 0.46, 1.0)) // 주둥이
  headGrp.add(box(0.3, 0.14, 0.6, M.body, 0, 0.32, 1.05)) // 윗입
  for (let i = 0; i < 5; i++) for (const sx of [1, -1]) headGrp.add(box(0.05, 0.1, 0.06, M.teeth, sx * 0.13, 0.24, 0.85 + i * 0.14))
  for (const sx of [1, -1]) {
    headGrp.add(box(0.09, 0.16, 0.16, M.eye, sx * 0.19, 0.58, 0.7))
    headGrp.add(box(0.05, 0.09, 0.09, M.pupil, sx * 0.22, 0.58, 0.75))
    headGrp.add(box(0.11, 0.07, 0.24, M.stripe, sx * 0.16, 0.68, 0.72)) // 눈두덩
  }
  const jaw = new THREE.Group()
  jaw.position.set(0, 0.28, 0.6)
  jaw.add(box(0.28, 0.14, 0.72, M.dark, 0, -0.08, 0.36))
  for (let i = 0; i < 5; i++) for (const sx of [1, -1]) jaw.add(box(0.05, 0.09, 0.06, M.teeth, sx * 0.11, 0.02, 0.28 + i * 0.13))
  headGrp.add(jaw)
  g.add(headGrp)

  // 깃털 팔 (2마디 + 발톱)
  const makeArm = (sx) => {
    const arm = new THREE.Group()
    arm.position.set(sx * 0.34, 1.95, 0.6); arm.rotation.x = 0.7
    arm.add(box(0.13, 0.4, 0.15, M.body, 0, -0.18, 0.02))
    arm.add(box(0.11, 0.34, 0.12, M.body, 0, -0.46, 0.08))
    for (const cx of [-0.05, 0.05]) arm.add(box(0.05, 0.18, 0.08, M.claw, cx, -0.68, 0.12))
    return arm
  }
  const armL = makeArm(-1), armR = makeArm(1); g.add(armL, armR)

  // 뒷다리 (낫 발톱 들림)
  const makeLeg = (sx) => {
    const leg = new THREE.Group()
    leg.position.set(sx * 0.3, 1.85, -0.1)
    const thigh = box(0.3, 0.9, 0.5, M.body, 0, -0.42, 0.06); thigh.rotation.x = 0.3
    const shin = box(0.2, 0.72, 0.3, M.body, 0, -1.08, 0.0); shin.rotation.x = -0.42
    const meta = box(0.16, 0.5, 0.2, M.body, 0, -1.55, 0.14); meta.rotation.x = 0.25
    const foot = box(0.22, 0.14, 0.42, M.body, 0, -1.78, 0.34)
    leg.add(thigh, shin, meta, foot)
    leg.add(box(0.15, 0.14, 0.2, M.body, 0, -1.78, 0.58))       // 앞발가락
    leg.add(box(0.09, 0.28, 0.12, M.claw, 0, -1.62, 0.5))       // 낫 발톱(치켜듦)
    return leg
  }
  const legL = makeLeg(-1), legR = makeLeg(1); g.add(legL, legR)

  // 뻣뻣한 긴 꼬리 (7단, 거의 수평)
  const tailSegs = []
  const lens = [0.55, 0.52, 0.5, 0.48, 0.46, 0.44, 0.42], ws = [0.34, 0.3, 0.26, 0.22, 0.18, 0.14, 0.1]
  let parent = g, base = new THREE.Vector3(0, 1.92, -0.7)
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Group(); s.position.copy(base)
    s.add(box(ws[i], ws[i] * 1.15, lens[i] + 0.04, i % 2 ? M.side : M.body, 0, 0, -lens[i] / 2))
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.01, -lens[i])
  }

  g.userData = { torso, headGrp, jaw, arms: [armL, armR], legs: [legL, legR], tailSegs }
  return g
}

// 알로사우루스 — 쥐라기 대표 사냥꾼. 눈 위 볏 + 3발가락 앞발 (고해상도)
export function makeAllosaurusMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#8a5a3c' }),
    side: new THREE.MeshLambertMaterial({ color: '#794d31' }),
    belly: new THREE.MeshLambertMaterial({ color: '#b58a5e' }),
    dark: new THREE.MeshLambertMaterial({ color: '#5e3c24' }),
    crest: new THREE.MeshLambertMaterial({ color: '#a34a34' }),
    teeth: new THREE.MeshLambertMaterial({ color: '#F4F1E4' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
    claw: new THREE.MeshLambertMaterial({ color: '#E4DAC0' }),
  }
  const g = new THREE.Group()

  // 몸통 슬랩
  const torso = new THREE.Group()
  const slabs = [[1.9, 3.05, 0.95, 1.25], [1.35, 3.05, 1.2, 1.6], [0.75, 3.02, 1.3, 1.75], [0.1, 2.98, 1.28, 1.75], [-0.55, 2.94, 1.12, 1.55], [-1.15, 2.9, 0.9, 1.25]]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.65, M.body, 0, y, z))
    torso.add(box(w * 0.8, 0.4, 0.63, M.belly, 0, y - h / 2 + 0.22, z))
    torso.add(box(0.15, h * 0.8, 0.6, M.side, w / 2 - 0.02, y, z))
    torso.add(box(0.15, h * 0.8, 0.6, M.side, -w / 2 + 0.02, y, z))
  }
  for (let i = 0; i < 6; i++) torso.add(box(0.3, 0.2, 0.34, M.dark, 0, 3.78 - i * 0.02, 1.7 - i * 0.5))
  g.add(torso)

  // 머리+목 — 길쭉한 두개골 + 눈 위 볏
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 3.35, 2.15)
  headGrp.add(box(0.78, 0.9, 0.8, M.body, 0, 0.25, 0.35))
  headGrp.add(box(0.7, 0.7, 0.75, M.body, 0, 0.35, 1.05)) // 뒤통수
  headGrp.add(box(0.6, 0.55, 0.7, M.body, 0, 0.32, 1.7))  // 주둥이
  headGrp.add(box(0.48, 0.4, 0.5, M.body, 0, 0.28, 2.15)) // 코끝
  headGrp.add(box(0.5, 0.14, 1.5, M.body, 0, 0.12, 1.5))  // 윗입술
  for (let i = 0; i < 7; i++) for (const sx of [1, -1]) headGrp.add(box(0.06, 0.16, 0.08, M.teeth, sx * 0.22, -0.02, 1.05 + i * 0.19))
  // 눈 위 볏(알로사우루스 특징)
  for (const sx of [1, -1]) {
    headGrp.add(box(0.14, 0.26, 0.5, M.crest, sx * 0.32, 0.72, 1.0))
    headGrp.add(box(0.12, 0.22, 0.22, M.eye, sx * 0.36, 0.42, 1.15))
    headGrp.add(box(0.06, 0.12, 0.12, M.pupil, sx * 0.4, 0.42, 1.2))
  }
  const jaw = new THREE.Group(); jaw.position.set(0, 0.06, 1.0)
  jaw.add(box(0.44, 0.26, 1.45, M.dark, 0, -0.14, 0.7))
  for (let i = 0; i < 6; i++) for (const sx of [1, -1]) jaw.add(box(0.06, 0.14, 0.08, M.teeth, sx * 0.18, 0.0, 0.25 + i * 0.2))
  headGrp.add(jaw)
  g.add(headGrp)

  const makeArm = (sx) => {
    const arm = new THREE.Group()
    arm.position.set(sx * 0.56, 2.75, 1.7); arm.rotation.x = 0.75
    arm.add(box(0.2, 0.55, 0.22, M.body, 0, -0.26, 0.04))
    arm.add(box(0.16, 0.4, 0.18, M.body, 0, -0.62, 0.12))
    for (const cx of [-0.09, 0, 0.09]) arm.add(box(0.06, 0.28, 0.09, M.claw, cx, -0.86, 0.18))
    return arm
  }
  const armL = makeArm(-1), armR = makeArm(1); g.add(armL, armR)

  const makeLeg = (sx) => {
    const leg = new THREE.Group()
    leg.position.set(sx * 0.66, 3.0, -0.4)
    const thigh = box(0.6, 1.55, 0.95, M.body, 0, -0.7, 0.16); thigh.rotation.x = 0.34
    const thighF = box(0.5, 1.0, 0.5, M.side, 0, -0.55, 0.6); thighF.rotation.x = 0.34
    const shin = box(0.38, 1.4, 0.55, M.body, 0, -1.85, 0.1); shin.rotation.x = -0.5
    const meta = box(0.3, 0.9, 0.36, M.body, 0, -2.7, -0.03); meta.rotation.x = 0.26
    const foot = box(0.5, 0.3, 0.8, M.body, 0, -3.0, 0.3)
    leg.add(thigh, thighF, shin, meta, foot)
    for (const tx of [-0.17, 0, 0.17]) {
      leg.add(box(0.15, 0.22, 0.36, M.body, tx, -3.02, 0.66))
      leg.add(box(0.1, 0.15, 0.2, M.claw, tx, -3.04, 0.9))
    }
    return leg
  }
  const legL = makeLeg(-1), legR = makeLeg(1); g.add(legL, legR)

  const tailSegs = []
  const lens = [1.0, 0.95, 0.9, 0.85, 0.8, 0.72, 0.64], hs = [1.5, 1.3, 1.08, 0.86, 0.64, 0.44, 0.26], ws = [1.05, 0.88, 0.72, 0.56, 0.42, 0.3, 0.18]
  let parent = g, base = new THREE.Vector3(0, 2.95, -1.35)
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Group(); s.position.copy(base)
    s.add(box(ws[i], hs[i], lens[i] + 0.05, M.body, 0, 0, -lens[i] / 2))
    s.add(box(ws[i] * 0.72, 0.36, lens[i], M.belly, 0, -hs[i] / 2 + 0.2, -lens[i] / 2))
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.08, -lens[i])
  }

  g.userData = { torso, headGrp, jaw, arms: [armL, armR], legs: [legL, legR], tailSegs }
  return g
}

// 콤프소그나투스 — 작은 육식공룡(서브 몹). 겁많고 빠름, 닭 크기 (고해상도)
export function makeCompyMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#9AA84E' }),
    side: new THREE.MeshLambertMaterial({ color: '#89963f' }),
    belly: new THREE.MeshLambertMaterial({ color: '#C7D089' }),
    dark: new THREE.MeshLambertMaterial({ color: '#6E7A34' }),
    stripe: new THREE.MeshLambertMaterial({ color: '#57612a' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
    claw: new THREE.MeshLambertMaterial({ color: '#E4DAC0' }),
  }
  const g = new THREE.Group()

  const torso = new THREE.Group()
  const slabs = [[0.55, 1.18, 0.4, 0.5], [0.15, 1.16, 0.48, 0.58], [-0.3, 1.14, 0.38, 0.48]]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.42, M.body, 0, y, z))
    torso.add(box(w * 0.8, 0.18, 0.4, M.belly, 0, y - h / 2 + 0.1, z))
    torso.add(box(w + 0.02, 0.1, 0.4, M.stripe, 0, y + h / 2 - 0.04, z))
  }
  g.add(torso)

  const headGrp = new THREE.Group()
  headGrp.position.set(0, 1.28, 0.68)
  headGrp.add(box(0.22, 0.3, 0.28, M.body, 0, 0.2, 0.1)) // 목
  headGrp.add(box(0.26, 0.26, 0.32, M.body, 0, 0.28, 0.4)) // 머리
  headGrp.add(box(0.2, 0.14, 0.34, M.body, 0, 0.2, 0.66)) // 주둥이
  for (const sx of [1, -1]) {
    headGrp.add(box(0.08, 0.11, 0.11, M.eye, sx * 0.13, 0.34, 0.42))
    headGrp.add(box(0.04, 0.06, 0.06, M.pupil, sx * 0.15, 0.34, 0.46))
  }
  const jaw = new THREE.Group()
  jaw.position.set(0, 0.12, 0.5)
  jaw.add(box(0.18, 0.07, 0.32, M.dark, 0, -0.04, 0.16))
  headGrp.add(jaw)
  g.add(headGrp)

  const makeArm = (sx) => {
    const arm = new THREE.Group()
    arm.position.set(sx * 0.18, 1.16, 0.32); arm.rotation.x = 0.6
    arm.add(box(0.07, 0.26, 0.08, M.body, 0, -0.12, 0.02))
    arm.add(box(0.04, 0.1, 0.05, M.claw, 0, -0.28, 0.05))
    return arm
  }
  g.add(makeArm(-1), makeArm(1))

  const makeLeg = (sx) => {
    const leg = new THREE.Group()
    leg.position.set(sx * 0.16, 1.02, -0.05)
    const thigh = box(0.15, 0.5, 0.22, M.body, 0, -0.24, 0.04); thigh.rotation.x = 0.28
    const shin = box(0.1, 0.42, 0.13, M.body, 0, -0.62, 0.0); shin.rotation.x = -0.38
    const foot = box(0.13, 0.08, 0.3, M.body, 0, -0.86, 0.12)
    leg.add(thigh, shin, foot)
    leg.add(box(0.06, 0.07, 0.1, M.claw, 0, -0.87, 0.3))
    return leg
  }
  const legL = makeLeg(-1), legR = makeLeg(1)
  g.add(legL, legR)

  const tailSegs = []
  const lens = [0.5, 0.46, 0.42, 0.38, 0.34], ws = [0.28, 0.22, 0.17, 0.12, 0.08]
  let parent = g, base = new THREE.Vector3(0, 1.14, -0.5)
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group(); seg.position.copy(base)
    seg.add(box(ws[i], ws[i], lens[i] + 0.03, i % 2 ? M.side : M.body, 0, 0, -lens[i] / 2))
    parent.add(seg); tailSegs.push(seg); parent = seg
    base = new THREE.Vector3(0, -0.01, -lens[i])
  }

  g.userData = { torso, headGrp, jaw, legs: [legL, legR], tailSegs }
  return g
}

// 트리케라톱스 — 네발 초식공룡. 넓은 프릴 + 뿔 3개 + 부리 (고해상도, 정면 +Z)
export function makeTriceratopsMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#7a6248' }),
    side: new THREE.MeshLambertMaterial({ color: '#6a5540' }),
    belly: new THREE.MeshLambertMaterial({ color: '#9a8264' }),
    dark: new THREE.MeshLambertMaterial({ color: '#574433' }),
    frill: new THREE.MeshLambertMaterial({ color: '#c8a06a' }),
    frillD: new THREE.MeshLambertMaterial({ color: '#a9854f' }),
    horn: new THREE.MeshLambertMaterial({ color: '#ece4cc' }),
    beak: new THREE.MeshLambertMaterial({ color: '#3f3226' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
  }
  const g = new THREE.Group()

  // 몸통 — 단면 슬랩 (앞이 크고 뒤로 좁아짐)
  const torso = new THREE.Group()
  const slabs = [[1.6, 2.35, 1.9, 1.9], [1.0, 2.4, 2.0, 2.05], [0.35, 2.4, 1.95, 2.05], [-0.35, 2.35, 1.8, 1.9], [-1.05, 2.3, 1.55, 1.65], [-1.6, 2.25, 1.25, 1.35]]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.72, M.body, 0, y, z))
    torso.add(box(w * 0.8, 0.44, 0.7, M.belly, 0, y - h / 2 + 0.24, z))
    torso.add(box(0.16, h * 0.8, 0.68, M.side, w / 2 - 0.02, y, z))
    torso.add(box(0.16, h * 0.8, 0.68, M.side, -w / 2 + 0.02, y, z))
  }
  g.add(torso)

  // 머리 그룹 (프릴·뿔·부리) — 피벗: 목
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 2.5, 2.2)
  // 프릴 (판 + 가장자리 스캘럽 돌기)
  headGrp.add(box(2.1, 2.1, 0.35, M.frill, 0, 0.55, -0.15))
  headGrp.add(box(2.3, 0.5, 0.28, M.frillD, 0, 1.5, -0.12)) // 윗 테두리
  for (const sx of [1, -1]) for (let i = 0; i < 3; i++) headGrp.add(box(0.3, 0.32, 0.24, M.frillD, sx * (0.75 + i * 0.35), 1.25 - i * 0.5, -0.1))
  // 두개골 + 볼
  headGrp.add(box(1.25, 1.15, 1.0, M.body, 0, 0.05, 0.55))
  headGrp.add(box(1.0, 0.85, 0.7, M.body, 0, -0.05, 1.25))  // 주둥이
  // 부리 (앵무 부리)
  headGrp.add(box(0.5, 0.42, 0.5, M.beak, 0, -0.3, 1.75))
  headGrp.add(box(0.32, 0.28, 0.4, M.beak, 0, -0.12, 1.95))
  // 뿔 3개 — 긴 눈썹뿔 2(앞으로 뻗음) + 짧은 코뿔. 회전 박스로 매끈하게
  for (const sx of [1, -1]) {
    const h1 = box(0.2, 1.15, 0.22, M.horn, sx * 0.46, 0.9, 1.2); h1.rotation.x = -0.6; headGrp.add(h1)
    const h2 = box(0.11, 0.45, 0.13, M.horn, sx * 0.46, 1.32, 1.5); h2.rotation.x = -0.6; headGrp.add(h2)
  }
  const noseH = box(0.24, 0.62, 0.26, M.horn, 0, 0.3, 1.7); noseH.rotation.x = -0.4; headGrp.add(noseH)
  // 눈
  for (const sx of [1, -1]) {
    headGrp.add(box(0.14, 0.22, 0.22, M.eye, sx * 0.6, 0.2, 0.85))
    headGrp.add(box(0.07, 0.12, 0.12, M.pupil, sx * 0.66, 0.2, 0.9))
  }
  g.add(headGrp)

  // 네 다리 (관절 있는 코끼리 다리 + 발가락)
  const legPillar = (x, z, front) => {
    const leg = new THREE.Group()
    leg.position.set(x, 2.05, z)
    leg.add(box(0.68, 1.15, 0.8, M.body, 0, -0.55, 0)) // 상단 근육
    leg.add(box(0.56, 1.0, 0.66, M.dark, 0, -1.55, 0.02)) // 하단
    leg.add(box(0.78, 0.28, 0.92, M.dark, 0, -2.05, 0.1)) // 발
    for (const tx of [-0.24, 0, 0.24]) leg.add(box(0.18, 0.16, 0.24, M.horn, tx, -2.06, 0.5)) // 발톱
    return leg
  }
  const legs = [legPillar(-0.82, 1.5, 1), legPillar(0.82, 1.5, 1), legPillar(-0.86, -1.35), legPillar(0.86, -1.35)]
  g.add(...legs)

  // 짧고 굵은 꼬리 (4단 테이퍼)
  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 2.3, -1.85)
  const lens = [0.8, 0.72, 0.64, 0.56], hs = [1.35, 1.05, 0.75, 0.48], ws = [1.3, 1.0, 0.7, 0.42]
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group(); s.position.copy(base)
    s.add(box(ws[i], hs[i], lens[i] + 0.05, M.body, 0, 0, -lens[i] / 2))
    s.add(box(ws[i] * 0.7, 0.36, lens[i], M.belly, 0, -hs[i] / 2 + 0.2, -lens[i] / 2))
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.06, -lens[i])
  }

  g.userData = { torso, headGrp, legs, tailSegs }
  return g
}

// 스테고사우루스 — 네발 초식. 아치형 등 + 큰 골판 2열 + 꼬리 가시(고해상도)
export function makeStegosaurusMesh() {
  const M = {
    body: new THREE.MeshLambertMaterial({ color: '#6f7a48' }),
    side: new THREE.MeshLambertMaterial({ color: '#606a3e' }),
    belly: new THREE.MeshLambertMaterial({ color: '#8b9560' }),
    dark: new THREE.MeshLambertMaterial({ color: '#4f5834' }),
    plate: new THREE.MeshLambertMaterial({ color: '#b5643c' }),
    plateD: new THREE.MeshLambertMaterial({ color: '#8f4a2b' }),
    spike: new THREE.MeshLambertMaterial({ color: '#ece4cc' }),
    eye: new THREE.MeshLambertMaterial({ color: '#C9A227' }),
    pupil: new THREE.MeshLambertMaterial({ color: '#241a08' }),
  }
  const g = new THREE.Group()

  // 몸통 — 등이 활처럼 솟은 아치 (엉덩이 높고 어깨 낮음)
  const torso = new THREE.Group()
  const slabs = [[1.9, 2.0, 1.25, 1.3], [1.25, 2.35, 1.5, 1.8], [0.55, 2.7, 1.65, 2.25], [-0.2, 2.75, 1.65, 2.35], [-0.95, 2.55, 1.45, 2.0], [-1.6, 2.3, 1.15, 1.5]]
  for (const [z, y, w, h] of slabs) {
    torso.add(box(w, h, 0.72, M.body, 0, y, z))
    torso.add(box(w * 0.8, 0.42, 0.7, M.belly, 0, y - h / 2 + 0.23, z))
    torso.add(box(0.16, h * 0.8, 0.68, M.side, w / 2 - 0.02, y, z))
    torso.add(box(0.16, h * 0.8, 0.68, M.side, -w / 2 + 0.02, y, z))
  }
  g.add(torso)

  // 작고 낮은 머리 (땅으로 숙임)
  const headGrp = new THREE.Group()
  headGrp.position.set(0, 1.75, 1.9)
  headGrp.add(box(0.66, 0.6, 0.7, M.body, 0, -0.05, 0.4))
  headGrp.add(box(0.56, 0.46, 0.7, M.body, 0, -0.18, 1.0))  // 주둥이
  headGrp.add(box(0.5, 0.18, 0.35, M.dark, 0, -0.35, 1.35)) // 부리
  for (const sx of [1, -1]) {
    headGrp.add(box(0.11, 0.16, 0.16, M.eye, sx * 0.3, 0.05, 0.55))
    headGrp.add(box(0.06, 0.09, 0.09, M.pupil, sx * 0.34, 0.05, 0.6))
  }
  g.add(headGrp)

  // 등판 골판 (지그재그 2열, 가운데가 가장 큼)
  for (let i = 0; i < 9; i++) {
    const z = 2.0 - i * 0.5
    const h = 0.7 + Math.sin((i / 8) * Math.PI) * 0.85
    const yTop = 2.7 + Math.sin(Math.max(0, (i - 1) / 7) * Math.PI) * 0.25
    g.add(box(0.14, h, 0.4, M.plate, i % 2 ? 0.2 : -0.2, yTop + h / 2, z))
    g.add(box(0.16, h * 0.5, 0.34, M.plateD, i % 2 ? 0.2 : -0.2, yTop + h * 0.25, z)) // 밑동 짙게
  }

  // 네 다리 (뒷다리 길어 아치) + 발
  const legPillar = (x, z, h) => {
    const leg = new THREE.Group()
    leg.position.set(x, h, z)
    leg.add(box(0.62, h * 0.55, 0.72, M.body, 0, -h * 0.28, 0))
    leg.add(box(0.5, h * 0.5, 0.58, M.dark, 0, -h * 0.72, 0.02))
    leg.add(box(0.7, 0.26, 0.8, M.dark, 0, -h, 0.06))
    return leg
  }
  const legs = [legPillar(-0.68, 1.55, 1.4), legPillar(0.68, 1.55, 1.4), legPillar(-0.76, -1.35, 2.35), legPillar(0.76, -1.35, 2.35)]
  g.add(...legs)

  // 꼬리 (4단 하향) + 끝 가시 4개(타고마이저)
  const tailSegs = []
  let parent = g, base = new THREE.Vector3(0, 2.25, -1.9)
  const lens = [0.85, 0.8, 0.75, 0.7], hs = [1.35, 1.05, 0.78, 0.55], ws = [1.15, 0.88, 0.62, 0.42]
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group(); s.position.copy(base)
    s.add(box(ws[i], hs[i], lens[i] + 0.05, i % 2 ? M.side : M.body, 0, 0, -lens[i] / 2))
    s.add(box(ws[i] * 0.7, 0.32, lens[i], M.belly, 0, -hs[i] / 2 + 0.18, -lens[i] / 2))
    if (i === 3) for (const sx of [1, -1]) {
      const s1 = box(0.12, 0.7, 0.12, M.spike, sx * 0.2, 0.2, -lens[i] + 0.2); s1.rotation.x = 0.5; s.add(s1)
      const s2 = box(0.11, 0.6, 0.11, M.spike, sx * 0.2, 0.15, -lens[i] + 0.5); s2.rotation.x = 0.7; s.add(s2)
    }
    parent.add(s); tailSegs.push(s); parent = s
    base = new THREE.Vector3(0, -0.08, -lens[i])
  }

  g.userData = { torso, headGrp, legs, tailSegs }
  return g
}
