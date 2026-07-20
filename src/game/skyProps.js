// ☁️ 하늘 거대 실루엣 — 작아진 시점에서 '거대한 인간세계'가 머리 위로 지나간다.
//   손·운동화·종이비행기·새·연·공·잠자리채가 하늘을 천천히 가로지른다 (Grounded식 스케일 연출).
// MeshBasicMaterial(안개 영향)로 납작한 실루엣. 낮=역광 어두운 실루엣 / 밤=달빛 밝은 톤.
import * as THREE from 'three'

const box = (w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); return g
}

// 손 흔들기 ✋
function hand(m) {
  const g = new THREE.Group()
  g.add(box(2.0, 2.2, 0.7, m, 0, 0, 0))                       // 손바닥
  const fx = [-0.72, -0.24, 0.24, 0.72], fh = [1.3, 1.6, 1.5, 1.2]
  for (let i = 0; i < 4; i++) g.add(box(0.42, fh[i], 0.6, m, fx[i], 1.1 + fh[i] / 2 - 0.3, 0)) // 손가락
  g.add(box(0.5, 1.1, 0.6, m, -1.15, 0.1, 0, 0, 0, 0.7))      // 엄지
  g.add(box(1.4, 1.6, 0.7, m, 0, -1.7, 0))                    // 손목/소매
  return g
}

// 운동화 👟
function shoe(m) {
  const g = new THREE.Group()
  g.add(box(3.6, 0.7, 1.4, m, 0, 0, 0))                       // 밑창
  g.add(box(2.6, 1.2, 1.3, m, -0.3, 0.85, 0))                // 뒤축(발등)
  g.add(box(1.3, 0.7, 1.25, m, 1.4, 0.45, 0))                // 앞코
  g.add(box(0.9, 1.3, 1.1, m, -1.5, 1.3, 0))                 // 발목
  return g
}

// 종이비행기 ✈️
function plane(m) {
  const g = new THREE.Group()
  g.add(box(3.2, 0.12, 0.5, m, 0, 0, 0))                      // 동체
  g.add(box(2.4, 0.1, 1.8, m, -0.3, 0.05, 1.0, 0, 0, 0, 0.35))   // 오른 날개 (약간 접힘)
  g.add(box(2.4, 0.1, 1.8, m, -0.3, 0.05, -1.0, 0, 0, 0, -0.35)) // 왼 날개
  g.add(box(0.8, 0.6, 0.1, m, -1.4, 0.3, 0))                  // 꼬리 날개
  return g
}

// 새 🐦 (날개 편 실루엣)
function bird(m) {
  const g = new THREE.Group()
  g.add(box(1.8, 0.9, 0.9, m, 0, 0, 0))                       // 몸통
  g.add(box(0.9, 0.7, 0.7, m, 1.2, 0.3, 0))                   // 머리
  g.add(box(0.7, 0.15, 0.1, m, 1.9, 0.25, 0))                // 부리
  const wing = (z, rz) => { const w = box(2.6, 0.14, 1.1, m, -0.3, 0.3, z, 0, 0, rz); return w }
  const wl = wing(1.2, 0.25), wr = wing(-1.2, -0.25)
  g.add(wl, wr); g.userData.flap = [wl, wr]                   // BugHunt가 펄럭이게
  g.add(box(1.2, 0.5, 0.1, m, -1.5, 0.1, 0))                  // 꼬리
  return g
}

// 연 🪁
function kite(m) {
  const g = new THREE.Group()
  const d = box(2.2, 2.2, 0.1, m, 0, 0, 0, 0, 0, Math.PI / 4) // 마름모
  d.scale.set(1, 1.4, 1); g.add(d)
  for (let i = 0; i < 4; i++) g.add(box(0.35, 0.35, 0.1, m, 0, -2.0 - i * 0.9, 0)) // 꼬리
  return g
}

// 공 ⚽ (줄무늬 없는 큰 실루엣 구)
function ball(m) {
  const g = new THREE.Group()
  const s = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), m); g.add(s); return g
}

// 잠자리채 🥅 (테마 소품 — 누군가 위에서 휘두르는 느낌)
function net(m) {
  const g = new THREE.Group()
  g.add(box(0.35, 5.0, 0.35, m, 0, -2.2, 0))                  // 자루
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.18, 8, 20), m); hoop.rotation.x = Math.PI / 2; g.add(hoop)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.2, 16, 1, true), m); cone.position.y = -1.1; g.add(cone)
  return g
}

const BUILDERS = { hand, shoe, plane, bird, kite, ball, net }
export const SKY_TYPES = Object.keys(BUILDERS)

// type → 실루엣 그룹. color: 실루엣 톤(낮 어둡게 / 밤 밝게)
export function buildSky(type, color = '#2E3A47') {
  const fn = BUILDERS[type]; if (!fn) return null
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), fog: false }) // 안개 무시 → 또렷한 실루엣
  const g = fn(m)
  g.userData.mat = m
  return g
}
