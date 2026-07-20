// 공룡 스폰·AI·전투·드롭 — Zombie.js 패턴 계승 (서바이벌 전용)
// D0: 파밍 월드에 티라노 1마리. 어슬렁 → 포효 → 추적 → 물기. 격퇴하면 poof + 뼈 드롭
// 초딩 톤: 피·죽음 없음. 격퇴 = 물러남(작아지며 사라졌다가 시간이 지나면 돌아옴)
import * as THREE from 'three'
import { WORLD, ZOO_POND } from './World.js'
import { DINOS } from './dinoData.js'
import { emojiTexture, moodTexture } from './Particles.js'

const GRAV = 24
const HOP_V = 6         // 한 칸 계단 오르기
const HALF_W = 0.9      // 충돌 박스 (축소 스케일 기준)
const HEIGHT = 2.2
const ROAR_TIME = 1.5   // 포효 연출 길이(초)
const RESPAWN_DELAY = 25 // 격퇴 후 다시 나타나기까지(초) — 사냥 루프가 너무 끊기지 않게
// 🦖 사냥터 메인(보스) 공룡 — 동물원 개체보다 더 크고·더 튼튼하게 (사냥 손맛)
const BOSS_SCALE = 1.55
const BOSS_HP = 1.7
const TURN_SPEED = 3.5  // 몸 돌리는 속도(rad/s) — 육중한 느낌
const FARM_AREA = { x0: 35, x1: 62, z0: 3, z1: 28 } // 파밍 월드 안쪽 (기본)
const FLY_HOVER = 3.2   // 익룡이 지면 위로 떠 있는 높이

// 각도 보간 (몸을 부드럽게 돌리기)
function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * Math.min(1, t)
}

// 🥚 알 메쉬 — 크림색 타원 + 점무늬
function makeEggMesh() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshLambertMaterial({ color: '#EFE3C2' }))
  body.scale.set(1, 1.35, 1)
  g.add(body)
  const spotMat = new THREE.MeshLambertMaterial({ color: '#B79A62' })
  for (const [x, y, z] of [[0.22, 0.1, 0.1], [-0.18, -0.1, 0.15], [0.05, 0.25, -0.2]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), spotMat)
    s.position.set(x, y, z)
    g.add(s)
  }
  return g
}

// 🍖 먹이 종류 → 이모지 (식성 안내·기분 마크)
const FOOD_EMOJI = { meat: '🥩', hay: '🌿', fish: '🐟' }

// 🍖 던지는 먹이 메쉬 — 고기(뼈붙은 살점)·건초(풀단)·물고기·물(물방울)
function makeFoodMesh(food) {
  const g = new THREE.Group()
  if (food === 'water') {
    // 💧 물 — 파란 물방울 (모든 공룡이 마심)
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshLambertMaterial({ color: '#4FA9E0', transparent: true, opacity: 0.9 }))
    drop.scale.set(1, 1.25, 1); g.add(drop)
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshLambertMaterial({ color: '#DFF3FF' }))
    shine.position.set(-0.07, 0.08, 0.12); g.add(shine)
  } else if (food === 'meat') {
    const flesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.26), new THREE.MeshLambertMaterial({ color: '#B23A2E' }))
    g.add(flesh)
    const fat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), new THREE.MeshLambertMaterial({ color: '#E8C9B0' }))
    fat.position.y = 0.15; g.add(fat)
    const bone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), new THREE.MeshLambertMaterial({ color: '#F2EFE2' }))
    bone.position.z = 0.28; g.add(bone)
  } else if (food === 'hay') {
    const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.34), new THREE.MeshLambertMaterial({ color: '#8FB84E' }))
    g.add(bundle)
    for (const dx of [-0.1, 0.1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), new THREE.MeshLambertMaterial({ color: '#6FA038' }))
      blade.position.set(dx, 0.2, 0.05); g.add(blade)
    }
  } else {
    // fish
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.4), new THREE.MeshLambertMaterial({ color: '#7FB6D6' }))
    g.add(body)
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.36), new THREE.MeshLambertMaterial({ color: '#EAF2F6' }))
    belly.position.y = -0.08; g.add(belly)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.08), new THREE.MeshLambertMaterial({ color: '#5E97BA' }))
    tail.position.z = -0.24; g.add(tail)
  }
  return g
}

export class DinoManager {
  constructor(scene, world, onAttackPlayer) {
    this.scene = scene
    this.world = world
    this.onAttackPlayer = onAttackPlayer // 물기 공격 콜백 (엔진이 hp 처리)
    this.fx = null        // 파티클 (엔진이 설정)
    this.sounds = null    // 사운드 (엔진이 설정 — 포효)
    this.onAggro = null   // 포효 시작 알림 (엔진이 공지 표시)
    this.onDefeat = null  // 격퇴 보상 (엔진이 소재 드롭)
    this.dinos = []
    this._respawnTimer = 0 // 0이면 스폰 시도, >0이면 대기
    this._raycaster = new THREE.Raycaster()
    this.defaultId = 'trex'   // 자유 로밍(비-스테이지)에서 재등장시킬 종
    this.stageTarget = null   // 스테이지 메인 공룡 id (설정 시 이 종만, 재등장 없음)
    this.stageMod = null      // 의뢰별 강화 배율
    this.autoRespawn = true    // 스테이지에선 false (격퇴=클리어)
    this.wanderArea = FARM_AREA // 배회 영역 (엔진이 지형에 맞게 교체)
    // 🥚 동물원 생태(먹이·번식·행복도)
    this.eggs = []
    this.foods = []        // 🍖 땅에 던져진 먹이 (공룡이 주워먹음)
    this.maxCount = 16     // 🦕 배치·번식 상한 (엔진이 부지 확장에 맞게 갱신)
    this.heldPos = null    // 🤲 들고 있는 공룡을 놓을 위치 (엔진이 매 프레임 지정)
    this._breedCd = 8
    this._ecoT = 0         // 생태(물·환경·건강) 갱신 타이머 — 1초마다
    this._callCd = 3 + Math.random() * 4 // 🦕 이따금 공룡 울음소리
    this.onZooEvent = null // 알·부화·죽음 알림 (엔진이 공지)
  }

