// 🪀 거대 인간세계 오브젝트 — 작아진 시점을 살리는 배경 랜드마크 (Grounded식 "뒷마당에 축소").
//   야구공·음료캔·병뚜껑·구슬·동전·크레용·도토리·주사위·아이스크림막대·고무오리.
// 게임의 뭉툭·귀여운 복셀 톤에 맞춘 블록 버전. BugHunt가 서식지 경계 밖에 크게 배치한다.
import * as THREE from 'three'
import { ellipsoid, tube, boxShape, voxMesh, hash3 } from './Vox.js'

const col = (h) => new THREE.Color(h)
const MV = 0.42 // 거대 오브젝트용 굵은 복셀(뭉툭·저비용)
const add = (g, shapes, cf, vox = MV) => { const m = voxMesh(shapes, cf, vox); if (m) g.add(m); return m }
const cube = (s, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m); b.position.set(x, y, z); return b }

// ⚾ 야구공 — 흰 공 + 빨간 실밥 두 줄 (기울어진 대원)
function baseball() {
  const g = new THREE.Group(); const R = 1.8
  const n1 = new THREE.Vector3(0.62, 0.5, 0.6).normalize()
  const n2 = new THREE.Vector3(-0.62, 0.5, 0.6).normalize()
  add(g, [ellipsoid(0, R, 0, R, R, R)], (px, py, pz) => {
    const v = new THREE.Vector3(px, py - R, pz)
    const d1 = Math.abs(v.dot(n1)), d2 = Math.abs(v.dot(n2))
    return (d1 < 0.22 || d2 < 0.22) ? col('#C8402E') : col('#F2EEE2')
  })
  return g
}

// 🥤 음료 캔 — 색 몸통 + 은색 위/아래 + 라벨 띠
function can(base = '#C83A3A') {
  const g = new THREE.Group(); const R = 0.95, H = 3.2
  add(g, [tube(0, 0.2, 0, 0, H, 0, R, R)], (px, py) => {
    if (py > H - 0.2 || py < 0.45) return col('#C9CED6')          // 위/아래 은색
    if (py > H * 0.42 && py < H * 0.62) return col('#F2EAD2')     // 라벨 띠
    return col(base)
  })
  add(g, [ellipsoid(0, H, 0, R * 0.82, 0.14, R * 0.82)], () => col('#AEB4BC')) // 뚜껑
  add(g, [boxShape(R * 0.3, H + 0.05, 0, 0.18, 0.05, 0.1)], () => col('#8A9098')) // 따개
  return g
}

// 🔴 병뚜껑 — 납작한 원반 + 톱니 옆면
function bottleCap(top = '#3A6EC0') {
  const g = new THREE.Group(); const R = 1.4
  add(g, [tube(0, 0, 0, 0, 0.5, 0, R, R)], (px, py, pz) => {
    if (py > 0.42) return col(top)
    // 옆면 톱니(주름)
    const a = Math.atan2(pz, px)
    return (Math.floor(a / 0.5) & 1) ? col(top) : col('#9AA0A6')
  })
  return g
}

// 🔵 구슬 — 반짝이는 색 구 + 흰 하이라이트
function marble(base = '#4FA9E0') {
  const g = new THREE.Group(); const R = 1.3
  add(g, [ellipsoid(0, R, 0, R, R, R)], (px, py, pz) => {
    const hx = px - R * 0.4, hy = py - R * 1.45, hz = pz - R * 0.4
    return (hx * hx + hy * hy + hz * hz < 0.5) ? col('#FFFFFF') : col(base)
  })
  return g
}

// 🪙 동전 — 바닥에 놓인 납작한 금빛 원반
function coin() {
  const g = new THREE.Group(); const R = 1.7
  add(g, [tube(0, 0, 0, 0, 0.42, 0, R, R)], (px, py, pz) => {
    const rr = Math.hypot(px, pz)
    if (rr > R - 0.32) return col('#C9971E')          // 도톰한 테두리
    return py > 0.22 ? col('#F2C84E') : col('#E0B23A') // 앞/뒤 금색
  })
  add(g, [boxShape(0, 0.46, 0, 0.55, 0.05, 0.55)], () => col('#C9971E')) // 가운데 새김
  return g
}

