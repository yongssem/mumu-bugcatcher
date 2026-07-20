// 좀비 — 밤에 맵 가장자리 스폰, 플레이어 추적, 전부 로컬 (서바이벌 전용)
// 초딩 대상: 뭉툭하고 귀엽게. 피·잔인함 없음 (죽으면 폭 하고 작아지며 사라짐)
import * as THREE from 'three'
import { WORLD } from './World.js'

const SPEED = 1.7
const BIG_SPEED = 1.45     // 大좀비는 느린 대신 강함
const ATTACK_RANGE = 1.4
const ATTACK_COOLDOWN = 1.2
const HALF_W = 0.3
const HEIGHT = 1.4
const HOP_V = 5.5 // 한 칸 계단 오르기 점프

// 일차별 난이도: 날이 갈수록 수가 늘고 빨리 나오고 튼튼해지며, 3일차부터 大좀비 등장
export function difficultyFor(day) {
  const hp = Math.min(2 + Math.floor((day - 1) / 2), 5) // 1~2일 2 → 3~4일 3 → … 최대 5
  return {
    maxZombies: Math.min(4 + day, 10),
    spawnInterval: Math.max(4.5 - day * 0.4, 2),
    bigChance: day >= 3 ? Math.min(0.15 * (day - 2), 0.5) : 0,
    hp,
    bigHp: Math.min(hp * 2, 8),
  }
}

// 얼굴 텍스처 — 점 눈 + 미소 (귀여움 담당)
function faceTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#6BA55C'
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = '#2b3a28'
  ctx.fillRect(4, 6, 2, 3)
  ctx.fillRect(10, 6, 2, 3)
  ctx.fillRect(6, 11, 4, 1) // 미소
  ctx.fillStyle = '#8fc47e'
  ctx.fillRect(2, 9, 2, 2) // 볼터치
  ctx.fillRect(12, 9, 2, 2)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

let _faceTex = null
function makeZombieMesh(big, shade = 0) {
  // 大좀비·강해진 좀비일수록 어두운 녹색 (얼굴은 똑같이 귀엽게)
  const bodyColor = new THREE.Color(big ? '#4A7A30' : '#5A8F3C').multiplyScalar(1 - shade)
  const headColor = new THREE.Color(big ? '#5E8F4C' : '#6BA55C').multiplyScalar(1 - shade)
  const green = new THREE.MeshLambertMaterial({ color: bodyColor })
  const lightGreen = new THREE.MeshLambertMaterial({ color: headColor })
  // 얼굴 재질은 좀비마다 분리 (피격 플래시가 다른 좀비 얼굴까지 번쩍이지 않게), 텍스처만 공유
  if (!_faceTex) _faceTex = faceTexture()
  const _faceMat = new THREE.MeshLambertMaterial({ map: _faceTex })

  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.32), green)
  body.position.y = 0.45
  // 머리: 앞면(+Z)만 얼굴 텍스처
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), [
    lightGreen, lightGreen, lightGreen, lightGreen, _faceMat, lightGreen,
  ])
  head.position.y = 1.0
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.45), green)
  armL.position.set(-0.36, 0.55, 0.2)
  const armR = armL.clone()
  armR.position.x = 0.36
  g.add(body, head, armL, armR)
  g.userData.arms = [armL, armR]
  return g
}

export class ZombieManager {
  constructor(scene, world, onAttackPlayer) {
    this.scene = scene
    this.world = world
    this.onAttackPlayer = onAttackPlayer // 근접 공격 콜백 (엔진이 hp 처리)
    this.onBossSpawn = null  // 보스 등장 알림 (엔진이 설정)
    this.onBossKill = null   // 보스 처치 보상 (엔진이 설정)
    this.onZombieKill = null // 일반 좀비 처치 보상 (엔진이 설정)
    this.fx = null           // 파티클 시스템 (엔진이 설정)
    this.zombies = []
    this._spawnTimer = 0
    this._bossDay = 0 // 보스를 이미 소환한 일차 (하룻밤 1회)
    this._raycaster = new THREE.Raycaster()
  }