  // 종의 식성 → 먹이 종류 (고기/건초/물고기)
  static foodFor(data) {
    const diet = data.diet || ''
    if (diet.includes('물고기')) return 'fish'
    if (diet.includes('초식')) return 'hay'
    return 'meat'
  }

  // 스테이지 메인 공룡 지정 — 한 마리만, 격퇴하면 재등장 없음
  // mod: 의뢰별 강화 배율 { hpMul, dmgAdd, scaleMul } (후반 의뢰의 강화 개체)
  setStage(dinoId, playerPos, mod = null) {
    this.stageTarget = dinoId
    this.stageMod = mod
    this.autoRespawn = false
    this.clear()
    // 🦖 메인 공룡은 멀리 스폰(파밍하다 발견) + 보스급으로. 멀리 못 찾으면 점점 가까이 재시도
    for (const md of [32, 26, 20, 14, 8]) {
      if (this.spawnDino(dinoId, playerPos, { minDist: md, boss: true })) break
    }
  }

  // 배회 영역 안, 플레이어와 minDist 이상 떨어진 지면 좌표 찾기
  _findSpawnPos(playerPos, minDist = 14) {
    for (let tries = 0; tries < 16; tries++) {
      const A = this.wanderArea; const x = A.x0 + Math.random() * (A.x1 - A.x0)
      const z = A.z0 + Math.random() * (A.z1 - A.z0)
      if (playerPos && Math.hypot(x - playerPos.x, z - playerPos.z) < minDist) continue
      const bx = Math.floor(x), bz = Math.floor(z)
      const gy = this.world.groundY(bx, bz)
      if (gy === null || gy > WORLD.MAX_H + 2) continue
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

  // 🧱 몸이 블록 안에 낀 공룡을 빼냄 (블록을 위에 놓거나 밀려 들어간 경우)
  // 위로 한 칸씩 올려 빈 곳을 찾고, 안 되면 지면 위로 올림
  _unstick(d) {
    if (d.flying || d.swimming) return // 하늘·물은 지형 충돌 없음
    if (!this._collides(d.pos.x, d.pos.y, d.pos.z)) return
    for (let up = 1; up <= 4; up++) {
      if (!this._collides(d.pos.x, d.pos.y + up, d.pos.z)) {
        d.pos.y += up
        d.velY = 0; d.onGround = true
        d.group.position.set(d.pos.x, d.pos.y, d.pos.z)
        return
      }
    }
    // 그래도 막히면 그 자리 지면 위로 올림
    const gy = this.world.groundY(Math.floor(d.pos.x), Math.floor(d.pos.z))
    if (gy != null && gy > d.pos.y) {
      d.pos.y = gy; d.velY = 0; d.onGround = true
      d.group.position.set(d.pos.x, d.pos.y, d.pos.z)
    }
  }

  // 하위호환 — 예전 호출부용
  spawnTrex(playerPos) {
    return this.spawnDino('trex', playerPos)
  }

  // ---------- 🦕 동물원(크리에이티브) — 평화로운 공룡 ----------
  // 지정 위치에 위협·공격 없는 공룡을 세운다. 집(스폰 지점) 근처를 천천히 배회
  spawnPeaceful(id, x, gy, z, opts = {}) {
    const data = DINOS[id]
    if (!data) return false
    const adultScale = data.stats.scale
    const baby = !!opts.baby
    const growT = opts.growT ?? (baby ? 0 : 1) // 0=갓 태어남 → 1=성체
    const scale = adultScale * (0.38 + 0.62 * growT)
    const group = data.make()
    group.scale.setScalar(scale)
    group.position.set(x, gy, z)
    this.scene.add(group)
    // 😊 기분 마크 — 머리 위에 뜨는 이모지+이유 버블 (배고픔/목마름/좁음/행복)
    const moodMat = new THREE.SpriteMaterial({ map: moodTexture('❤️', ''), transparent: true, depthTest: false })
    const moodSprite = new THREE.Sprite(moodMat)
    moodSprite.scale.set(1.3, 0.98, 1) // 텍스처 4:3 비율에 맞춤
    moodSprite.visible = false
    this.scene.add(moodSprite)
    this.dinos.push({
      id, data, group,
      peaceful: true,      // 동물원 공룡 — 절대 화내지·공격하지 않음
      home: [x, z],        // 배회 중심 (놓인 자리)
      flying: !!data.stats.flying,     // 익룡 — 공중에 떠서 날아다님
      swimming: !!data.stats.swimming, // 수룡 — 연못에서 헤엄
      food: DinoManager.foodFor(data), // 이 종이 먹는 먹이 (meat/hay/fish)
      sex: opts.sex || (Math.random() < 0.5 ? 'm' : 'f'), // ♂/♀
      fed: opts.fed ?? 0.6,  // 배부름(0~1) — 잘 먹으면 번식
      water: opts.water ?? 0.7, // 💧 수분(0~1) — 연못 근처에서 회복
      health: opts.health ?? 1, // ❤️ 건강(0~1) — 행복하면 회복, 방치하면 감소→떠남
      mood: 1,               // 종합 행복도(0~1)
      moodSprite, moodMat, moodEmoji: null,
      happyHop: 0,           // 먹이 먹을 때 폴짝 (기쁨 표현)
      baby, growT, adultScale,
      matedCd: baby ? 60 : 6, // 짝짓기 쿨다운(초)
      homeY: gy,
      flyT: Math.random() * 6.28,
      critter: false,
      dmgAdd: 0,
      pos: new THREE.Vector3(x, gy, z),
      velY: 0,
      hp: data.stats.hp,
      baseScale: scale,
      state: 'wander',
      target: null,
      eating: null,          // 조준 중인 땅 먹이
      idle: 1 + Math.random() * 2,
      yaw: Math.random() * Math.PI * 2,
      roarT: 0, attackCd: 0, chomp: 0,
      onGround: false, dying: 0, flash: 0,
      phase: Math.random() * Math.PI * 2,
    })
    return true
  }

  // 플레이어와 가장 가까운 동물원 공룡을 치움 (poof)
  removeNearest(pos) {
    let best = null, bd = Infinity
    for (const d of this.dinos) {
      if (d.dying || !d.peaceful) continue
      const dd = Math.hypot(d.pos.x - pos.x, d.pos.z - pos.z)
      if (dd < bd) { bd = dd; best = d }
    }
    if (!best) return false
    if (this.fx) { const p = best.pos.clone(); p.y += 1.2; this.fx.burst(p, '#5F7A3A', true) }
    best._rewarded = true // onDefeat(소재 드롭) 건너뜀
    best.dying = 0.001
    return true
  }

  // 💰 가장 가까운 공룡을 팔기 — 종·아기 여부 반환(가격은 엔진), 금빛 poof
  sellNearest(pos) {
    let best = null, bd = Infinity
    for (const d of this.dinos) {
      if (d.dying || !d.peaceful) continue
      const dd = Math.hypot(d.pos.x - pos.x, d.pos.z - pos.z)
      if (dd < bd) { bd = dd; best = d }
    }
    if (!best) return null
    const info = { id: best.id, baby: best.baby }
    if (this.fx) { const p = best.pos.clone(); p.y += 1.2; this.fx.burst(p, '#F2C14E', true) } // 금빛
    best._rewarded = true
    best.dying = 0.001
    return info
  }

  // 🤲 잡을 공룡 고르기 — 조준한 공룡 우선, 없으면 8칸 안 가장 가까운 공룡
  pickGrabbable(camera, pos) {
    const aimed = this._pickPeaceful(camera, 12)
    if (aimed && !aimed.held) return aimed
    let best = null, bd = Infinity
    for (const d of this.dinos) {
      if (d.dying || !d.peaceful || d.held) continue
      const dd = Math.hypot(d.pos.x - pos.x, d.pos.z - pos.z)
      if (dd < bd) { bd = dd; best = d }
    }
    return best && bd < 8 ? best : null
  }

  // 조준선에 있는 동물원 공룡 레코드를 반환 (내부용)
  _pickPeaceful(camera, reach = 8) {
    this._raycaster.setFromCamera({ x: 0, y: 0 }, camera)
    this._raycaster.far = reach
    const groups = this.dinos.filter((d) => !d.dying && d.peaceful).map((d) => d.group)
    if (!groups.length) return null
    const hits = this._raycaster.intersectObjects(groups, true)
    if (!hits.length) return null
    let obj = hits[0].object
    while (obj.parent && !groups.includes(obj)) obj = obj.parent
    return this.dinos.find((dd) => dd.group === obj) || null
  }

  // 클릭 공부 정보 — 도감 데이터 + 성별·아기 여부
  pickPeaceful(camera, reach = 8) {
    const d = this._pickPeaceful(camera, reach)
    if (!d) return null
    return { ...d.data, _sex: d.sex, _baby: d.baby }
  }

  // 🍖 조준한 공룡에게 먹이 주기. 반환: 'ok' | 'wrong' | 'none'
  feedAimed(camera, food, reach = 8) {
    const d = this._pickPeaceful(camera, reach)
    if (!d) return 'none'
    if (DinoManager.foodFor(d.data) !== food) return 'wrong'
    d.fed = Math.min(1, d.fed + 0.4)
    if (this.fx) { const p = d.pos.clone(); p.y += 1.2; this.fx.hit(p, '#ff5aa0') } // 하트빛
    return 'ok'
  }

  // 종별 배치 수 { trex: 2, ... }
  listCounts() {
    const c = {}
    for (const d of this.dinos) if (d.peaceful && !d.dying) c[d.id] = (c[d.id] || 0) + 1
    return c
  }

  peacefulCount() {
    return this.dinos.filter((d) => d.peaceful && !d.dying).length
  }

  // 저장용 — 배치된 동물원 공룡 목록 (성별·배부름·성장 포함)
  toZooJSON() {
    return this.dinos
      .filter((d) => d.peaceful && !d.dying)
      .map((d) => ({ id: d.id, x: d.pos.x, y: d.pos.y, z: d.pos.z, sex: d.sex, fed: +d.fed.toFixed(2), water: +d.water.toFixed(2), health: +d.health.toFixed(2), baby: d.baby, growT: +d.growT.toFixed(2) }))
  }

  // 서브퀘스트 몹(작은 공룡) N마리를 이 스테이지에 상주시킴 (격퇴하면 다시 등장)
  setCritters(count, id = 'compy') {
    this.critterTarget = count
    this.critterId = id
    this._critterTimer = 0
  }

  // 로스터의 임의 종을 스폰 (스테이지 강화 배율 적용). opts.critter=서브 몹
  spawnDino(id, playerPos, opts = {}) {
    const p = this._findSpawnPos(playerPos, opts.minDist ?? 14)
    if (!p) return false
    const [x, gy, z] = p
    const data = DINOS[id]
    if (!data) return false
    const mod = opts.critter ? null : this.stageMod // 서브 몹엔 강화 배율 미적용
    const boss = !!opts.boss // 사냥터 메인 공룡 = 더 크고 튼튼
    const scale = data.stats.scale * (mod?.scaleMul || 1) * (boss ? BOSS_SCALE : 1)
    const group = data.make()
    group.scale.setScalar(scale)
    group.position.set(x, gy, z)
    this.scene.add(group)
    this.dinos.push({
      id,
      data,
      group,
      critter: !!opts.critter, // 서브퀘스트 몹 (겁많음·재등장·클리어 무관)
      boss,
      dmgAdd: (mod?.dmgAdd || 0) + (boss ? 1 : 0), // 보스는 조금 더 아프게
      pos: new THREE.Vector3(x, gy, z),
      velY: 0,
      hp: Math.round(data.stats.hp * (mod?.hpMul || 1) * (boss ? BOSS_HP : 1)),
      baseScale: scale,
      state: 'wander',       // 'wander' | 'roar' | 'chase'
      target: null,          // 어슬렁 목표 지점
      idle: 1 + Math.random() * 2, // 멈춰서 쉬는 시간
      yaw: Math.random() * Math.PI * 2,
      roarT: 0,
      attackCd: 0,
      chomp: 0,              // 물기 연출 진행
      onGround: false,
      dying: 0,
      flash: 0,
      phase: Math.random() * Math.PI * 2, // 걷기 애니 위상
    })
    return true
  }

  // 어슬렁 목표 재설정
  _retarget(d) {
    d.target = [
      this.wanderArea.x0 + Math.random() * (this.wanderArea.x1 - this.wanderArea.x0),
      this.wanderArea.z0 + Math.random() * (this.wanderArea.z1 - this.wanderArea.z0),
    ]
  }

  // 리스폰 등에서 어그로 해제
  calmAll() {
    for (const d of this.dinos) {
      if (d.dying) continue
      d.state = 'wander'
      d.target = null
      d.idle = 2
    }
  }

  update(dt, playerPos) {
    // 자유 로밍: 항상 1마리 유지 (재등장). 스테이지: 재등장 없음(격퇴=클리어)
    if (this.autoRespawn && this.dinos.length === 0) {
      this._respawnTimer -= dt
      if (this._respawnTimer <= 0 && !this.spawnDino(this.defaultId, playerPos)) this._respawnTimer = 2
    }
    // 서브퀘스트 몹 상주 (목표 수 유지, 격퇴하면 잠시 후 재등장)
    if (this.critterTarget) {
      const alive = this.dinos.filter((d) => d.critter && !d.dying).length
      if (alive < this.critterTarget) {
        this._critterTimer -= dt
        if (this._critterTimer <= 0) {
          this.spawnDino(this.critterId, playerPos, { critter: true, minDist: 10 })
          this._critterTimer = 6
        }
      }
    }

    for (const d of this.dinos) {
      const st = d.data.stats

      // 격퇴 연출 (작아지며 폴짝 사라짐) + 보상 1회
      if (d.dying) {
        if (d.moodSprite) d.moodSprite.visible = false
        if (!d._rewarded) {
          d._rewarded = true
          if (this.fx) {
            const p = d.pos.clone()
            p.y += 1.2
            this.fx.burst(p, '#5F7A3A', true)
          }
          this.onDefeat?.(d.pos.clone(), d.data, d.critter)
          if (!d.critter) this._respawnTimer = RESPAWN_DELAY
        }
        d.dying = Math.min(1, d.dying + dt * 1.5)
        const s = d.baseScale * (1 - d.dying)
        d.group.scale.setScalar(Math.max(s, 0.001))
        continue
      }

      // 🤲 들려 있는 공룡 — AI 정지, 카메라 앞(heldPos)에 붙어 살랑 회전
      if (d.held) {
        if (this.heldPos) { d.pos.copy(this.heldPos); d.group.position.copy(this.heldPos) }
        d.yaw += dt * 1.6; d.group.rotation.y = d.yaw
        if (d.moodSprite) d.moodSprite.visible = false
        continue
      }

      // 🧱 블록에 낀 공룡 빼내기 (블록을 위에 놓거나 밀려 들어간 경우)
      this._unstick(d)

      // 피격 플래시 (좀비와 동일한 문법)
      if (d.flash > 0) {
        d.flash = Math.max(0, d.flash - dt)
        const k = d.flash / 0.15
        d.group.traverse((o) => {
          if (!o.isMesh) return
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of mats) m.emissive?.setScalar(k * 0.9)
        })
      }

      // 🍖 동물원 생태: 배고픔 감소 + 아기 성장
      if (d.peaceful) {
        d.fed = Math.max(0, d.fed - dt * 0.008) // 약 2분에 걸쳐 배고파짐
        if (d.matedCd > 0) d.matedCd -= dt
        if (d.baby) {
          d.growT = Math.min(1, d.growT + dt / 75) // ~75초에 성체
          d.baseScale = d.adultScale * (0.38 + 0.62 * d.growT)
          d.group.scale.setScalar(d.baseScale)
          if (d.growT >= 1) { d.baby = false; d.matedCd = 6 }
        }
      }

      const pdx = playerPos.x - d.pos.x
      const pdz = playerPos.z - d.pos.z
      const pdist = Math.hypot(pdx, pdz)

      // --- 상태 전이 (서브 몹·동물원 공룡은 위협 안 함) ---
      if (!d.critter && !d.peaceful && d.state === 'wander' && pdist < st.aggroRange) {
        d.state = 'roar'
        d.roarT = 0
        this.sounds?.roar?.()
        this.onAggro?.(d.data)
      } else if (d.state === 'chase' && pdist > st.loseRange) {
        d.state = 'wander'
        d.target = null
        d.idle = 1.5
      }

      let moveX = 0, moveZ = 0, speed = 0

      if (d.peaceful) {
        // 🍖 배고프면 먹이로, 💧 목마르면 물로 달려가 먹기 — 배회보다 우선
        const foodItem = this._nearestFood(d)
        if (foodItem) {
          const fp = foodItem.mesh.position
          const fdx = fp.x - d.pos.x, fdz = fp.z - d.pos.z
          const eatR = 0.7 + d.baseScale * 2.6
          if (Math.hypot(fdx, fdz) < eatR) { this._eatFood(d, foodItem); d.target = null; d.idle = 0.5 }
          else { moveX = fdx; moveZ = fdz; speed = (d.swimming ? st.wanderSpeed * 0.9 : st.wanderSpeed) * 1.2 }
        } else if (d.idle > 0) {
        // 🦕 동물원 — 서식지별 배회. 위협·공격 없음
          d.idle -= dt
        } else {
          if (!d.target) {
            if (d.flying) {
              // 🕊️ 하늘 — 맵 전체를 크게 돌아다님
              d.target = [4 + Math.random() * 56, 3 + Math.random() * 26]
            } else if (d.swimming) {
              // 🌊 물 — 연못 안에서만 헤엄
              const a = Math.random() * Math.PI * 2, rr = Math.random() * (ZOO_POND.r - 1.5)
              d.target = [ZOO_POND.x + Math.cos(a) * rr, ZOO_POND.z + Math.sin(a) * rr * 0.9]
            } else {
              // 🌿 육지 — 맵(섬) 전체를 자유롭게 돌아다님. 2칸 이상 울타리로 막으면 못 넘어가요
              const maxX = (this.world?.xMax ? this.world.xMax() : 60) - 2
              d.target = [2 + Math.random() * (maxX - 2), 2 + Math.random() * (WORLD.SIZE - 4)]
            }
          }
          const dx = d.target[0] - d.pos.x, dz = d.target[1] - d.pos.z
          const arrive = d.flying ? 1.6 : 1.0
          if (Math.hypot(dx, dz) < arrive) { d.target = null; d.idle = d.flying ? 0.2 : 1.5 + Math.random() * 2.5 }
          else { moveX = dx; moveZ = dz; speed = d.swimming ? st.wanderSpeed * 0.8 : st.wanderSpeed }
        }
      } else if (d.critter) {
        // 겁많은 서브 몹 — 가까우면 반대로 도망, 아니면 종종거리며 배회
        if (pdist < 7) {
          moveX = -pdx; moveZ = -pdz; speed = st.chaseSpeed
        } else if (d.idle > 0) {
          d.idle -= dt
        } else {
          if (!d.target) this._retarget(d)
          const dx = d.target[0] - d.pos.x, dz = d.target[1] - d.pos.z
          if (Math.hypot(dx, dz) < 1.2) { d.target = null; d.idle = 0.5 + Math.random() * 1.5 }
          else { moveX = dx; moveZ = dz; speed = st.wanderSpeed }
        }
      } else if (d.state === 'roar') {
        // 제자리에서 플레이어를 향해 포효 (이동 없음)
        d.roarT += dt
        d.yaw = lerpAngle(d.yaw, Math.atan2(pdx, pdz), TURN_SPEED * dt)
        if (d.roarT >= ROAR_TIME) d.state = 'chase'
      } else if (d.state === 'chase') {
        moveX = pdx; moveZ = pdz
        speed = st.chaseSpeed
        // 물기 공격
        d.attackCd -= dt
        const dy = playerPos.y - d.pos.y
        if (pdist < st.attackRange && Math.abs(dy) < 2.2 && d.attackCd <= 0) {
          d.attackCd = 1.4
          d.chomp = 0.4
          this.onAttackPlayer(st.dmg + (d.dmgAdd || 0))
        }
      } else {
        // 어슬렁 — 쉬다가 목표 지점으로 천천히 이동
        if (d.idle > 0) {
          d.idle -= dt
        } else {
          if (!d.target) this._retarget(d)
          const dx = d.target[0] - d.pos.x
          const dz = d.target[1] - d.pos.z
          if (Math.hypot(dx, dz) < 1.2) {
            d.target = null
            d.idle = 2 + Math.random() * 3
          } else {
            moveX = dx; moveZ = dz
            speed = st.wanderSpeed
          }
        }
      }

      // --- 이동 + 충돌 (축 분리) ---
      const mdist = Math.hypot(moveX, moveZ)
      if (speed > 0 && mdist > 0.05) {
        const vx = (moveX / mdist) * speed
        const vz = (moveZ / mdist) * speed
        const nx = d.pos.x + vx * dt
        const nz = d.pos.z + vz * dt
        if (d.flying || d.swimming) {
          // 하늘·물 — 지형 충돌 무시하고 자유 이동
          d.pos.x = nx; d.pos.z = nz
        } else {
          const blockedX = this._collides(nx, d.pos.y, d.pos.z)
          const blockedZ = this._collides(d.pos.x, d.pos.y, nz)
          if (!blockedX) d.pos.x = nx
          if (!blockedZ) d.pos.z = nz
          if (blockedX || blockedZ) {
            // 1칸 턱이면 한 번 폴짝, 진짜 벽이면 뒤돌아 다른 곳으로 (깡총 반복 방지)
            const stepX = blockedX && !this._collides(nx, d.pos.y + 1.0, d.pos.z)
            const stepZ = blockedZ && !this._collides(d.pos.x, d.pos.y + 1.0, nz)
            if ((stepX || stepZ) && d.onGround) d.velY = HOP_V
            else if (d.peaceful) { d.target = null; d.idle = 0.3 + Math.random() * 0.5 } // 방향 전환
            else if (blockedX && blockedZ && d.state === 'wander') { d.target = null; d.idle = 1 }
          }
        }
        d.yaw = lerpAngle(d.yaw, Math.atan2(moveX, moveZ), TURN_SPEED * dt)
      }

      // --- 높이 ---
      if (d.flying) {
        // 익룡 — 공중에 떠서 위아래로 살랑
        d.flyT += dt * 1.4
        d.pos.y = d.homeY + FLY_HOVER + Math.sin(d.flyT) * 0.5
      } else if (d.swimming) {
        // 수룡 — 연못 수면에서 넘실
        d.flyT += dt * 1.1
        d.pos.y = ZOO_POND.surfaceY + 0.15 + Math.sin(d.flyT) * 0.15
      } else {
        d.velY -= GRAV * dt
        const ny = d.pos.y + d.velY * dt
        if (!this._collides(d.pos.x, ny, d.pos.z)) {
          d.pos.y = ny
          d.onGround = false
        } else {
          if (d.velY < 0) d.onGround = true
          d.velY = 0
        }
      }

      // 🦘 먹이 먹을 때 기쁨의 폴짝 (표정 대신 몸으로 기쁨 표현)
      let hopY = 0
      if (d.happyHop > 0) {
        d.happyHop = Math.max(0, d.happyHop - dt)
        hopY = Math.sin((0.5 - d.happyHop) / 0.5 * Math.PI) * 0.3
      }
      d.group.position.set(d.pos.x, d.pos.y + hopY, d.pos.z)
      d.group.rotation.y = d.yaw
      // 😊 기분 마크 위치 (머리 위에서 살랑)
      if (d.moodSprite && d.moodSprite.visible) {
        const hh = Math.max(1.6, d.baseScale * 6)
        d.moodSprite.position.set(d.pos.x, d.pos.y + hh + Math.sin(d.phase) * 0.06, d.pos.z)
      }
      this._animate(d, dt, speed)
    }

    // 🍖 땅 먹이 낙하·부유 (동물원)
    this._updateFoods(dt)

    // 🚧 서로 겹치지 않게 밀어내기 (동물원)
    this._separate()

    // 💧 물·환경·건강(행복도) — 1초마다 갱신 (느리게 변함)
    this._ecoT += dt
    if (this._ecoT >= 1) { this._updateEco(this._ecoT); this._ecoT = 0 }

    // 🦕 이따금 무작위 공룡이 울음소리 (동물원 생동감)
    this._callCd -= dt
    if (this._callCd <= 0) {
      const arr = this.dinos.filter((d) => d.peaceful && !d.dying)
      if (arr.length && this.sounds) {
        const d = arr[Math.floor(Math.random() * arr.length)]
        this.sounds.dinoVoice?.(DinoManager.voiceKind(d.data))
      }
      this._callCd = 5 + Math.random() * 8 // 5~13초마다
    }

    // 💕 번식 + 🥚 알 부화 (동물원)
    this._updateBreeding(dt)

    // 소멸 완료 제거
    this.dinos = this.dinos.filter((d) => {
      if (d.dying >= 1) {
        this.scene.remove(d.group)
        if (d.moodSprite) { this.scene.remove(d.moodSprite); d.moodMat?.dispose?.() }
        return false
      }
      return true
    })
  }

  // 🍖 카메라 앞으로 먹이를 던진다 (동물원) — 땅에 떨어지면 공룡이 주워먹음
  throwFood(camera, food) {
    const mesh = makeFoodMesh(food)
    const pos = new THREE.Vector3(); camera.getWorldPosition(pos)
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir)
    pos.addScaledVector(dir, 0.7); pos.y -= 0.15
    mesh.position.copy(pos)
    this.scene.add(mesh)
    const vel = dir.clone().multiplyScalar(9); vel.y += 3.2
    this.foods.push({ mesh, type: food, vel, grounded: false, age: 0, spin: Math.random() * 6.28 })
    return true
  }

