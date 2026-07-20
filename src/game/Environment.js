// 주변 배경 — 마을/사냥터 밖을 채우는 원경 (하늘 지평선 방지)
// 잔디 지평선(스커트) + 원경 산맥 + 언덕 + 숲 + 호수. 전부 비충돌 장식 메쉬
import * as THREE from 'three'
import { WORLD } from './World.js'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const box = (w, h, d, color, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }))
  m.position.set(x, y, z)
  return m
}

export class Environment {
  constructor(scene, opts = {}) {
    this.scene = scene
    const g = new THREE.Group()
    this.group = g

    const cx = WORLD.X_MAX / 2   // 마을 중심 x ≈ 32
    const cz = WORLD.SIZE / 2    // 마을 중심 z ≈ 16
    const rand = mulberry32(777)

    const GRASS = '#6AB150', ROCK = '#8A8F98', ROCK2 = '#7A828C', SNOW = '#eef2f5'
    const TRUNK = '#7a5233', LEAF = '#4E9440', LEAF2 = '#3E8034', WATER = '#3F76E4'

    // 🌊 동물원(무인도) — 섬 바깥을 바다로 둘러쌈 + 원경 작은 섬 + 선착장·배
    if (opts.ocean) {
      this._buildOcean(g, cx, cz, rand)
      scene.add(g)
      return
    }

    // --- 1) 바닥 스커트 — 마을 사각형(0..X_MAX, 0..SIZE)을 감싸는 잔디 평면 4개 ---
    const SK = 700
    const y0 = 1.0
    const groundMat = new THREE.MeshLambertMaterial({ color: GRASS })
    const plane = (w, d, px, pz, mat = groundMat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
      m.rotation.x = -Math.PI / 2
      m.position.set(px, y0, pz)
      g.add(m)
    }
    plane(SK, 2 * SK + WORLD.SIZE, WORLD.X_MAX + SK / 2, cz)       // 동
    plane(SK, 2 * SK + WORLD.SIZE, -SK / 2, cz)                     // 서
    plane(WORLD.X_MAX, SK, cx, WORLD.SIZE + SK / 2)                 // 남
    plane(WORLD.X_MAX, SK, cx, -SK / 2)                            // 북

    // --- 2) 원경 호수 (서남쪽) — 레퍼런스의 물가 느낌 ---
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(150, 130), new THREE.MeshLambertMaterial({ color: WATER }))
    lake.rotation.x = -Math.PI / 2
    lake.position.set(-95, 1.02, 40) // 마을 서쪽 밖 (겹치지 않게)
    g.add(lake)