  // 플레이어 주변 링(9~16블록)에서 스폰 가능한 지면 좌표 찾기
  _findSpawnPos(playerPos) {
    for (let tries = 0; tries < 12; tries++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 9 + Math.random() * 7
      const x = Math.max(1, Math.min(WORLD.X_MAX - 1.5, playerPos.x + Math.cos(angle) * dist))
      const z = Math.max(1, Math.min(WORLD.Z_MAX - 1.5, playerPos.z + Math.sin(angle) * dist))
      if (Math.hypot(x - playerPos.x, z - playerPos.z) < 7) continue
      const bx = Math.floor(x), bz = Math.floor(z)
      const gy = this.world.groundY(bx, bz)
      if (gy === null || gy > WORLD.MAX_H + 2) continue // 나무 꼭대기 등 이상 지점 제외
      if (this.world.isSolid(bx, gy, bz) || this.world.isSolid(bx, gy + 1, bz)) continue
      return [x, gy, z]
    }
    return null
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

  spawn(playerPos, big = false, day = 1) {
    const p = this._findSpawnPos(playerPos)
    if (!p) return
    const [x, gy, z] = p
    const diff = difficultyFor(day)
    const hp = big ? diff.bigHp : diff.hp
    const shade = Math.min((hp - 2) * 0.08, 0.3) // 튼튼할수록 어두운 색 (한눈에 구분)
    const scale = (big ? 1.35 : 1) * (1 + (hp - 2) * 0.03)
    const group = makeZombieMesh(big, shade)
    group.scale.setScalar(scale)
    group.position.set(x, gy, z)
    this.scene.add(group)
    this.zombies.push({
      group,
      pos: new THREE.Vector3(x, gy, z),
      velY: 0,
      hp,                     // 일차가 지날수록 튼튼 (difficultyFor)
      dmg: big ? 3 : 2,       // 大좀비는 아프게 때림
      big,                    // 처치 보상 계산용
      speed: big ? BIG_SPEED : SPEED,
      baseScale: scale,
      attackCd: 0,
      onGround: false,
      dying: 0, // 0=생존, >0이면 소멸 애니메이션 진행률
      wobble: Math.random() * Math.PI * 2,
      ring: Math.random() * Math.PI * 2, // 포위 각도 — 서로 겹치지 않게 분산
    })
  }

  // 👑 보스 좀비 — 7일차마다 밤에 1마리. 크고 튼튼하고 아픔. 잡으면 골드 드롭
  spawnBoss(playerPos) {
    const p = this._findSpawnPos(playerPos)
    if (!p) return false
    const [x, gy, z] = p
    const group = makeZombieMesh(true, 0.35)
    // 금관 씌우기
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.14, 0.56),
      new THREE.MeshLambertMaterial({ color: '#F2C14E' })
    )
    crown.position.y = 1.32
    group.add(crown)
    const scale = 2.1
    group.scale.setScalar(scale)
    group.position.set(x, gy, z)
    this.scene.add(group)
    this.zombies.push({
      group,
      pos: new THREE.Vector3(x, gy, z),
      velY: 0,
      hp: 16,
      dmg: 4,
      speed: 1.15, // 크지만 느릿느릿
      baseScale: scale,
      attackCd: 0,
      onGround: false,
      dying: 0,
      wobble: Math.random() * Math.PI * 2,
      ring: Math.random() * Math.PI * 2,
      isBoss: true,
    })
    return true
  }

  update(dt, isNight, playerPos, day = 1) {
    const diff = difficultyFor(day)
    this._spawnTimer -= dt
    if (isNight && this.zombies.filter((z) => !z.dying).length < diff.maxZombies && this._spawnTimer <= 0) {
      this.spawn(playerPos, Math.random() < diff.bigChance, day)
      this._spawnTimer = diff.spawnInterval
    }
    // 7일차마다 보스 소환 (하룻밤 1회)
    if (isNight && day >= 7 && day % 7 === 0 && this._bossDay !== day) {
      if (this.spawnBoss(playerPos)) {
        this._bossDay = day
        this.onBossSpawn?.()
      }
    }

    for (const z of this.zombies) {
      // 처치 보상 + 폭발 연출 (죽기 시작한 순간 1회) — hp를 다 깎아 잡았을 때만 (낮 자연소멸 제외)
      if (z.dying && !z._rewarded) {
        z._rewarded = true
        if (z.hp <= 0) {
          // 🎆 폭죽 폭발 — 보스는 황금빛 대폭발
          if (this.fx) {
            const p = z.pos.clone()
            p.y += 0.7 * (z.baseScale || 1)
            this.fx.burst(p, z.isBoss ? '#F2C14E' : z.big ? '#4A7A30' : '#5A8F3C', z.isBoss || z.big)
          }
          if (z.isBoss) this.onBossKill?.(z.pos.clone())
          else this.onZombieKill?.(z.pos.clone(), !!z.big)
        }
      }
      // 낮이 되면 소멸 시작
      if (!isNight && !z.dying) z.dying = 0.001

      if (z.dying) {
        z.dying = Math.min(1, z.dying + dt * 2)
        const s = (z.baseScale || 1) * (1 - z.dying)
        z.group.scale.set(s, s, s)
        continue
      }

      // 피격 플래시: 하얗게 번쩍 + 몸이 순간 부풀었다 돌아옴
      if (z.flash > 0) {
        z.flash = Math.max(0, z.flash - dt)
        const k = z.flash / 0.15
        z.group.traverse((o) => {
          if (!o.isMesh) return
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) m.emissive?.setScalar(k * 0.9)
        })
        z.group.scale.setScalar((z.baseScale || 1) * (1 + k * 0.15))
      }

      // 추적 이동 (수평) — 각자 다른 각도에서 포위하도록 목표점 분산
      const tx = playerPos.x + Math.sin(z.ring) * 0.8
      const tz = playerPos.z + Math.cos(z.ring) * 0.8
      const dx = tx - z.pos.x
      const dz = tz - z.pos.z
      const pdx = playerPos.x - z.pos.x
      const pdz = playerPos.z - z.pos.z
      const dist = Math.hypot(pdx, pdz) // 공격 판정은 실제 플레이어 거리
      const mdist = Math.hypot(dx, dz)
      if (mdist > 0.05) {
        const vx = (dx / mdist) * (z.speed || SPEED)
        const vz = (dz / mdist) * (z.speed || SPEED)
        const nx = z.pos.x + vx * dt
        const nz = z.pos.z + vz * dt
        let blockedX = this._collides(nx, z.pos.y, z.pos.z)
        let blockedZ = this._collides(z.pos.x, z.pos.y, nz)
        if (!blockedX) z.pos.x = nx
        if (!blockedZ) z.pos.z = nz
        // 한 칸 계단이면 폴짝 뛰어오름
        if ((blockedX || blockedZ) && z.onGround) z.velY = HOP_V
        z.group.rotation.y = Math.atan2(pdx, pdz) // 플레이어 바라보기
      }

      // 중력
      z.velY -= 24 * dt
      const ny = z.pos.y + z.velY * dt
      if (!this._collides(z.pos.x, ny, z.pos.z)) {
        z.pos.y = ny
        z.onGround = false
      } else {
        if (z.velY < 0) z.onGround = true
        z.velY = 0
      }

      // 뒤뚱뒤뚱 + 팔 흔들기
      z.wobble += dt * 7
      z.group.position.set(z.pos.x, z.pos.y, z.pos.z)
      z.group.rotation.z = Math.sin(z.wobble) * 0.08
      const [armL, armR] = z.group.userData.arms
      armL.position.y = 0.55 + Math.sin(z.wobble) * 0.06
      armR.position.y = 0.55 - Math.sin(z.wobble) * 0.06

      // 근접 공격
      z.attackCd -= dt
      const dy = playerPos.y + 0.9 - (z.pos.y + 0.7)
      if (dist < ATTACK_RANGE && Math.abs(dy) < 1.6 && z.attackCd <= 0) {
        z.attackCd = ATTACK_COOLDOWN
        this.onAttackPlayer(z.dmg || 2)
      }
    }

    // 소멸 완료 제거
    this.zombies = this.zombies.filter((z) => {
      if (z.dying >= 1) {
        this.scene.remove(z.group)
        return false
      }
      return true
    })
  }

  // 피격 연출 — 흰 플래시 + 몸 팝 + 별 파티클 + 데미지 숫자 (모든 공격 수단 공통)
  applyHitFx(z, dmg = 1) {
    z.flash = 0.15
    if (this.fx) {
      const p = z.pos.clone()
      p.y += 0.8 * (z.baseScale || 1)
      this.fx.hit(p, z.isBoss || z.big ? '#4A7A30' : '#5A8F3C')
      this.fx.damageNumber(p, dmg)
    }
  }

  // 좌클릭 공격 — 카메라 레이가 좀비에 닿으면 처치 시도. 반환: false | 'hit' | 'kill'
  // damage: 맨손 1, 칼 2(한 방). reach: 손 닿는 거리
  tryHit(camera, reach = 3.5, damage = 1) {
    this._raycaster.setFromCamera({ x: 0, y: 0 }, camera)
    this._raycaster.far = reach
    const groups = this.zombies.filter((z) => !z.dying).map((z) => z.group)
    const hits = this._raycaster.intersectObjects(groups, true)
    if (hits.length === 0) return false
    let obj = hits[0].object
    while (obj.parent && !groups.includes(obj)) obj = obj.parent
    const z = this.zombies.find((zz) => zz.group === obj)
    if (!z) return false
    z.hp -= damage
    this.applyHitFx(z, damage)
    // 넉백 — 맞으면 살짝 밀려남
    const dir = new THREE.Vector3().subVectors(z.pos, camera.position).setY(0).normalize()
    const kx = z.pos.x + dir.x * 0.8
    const kz = z.pos.z + dir.z * 0.8
    if (!this._collides(kx, z.pos.y, z.pos.z)) z.pos.x = kx
    if (!this._collides(z.pos.x, z.pos.y, kz)) z.pos.z = kz
    if (z.hp <= 0) {
      z.dying = 0.001
      return 'kill'
    }
    return 'hit'
  }

  count() {
    return this.zombies.filter((z) => !z.dying).length
  }

  clear() {
    for (const z of this.zombies) this.scene.remove(z.group)
    this.zombies = []
    this._spawnTimer = 0
  }
}