  // 던진 먹이 낙하 → 땅/수면에 안착 후 살짝 부유, 오래되면 정리
  _updateFoods(dt) {
    if (!this.foods.length) return
    this.foods = this.foods.filter((f) => {
      f.age += dt
      if (f.age > 75) { this.scene.remove(f.mesh); return false }
      const p = f.mesh.position
      if (!f.grounded) {
        f.vel.y -= 14 * dt
        p.addScaledVector(f.vel, dt)
        const inPond = Math.hypot(p.x - ZOO_POND.x, p.z - ZOO_POND.z) < ZOO_POND.r
        if (inPond && p.y <= ZOO_POND.surfaceY + 0.25) {
          p.y = ZOO_POND.surfaceY + 0.2; f.grounded = true // 연못이면 수면에 둥둥
        } else if (f.vel.y < 0 && this.world.isSolid(Math.floor(p.x), Math.floor(p.y - 0.15), Math.floor(p.z))) {
          p.y = Math.floor(p.y - 0.15) + 1.18; f.grounded = true
        } else if (p.y < -12) { this.scene.remove(f.mesh); return false }
      } else {
        p.y += Math.sin(f.age * 3) * 0.002
      }
      f.spin += dt * 1.4
      f.mesh.rotation.y = f.spin
      return true
    })
  }

