// 강아지 동료 — 플레이어를 따라다니고, 좀비가 다가오면 대신 쫓아가 물어줌
// 초딩 감성 보호: 강아지는 절대 죽지 않는다
import * as THREE from 'three'

const FOLLOW_DIST = 3.0   // 이보다 멀면 주인에게 달려감
const TELEPORT_DIST = 20  // 너무 멀어지면 순간이동 (길 잃기 방지)
const RUN = 3.6
const GUARD_R = 8         // 주인 주변 이 반경의 좀비를 공격
const BITE_R = 1.1
const BITE_CD = 0.9
const BITE_DMG = 1
const HALF_W = 0.25
const HEIGHT = 0.6
const HOP_V = 5.2

function makeDogMesh() {
  const brown = new THREE.MeshLambertMaterial({ color: '#C89F6B' })
  const dark = new THREE.MeshLambertMaterial({ color: '#8A6844' })
  const cream = new THREE.MeshLambertMaterial({ color: '#EEDDC0' })

  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.62), brown)
  body.position.y = 0.32
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.3), cream)
  head.position.set(0, 0.5, 0.38)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), dark)
  nose.position.set(0, 0.46, 0.55)
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), dark)
  earL.position.set(-0.11, 0.68, 0.34)
  const earR = earL.clone()
  earR.position.x = 0.11
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.25), dark)
  tail.position.set(0, 0.42, -0.38)
  const legs = []
  for (const [lx, lz] of [[-0.13, 0.2], [0.13, 0.2], [-0.13, -0.2], [0.13, -0.2]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.09), brown)
    leg.position.set(lx, 0.09, lz)
    legs.push(leg)
  }
  g.add(body, head, nose, earL, earR, tail, ...legs)
  g.userData.tail = tail
  return g
}

export class Dog {
  constructor(scene, world, startPos) {
    this.scene = scene
    this.world = world
    this.group = makeDogMesh()
    this.pos = new THREE.Vector3(startPos.x + 1.2, startPos.y + 1, startPos.z + 1.2)
    this.velY = 0
    this.onGround = false
    this.biteCd = 0
    this.wag = 0
    this._targetRef = null
    this._stuckTimer = 0 // 구덩이 등에 갇힘 감지
    this._lastPos = this.pos.clone()
    scene.add(this.group)
  }

  _collides(px, py, pz) {
    const x0 = Math.floor(px - HALF_W), x1 = Math.floor(px + HALF_W)
    const y0 = Math.floor(py), y1 = Math.floor(py + HEIGHT)
    const z0 = Math.floor(pz - HALF_W), z1 = Math.floor(pz + HALF_W)
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++)
          if (this.world.isSolid(x, y, z)) return true
    return false
  }

  update(dt, playerPos, zombiesMgr, sounds) {
    // 주인 주변 좀비 중 가장 가까운 놈을 노린다
    let target = null
    if (zombiesMgr) {
      let best = GUARD_R
      for (const z of zombiesMgr.zombies) {
        if (z.dying) continue
        const d = Math.hypot(z.pos.x - playerPos.x, z.pos.z - playerPos.z)
        if (d < best) { best = d; target = z }
      }
    }
    // 새 타깃을 발견하면 멍멍!
    if (target && target !== this._targetRef) {
      this._targetRef = target
      sounds?.bark()
    }
    if (!target) this._targetRef = null

    const dest = target ? target.pos : playerPos
    const dx = dest.x - this.pos.x
    const dz = dest.z - this.pos.z
    const dist = Math.hypot(dx, dz)
    const wantMove = target ? dist > BITE_R * 0.8 : dist > FOLLOW_DIST

    if (wantMove && dist > 0.01) {
      const vx = (dx / dist) * RUN
      const vz = (dz / dist) * RUN
      const nx = this.pos.x + vx * dt
      const nz = this.pos.z + vz * dt
      const bx = this._collides(nx, this.pos.y, this.pos.z)
      const bz = this._collides(this.pos.x, this.pos.y, nz)
      if (!bx) this.pos.x = nx
      if (!bz) this.pos.z = nz
      if ((bx || bz) && this.onGround) this.velY = HOP_V // 한 칸 폴짝
      this.group.rotation.y = Math.atan2(dx, dz)
    }

    // 중력
    this.velY -= 24 * dt
    const ny = this.pos.y + this.velY * dt
    if (!this._collides(this.pos.x, ny, this.pos.z)) {
      this.pos.y = ny
      this.onGround = false
    } else {
      if (this.velY < 0) this.onGround = true
      this.velY = 0
    }

    // 갇힘 감지: 가야 할 곳이 있는데 1초간 제자리면 스턱 타이머 증가
    const playerDist = this.pos.distanceTo(playerPos)
    if (wantMove && playerDist > 4) {
      if (this.pos.distanceTo(this._lastPos) < 0.06) this._stuckTimer += dt
      else this._stuckTimer = 0
    } else {
      this._stuckTimer = 0
    }
    this._lastPos.copy(this.pos)

    // 너무 멀거나 / 낙하 / 구덩이에 3초 갇히면 주인 곁으로 순간이동
    if (playerDist > TELEPORT_DIST || this.pos.y < -12 || this._stuckTimer > 3) {
      this.pos.set(playerPos.x + 1.2, playerPos.y + 1.5, playerPos.z + 1.2)
      this.velY = 0
      this._stuckTimer = 0
    }

    // 물기
    this.biteCd -= dt
    if (target && dist < BITE_R && this.biteCd <= 0) {
      this.biteCd = BITE_CD
      target.hp -= BITE_DMG
      zombiesMgr.applyHitFx(target, BITE_DMG)
      if (target.hp <= 0) {
        target.dying = 0.001
        sounds?.zombieDie()
      } else {
        sounds?.zombieHit()
      }
    }

    // 꼬리 흔들기 + 이동 중 통통 튀는 느낌
    this.wag += dt * (target ? 16 : 8)
    this.group.userData.tail.rotation.y = Math.sin(this.wag) * 0.6
    this.group.position.set(
      this.pos.x,
      this.pos.y + (wantMove ? Math.abs(Math.sin(this.wag * 0.7)) * 0.06 : 0),
      this.pos.z
    )
  }

  dispose() {
    this.scene.remove(this.group)
  }
}
