// 농사 — 씨앗을 잔디/흙 위에 심으면 자라서 황금열매가 됨. 다가가면 자동 수확
// 수확: 골드 +1, 씨앗 +2 (농사가 골드 수입원 — 상점과 연결)
import * as THREE from 'three'

const GROW_TIME = 90 // 다 자라는 데 걸리는 시간(초). 비 오면 2.5배 빠름

export class Crops {
  constructor(scene) {
    this.scene = scene
    this.list = [] // { x,y,z, progress, group, stem, fruit }
    this._stemMat = new THREE.MeshLambertMaterial({ color: '#3E8F3E' })
    this._leafMat = new THREE.MeshLambertMaterial({ color: '#5CB85C' })
    this._fruitMat = new THREE.MeshLambertMaterial({ color: '#F2C14E' })
  }

  hasCropAt(x, y, z) {
    return this.list.some((c) => c.x === x && c.y === y && c.z === z)
  }

  plant(x, y, z, progress = 0) {
    const group = new THREE.Group()
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), this._stemMat)
    const leafL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), this._leafMat)
    leafL.position.set(-0.14, 0.1, 0)
    const leafR = leafL.clone()
    leafR.position.x = 0.14
    stem.add(leafL, leafR)
    const fruit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), this._fruitMat)
    fruit.visible = false
    group.add(stem, fruit)
    group.position.set(x + 0.5, y, z + 0.5) // 칸 바닥 기준
    this.scene.add(group)
    const crop = { x, y, z, progress, group, stem, fruit }
    this._applyVisual(crop)
    this.list.push(crop)
  }

  _applyVisual(c) {
    const p = Math.min(c.progress, 1)
    const s = 0.35 + 0.65 * p // 줄기가 점점 자람
    c.stem.scale.y = s
    c.stem.position.y = 0.35 * s
    if (p >= 1 && !c.fruit.visible) c.fruit.visible = true
    if (c.fruit.visible) c.fruit.position.y = 0.7 * s + 0.15
  }

  update(dt, mult = 1) {
    for (const c of this.list) {
      if (c.progress < 1) {
        c.progress += (dt * mult) / GROW_TIME
        this._applyVisual(c)
      } else {
        // 다 자란 열매는 살랑살랑
        c.fruit.rotation.y += dt * 1.5
      }
    }
  }

  // 다 자란 작물 근처를 지나가면 자동 수확 — 수확한 개수 반환
  harvestNear(playerPos, r = 1.3) {
    let got = 0
    this.list = this.list.filter((c) => {
      if (c.progress < 1) return true
      const d = Math.hypot(c.x + 0.5 - playerPos.x, c.z + 0.5 - playerPos.z)
      const dy = Math.abs(c.y - playerPos.y)
      if (d <= r && dy <= 2) {
        got++
        this.scene.remove(c.group)
        return false
      }
      return true
    })
    return got
  }

  toJSON() {
    return this.list.map((c) => ({ x: c.x, y: c.y, z: c.z, p: +c.progress.toFixed(3) }))
  }

  load(arr) {
    for (const c of arr || []) this.plant(c.x, c.y, c.z, c.p)
  }
}
