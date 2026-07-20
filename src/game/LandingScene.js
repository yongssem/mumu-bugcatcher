// 랜딩 배경용 3D 씬 — 저장된 내 마을을 공중에서 천천히 선회하며 보여준다
// 게임 엔진과 완전 분리: 입력·물리 없음, 카메라만 자동 궤도 (마인크래프트 타이틀 감성)
import * as THREE from 'three'
import { World, WORLD } from './World.js'
import { createMaterials } from './textures.js'

const ORBIT_RADIUS = 34
const ORBIT_HEIGHT = 18
const ORBIT_PERIOD = 48 // 1바퀴 도는 시간(초) — 아주 느리게

export class LandingScene {
  constructor(canvas, saveData) {
    this.canvas = canvas
    this.disposed = false

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#7EC8F0')
    this.scene.fog = new THREE.Fog('#7EC8F0', 45, 110)

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300)

    const hemi = new THREE.HemisphereLight('#ffffff', '#9B6B43', 1.0)
    const sun = new THREE.DirectionalLight('#fff6e0', 1.15)
    sun.position.set(25, 45, 20)
    this.scene.add(hemi, sun)

    // 저장된 지형 복원
    this.world = new World(saveData?.seed ?? 0)
    if (saveData?.blocks) this.world.loadDelta(saveData.blocks)

    // 블록 인스턴스 메시 (1회 생성 — 랜딩에선 변경 없음)
    const materials = createMaterials()
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const byType = {}
    let maxY = 1
    this.world.forEachBlock((x, y, z, type) => {
      ;(byType[type] ||= []).push([x, y, z])
      if (y > maxY) maxY = y
    })
    const dummy = new THREE.Object3D()
    for (const [type, positions] of Object.entries(byType)) {
      const mesh = new THREE.InstancedMesh(geo, materials[type], positions.length)
      positions.forEach(([x, y, z], i) => {
        dummy.position.set(x + 0.5, y + 0.5, z + 0.5)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      this.scene.add(mesh)
    }

    // 선회 중심: 운동장 한가운데, 건축물 높이의 절반쯤을 바라봄
    const c = WORLD.SIZE / 2
    this._center = new THREE.Vector3(c, Math.min(maxY, 10) * 0.5 + 1, c)
    this._angle = 0

    this.resize()
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)

    this._loop = this._loop.bind(this)
    this._last = performance.now()
    if (import.meta.env.DEV) window.__landing = this // dev 검증용
    requestAnimationFrame(this._loop)
  }

  _loop(now) {
    if (this.disposed) return
    requestAnimationFrame(this._loop)
    const dt = Math.min((now - this._last) / 1000, 0.05)
    this._last = now

    this._angle += (dt / ORBIT_PERIOD) * Math.PI * 2
    this.camera.position.set(
      this._center.x + Math.cos(this._angle) * ORBIT_RADIUS,
      ORBIT_HEIGHT,
      this._center.z + Math.sin(this._angle) * ORBIT_RADIUS
    )
    this.camera.lookAt(this._center)
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.disposed = true
    window.removeEventListener('resize', this._onResize)
    this.renderer.dispose()
  }
}