  // 공룡이 노릴 가장 가까운 땅 소비물 — 배고프면 식성 먹이, 목마르면 물(누구나)
  _nearestFood(d) {
    const hungry = d.fed < 0.9, thirsty = d.water < 0.85
    let best = null, bd = 999
    for (const f of this.foods) {
      if (!f.grounded) continue
      const wantFood = f.type === d.food && hungry
      const wantWater = f.type === 'water' && thirsty
      if (!wantFood && !wantWater) continue
      const dd = Math.hypot(f.mesh.position.x - d.pos.x, f.mesh.position.z - d.pos.z)
      if (dd < bd) { bd = dd; best = f }
    }
    return bd < 45 ? best : null
  }

  // 냠냠/꿀꺽 — 물이면 수분, 먹이면 배부름·건강 회복 + 기쁨의 폴짝 + 마크
  _eatFood(d, f) {
    this.scene.remove(f.mesh)
    this.foods = this.foods.filter((x) => x !== f)
    const head = d.pos.clone().setY(d.pos.y + d.baseScale * 5)
    if (f.type === 'water') {
      d.water = Math.min(1, d.water + 0.55) // 💧 꿀꺽
      if (this.fx) this.fx.emote(head, '💧')
    } else {
      d.fed = Math.min(1, d.fed + 0.5)
      d.water = Math.min(1, d.water + 0.1) // 먹이에도 수분 약간
      d.health = Math.min(1, d.health + 0.12)
      if (this.fx) this.fx.emote(head, '❤️')
    }
    d.happyHop = 0.5
    if (f.type === 'water') this.sounds?.pickup?.() // 물은 꿀꺽(뿅)
    else this.sounds?.nom?.() // 🍖 냠냠
    if (Math.random() < 0.5) this.sounds?.dinoVoice?.(DinoManager.voiceKind(d.data)) // 가끔 만족의 울음
  }