// 🖍️ 크레용 — 색 몸통 + 뾰족 끝 + 종이 라벨 (비스듬히 누움)
function crayon(base = '#E0574F') {
  const g = new THREE.Group(); const R = 0.55
  add(g, [tube(0, 0, 0, 0, 3.4, 0, R, R)], (px, py) => (py > 1.2 && py < 2.6 ? col('#F5F0E4') : col(base)))
  add(g, [tube(0, 3.4, 0, 0, 4.1, 0, R, 0.02)], () => col(base)) // 뾰족 끝
  g.rotation.z = 1.15; g.position.y = 0.5
  return g
}

// 🌰 도토리 — 갈색 알 + 오돌토돌 모자 + 꼭지
function acorn() {
  const g = new THREE.Group(); const R = 1.3
  add(g, [ellipsoid(0, R, 0, R, R * 1.15, R)], () => col('#C8923E'))
  add(g, [ellipsoid(0, R * 1.7, 0, R * 1.05, R * 0.55, R * 1.05)], (px, py, pz) =>
    hash3(Math.floor(px * 3), Math.floor(py * 3), Math.floor(pz * 3)) > 0.55 ? col('#6A4423') : col('#7A5230'))
  add(g, [tube(0, R * 2.1, 0, 0, R * 2.6, 0, 0.14, 0.1)], () => col('#4A3420'))
  return g
}

// 🎲 주사위 — 흰 정육면체 + 검은 눈
function dice() {
  const g = new THREE.Group(); const S = 1.5
  add(g, [boxShape(0, S, 0, S, S, S)], () => col('#F2F0E8'))
  const pip = new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  g.add(cube(0.34, pip, 0, S, S + 0.02))                                   // 앞면 1
  g.add(cube(0.3, pip, -S * 0.5, S + S * 0.5, 0), cube(0.3, pip, S * 0.5, S + S * -0.5, 0)) // 윗면 2 (근사)
  g.add(cube(0.3, pip, S + 0.02, S + S * 0.45, S * 0.45), cube(0.3, pip, S + 0.02, S - S * 0.45, S * -0.45)) // 옆면
  return g
}

// 🍦 아이스크림 막대 — 바닥에 눕힌 나무 널빤지
function stick() {
  const g = new THREE.Group()
  add(g, [boxShape(0, 0.18, 0, 2.6, 0.16, 0.5)], (px) =>
    (Math.abs(px) > 2.3 ? col('#C9A86A') : col('#D8BE86'))) // 둥근 끝은 조금 진하게 근사
  return g
}

// 🦆 고무 오리 — 노란 몸 + 머리 + 주황 부리 + 눈 (연못)
function duck() {
  const g = new THREE.Group()
  add(g, [ellipsoid(0, 0.9, 0, 1.3, 0.95, 1.5)], () => col('#F5C518'))       // 몸
  add(g, [ellipsoid(0, 1.9, 1.0, 0.75, 0.75, 0.75)], () => col('#F7CE2E'))    // 머리
  add(g, [ellipsoid(0.9, 0.9, -1.2, 0.5, 0.4, 0.6)], () => col('#F0BE10'))    // 꼬리
  add(g, [boxShape(0, 1.8, 1.75, 0.28, 0.16, 0.4)], () => col('#E8863A'))     // 부리
  const eye = new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  g.add(cube(0.18, eye, 0.34, 2.05, 1.55), cube(0.18, eye, -0.34, 2.05, 1.55))
  return g
}

const BUILDERS = {
  baseball, can: () => can('#C83A3A'), soda: () => can('#3A7ED0'), juice: () => can('#E08A2E'),
  bottlecap: () => bottleCap('#3A6EC0'), redcap: () => bottleCap('#C8402E'),
  marble: () => marble('#4FA9E0'), gumball: () => marble('#C84E8A'),
  coin, crayon: () => crayon('#E0574F'), bluecrayon: () => crayon('#3A7ED0'),
  acorn, dice, stick, duck,
}

// type → THREE.Group (없으면 null)
export function buildMega(type) {
  const fn = BUILDERS[type]
  return fn ? fn() : null
}
