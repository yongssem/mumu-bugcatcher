// 드롭 아이템 — 부서진 블록이 작은 큐브로 변해 둥둥 떠다니고, 다가가면 자석처럼 끌려와 획득
import * as THREE from 'three'

const SIZE = 0.24        // 드롭 큐브 크기
const MAGNET_R = 2.2     // 끌려오기 시작 거리
const PICKUP_R = 0.6     // 획득 판정 거리
const MAGNET_SPEED = 7
const LIFETIME = 90      // 초 — 너무 오래 방치하면 소멸 (메모리 보호)
const GRAV = 14

// 하트 드롭 텍스처 — 분홍 바탕에 픽셀 하트 (먹으면 체력 회복)
function heartTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#FF8FA3'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#E8354F'
  // 픽셀 하트
  const px = [
    [4, 4], [5, 4], [10, 4], [11, 4],
    [3, 5], [6, 5], [9, 5], [12, 5],
    [3, 6], [12, 6], [4, 7], [11, 7],
    [5, 8], [10, 8], [6, 9], [9, 9], [7, 10], [8, 10],
  ]
  for (const [x, y] of px) ctx.fillRect(x, y, 1, 1)
  ctx.fillRect(4, 5, 8, 3)
  ctx.fillRect(5, 8, 6, 1)
  ctx.fillRect(6, 9, 4, 1)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 뼈 드롭 텍스처 — 흙빛 바탕에 픽셀 뼈다귀 (공룡 소재)
function boneTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#B99C74'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#F2EFE2'
  // 대각선 뼈대 + 양 끝 뭉툭한 마디
  ctx.fillRect(5, 6, 6, 4)
  ctx.fillRect(3, 4, 3, 3)
  ctx.fillRect(3, 8, 3, 3)
  ctx.fillRect(10, 5, 3, 3)
  ctx.fillRect(10, 9, 3, 3)
  ctx.fillStyle = '#D8D2BC'
  ctx.fillRect(6, 9, 5, 1) // 아래쪽 음영
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 가죽 드롭 텍스처 — 갈색 바탕에 바느질 자국 (공룡 소재)
function hideTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#9B6B43'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#7A5233'
  ctx.fillRect(0, 0, 16, 3)
  ctx.fillRect(0, 13, 16, 3)
  ctx.fillStyle = '#C79A6E'
  for (const y of [5, 10]) for (let x = 2; x < 14; x += 3) ctx.fillRect(x, y, 1, 1) // 바느질 점선
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 이빨(희귀) 드롭 텍스처 — 밝은 상아색 + 반짝이 (희귀 소재 강조)
function toothTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#E8C97A' // 호박빛 바탕 (희귀 표시)
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#FDFBF0'
  // 아래로 갈수록 뾰족한 이빨 실루엣
  ctx.fillRect(6, 2, 4, 3)
  ctx.fillRect(5, 5, 6, 4)
  ctx.fillRect(6, 9, 4, 3)
  ctx.fillRect(7, 12, 2, 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(7, 4, 1, 4) // 반짝이
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class Drops {
  constructor(scene, world, materials) {
    this.scene = scene
    this.world = world
    this.materials = materials
    this.items = []
    this._geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE)
    this._heartMat = new THREE.MeshLambertMaterial({ map: heartTexture() })
    // 공룡 소재 재질 — 인벤토리 타입 이름과 매칭 (bone/hide/tooth)
    this._matMats = {
      bone: new THREE.MeshLambertMaterial({ map: boneTexture() }),
      hide: new THREE.MeshLambertMaterial({ map: hideTexture() }),
      tooth: new THREE.MeshLambertMaterial({ map: toothTexture() }),
    }
  }

  // 블록 중심 좌표에서 드롭 생성 (살짝 위로 튀어오름)
  // type: 블록 타입 / 'heart'(체력 회복) / 'bone'·'hide'·'tooth'(공룡 소재)
  spawn(x, y, z, type) {
    const mat = type === 'heart' ? this._heartMat : this._matMats[type] || this.materials[type]
    if (!mat) return
    const mesh = new THREE.Mesh(this._geo, mat)
    mesh.position.set(x, y, z)
    this.scene.add(mesh)
    this.items.push({
      mesh,
      type,
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 3.2, (Math.random() - 0.5) * 1.5),
      spin: Math.random() * Math.PI * 2,
      age: 0,
      grounded: false,
    })
  }

  _solidBelow(p) {
    return this.world.isSolid(Math.floor(p.x), Math.floor(p.y - SIZE), Math.floor(p.z))
  }

  /**
   * @param playerPos 플레이어 발밑 좌표
   * @param onPickup (type) => void — 획득 콜백 (인벤토리 반영)
   */
  update(dt, playerPos, onPickup) {
    const center = new THREE.Vector3(playerPos.x, playerPos.y + 0.9, playerPos.z) // 몸통 기준
    this.items = this.items.filter((it) => {
      it.age += dt
      if (it.age > LIFETIME) {
        this.scene.remove(it.mesh)
        return false
      }

      const d = it.mesh.position.distanceTo(center)
      if (d < PICKUP_R) {
        onPickup(it.type)
        this.scene.remove(it.mesh)
        return false
      }

      if (d < MAGNET_R) {
        // 자석: 플레이어 쪽으로 가속 (거리가 가까울수록 빠르게)
        const dir = center.clone().sub(it.mesh.position).normalize()
        it.mesh.position.addScaledVector(dir, MAGNET_SPEED * (1.2 - d / MAGNET_R) * dt)
      } else {
        // 자유 낙하 → 바닥에 안착 후 둥둥
        if (!it.grounded) {
          it.vel.y -= GRAV * dt
          it.mesh.position.addScaledVector(it.vel, dt)
          if (it.vel.y < 0 && this._solidBelow(it.mesh.position)) {
            it.grounded = true
            it.mesh.position.y = Math.floor(it.mesh.position.y - SIZE) + 1 + SIZE * 0.9
          }
          if (it.mesh.position.y < -12) {
            // 구덩이 밖으로 떨어진 드롭 정리
            this.scene.remove(it.mesh)
            return false
          }
        } else {
          // 둥둥 떠다니기
          it.mesh.position.y += Math.sin(it.age * 3) * 0.0022
        }
      }

      it.spin += dt * 2
      it.mesh.rotation.y = it.spin
      return true
    })
  }

  clear() {
    for (const it of this.items) this.scene.remove(it.mesh)
    this.items = []
  }
}