  // 종류별 울음소리 종류 판별 (익룡·수룡·육식대형·소형·초식대형)
  static voiceKind(data) {
    const s = data.stats || {}
    if (s.flying) return 'screech'
    if (s.swimming) return 'whale'
    const carn = (data.diet || '').includes('육식')
    if ((s.scale || 0.4) < 0.25) return 'chirp' // 콤프소·벨로시랩터
    return carn ? 'roar' : 'bellow'
  }

  // 💧 물·🏡 환경·❤️ 건강(행복도) 갱신 — 1초 간격. 방치하면 쇠약해 떠남
  _updateEco(dt) {
    const zoo = this.dinos.filter((d) => d.peaceful && !d.dying)
    for (const d of zoo) {
      // 💧 물: 연못 근처면 마시고, 멀면 서서히 마름 (수룡은 늘 물속)
      const pondD = Math.hypot(d.pos.x - ZOO_POND.x, d.pos.z - ZOO_POND.z)
      const nearWater = d.swimming || pondD < ZOO_POND.r + 4
      d.water = nearWater ? Math.min(1, d.water + dt * 0.06) : Math.max(0, d.water - dt * 0.02)
      // 🏡 쾌적도: 너무 붐비면 불편 / 초식(무리)은 친구 없으면 외로움 / 육식은 비좁으면 예민
      let neighbors = 0, sameKind = 0
      for (const o of zoo) {
        if (o === d || o.flying !== d.flying) continue
        if (Math.hypot(o.pos.x - d.pos.x, o.pos.z - d.pos.z) < 10) { neighbors++; if (o.id === d.id) sameKind++ }
      }
      const herb = (d.data.diet || '').includes('초식')
      let comfort = 1 - Math.max(0, neighbors - 3) * 0.18
      if (herb && sameKind === 0) comfort -= 0.15
      if (!herb && neighbors > 2) comfort -= 0.1
      comfort = Math.max(0, Math.min(1, comfort))
      // 😊 종합 행복도 — 가장 나쁜 요소에 민감 (하나라도 바닥이면 크게 불행)
      const worst = Math.min(d.fed, d.water, comfort)
      d.mood = (d.fed * 0.4 + d.water * 0.3 + comfort * 0.3) * (0.5 + 0.5 * worst)
      // ❤️ 건강: 행복하면 회복 / 오래 불행하면 감소 → 0이면 조용히 떠남
      if (d.mood > 0.55) d.health = Math.min(1, d.health + dt * 0.04)
      else if (d.mood < 0.3) d.health = Math.max(0, d.health - dt * 0.02)
      if (d.health <= 0 && !d.baby) {
        d._rewarded = true; d.dying = 0.001
        this.onZooEvent?.(`😢 ${DINOS[d.id].name}가 힘들어서 떠났어요… 물·먹이·공간을 챙겨주세요`)
        if (this.fx) this.fx.emote(d.pos.clone().setY(d.pos.y + d.baseScale * 5), '😢')
        continue
      }
      // 🫧 기분 마크 갱신 — 슬프면 "왜 슬픈지"(목마름·배고픔·좁음)를 말풍선으로 함께 표시
      let emoji = null, label = ''
      if (d.health < 0.5 || d.mood < 0.35) {
        // 가장 나쁜 요소를 이유로 (물 > 먹이 > 공간)
        emoji = '😢'
        if (d.water <= d.fed && d.water <= comfort) label = '목말라요'
        else if (d.fed <= comfort) label = '배고파요'
        else label = '좁아요'
      } else if (d.fed < 0.35) { emoji = FOOD_EMOJI[d.food] || '🍖'; label = '배고파요' }
      else if (d.water < 0.35) { emoji = '💧'; label = '목말라요' }
      else if (comfort < 0.45) { emoji = '😣'; label = '좁아요' }
      else if (d.mood > 0.75) { emoji = '❤️'; label = '' }
      const moodKey = emoji ? emoji + '|' + label : null
      if (moodKey !== d.moodEmoji) {
        d.moodEmoji = moodKey
        if (emoji) {
          d.moodMat.map = moodTexture(emoji, label); d.moodMat.needsUpdate = true
          d.moodSprite.position.set(d.pos.x, d.pos.y + Math.max(1.6, d.baseScale * 6), d.pos.z) // 첫 프레임 원점 깜빡임 방지
          d.moodSprite.visible = true
        } else d.moodSprite.visible = false
      }
    }
  }

