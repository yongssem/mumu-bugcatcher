// 플레이어 물리 — 중력, AABB 복셀 충돌, 1인칭 이동
import * as THREE from 'three'
import { WORLD } from './World.js'

const HALF_W = 0.3   // 몸통 반너비
const HEIGHT = 1.8   // 키
export const EYE = 1.62 // 눈높이

const GRAVITY = 24
const JUMP_V = 8.5
const WALK = 4.3
const RUN = 6.0

export class Player {
  constructor(world) {
    this.world = world
    this.pos = new THREE.Vector3() // 발밑 기준
    this.vel = new THREE.Vector3()
    this.yaw = 0
    this.pitch = 0
    this.onGround = false
    this.hp = 20 // 서바이벌용 (P3), 크리에이티브는 미사용
    this.respawn()
  }

  respawn() {
    const c = WORLD.SIZE / 2
    // 지형 높이에 맞춰 지면 위에 스폰 (농촌 등 고저차 있는 맵에서 블록에 끼이는 버그 방지)
    const gy = this.world.groundY(Math.floor(c), Math.floor(c))
    this.pos.set(c + 0.5, (gy ?? 2) + 0.1, c + 0.5)
    this.vel.set(0, 0, 0)
  }

  // 저장/복원
  toJSON() {
    return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, hp: this.hp }
  }

  fromJSON(p) {
    if (!p) return
    this.pos.set(p.x, p.y, p.z)
    this.yaw = p.yaw || 0
    this.hp = p.hp ?? 20
  }

  // 플레이어 AABB가 특정 블록 칸과 겹치는지 (설치 방지용)
  intersectsBlock(bx, by, bz) {
    return (
      this.pos.x + HALF_W > bx && this.pos.x - HALF_W < bx + 1 &&
      this.pos.y + HEIGHT > by && this.pos.y < by + 1 &&
      this.pos.z + HALF_W > bz && this.pos.z - HALF_W < bz + 1
    )
  }

  // AABB가 겹치는 복셀 중 solid가 있는지 검사
  collides(px, py, pz) {
    const x0 = Math.floor(px - HALF_W), x1 = Math.floor(px + HALF_W)
    const y0 = Math.floor(py), y1 = Math.floor(py + HEIGHT - 1e-6)
    const z0 = Math.floor(pz - HALF_W), z1 = Math.floor(pz + HALF_W)
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++)
          if (this.world.isSolid(x, y, z)) return true
    return false
  }

  update(dt, input) {
    // 이동 축 — 키보드(불리언)와 모바일 조이스틱(아날로그 moveX/moveY)을 합산
    // F: 전진(+)/후진(-), S: 오른쪽(+)/왼쪽(-)
    let F = (input.forward ? 1 : 0) - (input.back ? 1 : 0) + (input.moveY || 0)
    let S = (input.right ? 1 : 0) - (input.left ? 1 : 0) + (input.moveX || 0)
    F = Math.max(-1, Math.min(1, F))
    S = Math.max(-1, Math.min(1, S))

    const speed = input.run ? RUN : WALK
    let dx = -Math.sin(this.yaw) * F + Math.cos(this.yaw) * S
    let dz = -Math.cos(this.yaw) * F - Math.sin(this.yaw) * S
    const len = Math.hypot(dx, dz)
    if (len > 1) { dx /= len; dz /= len } // 대각선 과속 방지
    dx *= speed
    dz *= speed

    this.vel.x = dx
    this.vel.z = dz
    this.vel.y -= GRAVITY * dt

    if (input.jump && this.onGround) {
      this.vel.y = JUMP_V
      this.onGround = false
    }

    // 축별 이동 + 충돌 클램프 (터널링 방지를 위해 축 분리)
    const p = this.pos
    const nx = p.x + this.vel.x * dt
    if (!this.collides(nx, p.y, p.z)) p.x = nx

    const ny = p.y + this.vel.y * dt
    if (!this.collides(p.x, ny, p.z)) {
      p.y = ny
      this.onGround = false
    } else {
      if (this.vel.y < 0) this.onGround = true
      this.vel.y = 0
    }

    const nz = p.z + this.vel.z * dt
    if (!this.collides(p.x, p.y, nz)) p.z = nz

    // 바닥을 뚫고 떨어지면 리스폰 (건축물은 유지)
    if (p.y < -20) this.respawn()
  }
}