    // --- 3) 원경 산맥 — 마을을 빙 두른 계단식 봉우리 ---
    const ring = (count, rMin, rMax, hMin, hMax, snow) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.35
        const r = rMin + rand() * (rMax - rMin)
        const mx = cx + Math.cos(a) * r
        const mz = cz + Math.sin(a) * r * 0.85
        const H = hMin + rand() * (hMax - hMin)
        const B = H * (1.4 + rand() * 0.5)
        const layers = 4
        for (let L = 0; L < layers; L++) {
          const t = L / layers
          const w = B * (1 - t * 0.72)
          const lh = H / layers + 0.5
          const yy = 1 + H * t + lh / 2
          const col = t < 0.55 ? GRASS : t < 0.85 ? (L % 2 ? ROCK2 : ROCK) : (snow && H > hMax * 0.8 ? SNOW : ROCK)
          g.add(box(w, lh, w, col, mx, yy, mz))
        }
      }
    }
    ring(18, 95, 165, 22, 55, true)  // 먼 산 (눈봉우리 가능)
    ring(14, 55, 90, 8, 20, false)   // 중간 언덕

    // --- 4) 숲 — 마을과 산 사이 링에 나무 클러스터 ---
    const tree = (x, z, s) => {
      g.add(box(1.1 * s, 3.2 * s, 1.1 * s, TRUNK, x, 1 + 1.6 * s, z))
      g.add(box(3.4 * s, 2.2 * s, 3.4 * s, rand() < 0.5 ? LEAF : LEAF2, x, 1 + 3.6 * s, z))
      g.add(box(2.2 * s, 1.3 * s, 2.2 * s, LEAF, x, 1 + 5.0 * s, z))
    }
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2
      const r = 40 + rand() * 55
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r * 0.9
      // 마을 사각형 안(대략)엔 심지 않음
      if (x > -2 && x < WORLD.X_MAX + 2 && z > -2 && z < WORLD.SIZE + 2) continue
      tree(x, z, 0.8 + rand() * 0.9)
    }

    // --- 5) 낮은 잔디 둔덕 (근경 풍성함) ---
    for (let i = 0; i < 18; i++) {
      const a = rand() * Math.PI * 2
      const r = 52 + rand() * 38
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r * 0.9
      if (x > -6 && x < WORLD.X_MAX + 6 && z > -6 && z < WORLD.SIZE + 6) continue
      const w = 4 + rand() * 8
      g.add(box(w, 2 + rand() * 3, w, GRASS, x, 1.5, z))
    }

    scene.add(g)
  }

  // 🌊 무인도 바다 — 섬을 둘러싼 큰 물 평면 + 원경 작은 섬 + 선착장·유람선
  // ⚠️ 바다 수면을 섬 지면(잔디 윗면 y=1)보다 한 칸 아래로 낮춤(SEA=-0.1) →
  //    육지가 물보다 확실히 높아 보이고, 블록을 깨도 바다 평면이 구멍으로 비치지 않음
  _buildOcean(g, cx, cz, rand) {
    const WATER = '#3F76E4', SAND = '#E8D6A0', GRASS = '#6AB150'
    const TRUNK = '#7a5233', LEAF = '#4E9440', PLANK = '#B08850', BOAT = '#c94f3d', BOATTOP = '#f0e6d0'
    const SEA = -0.1 // 수면 높이 (섬 잔디 윗면 y=1 보다 한 칸 아래)

    // 큰 바다 평면 (섬보다 한 칸 낮게 — 육지가 물 위로 솟은 무인도)
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshLambertMaterial({ color: WATER })
    )
    sea.rotation.x = -Math.PI / 2
    sea.position.set(cx, SEA, cz)
    g.add(sea)

    // 원경 작은 섬들 (모래 둔덕 + 잔디 + 야자수) — 수면 위로 솟게 (SEA 기준)
    const islet = (x, z, s) => {
      g.add(box(9 * s, 1.4, 9 * s, SAND, x, SEA + 0.15, z))
      g.add(box(6 * s, 1.4, 6 * s, GRASS, x, SEA + 0.85, z))
      g.add(box(0.8 * s, 3 * s, 0.8 * s, TRUNK, x, SEA + 1.55 + 1.4 * s, z))
      g.add(box(2.6 * s, 1.4 * s, 2.6 * s, LEAF, x, SEA + 2.55 + 2.6 * s, z))
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + (rand() - 0.5) * 0.5
      const r = 70 + rand() * 90
      islet(cx + Math.cos(a) * r, cz + Math.sin(a) * r * 0.9, 1.2 + rand() * 1.6)
    }

    // 🛥️ 선착장(부두) + 유람선 — 남쪽 해변 앞바다 (관람객이 배 타고 도착)
    const dockX = cx
    for (let z = -2; z >= -9; z--) { // 섬 남쪽(z<0)에서 바다로 뻗는 판자 부두
      g.add(box(2.2, 0.3, 1.0, PLANK, dockX, SEA + 0.2, z))
      if (z % 2 === 0) { g.add(box(0.25, 1.4, 0.25, TRUNK, dockX - 1, SEA - 0.35, z)); g.add(box(0.25, 1.4, 0.25, TRUNK, dockX + 1, SEA - 0.35, z)) }
    }
    // 유람선 (부두 끝)
    const boat = new THREE.Group()
    boat.position.set(dockX + 4, SEA + 0.15, -10)
    boat.add(box(2.4, 1.0, 5.5, BOAT, 0, 0.1, 0))       // 선체
    boat.add(box(2.0, 0.4, 4.8, BOATTOP, 0, 0.65, 0))   // 갑판
    boat.add(box(1.4, 1.2, 1.6, BOATTOP, 0, 1.3, -0.6)) // 선실
    boat.add(box(0.2, 2.2, 0.2, TRUNK, 0, 2.0, 1.0))    // 돛대
    boat.rotation.y = -0.3
    g.add(boat)
  }

  dispose() {
    this.scene.remove(this.group)
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose()
        o.material.dispose()
      }
    })
  }
}