  // 공룡끼리 서로 겹치지 않게 밀어냄 (크기에 비례한 반경). 같은 층끼리만(하늘/땅 구분)
  _separate() {
    const arr = this.dinos.filter((d) => !d.dying && d.peaceful)
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i], ra = Math.max(0.5, a.baseScale * 3.2)
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j]
        if (a.flying !== b.flying) continue // 하늘 vs 땅은 높이가 달라 안 겹침
        const rb = Math.max(0.5, b.baseScale * 3.2)
        let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z
        let dd = Math.hypot(dx, dz)
        const minD = ra + rb
        if (dd >= minD) continue
        if (dd < 0.001) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; dd = Math.hypot(dx, dz) || 1 }
        const push = (minD - dd) * 0.5
        dx /= dd; dz /= dd
        // 블록 안으로 밀어넣지 않게 축별로 충돌 검사 후 이동
        this._nudge(a, -dx * push, -dz * push)
        this._nudge(b, dx * push, dz * push)
      }
    }
  }

  // 공룡을 (mx,mz)만큼 밀되 벽/블록은 통과하지 않게 (땅 공룡만 충돌 검사)
  _nudge(o, mx, mz) {
    if (o.flying || o.swimming) { o.pos.x += mx; o.pos.z += mz }
    else {
      if (!this._collides(o.pos.x + mx, o.pos.y, o.pos.z)) o.pos.x += mx
      if (!this._collides(o.pos.x, o.pos.y, o.pos.z + mz)) o.pos.z += mz
    }
    o.group.position.set(o.pos.x, o.pos.y, o.pos.z)
  }

  // 잘 먹은 암수 성체 한 쌍이 가까이 있으면 알을 낳고, 알은 시간이 지나면 새끼로 부화
  _updateBreeding(dt) {
    // 알 업데이트 (흔들 + 부화)
    for (const e of this.eggs) {
      e.t += dt
      e.mesh.rotation.z = Math.sin(e.t * 6) * 0.12 * Math.min(1, e.t / (e.hatch - 2))
      e.mesh.position.y = e.pos.y + 0.45 + Math.abs(Math.sin(e.t * 3)) * 0.05
    }
    const hatched = this.eggs.filter((e) => e.t >= e.hatch)
    for (const e of hatched) {
      this.scene.remove(e.mesh)
      this.spawnPeaceful(e.id, e.pos.x, e.pos.y, e.pos.z, { baby: true })
      this.onZooEvent?.(`🐣 ${DINOS[e.id].name} 새끼가 태어났어요!`)
      if (this.fx) this.fx.burst(e.pos.clone().setY(e.pos.y + 0.4), '#FBD87A', true)
    }
    if (hatched.length) this.eggs = this.eggs.filter((e) => e.t < e.hatch)

    // 짝짓기 (전체 쿨다운 + 개체 수 상한)
    this._breedCd -= dt
    const alive = this.dinos.filter((d) => d.peaceful && !d.dying)
    if (this._breedCd > 0 || alive.length + this.eggs.length >= this.maxCount) return
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i]
      if (a.baby || a.matedCd > 0 || a.fed < 0.7) continue
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j]
        if (b.id !== a.id || b.baby || b.matedCd > 0 || b.fed < 0.7) continue
        if (a.sex === b.sex) continue
        if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > 6) continue
        // ♥ 짝 성립 → 알
        const ex = (a.pos.x + b.pos.x) / 2, ez = (a.pos.z + b.pos.z) / 2
        let ey = a.swimming ? 0.1 : (this.world.groundY(Math.floor(ex), Math.floor(ez)) ?? 1)
        const mesh = makeEggMesh()
        mesh.position.set(ex, ey + 0.45, ez)
        this.scene.add(mesh)
        this.eggs.push({ id: a.id, pos: new THREE.Vector3(ex, ey, ez), mesh, t: 0, hatch: 16 })
        a.fed -= 0.3; b.fed -= 0.3
        a.matedCd = b.matedCd = 45
        this._breedCd = 15
        this.onZooEvent?.(`💕 ${DINOS[a.id].name} 부부가 알을 낳았어요!`)
        return
      }
    }
  }

  // 알·먹이도 함께 정리
  clearZoo() {
    for (const e of this.eggs) this.scene.remove(e.mesh)
    this.eggs = []
    for (const f of this.foods) this.scene.remove(f.mesh)
    this.foods = []
  }

  // 걷기(다리 스윙·꼬리 좌우)·경계(머리 들기, 육식은 턱 벌림)·공격 연출
  // 2족(티라노)·4족(트리케라·스테고) 모두 지원. 턱(jaw)은 있으면만 사용
  _animate(d, dt, speed) {
    const u = d.group.userData
    const walking = speed > 0
    d.phase += dt * (2.2 + speed * 1.1)

    // 익룡: 날개 펄럭임 (좌우 대칭) — 다리 스윙 대신
    if (d.flying && u.wings) {
      const flap = Math.sin(d.phase * 1.5) * 0.5 + 0.05
      u.wings[0].rotation.z = flap   // 오른 날개
      u.wings[1].rotation.z = -flap  // 왼 날개
    } else {
      // 다리: 교차 스윙 (4족은 대각선 보행 — legs[0]&[3] 동위상, [1]&[2] 반대)
      const amp = walking ? Math.min(0.28 + speed * 0.06, 0.6) : 0
      const legs = u.legs || []
      for (let i = 0; i < legs.length; i++) {
        const off = i === 0 || i === 3 ? 0 : Math.PI
        legs[i].rotation.x = Math.sin(d.phase + off) * amp
        // 무릎 관절: 다리를 앞으로 들 때 정강이가 접혔다 펴짐 (있는 종만)
        const knee = legs[i].userData?.knee
        if (knee) knee.rotation.x = Math.max(0, Math.sin(d.phase + off + 0.6)) * amp * 1.4
      }
    }

    // 꼬리: 마디마다 위상차 흔들림 (중첩 그룹이라 뒤로 전파)
    if (u.tailSegs) {
      for (let i = 0; i < u.tailSegs.length; i++) {
        u.tailSegs[i].rotation.y = Math.sin(d.phase * 0.6 + i * 0.7) * (walking ? 0.09 : 0.045)
      }
    }

    // 몸통: 걸을 때 살짝 들썩
    if (u.torso) {
      u.torso.position.y = walking ? Math.abs(Math.sin(d.phase)) * 0.09 : 0
      u.torso.rotation.z = Math.sin(d.phase) * (walking ? 0.02 : 0)
    }

    // 머리·턱 (턱은 육식공룡만 있음)
    if (!u.headGrp) return
    if (d.state === 'roar') {
      const k = Math.sin(Math.min(d.roarT / ROAR_TIME, 1) * Math.PI)
      u.headGrp.rotation.x = -0.4 * k // 머리 들며 위협
      if (u.jaw) u.jaw.rotation.x = 0.75 * k
    } else if (d.chomp > 0) {
      d.chomp = Math.max(0, d.chomp - dt)
      const k = Math.sin((d.chomp / 0.4) * Math.PI)
      u.headGrp.rotation.x = (u.jaw ? 0.15 : -0.25) * k // 육식=물기 / 초식=박치기
      if (u.jaw) u.jaw.rotation.x = 0.6 * k
    } else {
      const chase = d.state === 'chase'
      u.headGrp.rotation.x = walking ? Math.sin(d.phase * 2) * 0.03 : 0
      if (u.jaw) u.jaw.rotation.x = chase ? 0.18 : Math.max(0, Math.sin(d.phase * 0.3)) * 0.05
    }
  }

  // 좌클릭/무기 공격 — 카메라 레이가 공룡에 닿으면 피해. 반환: false | 'hit' | 'kill'
  tryHit(camera, reach = 3.5, damage = 1) {
    this._raycaster.setFromCamera({ x: 0, y: 0 }, camera)
    this._raycaster.far = reach
    const groups = this.dinos.filter((d) => !d.dying && !d.peaceful).map((d) => d.group)
    if (groups.length === 0) return false
    const hits = this._raycaster.intersectObjects(groups, true)
    if (hits.length === 0) return false
    let obj = hits[0].object
    while (obj.parent && !groups.includes(obj)) obj = obj.parent
    const d = this.dinos.find((dd) => dd.group === obj)
    if (!d) return false
    this.damage(d, damage)
    return d.dying ? 'kill' : 'hit'
  }

  // 피해 적용 (근접·화살·폭발 공통) — 맞으면 반격 모드로
  damage(d, dmg) {
    if (d.dying) return
    d.hp -= dmg
    d.flash = 0.15
    if (this.fx) {
      const p = d.pos.clone()
      p.y += 1.3
      this.fx.hit(p, '#5F7A3A')
      this.fx.damageNumber(p, dmg)
    }
    if (d.hp <= 0) {
      d.dying = 0.001
    } else if (d.state === 'wander') {
      d.state = 'roar'
      d.roarT = 0
      this.sounds?.roar?.()
      this.onAggro?.(d.data)
    }
  }

  count() {
    return this.dinos.filter((d) => !d.dying).length
  }

  clear() {
    for (const d of this.dinos) {
      this.scene.remove(d.group)
      if (d.moodSprite) { this.scene.remove(d.moodSprite); d.moodMat?.dispose?.() }
    }
    this.dinos = []
    this._respawnTimer = 0
  }
}
