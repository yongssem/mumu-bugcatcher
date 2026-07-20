// 하늘·날씨 — 뭉게구름, 후광 있는 해/크레이터 있는 달, 밤하늘 별, 비
// 비는 가끔(15%), 오전에 내리다 낮에 갬. 비 오는 동안 작물 성장 가속
import * as THREE from 'three'

const CLOUD_COUNT = 11
const RAIN_COUNT = 450
const STAR_COUNT = 180
const RAIN_CHANCE = 0.15 // 매일 아침 15% 확률로 비

export class Weather {
  constructor(scene) {
    this.scene = scene
    this.raining = false
    this._rainEnd = 0

    // --- 뭉게구름: 박스 3~5조각 클러스터 (입체감) ---
    // Basic 재질: 조명 무시 — 아래에서 올려다봐도 항상 하얗게
    this.clouds = []
    const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })
    const cloudMat2 = new THREE.MeshBasicMaterial({ color: '#EDF3F8', transparent: true, opacity: 0.65 })
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const g = new THREE.Group()
      const w = 3.5 + Math.random() * 4
      // 중심 덩어리
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 2.6 + Math.random() * 2), cloudMat))
      // 주변 뭉게 조각 2~4개
      const parts = 2 + Math.floor(Math.random() * 3)
      for (let j = 0; j < parts; j++) {
        const pw = 1.5 + Math.random() * 2.5
        const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.8 + Math.random() * 0.7, 1.4 + Math.random() * 1.6), cloudMat2)
        p.position.set(
          (Math.random() - 0.5) * w * 1.3,
          0.4 + Math.random() * 0.6,
          (Math.random() - 0.5) * 2.2
        )
        g.add(p)
      }
      g.position.set(-15 + Math.random() * 95, 21 + Math.random() * 8, -8 + Math.random() * 48)
      scene.add(g)
      this.clouds.push({ mesh: g, speed: 0.35 + Math.random() * 0.55, bob: Math.random() * Math.PI * 2 })
    }

    // --- 해: 밝은 코어 + 이중 후광 (은은히 회전) ---
    this.sun = new THREE.Group()
    this.sun.add(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.6), new THREE.MeshBasicMaterial({ color: '#FFE98A', fog: false })))
    const glow1 = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 4.6, 0.4),
      new THREE.MeshBasicMaterial({ color: '#FFD75E', fog: false, transparent: true, opacity: 0.4 })
    )
    const glow2 = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 6.4, 0.2),
      new THREE.MeshBasicMaterial({ color: '#FFC94A', fog: false, transparent: true, opacity: 0.16 })
    )
    glow2.rotation.z = Math.PI / 4 // 겹친 마름모 — 반짝이는 느낌
    this._sunGlow = glow2
    this.sun.add(glow1, glow2)
    scene.add(this.sun)

    // --- 달: 코어 + 크레이터 + 후광 ---
    this.moon = new THREE.Group()
    this.moon.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.5), new THREE.MeshBasicMaterial({ color: '#EDF1F8', fog: false })))
    const craterMat = new THREE.MeshBasicMaterial({ color: '#C7CEDD', fog: false })
    for (const [cx, cy, s] of [[-0.5, 0.5, 0.5], [0.55, -0.15, 0.4], [-0.1, -0.65, 0.3]]) {
      const crater = new THREE.Mesh(new THREE.BoxGeometry(s, s, 0.1), craterMat)
      crater.position.set(cx, cy, 0.3)
      this.moon.add(crater)
    }
    const moonGlow = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 3.6, 0.3),
      new THREE.MeshBasicMaterial({ color: '#B9C8E8', fog: false, transparent: true, opacity: 0.22 })
    )
    this.moon.add(moonGlow)
    scene.add(this.moon)

    // --- 별: 밤에만 반짝 (어두울수록 선명) ---
    const starPos = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      // 하늘 반구에 흩뿌리기
      const a = Math.random() * Math.PI * 2
      const elev = 0.15 + Math.random() * 0.8
      const r = 95
      starPos[i * 3] = 33 + Math.cos(a) * r * (1 - elev * 0.5)
      starPos[i * 3 + 1] = 10 + elev * 70
      starPos[i * 3 + 2] = 16 + Math.sin(a) * r * (1 - elev * 0.5)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    this.starMat = new THREE.PointsMaterial({
      color: '#FFFFFF', size: 0.45, transparent: true, opacity: 0, fog: false, sizeAttenuation: true,
    })
    this.stars = new THREE.Points(starGeo, this.starMat)
    scene.add(this.stars)

    // --- 비: 카메라 주변 박스 안에서 떨어지는 포인트들 ---
    const positions = new Float32Array(RAIN_COUNT * 3)
    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24
      positions[i * 3 + 1] = Math.random() * 15
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24
    }
    const rainGeo = new THREE.BufferGeometry()
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.rain = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: '#AEC6E4', size: 0.1, transparent: true, opacity: 0.65 })
    )
    this.rain.visible = false
    scene.add(this.rain)
  }

  // 매일 아침 날씨 굴리기 — 비가 새로 시작되면 true 반환 (알림용)
  roll() {
    const was = this.raining
    this.raining = Math.random() < RAIN_CHANCE
    // 비는 오전 한때만: 하루의 20%~50% 지점에서 갬
    if (this.raining) this._rainEnd = 0.2 + Math.random() * 0.3
    this.rain.visible = this.raining
    return this.raining && !was
  }

  update(dt, t, camera, darkness = 0) {
    // 비 그침 (낮 중간에)
    if (this.raining && t > this._rainEnd && t < 0.7) {
      this.raining = false
      this.rain.visible = false
    }

    // 구름 드리프트 + 살짝 둥실둥실
    for (const c of this.clouds) {
      c.bob += dt * 0.5
      c.mesh.position.x += c.speed * dt
      c.mesh.position.y += Math.sin(c.bob) * 0.002
      if (c.mesh.position.x > 85) c.mesh.position.x = -18
    }

    // 해: 낮 구간(0~0.7)에 동→서 호 이동 / 달: 밤 구간(0.7~1)
    const cx = 33, cz = -12, R = 60
    const dayA = Math.min(t / 0.7, 1) * Math.PI
    this.sun.position.set(cx - Math.cos(dayA) * R, Math.sin(dayA) * R * 0.65 + 3, cz)
    this.sun.visible = t < 0.72
    const nightA = t >= 0.7 ? ((t - 0.7) / 0.3) * Math.PI : 0
    this.moon.position.set(cx - Math.cos(nightA) * R, Math.sin(nightA) * R * 0.65 + 3, cz)
    this.moon.visible = t >= 0.7
    // 빌보드: 해/달의 얼굴이 항상 카메라를 향하게 (얇은 옆면만 보이는 문제 방지)
    this.sun.lookAt(camera.position)
    this.moon.lookAt(camera.position)
    this._sunGlow.rotation.z += dt * 0.25 // 후광만 은은히 회전 (반짝)

    // 별: 어두울수록 선명하게
    this.starMat.opacity = darkness * 0.95

    // 비: 카메라를 따라다니며 아래로 떨어짐
    if (this.raining) {
      this.rain.position.copy(camera.position)
      const pos = this.rain.geometry.attributes.position
      for (let i = 0; i < RAIN_COUNT; i++) {
        let y = pos.getY(i) - 20 * dt
        if (y < -2) y = 13 + Math.random() * 2
        pos.setY(i, y)
      }
      pos.needsUpdate = true
    }
  }
}
