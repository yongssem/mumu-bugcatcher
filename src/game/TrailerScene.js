// 랜딩 예고편 씬 — 석양 역광 아래 티라노가 뛰어다니고, 원시인이 창을 들고 맞선다 (CLAUDE.md §9)
// 게임 엔진과 완전 분리: 입력·물리 없음. 카메라는 잔잔한 시네마틱 흔들림만
import * as THREE from 'three'
import { makeTrexMesh } from './Dino.js'

// 석양 그라데이션 하늘 텍스처 (위 보라 → 아래 주황, 디자인 토큰 #2b1a4d→#e8703a)
function skyGradientTexture() {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0.0, '#241645') // 깊은 보라 (상단)
  g.addColorStop(0.35, '#5b3568')
  g.addColorStop(0.58, '#a24d67')
  g.addColorStop(0.78, '#e8703a') // 주황
  g.addColorStop(0.92, '#f6a23c')
  g.addColorStop(1.0, '#ffd27a') // 지평선 밝은 노을
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 해 후광 스프라이트 (지평선의 부드러운 빛 덩어리)
function sunGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,240,200,1)')
  g.addColorStop(0.3, 'rgba(255,200,120,0.7)')
  g.addColorStop(1, 'rgba(255,150,80,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// 둥근 불티 파티클 텍스처
function emberTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
  g.addColorStop(0, 'rgba(255,225,160,1)')
  g.addColorStop(1, 'rgba(255,150,70,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 16)
  return new THREE.CanvasTexture(c)
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

// 복셀 나무 — 어두운 실루엣 (뭉툭한 버섯형)
function makeTree(scale = 1) {
  const trunk = new THREE.MeshLambertMaterial({ color: '#2a1c22' })
  const leaf = new THREE.MeshLambertMaterial({ color: '#20302a' })
  const g = new THREE.Group()
  g.add(box(0.7, 3.2, 0.7, trunk, 0, 1.6, 0))
  g.add(box(2.8, 1.6, 2.8, leaf, 0, 3.6, 0))
  g.add(box(2.0, 1.0, 2.0, leaf, 0, 4.6, 0))
  g.scale.setScalar(scale)
  return g
}

// 복셀 원시인 — 티라노에게 쫓겨 도망치는 실루엣 (다리·팔이 움직이도록 관절 분리)
function makeCaveman() {
  // 역광 실루엣 씬이라 어두우면 묻힘 → 따뜻한 emissive로 작은 원시인이 도드라지게
  const skin = new THREE.MeshLambertMaterial({ color: '#c88b58', emissive: '#3a1e08', emissiveIntensity: 0.6 })
  const fur = new THREE.MeshLambertMaterial({ color: '#efd9ac', emissive: '#5a3a12', emissiveIntensity: 0.5 }) // 밝은 털옷
  const wood = new THREE.MeshLambertMaterial({ color: '#5a4026' })
  const stone = new THREE.MeshLambertMaterial({ color: '#b7bcc4' })
  const hair = new THREE.MeshLambertMaterial({ color: '#3a2818' })
  const g = new THREE.Group()

  // 다리 — 엉덩이 피벗 그룹 (달릴 때 앞뒤로 스윙)
  const legL = new THREE.Group(); legL.position.set(-0.2, 0.7, 0)
  legL.add(box(0.32, 0.72, 0.34, skin, 0, -0.36, 0))
  legL.add(box(0.4, 0.14, 0.5, hair, 0, -0.72, 0.08)) // 발
  const legR = new THREE.Group(); legR.position.set(0.2, 0.7, 0)
  legR.add(box(0.32, 0.72, 0.34, skin, 0, -0.36, 0))
  legR.add(box(0.4, 0.14, 0.5, hair, 0, -0.72, 0.08))
  g.add(legL, legR)

  // 몸통(털옷) — 살짝 앞으로 기운 달리기 자세
  const torso = new THREE.Group(); torso.position.set(0, 0.7, 0)
  torso.add(box(0.8, 0.9, 0.5, fur, 0, 0.45, 0))
  torso.rotation.x = 0.22 // 앞으로 숙임
  g.add(torso)

  // 머리 — 뒤돌아 티라노를 보는 겁먹은 얼굴
  const headGrp = new THREE.Group(); headGrp.position.set(0, 1.85, 0.05)
  headGrp.add(box(0.5, 0.5, 0.5, skin, 0, 0, 0))
  headGrp.add(box(0.55, 0.28, 0.55, hair, 0, 0.3, 0)) // 삐죽 머리
  headGrp.add(box(0.16, 0.16, 0.02, new THREE.MeshLambertMaterial({ color: '#1a120a' }), -0.12, 0.02, 0.26)) // 눈(놀란)
  headGrp.add(box(0.16, 0.16, 0.02, new THREE.MeshLambertMaterial({ color: '#1a120a' }), 0.12, 0.02, 0.26))
  headGrp.add(box(0.22, 0.14, 0.02, new THREE.MeshLambertMaterial({ color: '#3a1512' }), 0, -0.16, 0.26)) // 벌린 입(비명)
  g.add(headGrp)

  // 왼팔 — 번쩍 들어 허우적 (겁먹음)
  const armL = new THREE.Group(); armL.position.set(-0.46, 1.5, 0)
  armL.add(box(0.22, 0.66, 0.22, skin, 0, 0.28, 0))
  armL.rotation.z = 0.5 // 위로

  // 오른팔 — 창을 뒤로 끌며 도망
  const armR = new THREE.Group(); armR.position.set(0.46, 1.5, 0)
  armR.add(box(0.22, 0.66, 0.22, skin, 0, 0.24, 0))
  const spear = new THREE.Group(); spear.position.set(0, 0.36, 0)
  spear.add(box(0.08, 0.08, 2.2, wood, 0, 0, -0.5))
  spear.add(box(0.18, 0.05, 0.4, stone, 0, 0, -1.5)) // 창날
  armR.add(spear)
  armR.rotation.z = 0.35

  g.add(armL, armR)
  g.userData = { legL, legR, armL, armR, headGrp, torso }
  return g
}

// 각도 보간 (몸을 부드럽게 돌리기)
function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * Math.min(1, t)
}

export class TrailerScene {
  constructor(canvas) {
    this.canvas = canvas
    this.disposed = false

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.scene.background = skyGradientTexture()
    // 지평선 노을로 스며드는 안개 — 먼 나무가 빛에 녹아든다
    this.scene.fog = new THREE.Fog('#e8703a', 22, 62)

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
    // 프레이밍 값은 resize()에서 화면 비율(가로/세로)에 맞춰 설정
    this._baseY = 3.6
    this._camTarget = new THREE.Vector3(0, 4.4, -3) // 올려다봄 → 티라노가 상단에 크게, 하늘 배경

    // --- 조명: 역광(석양) 실루엣 ---
    this.scene.add(new THREE.AmbientLight('#43305a', 0.8)) // 차가운 보라 채움
    const backSun = new THREE.DirectionalLight('#ffb060', 2.2) // 뒤(지평선)에서 오는 따뜻한 역광
    backSun.position.set(-4, 7, -34)
    const frontFill = new THREE.DirectionalLight('#ffd9a0', 0.62) // 앞쪽 채움 (공룡 올리브가 선명하게)
    frontFill.position.set(5, 9, 22)
    this.scene.add(backSun, frontFill)

    // --- 지면 (어두운 실루엣, 살짝 따뜻) ---
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshLambertMaterial({ color: '#2a1420' })
    )
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)

    // --- 해 후광 (지평선) ---
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    sun.position.set(-3, 3.2, -40)
    sun.scale.set(46, 46, 1)
    this.scene.add(sun)

    // --- 나무 숲 (좌우로 흩뿌린 실루엣 — 중앙 앞은 비워 티라노를 살림) ---
    const treeSpots = [
      [-15, -13, 1.2], [-8, -18, 1.3], [-21, -20, 1.6], [13, -14, 1.25],
      [19, -19, 1.5], [9, -22, 1.35], [-13, -28, 1.8], [23, -29, 1.9], [0, -36, 2.1], [-25, -26, 1.7],
    ]
    for (const [x, z, s] of treeSpots) {
      const t = makeTree(s)
      t.position.set(x, 0, z)
      t.rotation.y = x * 1.7
      this.scene.add(t)
    }

    // --- 티라노 (뛰어다님 — 예고편의 주인공) ---
    this.trex = makeTrexMesh()
    this.trex.scale.setScalar(0.9)
    this.scene.add(this.trex)
    this._trexAngle = Math.PI * 0.5
    this._phase = 0

    // --- 원시인 — 티라노보다 앞서 뛰며 쫓기는 실루엣 (같은 타원 경로 위) ---
    this.caveman = makeCaveman()
    this.caveman.scale.setScalar(0.8)
    this.scene.add(this.caveman)
    this._runPhase = 0

    // --- 불티 파티클 ---
    this._embers = this._makeEmbers()
    this.scene.add(this._embers.points)

    this._t = 0
    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)

    this._loop = this._loop.bind(this)
    this._last = performance.now()
    if (import.meta.env.DEV) window.__trailer = this
    requestAnimationFrame(this._loop)
  }

  _makeEmbers() {
    const N = 70
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(N * 3)
    const spd = []
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = Math.random() * 14
      pos[i * 3 + 2] = -5 - Math.random() * 30
      spd.push(0.5 + Math.random() * 1.2)
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({
      map: emberTexture(),
      size: 0.5,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    })
    return { points: new THREE.Points(geo, mat), spd, N }
  }

  // 티라노 달리기 애니메이션 (다리 스윙·꼬리·몸 들썩·머리 흔들)
  _animateTrex(dt, speed) {
    const u = this.trex.userData
    this._phase += dt * (5 + speed * 1.4)
    const swing = Math.sin(this._phase) * 0.5
    u.legs[0].rotation.x = swing
    u.legs[1].rotation.x = -swing
    for (let i = 0; i < u.tailSegs.length; i++) {
      u.tailSegs[i].rotation.y = Math.sin(this._phase * 0.6 + i * 0.7) * 0.14
    }
    u.torso.position.y = Math.abs(Math.sin(this._phase)) * 0.13
    u.torso.rotation.z = Math.sin(this._phase) * 0.03
    u.headGrp.rotation.x = Math.sin(this._phase * 2) * 0.05
    u.jaw.rotation.x = 0.16 + Math.max(0, Math.sin(this._phase * 0.5)) * 0.12 // 살짝 벌린 입
  }

  _loop(now) {
    if (this.disposed) return
    requestAnimationFrame(this._loop)
    const dt = Math.min((now - this._last) / 1000, 0.05)
    this._last = now
    this._t += dt

    // 티라노: 앞쪽 타원을 따라 뛰어다님 (얕은 깊이 → 크게 유지하며 좌우로)
    const spd = 0.5
    this._trexAngle += dt * spd
    const rx = 6, rz = 1.8
    const cx = 0, cz = -3
    const x = cx + Math.cos(this._trexAngle) * rx
    const z = cz + Math.sin(this._trexAngle) * rz
    // 진행 방향(접선)으로 몸 돌리기
    const tx = -Math.sin(this._trexAngle) * rx
    const tz = Math.cos(this._trexAngle) * rz
    const targetYaw = Math.atan2(tx, tz)
    this.trex.position.set(x, 0, z)
    this.trex.rotation.y = lerpAngle(this.trex.rotation.y, targetYaw, 1)
    this._animateTrex(dt, 4)

    // 원시인: 티라노보다 앞선 각도로 달아남 (쫓김). 살짝 더 앞쪽(카메라쪽) 타원 → 크게 보임
    const cAng = this._trexAngle + 0.46
    const crx = 6, crz = 2.8
    const cX = cx + Math.cos(cAng) * crx
    const cZ = cz + Math.sin(cAng) * crz
    const cTanX = -Math.sin(cAng) * crx
    const cTanZ = Math.cos(cAng) * crz
    const cYaw = Math.atan2(cTanX, cTanZ)
    this._runPhase += dt * 11 // 다급한 달리기
    const rp = this._runPhase
    const bob = Math.abs(Math.sin(rp)) * 0.16
    this.caveman.position.set(cX, bob, cZ)
    this.caveman.rotation.y = lerpAngle(this.caveman.rotation.y, cYaw, 1)
    const u = this.caveman.userData
    u.legL.rotation.x = Math.sin(rp) * 0.95
    u.legR.rotation.x = -Math.sin(rp) * 0.95
    u.armL.rotation.x = Math.sin(rp * 1.2) * 0.6 // 허우적
    u.armR.rotation.x = -0.3 - Math.sin(rp * 1.2) * 0.3
    u.torso.rotation.x = 0.22 + Math.sin(rp) * 0.04
    u.headGrp.rotation.y = 0.6 + Math.sin(this._t * 4) * 0.12 // 뒤돌아보며 비명

    // 불티: 위로 떠오르며 화면 밖이면 아래에서 재등장
    const arr = this._embers.points.geometry.attributes.position.array
    for (let i = 0; i < this._embers.N; i++) {
      arr[i * 3 + 1] += this._embers.spd[i] * dt
      arr[i * 3] += Math.sin(this._t + i) * 0.004
      if (arr[i * 3 + 1] > 15) {
        arr[i * 3 + 1] = 0
        arr[i * 3] = (Math.random() - 0.5) * 40
      }
    }
    this._embers.points.geometry.attributes.position.needsUpdate = true

    // 카메라: 잔잔한 시네마틱 흔들림
    this.camera.position.x = Math.sin(this._t * 0.3) * 0.9
    this.camera.position.y = this._baseY + Math.sin(this._t * 0.23) * 0.25
    this.camera.lookAt(this._camTarget)

    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    this.camera.aspect = aspect
    // 세로(모바일)에선 좁은 가로 시야 탓에 티라노가 꽉 차므로 카메라를 뒤로 빼고 시야각을 넓힘
    const portrait = aspect < 1
    this.camera.fov = portrait ? 76 : 60
    this.camera.position.z = portrait ? 24 : 15
    this._baseY = portrait ? 5.4 : 3.6
    this._camTarget.set(0, portrait ? 5.2 : 4.4, -3)
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.disposed = true
    window.removeEventListener('resize', this._onResize)
    this.renderer.dispose()
  }
}
