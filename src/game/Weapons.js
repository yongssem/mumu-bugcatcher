// 무기 발사체 — 화살(원거리)·다이너마이트(광역). 좀비만 피해 (건축물 보호)
import * as THREE from 'three'

const ARROW_SPEED = 30
const ARROW_LIFE = 2.5
const ARROW_DMG = 2      // 좀비 hp 2 → 한 발 처치
const ARROW_HIT_R = 0.6  // 좀비 명중 반경
const DYN_THROW = 13     // 던지는 속도
const DYN_FUSE = 1.3     // 도화선(초)
const DYN_RADIUS = 3.2   // 폭발 반경
const DYN_DMG = 8        // 반경 내 좀비 즉사 — 후반 大좀비(hp8)까지 한 방 (개수 제한 있는 비장의 무기)
const GRAV = 13          // 발사체 중력(살짝 포물선)

const UP = new THREE.Vector3(0, 1, 0)

export class WeaponSystem {
  constructor(scene, zombies, world, sounds, dinos = null) {
    this.scene = scene
    this.zombies = zombies
    this.world = world
    this.sounds = sounds
    this.dinos = dinos // 공룡도 화살·폭발 피해 대상
    this.arrows = []
    this.dynamites = []
    this.blasts = []

    // 공유 지오/재질
    this._arrowGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.6, 5)
    this._arrowMat = new THREE.MeshLambertMaterial({ color: '#d8c48a' })
    this._dynGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32)
    this._dynMat = new THREE.MeshLambertMaterial({ color: '#C0392B' })
    this._blastGeo = new THREE.SphereGeometry(1, 12, 12)
  }

  _spawnPoint(camera, dir) {
    // 카메라보다 살짝 앞·아래(손 위치)에서 출발
    return camera.position.clone().addScaledVector(dir, 0.6).addScaledVector(UP, -0.15)
  }

  shootArrow(camera) {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    const mesh = new THREE.Mesh(this._arrowGeo, this._arrowMat)
    mesh.position.copy(this._spawnPoint(camera, dir))
    mesh.quaternion.setFromUnitVectors(UP, dir) // 진행 방향으로 눕히기
    this.scene.add(mesh)
    this.arrows.push({ mesh, vel: dir.clone().multiplyScalar(ARROW_SPEED), life: ARROW_LIFE })
  }

  throwDynamite(camera) {
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    const mesh = new THREE.Mesh(this._dynGeo, this._dynMat)
    mesh.position.copy(this._spawnPoint(camera, dir))
    this.scene.add(mesh)
    const vel = dir.clone().multiplyScalar(DYN_THROW)
    vel.y += 3.5 // 살짝 위로 던져 포물선
    this.dynamites.push({ mesh, vel, fuse: DYN_FUSE, spin: 0 })
  }

  _solidAt(p) {
    return this.world.isSolid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))
  }

  // 지점 기준 반경 내 살아있는 좀비에게 피해
  _damageZombiesNear(point, radius, dmg) {
    let hit = 0
    for (const z of this.zombies.zombies) {
      if (z.dying) continue
      const cx = z.pos.x, cy = z.pos.y + 0.7, cz = z.pos.z
      if (Math.hypot(point.x - cx, point.y - cy, point.z - cz) <= radius) {
        z.hp -= dmg
        this.zombies.applyHitFx(z, dmg)
        if (z.hp <= 0) {
          z.dying = 0.001
          this.sounds?.zombieDie()
        }
        hit++
      }
    }
    return hit
  }

  // 지점 기준 반경 내 공룡에게 피해 (격퇴 연출·보상은 DinoManager가 처리)
  _damageDinosNear(point, radius, dmg) {
    if (!this.dinos) return
    for (const d of this.dinos.dinos) {
      if (d.dying) continue
      if (Math.hypot(point.x - d.pos.x, point.y - (d.pos.y + 1.3), point.z - d.pos.z) <= radius + 1) {
        this.dinos.damage(d, dmg)
      }
    }
  }

  _explode(pos) {
    this.sounds?.explosion()
    this._damageZombiesNear(pos, DYN_RADIUS, DYN_DMG)
    this._damageDinosNear(pos, DYN_RADIUS, 4) // 폭탄도 공룡 즉사는 아님 (소재는 정정당당히)
    // 폭발 시각효과 — 주황 구가 커지며 사라짐 (건축물은 안 건드림)
    const mat = new THREE.MeshBasicMaterial({ color: '#FF9A3C', transparent: true, opacity: 0.8 })
    const mesh = new THREE.Mesh(this._blastGeo, mat)
    mesh.position.copy(pos)
    mesh.scale.setScalar(0.4)
    this.scene.add(mesh)
    this.blasts.push({ mesh, mat, t: 0 })
  }

  update(dt) {
    // --- 화살 ---
    this.arrows = this.arrows.filter((a) => {
      a.vel.y -= GRAV * dt
      a.mesh.position.addScaledVector(a.vel, dt)
      a.mesh.quaternion.setFromUnitVectors(UP, a.vel.clone().normalize())
      a.life -= dt
      // 좀비 명중
      for (const z of this.zombies.zombies) {
        if (z.dying) continue
        const d = Math.hypot(
          a.mesh.position.x - z.pos.x,
          a.mesh.position.y - (z.pos.y + 0.7),
          a.mesh.position.z - z.pos.z
        )
        if (d <= ARROW_HIT_R) {
          z.hp -= ARROW_DMG
          this.zombies.applyHitFx(z, ARROW_DMG)
          if (z.hp <= 0) {
            z.dying = 0.001
            this.sounds?.zombieDie()
          } else {
            this.sounds?.zombieHit()
          }
          this.scene.remove(a.mesh)
          return false
        }
      }
      // 공룡 명중 (몸집이 커서 판정 넉넉히)
      if (this.dinos) {
        for (const d of this.dinos.dinos) {
          if (d.dying) continue
          const dd = Math.hypot(
            a.mesh.position.x - d.pos.x,
            a.mesh.position.y - (d.pos.y + 1.3),
            a.mesh.position.z - d.pos.z
          )
          if (dd <= 1.4) {
            this.dinos.damage(d, ARROW_DMG)
            if (!d.dying) this.sounds?.zombieHit()
            this.scene.remove(a.mesh)
            return false
          }
        }
      }
      // 블록/바닥 충돌 또는 수명 종료
      if (a.life <= 0 || a.mesh.position.y < -2 || this._solidAt(a.mesh.position)) {
        this.scene.remove(a.mesh)
        return false
      }
      return true
    })

    // --- 다이너마이트 ---
    this.dynamites = this.dynamites.filter((d) => {
      d.vel.y -= GRAV * dt
      const next = d.mesh.position.clone().addScaledVector(d.vel, dt)
      if (this._solidAt(next)) {
        // 바닥/벽에 닿으면 멈춰서 도화선만 태움
        d.vel.set(0, 0, 0)
      } else {
        d.mesh.position.copy(next)
      }
      d.spin += dt * 6
      d.mesh.rotation.set(d.spin, d.spin * 0.7, 0)
      // 도화선 깜빡임(밝기 진동)
      const blink = 0.5 + 0.5 * Math.abs(Math.sin(d.fuse * 12))
      d.mesh.material = this._dynMat // 공유 재질 유지
      d.mesh.scale.setScalar(1 + blink * 0.15)
      d.fuse -= dt
      if (d.fuse <= 0) {
        this._explode(d.mesh.position.clone())
        this.scene.remove(d.mesh)
        return false
      }
      return true
    })

    // --- 폭발 이펙트 ---
    this.blasts = this.blasts.filter((b) => {
      b.t += dt
      const k = b.t / 0.4
      b.mesh.scale.setScalar(0.4 + k * DYN_RADIUS)
      b.mat.opacity = 0.8 * (1 - k)
      if (k >= 1) {
        this.scene.remove(b.mesh)
        b.mat.dispose()
        return false
      }
      return true
    })
  }

  clear() {
    for (const a of this.arrows) this.scene.remove(a.mesh)
    for (const d of this.dynamites) this.scene.remove(d.mesh)
    for (const b of this.blasts) { this.scene.remove(b.mesh); b.mat.dispose() }
    this.arrows = []
    this.dynamites = []
    this.blasts = []
  }
}
