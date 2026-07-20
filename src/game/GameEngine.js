// 게임 엔진 — 씬·카메라·렌더러·rAF 루프 소유. React와는 콜백으로만 연결
import * as THREE from 'three'
import { World, WORLD, ZOO_POND } from './World.js'
import { Player, EYE } from './Player.js'
import { BlockActions } from './BlockActions.js'
import { createMaterials, HOTBAR, BLOCK_TYPES, PLANT_TYPES, crossGeometry, BLOCK_PRICE, FOOD_SLOTS } from './textures.js'
import { DayNight } from './DayNight.js'
import { ZombieManager } from './Zombie.js'
import { DinoManager } from './Dinos.js'
import { Npcs } from './Npcs.js'
import { Environment } from './Environment.js'
import { FieldDecor } from './FieldDecor.js'
import { PART_ORDER, PART_INFO, DINOS, DINO_PRICE } from './dinoData.js'
import { RECIPES, canCraft } from './craft.js'
import { recordDinoPart } from '../save/dinopedia.js'
import { WeaponSystem } from './Weapons.js'
import { ViewModel } from './ViewModel.js'
import { Sounds } from './sounds.js'
import { Drops } from './Drops.js'
import { Weather } from './Weather.js'
import { Dog } from './Dog.js'
import { Crops } from './Crops.js'
import { Particles } from './Particles.js'
import { writeSave, addIsland, setCurrentIsland, islandInfo as loadIslandInfo } from '../save/storage.js'
import { writeProfile, MAT_KEYS } from '../save/profile.js'
import { loadProgress } from '../save/progress.js'
import { eraIndexForClears, eraBonus } from './eras.js'

const SAVE_DEBOUNCE = 1500   // 블록 변경 후 자동저장 대기(ms)
const START_INVENTORY = 24   // 서바이벌 시작 시 블록 종류별 개수
const MAX_HP = 20
const REGEN_INTERVAL = 4     // 낮 회복 주기(초)
const MINIMAP_INTERVAL = 0.5

// 무기 탄약: 최대치 + 충전 주기(초). 칼(sword)·맨손(hand)·곡괭이(pickaxe)는 무제한
const AMMO_MAX = { arrow: 20, dynamite: 3 }
const AMMO_RECHARGE = { arrow: 4, dynamite: 15 }
const WEAPON_KEYS = { KeyV: 'hand', KeyB: 'pickaxe', KeyZ: 'sword', KeyX: 'bow', KeyC: 'dynamite', KeyG: 'seed' }
const SEED_MAX = 99
const ZOO_MAX = 16 // 🦕 동물원 기본 배치 한도 (부지 확장 1단계마다 +16)
// 🗺️ 부지 확장 — 구독자 이 숫자를 넘으면 한 단계씩 확장(+16). 최대 5단계 → 96마리
const ZOO_EXPAND_SUBS = [1000, 10000, 100000, 1000000, 10000000]
const CHANNEL_UNLOCK_DAY = 3 // 📺 유튜브 채널 개설 가능 일차
const ISLAND_PRICE = 1000000 // 🏝️ 새 섬 분양 가격 (코인). 섬을 옮겨가며 운영

// 골드 상점 가격표 (골드 = 캐거나 농사로 얻은 gold 블록)
export const SHOP_ITEMS = [
  { id: 'arrow5', icon: '🏹', name: '화살 5발', cost: 2 },
  { id: 'dyn1', icon: '🧨', name: '다이너마이트 1개', cost: 3 },
  { id: 'seed3', icon: '🌱', name: '씨앗 3개', cost: 1 },
  { id: 'heal', icon: '❤️', name: '하트 모두 회복', cost: 4 },
  { id: 'dog', icon: '🐶', name: '강아지 동료', cost: 10 },
]
const ATTACK_CD = 0.25 // 무기 연사 방지(초)

// 블록 경도 — 곡괭이로 부수는 데 걸리는 시간(초). 맨손은 3배 느림
const HARDNESS = {
  leaves: 0.25, sand: 0.4, grass: 0.5, dirt: 0.5,
  wood: 0.9, stone: 1.5, gold: 1.5, brick: 1.8,
}
const HAND_MULT = 3
const MINE_SWING_INTERVAL = 0.26 // 채굴 중 휘두르기·틱 소리 간격

export class GameEngine {
  /**
   * @param canvas 게임 캔버스
   * @param saveData 이어하기 데이터 (새 게임이면 { mode }만 담김)
   * @param bridge React 브리지 { onPause, onHotbar, onInventory, onHp, onDeath, onTime, onWeapon, onAmmo }
   */
  constructor(canvas, saveData, bridge = {}) {
    this.canvas = canvas
    this.bridge = bridge
    this.mode = saveData?.mode || 'creative'
    this.survival = this.mode === 'survival'
    this.villageMode = this.mode === 'village' // 마을: 안전지대 — 전투·건축 없음, NPC·대문
    this.zoo = this.mode === 'creative'        // 🦕 공룡 동물원 — 자유 건축 + 평화로운 공룡 배치
    this.stage = saveData?.stage || null // 사냥 스테이지 설정 (있으면 낮 고정·메인 공룡·클리어)
    this._cleared = false

    // --- 씬 구성 ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#7EC8F0')
    this.scene.fog = new THREE.Fog('#7EC8F0', 40, 90)

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200)

    this.hemi = new THREE.HemisphereLight('#ffffff', '#9B6B43', 0.9)
    this.sun = new THREE.DirectionalLight('#fff6e0', 1.2)
    this.sun.position.set(20, 40, 15)
    this.scene.add(this.hemi, this.sun)

    // --- 낮밤 ---
    this.dayNight = new DayNight(this.scene, this.hemi, this.sun)
    if (saveData?.dayTime != null) this.dayNight.setTime(saveData.dayTime)
    if (saveData?.day) this.dayNight.day = saveData.day
    if (this.stage) {
      // 스테이지: 낮 고정 + 지역 하늘색 (밤/좀비 없음 — 사냥에 집중)
      this.dayNight.setTime(0.3)
      const sky = new THREE.Color(this.stage.theme?.sky || '#7EC8F0')
      this.scene.background.copy(sky)
      this.scene.fog.color.copy(sky)
    }
    if (this.villageMode) this.dayNight.setTime(0.3) // 마을도 밝은 낮 고정
    // 🏞️ 마을·사냥터 밖 원경 (땅·산·숲) — 하늘 지평선 방지 + 안개 멀리
    if (this.villageMode || this.stage) {
      this.environment = new Environment(this.scene)
      this.scene.fog.near = 60
      this.scene.fog.far = 230
    } else if (this.zoo) {
      // 🌊 동물원 = 바다로 둘러싸인 무인도
      this.environment = new Environment(this.scene, { ocean: true })
      this.scene.fog.near = 70
      this.scene.fog.far = 300
    }

    // --- 월드 & 플레이어 ---
    const variant = this.villageMode ? 'village' : this.zoo ? 'zoo' : this.stage?.terrain || 'classic'
    const zooExp0 = this.zoo ? Math.max(0, Math.min(ZOO_EXPAND_SUBS.length, saveData?.zooExpand ?? 0)) : 0
    this.world = new World(saveData?.seed ?? Math.floor(Math.random() * 1e9), variant, zooExp0)
    if (saveData?.blocks) this.world.loadDelta(saveData.blocks)
    this.player = new Player(this.world)
    if (saveData?.player) this.player.fromJSON(saveData.player)
    this.actions = new BlockActions(this.world, this.player, this.camera)

    // --- 서바이벌: 인벤토리 + 좀비 ---
    // 스테이지는 블록을 새로 지급하고 프로필 소재(뼈·가죽·이빨·골드)를 얹는다 (지형은 매번 새로)
    const freshBlocks = () => Object.fromEntries(HOTBAR.map((t) => [t, START_INVENTORY]))
    this.inventory = this.survival
      ? this.stage
        ? { ...freshBlocks(), ...(saveData?.mats || {}) }
        : saveData?.inventory || freshBlocks()
      : null
    this.zombies = this.survival
      ? new ZombieManager(this.scene, this.world, (dmg) => this._onZombieAttack(dmg))
      : null
    // 🦖 공룡 — 스테이지면 메인 공룡 1마리(재등장X), 아니면 티라노 상주(재등장O)
    // 🦕 동물원(크리에이티브)도 매니저를 두되 자동 스폰은 끔 (플레이어가 직접 배치)
    this.dinos = this.survival || this.zoo
      ? new DinoManager(this.scene, this.world, (dmg) => this._onZombieAttack(dmg))
      : null
    if (this.zoo && this.dinos) this.dinos.autoRespawn = false
    // 농촌 등 전용 지형은 필드 전체를 배회 (메인몹이 멀리서 여기저기 돌아다님)
    if (this.dinos && this.stage?.terrain === 'field') {
      this.dinos.wanderArea = { x0: 4, x1: 60, z0: 4, z1: 28 }
    }
    if (this.stage && this.dinos) this.dinos.setStage(this.stage.dinoId, this.player.pos, this.stage.mod)
    // 서브퀘스트 몹 — 농촌 필드에 콤프소그나투스 여러 마리 상주 (파밍: 메인 발견 전 사냥 소재)
    if (this.stage?.terrain === 'field' && this.dinos) this.dinos.setCritters(5, 'compy')
    // 🌾 밭 십자 작물 (마인크래프트식, 비충돌)
    if (this.stage?.terrain === 'field') this.fieldDecor = new FieldDecor(this.scene, this.world)

    // --- 마을 NPC (안전지대) ---
    this.npcs = this.villageMode ? new Npcs(this.scene, this.world) : null
    this._nearNpc = null
    this._nearGate = false
    this._lastPrompt = null

    // --- 사운드 (효과음 + BGM, 첫 입력 시 unlock) ---
    this.sounds = new Sounds()

    // --- 서바이벌: 무기·도구 (전부 처음부터 보유) ---
    this.weapon = 'hand' // 'hand' | 'pickaxe' | 'sword' | 'bow' | 'dynamite'
    this.blockSelected = true // 핫바 블록을 고른 상태 (그때만 설치 가능·손에 블록 표시)
    this.weapons = this.survival
      ? new WeaponSystem(this.scene, this.zombies, this.world, this.sounds, this.dinos)
      : null
    this.ammo = this.survival
      ? saveData?.ammo || { arrow: AMMO_MAX.arrow, dynamite: AMMO_MAX.dynamite, seed: 5 }
      : null
    if (this.ammo && typeof this.ammo.seed !== 'number') this.ammo.seed = 5 // 구버전 저장 호환

    // --- 제작 장비 (공룡 소재로 만든 검·갑옷) + 시대 보너스 ---
    this.crafted = this.survival ? saveData?.crafted || {} : {}
    // 시대 = 실제 파워: 클리어한 의뢰 수 → 시대 → 공격/방어 보너스 (eras.js)
    const clears = this.survival
      ? Object.values(loadProgress().cleared || {}).filter(Boolean).length
      : 0
    this._eraBonus = eraBonus(eraIndexForClears(clears))
    this.swordDamage = 2 // 기본 칼. 뼈 검→3, 이빨 창→4 + 시대 보너스 (_applyEquipment)
    this.defense = 0     // 가죽 갑옷→3 + 시대 보너스
    this._ammoTimers = { arrow: 0, dynamite: 0 }
    this._attackCd = 0
    // 채굴 홀드 상태 (꾹 누르는 동안 진행)
    this._mining = false
    this._mineKey = null
    this._mineProgress = 0
    this._mineSwingTimer = 0

    this.world.onChange = () => {
      this.rebuildMeshes()
      this.scheduleSave()
      this._drawMinimap()
    }

    // --- 블록 메시 (타입별 InstancedMesh, 변경 시 재생성) ---
    this.materials = createMaterials()
    this.blockGeo = new THREE.BoxGeometry(1, 1, 1)
    this.crossGeo = crossGeometry() // 🌿 식물형 블록(건초·옥수수·벼)용 십자 지오
    this.blockMeshes = []
    this.rebuildMeshes()

    // 조준 하이라이트
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })
    )
    this.highlight.visible = false
    this.scene.add(this.highlight)

    // --- 1인칭 뷰모델 (손/도구 + 휘두르기 모션) ---
    this.scene.add(this.camera) // 카메라 자식(뷰모델)이 렌더되도록
    this.viewModel = new ViewModel(this.camera, this.materials, saveData?.skinTone)
    if (this.survival) this._applyEquipment() // 저장된 제작 장비 반영
    if (this.villageMode) this.viewModel.setWeapon('hand', false) // 마을은 빈손

    // --- 드롭 아이템 (서바이벌: 부순 블록이 작은 큐브로 떠다님) ---
    this.drops = this.survival ? new Drops(this.scene, this.world, this.materials) : null

    // --- 하늘·날씨 (모든 모드): 뭉게구름 + 해/달 + 별 + 비 ---
    this.weather = new Weather(this.scene)
    this._lastDay = this.dayNight.day
    this._wasRaining = false

    // --- 농사 + 강아지 (서바이벌) ---
    this.crops = this.survival ? new Crops(this.scene) : null
    if (this.crops && saveData?.crops) this.crops.load(saveData.crops)
    this.hasDog = this.survival && !!saveData?.dog
    this.dog = this.hasDog ? new Dog(this.scene, this.world, this.player.pos) : null

    // --- 파티클 (피격·처치 이펙트) ---
    this.particles = new Particles(this.scene)
    if (this.zombies) this.zombies.fx = this.particles

    // --- 공룡 훅 (포효 알림 + 격퇴 보상) ---
    if (this.dinos) {
      this.dinos.fx = this.particles
      this.dinos.sounds = this.sounds
      this.dinos.onZooEvent = (text) => this.bridge.onNotice?.(text) // 알·부화 알림
      this.dinos.onAggro = (data) => {
        this.bridge.onNotice?.(`🦖 ${data.name}가 나를 발견했어요! 도망치거나 맞서 싸워요!`)
      }
      this.dinos.onDefeat = (pos, data, critter) => {
        this.sounds.dinoPoof()
        // 전리품 계산 (기본 + 희귀 확률)
        const loot = {}
        for (const [type, n] of Object.entries(data.drops || {})) loot[type] = (loot[type] || 0) + n
        let gotRare = false
        if (data.rareDrop && Math.random() < data.rareDrop.chance) { loot[data.rareDrop.type] = (loot[data.rareDrop.type] || 0) + 1; gotRare = true }

        const isBoss = this.stage && data.id === this.stage.dinoId && !this._cleared
        if (isBoss) {
          // 🏆 보스 격파 — 전리품 확정 자동 획득 + 슬로우모션 승리 연출
          this._cleared = true
          for (const [type, n] of Object.entries(loot)) this.inventory[type] = (this.inventory[type] || 0) + n
          this._emitInventory()
          recordDinoPart(data.id, PART_ORDER)
          this.bridge.onDinopediaUpdate?.()
          this.saveNow()
          this._victory(pos.clone(), data, loot)
          return
        }

        // 일반·서브 몹 — 소재를 흩뿌려 줍게
        const scatter = (type) => this.drops.spawn(pos.x + (Math.random() - 0.5) * 2.2, pos.y + 1.2, pos.z + (Math.random() - 0.5) * 2.2, type)
        for (const [type, n] of Object.entries(loot)) for (let i = 0; i < n; i++) scatter(type)
        if (critter) { this.bridge.onNotice?.(`🦴 ${data.name}에게서 소재를 얻었어요!`); return }
        // 📖 도감 — 격퇴할 때마다 부위 하나씩 관찰(해금)
        const rec = recordDinoPart(data.id, PART_ORDER)
        this.bridge.onDinopediaUpdate?.()
        if (rec) {
          const info = PART_INFO[rec.part]
          const done = rec.complete ? ' 🎉 도감 완성!' : ` (${rec.count}/${rec.total})`
          this.bridge.onNotice?.(`${info.icon} ${data.name} ${info.label} 관찰 — ${info.reveal}${done}`)
        } else {
          this.bridge.onNotice?.(`🎉 ${data.name} 격퇴! 소재를 주워 제작해 보세요!`)
        }
        if (gotRare) this.bridge.onNotice?.('🦷✨ 희귀한 티라노 이빨을 얻었어요! (이빨 창 재료)')
      }
    }

    // 🦕 동물원: 저장된 배치 공룡 복원
    if (this.zoo && this.dinos && Array.isArray(saveData?.zoo)) {
      for (const z of saveData.zoo) this.dinos.spawnPeaceful(z.id, z.x, z.y, z.z, { sex: z.sex, fed: z.fed, water: z.water, health: z.health, baby: z.baby, growT: z.growT })
    }

    // 💰 유튜버 동물원 경영 — 돈·소유 블록·유튜브 채널
    if (this.zoo) {
      this.money = saveData?.money ?? 500 // 시드머니 (첫 공룡·블록 살 밑천)
      this.owned = new Set(saveData?.owned && saveData.owned.length ? saveData.owned : ['dirt']) // 소유 블록 (처음엔 흙만)
      this.channel = saveData?.channel || { created: false, subs: 0 } // 유튜브 채널
      this._prevDay = this.dayNight.day // 광고 정산 기준일
      this._superchatCd = 20 + Math.random() * 15 // 슈퍼챗 쿨다운
      this._subAccum = 0 // 구독자 소수점 누적
      this._econTimer = 0
      this._channelPrompted = false // 3일차 채널 개설 안내를 한 번만
      this.zooExpand = Math.max(0, Math.min(ZOO_EXPAND_SUBS.length, saveData?.zooExpand ?? 0)) // 부지 확장 단계
      this._expandPrompted = -1 // 확장 가능 안내를 단계당 한 번만
      this.heldDino = null // 🤲 지금 안고 있는 공룡
      if (this.dinos) this.dinos.maxCount = this.zooMax() // 번식 상한도 확장 반영
    }

    // --- 보스 훅 ---
    if (this.zombies) {
      this.zombies.onBossSpawn = () => {
        this.sounds.bossAppear()
        this.bridge.onNotice?.('👑 보스 좀비가 나타났어요!')
      }
      this.zombies.onBossKill = (pos) => {
        // 보상: 골드 5개 + 하트 1개 드롭
        for (let i = 0; i < 5; i++) {
          this.drops.spawn(pos.x + (Math.random() - 0.5) * 1.5, pos.y + 1, pos.z + (Math.random() - 0.5) * 1.5, 'gold')
        }
        this.drops.spawn(pos.x, pos.y + 1.5, pos.z, 'heart')
        this.sounds.goldDing()
        this.bridge.onNotice?.('👑 보스 처치! 골드가 쏟아져요!')
      }
      // 일반 좀비 처치 보상: 大좀비 골드 확정 / 일반 40% 골드, 20% 하트
      this.zombies.onZombieKill = (pos, big) => {
        if (big || Math.random() < 0.4) this.drops.spawn(pos.x, pos.y + 0.8, pos.z, 'gold')
        if (Math.random() < 0.2) this.drops.spawn(pos.x + 0.4, pos.y + 0.8, pos.z + 0.4, 'heart')
      }
    }

    // --- 상태 ---
    this.input = { forward: false, back: false, left: false, right: false, jump: false, run: false }
    this.hotbarIndex = 0
    // 핫바 구성 — 가방에서 슬롯별로 바꿀 수 있음. 저장된 값이 유효하면 복원
    // 유튜버 동물원 새 게임: 흙만 지급 (나머지는 상점에서 사서 채움)
    const zooDefault = () => Array.from({ length: HOTBAR.length }, () => 'dirt')
    this.hotbar =
      Array.isArray(saveData?.hotbar) && saveData.hotbar.length === HOTBAR.length
        ? saveData.hotbar.map((t, i) => (BLOCK_TYPES[t] ? t : (this.zoo ? 'dirt' : HOTBAR[i])))
        : this.zoo ? zooDefault() : [...HOTBAR]
    this.paused = false
    this.dead = false
    this.disposed = false
    this.minimapCanvas = null
    this._saveTimer = null
    this._regenTimer = 0
    this._clockTimer = 1 // 첫 프레임에 바로 시계 전달
    this._minimapTimer = 0
    this._lastTime = performance.now()

    this._bindEvents()
    this.resize()
    if (import.meta.env.DEV) window.__engine = this // dev 콘솔 디버깅용

    this._loop = this._loop.bind(this)
    requestAnimationFrame(this._loop)
  }

  // ---------- 입력 ----------
  _bindEvents() {
    this._onKeyDown = (e) => {
      this.sounds.unlock()
      if (this.paused || this.dead) return
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.input.forward = true; break
        case 'KeyS': case 'ArrowDown': this.input.back = true; break
        case 'KeyA': case 'ArrowLeft': this.input.left = true; break
        case 'KeyD': case 'ArrowRight': this.input.right = true; break
        case 'Space': this.input.jump = true; e.preventDefault(); break
        case 'ShiftLeft': case 'ShiftRight': this.input.run = true; break
        case 'KeyE':
          // E: 마을=대화/대문, 서바이벌=골드 상점
          if (this.villageMode) this.interact()
          else if (this.survival) this.bridge.onOpenShop?.()
          break
        case 'KeyP':
          // P: 공룡 도감 (Book) — B는 곡괭이라 P(Pedia)로 배치
          if (this.survival || this.villageMode) this.bridge.onOpenDinopedia?.()
          break
        case 'KeyF':
          // F: 제작대 (Forge)
          if (this.survival || this.villageMode) this.bridge.onOpenCraft?.()
          break
        case 'KeyG':
          // G: 🦕 공룡 동물원 패널(크리에이티브) / 서바이벌은 씨앗 선택
          if (this.zoo) this.bridge.onOpenZoo?.()
          else if (this.survival) this.selectWeapon('seed')
          break
        case 'KeyB':
          // B: 🎒 내 가방(크리에이티브 핫바 설정) / 서바이벌은 곡괭이
          if (this.zoo) this.bridge.onOpenBag?.()
          else if (this.survival) this.selectWeapon('pickaxe')
          break
        case 'KeyY':
          // Y: ▶ 유튜브 채널 (동물원) — PC는 포인터락 때문에 버튼 클릭이 어려워 단축키 제공
          if (this.zoo) this.bridge.onOpenChannel?.()
          break
        case 'KeyQ':
          // Q: 🤲 공룡 잡기 / 놓기 (동물원 — 몰림 정리)
          if (this.zoo) this.grabDino()
          break
        case 'KeyT':
          // T: 💰 안고 있는 공룡 팔기 (동물원)
          if (this.zoo) this.sellHeldDino()
          break
        case 'KeyC':
          // C: 💸 화면의 슈퍼챗 모두 받기 (PC — 포인터락으로 클릭이 어려움)
          if (this.zoo) this.bridge.onCollectSuperchats?.()
          break
        case 'KeyI':
          // I: 🏝️ 섬 분양·이동 패널 (동물원)
          if (this.zoo) this.bridge.onOpenIsland?.()
          break
        default:
          // 숫자키 핫바 선택
          if (/^Digit[1-8]$/.test(e.code)) {
            const n = Number(e.code.slice(5)) - 1 // 0~7
            // 🦕 동물원: 1~4 블록 / 5~8 먹이(고기·물·물고기·건초)
            if (this.zoo && n >= 4) this.setFeedItem(FOOD_SLOTS[n - 4].id)
            else this.setHotbar(n)
          }
          // 서바이벌 무기 전환 (V 맨손 / Z 칼 / X 활 / C 다이너마이트)
          else if (this.survival && WEAPON_KEYS[e.code]) this.selectWeapon(WEAPON_KEYS[e.code])
      }
    }
    this._onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.input.forward = false; break
        case 'KeyS': case 'ArrowDown': this.input.back = false; break
        case 'KeyA': case 'ArrowLeft': this.input.left = false; break
        case 'KeyD': case 'ArrowRight': this.input.right = false; break
        case 'Space': this.input.jump = false; break
        case 'ShiftLeft': case 'ShiftRight': this.input.run = false; break
      }
    }
    this._onMouseMove = (e) => {
      if (!this._locked() || this.paused || this.dead) return
      this.player.yaw -= e.movementX * 0.0025
      this.player.pitch -= e.movementY * 0.0025
      const limit = Math.PI / 2 - 0.01
      this.player.pitch = Math.max(-limit, Math.min(limit, this.player.pitch))
    }
    this._onMouseDown = (e) => {
      this.sounds.unlock()
      if (this.paused || this.dead) return
      if (!this._locked()) {
        this.canvas.requestPointerLock?.()
        return
      }
      if (e.button === 0) this._leftClick()
      if (e.button === 2) this._place()
    }
    this._onMouseUp = (e) => {
      if (e.button === 0) this._stopMining()
    }
    this._onWheel = (e) => {
      if (this.paused || this.dead) return
      const d = e.deltaY > 0 ? 1 : -1
      // 동물원 핫바는 앞 4칸만 블록(뒤 4칸은 먹이 슬롯) — 휠은 블록 칸만 순환
      const n = this.zoo ? 4 : this.hotbar.length
      this.setHotbar(((this.hotbarIndex % n) + d + n) % n)
    }
    this._onContextMenu = (e) => e.preventDefault()
    // 포인터락 해제(Esc) = 일시정지 → 즉시 저장 (사망 화면 중엔 제외)
    this._onLockChange = () => {
      if (!this._locked() && !this.paused && !this.dead && !this.disposed) this.pause()
    }
    this._onResize = () => this.resize()
    // 탭 닫기/전환 시 debounce 대기분 즉시 저장 (초등 사용자는 예고 없이 닫는다)
    this._onHide = () => {
      if (document.visibilityState === 'hidden') this.saveNow()
    }

    // --- 터치 시점 조작 (모바일/태블릿) — 캔버스 위 드래그로 시점 회전 ---
    // 조이스틱·버튼은 DOM 요소라 그쪽 터치는 캔버스로 오지 않는다
    this._lookTouchId = null
    this._lastTouch = null
    this._onTouchStart = (e) => {
      this.sounds.unlock()
      if (this.paused || this.dead) return
      if (this._lookTouchId !== null) return
      const t = e.changedTouches[0]
      this._lookTouchId = t.identifier
      this._lastTouch = { x: t.clientX, y: t.clientY }
    }
    this._onTouchMove = (e) => {
      if (this.paused || this.dead || this._lookTouchId === null) return
      for (const t of e.changedTouches) {
        if (t.identifier !== this._lookTouchId) continue
        this.lookDelta(t.clientX - this._lastTouch.x, t.clientY - this._lastTouch.y)
        this._lastTouch = { x: t.clientX, y: t.clientY }
        e.preventDefault()
      }
    }
    this._onTouchEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._lookTouchId) {
          this._lookTouchId = null
          this._lastTouch = null
        }
      }
    }

    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('keyup', this._onKeyUp)
    document.addEventListener('mousemove', this._onMouseMove)
    this.canvas.addEventListener('mousedown', this._onMouseDown)
    document.addEventListener('mouseup', this._onMouseUp)
    this.canvas.addEventListener('wheel', this._onWheel)
    this.canvas.addEventListener('contextmenu', this._onContextMenu)
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false })
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false })
    this.canvas.addEventListener('touchend', this._onTouchEnd)
    this.canvas.addEventListener('touchcancel', this._onTouchEnd)
    document.addEventListener('pointerlockchange', this._onLockChange)
    document.addEventListener('visibilitychange', this._onHide)
    window.addEventListener('resize', this._onResize)
  }

  // --- 모바일 조작 API (React 터치 컨트롤이 호출) ---
  lookDelta(dx, dy) {
    this.player.yaw -= dx * 0.006
    this.player.pitch -= dy * 0.006
    const limit = Math.PI / 2 - 0.01
    this.player.pitch = Math.max(-limit, Math.min(limit, this.player.pitch))
  }

  setMoveAxis(x, y) {
    // 조이스틱 벡터 (-1~1). y: 위로 밀면 전진(+)
    this.input.moveX = x
    this.input.moveY = y
  }

  setJump(on) {
    this.input.jump = on
  }

  // 모바일 버튼 → 좌클릭(부수기/공격) / 우클릭(설치). 포인터락 불필요
  // 부수기는 꾹 누르기 지원: Start에서 채굴 시작, End에서 중단
  mobileBreakStart() {
    if (this.paused || this.dead) return
    this._leftClick()
  }

  mobileBreakEnd() {
    this._stopMining()
  }

  mobilePlace() {
    if (this.paused || this.dead) return
    this._place()
  }

  _locked() {
    return document.pointerLockElement === this.canvas
  }

  // 핫바 블록 선택 = 건축 모드 (맨손에 블록 들림)
  setHotbar(i) {
    if (this.villageMode) return // 마을은 건축 없음
    // 🍖 먹이를 들고 있었다면 내려놓기 → 다시 블록 부수기/설치 가능
    if (this.feedItem) { this.feedItem = null; this.bridge.onFeed?.(null) }
    this.hotbarIndex = i
    this.blockSelected = true // 블록 선택 = 건축 모드 (먹이 모드 해제 포함)
    if (this.survival) {
      this.weapon = 'hand'
      this._stopMining()
      this.bridge.onWeapon?.('hand', true)
    }
    this.viewModel?.setWeapon('hand', true)
    this.viewModel?.setBlock(this.hotbar[i])
    this.bridge.onHotbar?.(i)
  }

  // 🎒 가방 — 핫바 슬롯 i에 블록 type을 배정 (동물원은 소유한 블록만)
  setHotbarSlot(i, type) {
    if (i < 0 || i >= this.hotbar.length || !BLOCK_TYPES[type]) return
    if (this.zoo && this.owned && !this.owned.has(type)) {
      this.bridge.onNotice?.(`🔒 ${BLOCK_TYPES[type]?.name}은(는) 상점에서 먼저 사야 해요`)
      return
    }
    this.hotbar[i] = type
    if (i === this.hotbarIndex && this.blockSelected) this.viewModel?.setBlock(type)
    this.bridge.onHotbarConfig?.([...this.hotbar])
    this.scheduleSave()
  }

  // 도구·무기 선택 = 블록 내려놓음 (맨손이면 빈손)
  selectWeapon(w) {
    if (!this.survival) return
    this.weapon = w
    this.blockSelected = false
    this._stopMining()
    this.viewModel?.setWeapon(w, false)
    this.bridge.onWeapon?.(w, false)
  }

  toggleMute() {
    return this.sounds.toggleMute()
  }

  // ---------- 골드 상점 ----------
  // 구매 성공 시 true. 골드(gold 블록)를 화폐로 사용
  buyShopItem(id) {
    if (!this.survival) return false
    const gold = this.inventory.gold || 0
    const item = SHOP_ITEMS.find((s) => s.id === id)
    if (!item || gold < item.cost) return false
    switch (id) {
      case 'arrow5':
        if (this.ammo.arrow >= AMMO_MAX.arrow) return false
        this.ammo.arrow = Math.min(AMMO_MAX.arrow, this.ammo.arrow + 5)
        break
      case 'dyn1':
        if (this.ammo.dynamite >= AMMO_MAX.dynamite) return false
        this.ammo.dynamite++
        break
      case 'seed3':
        if (this.ammo.seed >= SEED_MAX) return false
        this.ammo.seed = Math.min(SEED_MAX, this.ammo.seed + 3)
        break
      case 'heal':
        if (this.player.hp >= 20) return false
        this.player.hp = 20
        this.bridge.onHp?.(20, false)
        break
      case 'dog':
        if (this.hasDog) return false
        this.hasDog = true
        this.dog = new Dog(this.scene, this.world, this.player.pos)
        this.sounds.bark()
        break
      default:
        return false
    }
    this.inventory.gold = gold - item.cost
    this.sounds.buy()
    this._emitInventory()
    this._emitAmmo()
    this.saveNow()
    return true
  }

  // ---------- 제작 (공룡 소재 → 장비) ----------
  // 성공 시 true. 소재를 소모하고 장비 효과를 즉시 반영
  craftItem(id) {
    if (!this.survival) return false
    const recipe = RECIPES.find((r) => r.id === id)
    if (!recipe || !canCraft(recipe, this.inventory, this.crafted)) return false
    for (const [m, n] of Object.entries(recipe.cost)) this.inventory[m] -= n
    this.crafted[id] = true
    this._applyEquipment()
    this.sounds.craft()
    this.bridge.onNotice?.(`🔨 ${recipe.name} 완성! ${recipe.effect}`)
    this.bridge.onCrafted?.({ ...this.crafted })
    this._emitInventory()
    this.saveNow()
    return true
  }

  // 제작한 장비 + 시대 보너스를 게임 수치·뷰모델에 반영 (최상위 등급만 효과)
  _applyEquipment() {
    const base = this.crafted.toothSpear ? 4 : this.crafted.boneSword ? 3 : 2
    this.swordDamage = base + this._eraBonus.atk
    this.defense = (this.crafted.hideArmor ? 3 : 0) + this._eraBonus.def
    const tier = this.crafted.toothSpear ? 2 : this.crafted.boneSword ? 1 : 0
    this.viewModel?.setSwordTier(tier)
  }

  _emitAmmo() {
    if (this.ammo) this.bridge.onAmmo?.({ ...this.ammo })
  }

  // 화살·다이너마이트를 시간이 지나면 조금씩 자동 충전
  _rechargeAmmo(dt) {
    let changed = false
    for (const k of ['arrow', 'dynamite']) {
      if (this.ammo[k] >= AMMO_MAX[k]) continue
      this._ammoTimers[k] += dt
      if (this._ammoTimers[k] >= AMMO_RECHARGE[k]) {
        this._ammoTimers[k] = 0
        this.ammo[k]++
        changed = true
      }
    }
    if (changed) this._emitAmmo()
  }

  // 우클릭/설치 버튼 — 현재 선택 블록을 놓음 (블록을 든 상태에서만, 서바이벌은 개수 소모)
  _place() {
    if (this.villageMode) return // 마을은 건축 금지 (안전지대)
    if (this.survival && !(this.weapon === 'hand' && this.blockSelected)) return // 도구 들고는 설치 불가
    const type = this.hotbar[this.hotbarIndex]
    if (this.inventory && (this.inventory[type] || 0) <= 0) return // 블록 소진
    if (this.actions.placeBlock(type)) {
      this.viewModel.swing()
      this.sounds.blockPlace()
      if (this.inventory) {
        this.inventory[type]--
        this._emitInventory()
      }
    }
  }

  _stopMining() {
    this._mining = false
    this._mineKey = null
    this._mineProgress = 0
  }

  // 채굴 진행 (루프에서 매 프레임) — 꾹 누르는 동안 경도만큼 시간이 걸림
  _updateMining(dt) {
    if (!this._mining || !(this.weapon === 'hand' || this.weapon === 'pickaxe')) return
    const target = this.actions.getTarget()
    if (!target) {
      this._mineKey = null
      this._mineProgress = 0
      return
    }
    const [x, y, z] = target.block
    const k = `${x}_${y}_${z}`
    if (k !== this._mineKey) {
      this._mineKey = k
      this._mineProgress = 0
    }
    const type = this.world.getBlock(x, y, z)
    if (!type || type === 'bedrock') {
      this._mineProgress = 0
      return
    }
    // 곡괭이는 빠르고 맨손은 느리다
    const mult = this.weapon === 'pickaxe' ? 1 : HAND_MULT
    this._mineProgress += dt / ((HARDNESS[type] ?? 1) * mult)
    // 계속 휘두르기 + 틱 소리
    this._mineSwingTimer -= dt
    if (this._mineSwingTimer <= 0) {
      this._mineSwingTimer = MINE_SWING_INTERVAL
      this.viewModel.swing()
      this.sounds.mineTick()
    }
    if (this._mineProgress >= 1) {
      this._mineProgress = 0
      this._mineKey = null
      this.world.setBlock(x, y, z, null)
      if (type === 'gold') this.sounds.goldDing()
      else this.sounds.blockBreak()
      // 부서진 블록 → 드롭 아이템으로 (다가가면 획득)
      this.drops?.spawn(x + 0.5, y + 0.6, z + 0.5, type)
    }
  }

  // 마을 상호작용 (E키·모바일 버튼) — 근처 NPC와 대화하거나 대문에서 출동
  interact() {
    if (!this.villageMode) return
    if (this._nearNpc) this.bridge.onNpcTalk?.(this._nearNpc)
    else if (this._nearGate) this.bridge.onGate?.()
  }

  // 좌클릭 — 든 무기에 따라 동작 (맨손=건축/약공격, 칼=근접, 활/다이너마이트=발사)
  _leftClick() {
    if (this.villageMode) {
      this.interact() // 마을에선 클릭도 대화/출동
      return
    }
    // 🦕 동물원: 먹이를 들었으면 던지기, 아니면 클릭 공부 정보 (블록 부수기보다 우선)
    if (this.zoo && this.dinos) {
      if (this.feedItem) {
        this.viewModel.swing()
        this.dinos.throwFood(this.camera, this.feedItem)
        this.sounds.swing?.()
        return
      }
      const info = this.dinos.pickPeaceful(this.camera, 8)
      if (info) {
        this.bridge.onDinoInfo?.(info)
        return
      }
    }
    switch (this.weapon) {
      case 'sword': {
        // 칼: 넓은 사거리·한 방 처치
        this.viewModel.swing()
        this.sounds.swing()
        const dmg = this.swordDamage // 기본 2 / 뼈 검 3 / 이빨 창 4
        const r = this.zombies?.tryHit(this.camera, 4.0, dmg)
        if (r === 'kill') this.sounds.zombieDie()
        else if (r === 'hit') this.sounds.zombieHit()
        else if (this.dinos?.tryHit(this.camera, 4.0, dmg) === 'hit') this.sounds.zombieHit()
        // 공룡 격퇴('kill') 사운드는 onDefeat의 dinoPoof가 담당
        break
      }
      case 'bow':
        if (this._attackCd > 0) return
        if ((this.ammo?.arrow || 0) <= 0) return
        this.viewModel.swing()
        this.sounds.arrowShot()
        this.weapons.shootArrow(this.camera)
        this.ammo.arrow--
        this._attackCd = ATTACK_CD
        this._emitAmmo()
        break
      case 'dynamite':
        if (this._attackCd > 0) return
        if ((this.ammo?.dynamite || 0) <= 0) return
        this.viewModel.swing()
        this.sounds.dynamiteThrow()
        this.weapons.throwDynamite(this.camera)
        this.ammo.dynamite--
        this._attackCd = ATTACK_CD * 2
        this._emitAmmo()
        break
      case 'seed': {
        // 씨앗 심기: 잔디/흙 위 빈 칸에
        if ((this.ammo?.seed || 0) <= 0) return
        const t = this.actions.getTarget()
        if (!t) return
        const [bx, by, bz] = t.block
        const ground = this.world.getBlock(bx, by, bz)
        if (ground !== 'grass' && ground !== 'dirt') {
          this.bridge.onNotice?.('🌱 씨앗은 잔디나 흙 위에 심어요!')
          return
        }
        if (this.world.isSolid(bx, by + 1, bz) || this.crops.hasCropAt(bx, by + 1, bz)) return
        this.viewModel.swing()
        this.crops.plant(bx, by + 1, bz)
        this.ammo.seed--
        this._emitAmmo()
        this.sounds.blockPlace()
        this.scheduleSave()
        break
      }
      default: {
        // 맨손·곡괭이: 좀비가 조준선에 있으면 때리고, 아니면 채굴 시작(꾹 누르기)
        this.viewModel.swing()
        const r = this.zombies?.tryHit(this.camera, 3.5, 1)
        if (r === 'kill') { this.sounds.zombieDie(); return }
        if (r === 'hit') { this.sounds.zombieHit(); return }
        const rd = this.dinos?.tryHit(this.camera, 3.5, 1)
        if (rd === 'hit') { this.sounds.zombieHit(); return }
        if (rd === 'kill') return // 격퇴 사운드는 dinoPoof가 담당
        if (!this.survival) {
          // 크리에이티브: 클릭 즉시 부수기 (건축 수업용 — 시원하게)
          const broken = this.actions.breakBlock()
          if (broken === 'gold') this.sounds.goldDing()
          else if (broken) this.sounds.blockBreak()
          else this.sounds.swing()
          return
        }
        // 서바이벌: 홀드 채굴 시작 (경도·도구에 따라 시간 소요)
        this.sounds.swing()
        this._mining = true
        this._mineSwingTimer = MINE_SWING_INTERVAL
      }
    }
  }

  _emitInventory() {
    if (this.inventory) this.bridge.onInventory?.({ ...this.inventory })
  }

  // ---------- 전투/사망 (서바이벌) ----------
  _onZombieAttack(dmg) {
    if (this.dead || this.paused) return
    // 가죽 갑옷 방어력만큼 피해 감소 (최소 1은 아프게)
    const taken = Math.max(1, dmg - this.defense)
    this.player.hp = Math.max(0, this.player.hp - taken)
    this.sounds.hurt()
    this.bridge.onHp?.(this.player.hp, true)
    if (this.player.hp <= 0) this._die()
  }

  _die() {
    this.sounds.playerDie()
    this.dead = true
    this.input = { forward: false, back: false, left: false, right: false, jump: false, run: false }
    if (this._locked()) document.exitPointerLock()
    this.bridge.onDeath?.()
  }

  // 리스폰 — 건축물은 그대로, 좀비는 리셋
  respawnPlayer() {
    this.player.hp = MAX_HP
    this.player.respawn()
    this.zombies?.clear()
    this.dinos?.calmAll() // 공룡은 그대로 두되 어그로만 해제 (다시 어슬렁)
    this.weapons?.clear()
    this.dead = false
    this.bridge.onHp?.(this.player.hp, false)
    this.saveNow()
    this.resume()
  }

  // ---------- 메시 재생성 ----------
  rebuildMeshes() {
    for (const m of this.blockMeshes) {
      this.scene.remove(m)
      m.dispose()
    }
    this.blockMeshes = []

    // 타입별 위치 수집
    const byType = {}
    this.world.forEachBlock((x, y, z, type) => {
      ;(byType[type] ||= []).push([x, y, z])
    })

    const dummy = new THREE.Object3D()
    for (const [type, positions] of Object.entries(byType)) {
      const geo = PLANT_TYPES.includes(type) ? this.crossGeo : this.blockGeo // 식물형은 십자
      const mesh = new THREE.InstancedMesh(geo, this.materials[type], positions.length)
      positions.forEach(([x, y, z], i) => {
        dummy.position.set(x + 0.5, y + 0.5, z + 0.5) // 칸 중앙
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      this.scene.add(mesh)
      this.blockMeshes.push(mesh)
    }
  }

  // ---------- 미니맵 (위에서 내려다본 블록 색) ----------
  setMinimapCanvas(el) {
    this.minimapCanvas = el
    this._drawMinimap()
  }

  _drawMinimap() {
    const c = this.minimapCanvas
    if (!c) return
    const ctx = c.getContext('2d')
    // 운동장 + 파밍 월드 전체 (x 0..64, z 0..31) — 동물원은 확장된 동쪽까지
    const COLS = this.zoo ? this.world.xMax() : WORLD.X_MAX
    const ROWS = WORLD.SIZE
    const pxX = c.width / COLS
    const pxZ = c.height / ROWS
    ctx.fillStyle = '#0d1626'
    ctx.fillRect(0, 0, c.width, c.height)
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        // 위에서부터 첫 블록 색 (나무 꼭대기~지하 구덩이까지 탐색)
        for (let y = 12; y >= -WORLD.DEPTH; y--) {
          const type = this.world.getBlock(x, y, z)
          if (type) {
            ctx.fillStyle = BLOCK_TYPES[type]?.color || '#888'
            ctx.fillRect(x * pxX, z * pxZ, Math.ceil(pxX), Math.ceil(pxZ))
            break
          }
        }
      }
    }
    // 밤엔 어둡게
    if (this.dayNight.isNight()) {
      ctx.fillStyle = 'rgba(15,25,55,0.45)'
      ctx.fillRect(0, 0, c.width, c.height)
    }
    // 좀비 (빨간 점 — 위험 표시)
    if (this.zombies) {
      ctx.fillStyle = '#E85D5D'
      for (const z of this.zombies.zombies) {
        if (z.dying) continue
        ctx.fillRect(z.pos.x * pxX - 1.5, z.pos.z * pxZ - 1.5, 3.5, 3.5)
      }
    }
    // 공룡 (호박색 점 — 크게)
    if (this.dinos) {
      ctx.fillStyle = '#C9A227'
      for (const d of this.dinos.dinos) {
        if (d.dying) continue
        ctx.fillRect(d.pos.x * pxX - 2.5, d.pos.z * pxZ - 2.5, 5, 5)
      }
    }
    // 플레이어 (흰 점 + 시선 방향)
    const p = this.player.pos
    const cx = p.x * pxX, cz = p.z * pxZ
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cz)
    ctx.lineTo(cx - Math.sin(this.player.yaw) * 6, cz - Math.cos(this.player.yaw) * 6)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cz, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // ---------- 저장 ----------
  getSaveData() {
    const data = {
      seed: this.world.seed,
      mode: this.mode,
      blocks: this.world.getDeltaObject(),
      player: this.player.toJSON(),
      dayTime: this.dayNight.t,
      day: this.dayNight.day,
      hotbar: this.hotbar, // 가방에서 바꾼 핫바 구성
    }
    if (this.inventory) data.inventory = this.inventory
    if (this.ammo) data.ammo = this.ammo
    if (this.survival) data.crafted = this.crafted
    if (this.crops) data.crops = this.crops.toJSON()
    if (this.survival) data.dog = this.hasDog
    if (this.zoo && this.dinos) data.zoo = this.dinos.toZooJSON() // 배치한 동물원 공룡
    if (this.zoo) {
      data.money = Math.round(this.money)
      data.owned = [...this.owned]
      data.channel = { created: this.channel.created, subs: Math.round(this.channel.subs) }
      data.zooExpand = this.zooExpand
    }
    return data
  }

  // ---------- 🦕 동물원 (크리에이티브) ----------
  // 조준한 곳(없으면 카메라 앞) 지면에 평화로운 공룡을 놓는다
  // 현재 배치 한도 (기본 16 + 확장 단계당 16)
  zooMax() {
    return ZOO_MAX * (1 + (this.zooExpand || 0))
  }

  placeDino(id) {
    if (!this.zoo || !this.dinos || !DINOS[id]) return
    const max = this.zooMax()
    if (this.dinos.peacefulCount() >= max) {
      const info = this.zooExpandInfo()
      const more = info.nextSubs != null
        ? ` 구독자 ${info.nextSubs.toLocaleString()}명이 되면 부지를 넓힐 수 있어요!`
        : ''
      this.bridge.onNotice?.(`공룡이 꽉 찼어요! (최대 ${max}마리)${more}`)
      return
    }
    // 💰 공룡 구매 — 돈이 부족하면 배치 불가
    const price = DINO_PRICE[id] ?? 100
    if (this.money < price) {
      this.bridge.onNotice?.(`💰 코인이 부족해요! (${DINOS[id].name} ${price}코인)`)
      return
    }
    const data = DINOS[id]
    let x, z, gy
    if (data.stats.swimming) {
      // 🌊 수룡은 연못(물)에 배치
      const a = Math.random() * Math.PI * 2, rr = Math.random() * (ZOO_POND.r - 2)
      x = ZOO_POND.x + Math.cos(a) * rr
      z = ZOO_POND.z + Math.sin(a) * rr * 0.9
      gy = ZOO_POND.surfaceY
    } else {
      const t = this.actions.getTarget()
      if (t) {
        x = t.block[0] + 0.5; z = t.block[2] + 0.5
      } else {
        const dir = new THREE.Vector3()
        this.camera.getWorldDirection(dir)
        x = this.player.pos.x + dir.x * 3.5
        z = this.player.pos.z + dir.z * 3.5
      }
      gy = this.world.groundY(Math.floor(x), Math.floor(z))
      if (gy == null) return
    }
    if (this.dinos.spawnPeaceful(id, x, gy, z)) {
      this.money -= price
      this.bridge.onMoney?.(this.money)
      this.sounds.pickup()
      this.sounds.dinoVoice?.(DinoManager.voiceKind(data)) // 🦕 배치하면 인사 울음
      const where = data.stats.swimming ? ' (연못에)' : data.stats.flying ? ' (하늘에)' : ''
      this.bridge.onNotice?.(`🦕 ${data.name} 구매·배치! (-${price}코인)${where}`)
      this.bridge.onZoo?.(this.dinos.listCounts())
      this.scheduleSave()
    }
  }

  // ---------- 💰 유튜버 동물원 경영 ----------
  // 🧱 상점에서 블록 구매 (소유 목록에 추가 → 가방에서 핫바에 넣어 사용)
  buyBlock(type) {
    if (!this.zoo) return
    if (this.owned.has(type)) return
    const price = BLOCK_PRICE[type]
    if (price == null) return
    if (this.money < price) { this.bridge.onNotice?.(`💰 코인이 부족해요! (${BLOCK_TYPES[type]?.name} ${price}코인)`); return }
    this.money -= price
    this.owned.add(type)
    this.sounds.pickup()
    this.bridge.onMoney?.(this.money)
    this.bridge.onOwned?.([...this.owned])
    this.bridge.onNotice?.(`🧱 ${BLOCK_TYPES[type]?.name} 블록 구매! (-${price}코인)`)
    this.scheduleSave()
  }

  ownedBlocks() {
    return this.zoo ? [...this.owned] : null
  }

  moneyAmount() {
    return this.money || 0
  }

  channelState() {
    return this.zoo ? { ...this.channel, day: this.dayNight.day, upkeep: this._dailyUpkeep(), adRevenue: Math.round(20 + Math.sqrt(this.channel.subs || 0) * 4) } : null
  }

  // 🎬 유튜브 채널 개설 (3일차부터)
  createChannel() {
    if (!this.zoo || this.channel.created) return
    if (this.dayNight.day < CHANNEL_UNLOCK_DAY) {
      this.bridge.onNotice?.(`📺 채널은 ${CHANNEL_UNLOCK_DAY}일차부터 만들 수 있어요!`)
      return
    }
    this.channel.created = true
    this.channel.subs = 0
    this._prevDay = this.dayNight.day // 정산 기준일 리셋
    this.sounds.goldDing?.()
    this.bridge.onChannel?.(this.channelState())
    this.bridge.onNotice?.('🎬 유튜브 채널 개설! 이제 공룡 동물원을 방송해 구독자·수익을 모아요')
    this.scheduleSave()
  }

  // 🐣 동물원 인기 점수 — 공룡 수·다양성·행복도로 구독자 성장 속도 결정
  _zooScore() {
    const dinos = this.dinos?.dinos?.filter((d) => d.peaceful && !d.dying) || []
    if (!dinos.length) return 0
    const kinds = new Set()
    let worth = 0
    for (const d of dinos) {
      kinds.add(d.id)
      const price = DINO_PRICE[d.id] ?? 100
      const happy = 0.4 + 0.6 * (d.mood ?? 0.6) // 행복할수록 인기
      worth += (price / 100) * happy
    }
    return worth * (1 + kinds.size * 0.15) // 종 다양성 보너스
  }

  // 🍽️ 하루 공룡 운영비 — 마리 수 × 희귀도(구매가). 아기는 저렴. 채널 개설 후부터 부과
  _dailyUpkeep() {
    if (!this.dinos) return 0
    let sum = 0
    for (const d of this.dinos.dinos) {
      if (!d.peaceful || d.dying) continue
      const base = DINO_PRICE[d.id] ?? 100
      sum += Math.max(1, Math.round(base * (d.baby ? 0.015 : 0.045)))
    }
    return sum
  }

  // 💸 슈퍼챗 이벤트 — 구독자가 많을수록 자주. 금액은 제곱근으로 완만히(후반 폭주 방지)
  _superchat() {
    const subs = this.channel.subs
    const r = Math.sqrt(subs)
    const amount = Math.round(10 + r * 1.2 + Math.random() * (15 + r * 0.8))
    const names = ['공룡덕후', '쥬라기팬', '초록이', '티라노짱', '아기공룡', '용쌤팬', '복셀러버', '뿔공룡']
    this.bridge.onSuperchat?.({ id: Date.now(), from: names[Math.floor(Math.random() * names.length)], amount })
  }

  // 💰 슈퍼챗 받기 (React에서 탭)
  collectSuperchat(amount) {
    if (!this.zoo) return
    this.money += amount
    this.sounds.goldDing?.()
    this.bridge.onMoney?.(this.money)
    this.scheduleSave()
  }

  // 매 프레임: 구독자 성장 · 슈퍼챗 · 하루 지날 때 광고 정산
  _updateEconomy(dt) {
    const ch = this.channel
    if (ch.created) {
      // 🐣 구독자 성장 — 동물원 인기 점수에 비례
      this._subAccum += this._zooScore() * 0.5 * dt
      if (this._subAccum >= 1) {
        const add = Math.floor(this._subAccum)
        ch.subs += add
        this._subAccum -= add
      }
      // 🗺️ 부지 확장 조건을 새로 채우면 안내 (단계당 1회)
      const ei = this.zooExpandInfo()
      if (ei.canExpand && this._expandPrompted < ei.level) {
        this._expandPrompted = ei.level
        this.bridge.onNotice?.(`🗺️ 구독자 ${ei.nextSubs.toLocaleString()}명 돌파! 공룡(G) 메뉴에서 부지를 확장하세요 (+16마리)`)
        this.sounds.goldDing?.()
      }
      // 💸 슈퍼챗 — 구독자 많을수록 자주
      this._superchatCd -= dt
      if (this._superchatCd <= 0) {
        if (ch.subs > 0) this._superchat()
        this._superchatCd = Math.max(9, 26 - ch.subs * 0.008) + Math.random() * 6
      }
      // 📺 하루 정산 — 광고 수익(구독자 체감 증가) − 공룡 운영비(마리·희귀도 비례)
      if (this.dayNight.day > this._prevDay) {
        const days = this.dayNight.day - this._prevDay
        this._prevDay = this.dayNight.day
        // 광고: 구독자에 따라 오르되 무한정 안 커지게(제곱근) → 후반 폭주 방지
        const earn = Math.round((20 + Math.sqrt(ch.subs) * 4) * days)
        const upkeep = this._dailyUpkeep() * days // 🍽️ 운영비 (동물원 클수록 부담)
        this.money = Math.max(0, this.money + earn - upkeep)
        this.bridge.onMoney?.(this.money)
        const net = earn - upkeep
        this.bridge.onNotice?.(`📺 광고 +${earn} · 🍽️ 운영비 -${upkeep} = ${net >= 0 ? '+' : ''}${net}코인`)
        if (net > 0) this.sounds.goldDing?.()
        this.scheduleSave()
      }
    } else if (!this._channelPrompted && this.dayNight.day >= CHANNEL_UNLOCK_DAY) {
      // ▶ 아직 채널이 없는데 3일차가 됐다 — 개설 기회를 크게 안내(세션당 1회)
      this._channelPrompted = true
      this.bridge.onNotice?.(`▶ ${CHANNEL_UNLOCK_DAY}일차! 유튜브 채널을 개설해 광고·슈퍼챗으로 수익을 올려요 (Y키 또는 ▶채널 버튼)`)
      this.sounds.goldDing?.()
    }
    // 구독자 표시 갱신 (2초 간격)
    this._econTimer += dt
    if (this._econTimer >= 2) {
      this._econTimer = 0
      if (ch.created) this.bridge.onChannel?.(this.channelState())
    }
  }

  // 가장 가까운 동물원 공룡 치우기 (poof)
  removeDino() {
    if (!this.zoo || !this.dinos) return
    if (this.dinos.removeNearest(this.player.pos)) {
      this.sounds.dinoPoof()
      this.bridge.onZoo?.(this.dinos.listCounts())
      this.scheduleSave()
    } else {
      this.bridge.onNotice?.('근처에 치울 공룡이 없어요.')
    }
  }

  // 💰 가장 가까운 공룡 팔기 — 성체는 원가만큼, 아기는 절반 (번식→판매로 수익!)
  sellDino() {
    if (!this.zoo || !this.dinos) return
    const info = this.dinos.sellNearest(this.player.pos)
    if (!info) { this.bridge.onNotice?.('근처에 팔 공룡이 없어요.'); return }
    const base = DINO_PRICE[info.id] ?? 100
    const price = info.baby ? Math.round(base * 0.5) : base // 아기 50% · 성체 100%
    this.money += price
    this.sounds.goldDing?.()
    this.bridge.onMoney?.(this.money)
    this.bridge.onNotice?.(`💰 ${DINOS[info.id].name}${info.baby ? ' 아기' : ''} 판매! +${price}코인`)
    this.bridge.onZoo?.(this.dinos.listCounts())
    this.scheduleSave()
  }

  // ---------- 🤲 공룡 잡기·놓기·팔기 (몰림 정리용) ----------
  isHoldingDino() { return !!this.heldDino }
  _heldInfo() {
    const d = this.heldDino
    return d ? { id: d.id, name: DINOS[d.id]?.name, baby: !!d.baby } : null
  }

  // 조준(없으면 가까운) 공룡을 안는다 / 이미 안고 있으면 놓기 토글
  grabDino() {
    if (!this.zoo || !this.dinos) return
    if (this.heldDino) return this.dropHeldDino()
    const d = this.dinos.pickGrabbable(this.camera, this.player.pos)
    if (!d) { this.bridge.onNotice?.('🤲 잡을 공룡을 조준하거나 가까이 가세요'); return }
    this.heldDino = d
    d.held = true; d.target = null
    this.sounds.pickup?.()
    this.bridge.onNotice?.(`🤲 ${DINOS[d.id].name}${d.baby ? ' 아기' : ''}를 안았어요! 옮길 곳을 보고 놓기(Q)·팔기(T)`)
    this.bridge.onHeld?.(this._heldInfo())
  }

  // 안고 있던 공룡을 바라보는 지면(없으면 앞쪽)에 내려놓기
  dropHeldDino() {
    const d = this.heldDino
    if (!d) return
    let x, z
    const t = this.actions.getTarget()
    if (t) { x = t.block[0] + 0.5; z = t.block[2] + 0.5 }
    else {
      const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir)
      const L = Math.hypot(dir.x, dir.z) || 1
      x = this.player.pos.x + (dir.x / L) * 3; z = this.player.pos.z + (dir.z / L) * 3
    }
    let gy = d.data.stats?.swimming ? ZOO_POND.surfaceY : this.world.groundY(Math.floor(x), Math.floor(z))
    if (gy == null) gy = this.player.pos.y
    d.pos.set(x, gy, z)
    d.home = [x, z]
    if (d.homeY != null) d.homeY = gy
    d.held = false; d.target = null; d.idle = 0.6
    this.heldDino = null; this.dinos.heldPos = null
    this.sounds.pickup?.()
    this.bridge.onNotice?.(`🖐️ ${DINOS[d.id].name}를 여기 놓았어요`)
    this.bridge.onHeld?.(null)
    this.scheduleSave()
  }

  // 안고 있던 공룡을 판다 — 원가보다 싸게(성체 55%·아기 30%) + 건강에 비례
  //   → 사서 되팔면 손해, 떠나려는(아픈) 공룡은 헐값이라 '환전 꼼수'가 막힘
  sellHeldDino() {
    const d = this.heldDino
    if (!d) { this.bridge.onNotice?.('먼저 공룡을 잡아요 (Q)'); return }
    const base = DINO_PRICE[d.id] ?? 100
    const rate = d.baby ? 0.3 : 0.55
    const health = Math.max(0.15, d.health ?? 1) // 아플수록 값이 뚝 떨어짐
    const price = Math.max(3, Math.round(base * rate * health))
    this.heldDino = null; this.dinos.heldPos = null
    d.held = false; d._rewarded = true
    if (this.dinos.fx) { const p = d.pos.clone(); p.y += 1.2; this.dinos.fx.burst(p, '#F2C14E', true) }
    d.dying = 0.001
    this.money += price
    this.sounds.goldDing?.()
    this.bridge.onMoney?.(this.money)
    const weak = health < 0.6 ? ' (건강이 나빠 헐값)' : ''
    this.bridge.onNotice?.(`💰 ${DINOS[d.id].name}${d.baby ? ' 아기' : ''} 판매! +${price}코인${weak}`)
    this.bridge.onHeld?.(null)
    this.bridge.onZoo?.(this.dinos.listCounts())
    this.scheduleSave()
  }

  // 🗺️ 부지 확장 현황 { level, max, subs, nextSubs, maxLevel, canExpand }
  zooExpandInfo() {
    const level = this.zooExpand || 0
    const subs = Math.round(this.channel?.subs || 0)
    const nextSubs = level < ZOO_EXPAND_SUBS.length ? ZOO_EXPAND_SUBS[level] : null
    return { level, max: this.zooMax(), subs, nextSubs, maxLevel: ZOO_EXPAND_SUBS.length, canExpand: nextSubs != null && subs >= nextSubs }
  }

  // 🗺️ 부지 확장 — 구독자 조건을 채웠으면 한 단계(+16) 넓힘
  expandZoo() {
    if (!this.zoo) return false
    const info = this.zooExpandInfo()
    if (!info.canExpand) {
      if (info.nextSubs == null) this.bridge.onNotice?.('🗺️ 이미 최대까지 확장했어요! (96마리)')
      else this.bridge.onNotice?.(`🗺️ 부지 확장은 구독자 ${info.nextSubs.toLocaleString()}명부터 (지금 ${info.subs.toLocaleString()}명)`)
      return false
    }
    this.zooExpand++
    if (this.dinos) this.dinos.maxCount = this.zooMax()
    this.world.setZooExpand(this.zooExpand) // 🗺️ 동쪽으로 실제 땅이 넓어짐 (메시 재빌드)
    this.sounds.goldDing?.()
    this.bridge.onNotice?.(`🗺️ 부지 확장! 동쪽으로 땅이 넓어지고 공룡을 ${this.zooMax()}마리까지 키울 수 있어요`)
    this.bridge.onZoo?.(this.dinos.listCounts())
    this.scheduleSave()
    return true
  }

  zooCounts() {
    return this.dinos?.listCounts() || {}
  }

  // ---------- 🏝️ 섬 분양·이동 (코인·채널은 전역 공유, 지형·공룡은 섬마다) ----------
  islandInfo() {
    const info = loadIslandInfo()
    return { ...info, price: ISLAND_PRICE, canBuy: (this.money || 0) >= ISLAND_PRICE }
  }

  // 새 섬 분양 (100만 코인) → 저장 후 새 섬으로 이동
  buyIsland() {
    if (!this.zoo) return
    if (this.money < ISLAND_PRICE) {
      this.bridge.onNotice?.(`🏝️ 새 섬 분양은 ${ISLAND_PRICE.toLocaleString()}코인이 필요해요 (지금 ${Math.round(this.money).toLocaleString()})`)
      return
    }
    this.money -= ISLAND_PRICE
    this.bridge.onMoney?.(this.money)
    this.saveNow() // 현재 섬 + 차감된 코인 저장 (currentIsland=현재)
    const idx = addIsland() // 새 빈 섬 (seed만)
    setCurrentIsland(idx)
    this.sounds.goldDing?.()
    this.bridge.onNotice?.('🏝️ 새 섬을 분양받았어요! 이동합니다…')
    this._noSaveOnDispose = true // 재장착 시 옛 월드를 새 섬에 덮어쓰지 않게
    this.bridge.onReloadWorld?.()
  }

  // 소유한 다른 섬으로 이동
  switchIsland(i) {
    if (!this.zoo) return
    const info = loadIslandInfo()
    if (i === info.current || i < 0 || i >= info.count) return
    this.saveNow() // 현재 섬 저장 (currentIsland=현재)
    setCurrentIsland(i)
    this._noSaveOnDispose = true
    this.bridge.onNotice?.(`🚤 ${info.names[i] || (i + 1) + '번째 섬'}(으)로 이동합니다…`)
    this.bridge.onReloadWorld?.()
  }

  // 🍖 든 먹이 선택 (null이면 손/무기로 복귀) — 'meat'|'water'|'fish'|'hay'
  // 같은 먹이를 다시 고르면 내려놓기(토글)
  setFeedItem(food) {
    if (food && this.feedItem === food) food = null
    this.feedItem = food
    if (food) {
      this.blockSelected = false // 블록 건축 해제 → 던지기 모드
      this.viewModel?.setFood(food) // 손에 먹이 들기
    } else {
      // 내려놓기 → 다시 건축(손에 블록)
      this.blockSelected = true
      this.viewModel?.setBlock(this.hotbar[this.hotbarIndex])
    }
    this.bridge.onFeed?.(food) // HUD 먹이 표시 갱신
  }

  // 스테이지면 프로필(소재·장비)만, 아니면 월드 세이브 전체를 기록
  getMats() {
    const m = {}
    for (const k of MAT_KEYS) m[k] = this.inventory?.[k] || 0
    return m
  }

  _persist() {
    if (this.villageMode) return // 마을은 저장할 것 없음 (크리에이티브 세이브 보호)
    if (this.stage) writeProfile({ mats: this.getMats(), crafted: this.crafted })
    else writeSave(this.getSaveData())
  }

  saveNow() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
      this._saveTimer = null
    }
    this._persist()
  }

  scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null
      this._persist()
    }, SAVE_DEBOUNCE)
  }

  // ---------- 일시정지 ----------
  pause() {
    this.paused = true
    this._stopMining()
    this.input = { forward: false, back: false, left: false, right: false, jump: false, run: false }
    if (this._locked()) document.exitPointerLock()
    this.saveNow() // 일시정지 시 즉시 저장
    this.sounds.suspend() // BGM도 잠시 멈춤
    this.bridge.onPause?.()
  }

  resume() {
    this.paused = false
    this._lastTime = performance.now()
    this.sounds.resume()
    this.canvas.requestPointerLock?.()
  }

  // 🏆 보스 격파 승리 연출 시작 — 슬로우모션 + 반짝 + 폭죽, 끝나면 클리어 화면
  _victory(pos, data, loot) {
    this._victoryT = 2.4      // 연출 지속(실시간 초)
    this._fwT = 0             // 폭죽 연발 타이머
    this._victoryPos = pos
    this._victoryLoot = loot
    this._victoryStage = this.stage
    this.sounds.fanfare?.()
    this.particles.sparkle?.(pos.clone().setY(pos.y + 1.5), 14)
    this.particles.fireworks(pos.clone().setY(pos.y + 2.2))
    this.bridge.onBossDefeated?.(data.name) // React '격파!' 플래시 오버레이
  }

  // ---------- 루프 ----------
  _loop(now) {
    if (this.disposed) return
    requestAnimationFrame(this._loop)

    let dt = Math.min(Math.max(0, (now - this._lastTime) / 1000), 0.05) // 0~0.05로 클램프 (음수 dt로 날짜가 헛도는 것 방지)
    this._lastTime = now
    if (this.paused) return // 일시정지 = 세계도 멈춤 (수업 중 안심)

    // 🎆 보스 격파 슬로우모션 + 폭죽 연발 → 끝나면 클리어 화면 (연출은 실시간, 월드는 느리게)
    if (this._victoryT > 0) {
      this._victoryT -= dt
      this._fwT -= dt
      if (this._fwT <= 0 && this._victoryPos) {
        this._fwT = 0.22
        const p = this._victoryPos.clone()
        p.x += (Math.random() - 0.5) * 6; p.z += (Math.random() - 0.5) * 6; p.y += 1 + Math.random() * 3.5
        this.particles.fireworks(p)
        this.sounds.goldDing?.()
      }
      if (this._victoryT <= 0) {
        this._victoryT = 0
        this.bridge.onStageClear?.(this._victoryStage, this._victoryLoot)
        this.pause() // 클리어 버튼 클릭 보장
        return
      }
      dt *= 0.22 // 월드 슬로우모션
    }

    if (!this.stage && !this.villageMode) {
      this.dayNight.update(dt)
      this.sounds.setNight(this.dayNight.isNight()) // BGM 전환 + 아침/밤 차임
    }

    // 하늘·날씨: 구름 드리프트 + 해/달 이동 + 별(밤) + 비
    this.weather.update(dt, this.dayNight.t, this.camera, this.dayNight.darkness())
    if (this.dayNight.day !== this._lastDay) {
      this._lastDay = this.dayNight.day
      const rainStarted = this.weather.roll() // 매일 아침 날씨 굴리기
      if (rainStarted) this.bridge.onNotice?.('🌧️ 비가 와요 — 작물이 쑥쑥 자라요!')
    }
    // 비 시작/그침에 맞춰 빗소리 on/off (낮 중간에 개는 경우 포함)
    if (this.weather.raining !== this._wasRaining) {
      this._wasRaining = this.weather.raining
      this.sounds.setRain(this._wasRaining)
      if (!this._wasRaining) this.bridge.onNotice?.('☀️ 비가 그쳤어요!')
    }
    if (this.weather.raining && !this.stage) {
      // 비 오는 동안은 하늘이 살짝 어둑 (스테이지는 하늘색 고정이라 제외 — 매 프레임 누적 방지)
      this.scene.background.multiplyScalar(0.85)
      this.scene.fog.color.copy(this.scene.background)
    }

    // 뷰모델 모션 (휘두르기 + 걷기 bob)
    const moving =
      this.input.forward || this.input.back || this.input.left || this.input.right ||
      Math.abs(this.input.moveX || 0) > 0.15 || Math.abs(this.input.moveY || 0) > 0.15
    this.viewModel.update(dt, moving && !this.dead)

    if (!this.dead) {
      this.player.update(dt, this.input)
      // 카메라 동기화
      this.camera.position.set(this.player.pos.x, this.player.pos.y + EYE, this.player.pos.z)
      this.camera.rotation.set(0, 0, 0)
      this.camera.rotateY(this.player.yaw)
      this.camera.rotateX(this.player.pitch)
    }

    // 채굴 진행 (홀드)
    if (!this.dead) this._updateMining(dt)

    // 파티클 (피격·처치 이펙트)
    this.particles.update(dt)

    // 좀비 + 무기 발사체 + 드롭 획득 + 낮 회복 (서바이벌)
    if (this.zombies) {
      // 스테이지에선 밤/좀비 없음 (isNight=false 고정)
      this.zombies.update(dt, this.stage ? false : this.dayNight.isNight(), this.player.pos, this.dayNight.day)
      this.dinos.update(dt, this.player.pos)
      this.weapons.update(dt)
      this.drops.update(dt, this.player.pos, (type) => {
        if (type === 'heart') {
          // 하트: 체력 +4 (좀비 보상)
          this.player.hp = Math.min(MAX_HP, this.player.hp + 4)
          this.bridge.onHp?.(this.player.hp, false)
        } else if (this.inventory) {
          // 블록 드롭 → 인벤토리 +1
          this.inventory[type] = (this.inventory[type] || 0) + 1
          this._emitInventory()
        }
        this.sounds.pickup()
      })
      if (this._attackCd > 0) this._attackCd -= dt
      this._rechargeAmmo(dt)

      // 농사: 성장 (비 오면 2.5배) + 다 자란 작물 자동 수확
      this.crops.update(dt, this.weather.raining ? 2.5 : 1)
      if (!this.dead) {
        const got = this.crops.harvestNear(this.player.pos)
        if (got > 0) {
          this.inventory.gold = (this.inventory.gold || 0) + got
          this.ammo.seed = Math.min(SEED_MAX, this.ammo.seed + got * 2)
          this.sounds.goldDing()
          this._emitInventory()
          this._emitAmmo()
          this.bridge.onNotice?.(`🌾 수확! 골드 +${got} · 씨앗 +${got * 2}`)
          this.scheduleSave()
        }
      }

      // 강아지 동료
      this.dog?.update(dt, this.player.pos, this.zombies, this.sounds)
      if (!this.dead && !this.dayNight.isNight() && this.player.hp < MAX_HP) {
        this._regenTimer += dt
        if (this._regenTimer >= REGEN_INTERVAL) {
          this._regenTimer = 0
          this.player.hp = Math.min(MAX_HP, this.player.hp + 2)
          this.bridge.onHp?.(this.player.hp, false)
        }
      }
    }

    // 🦕 동물원(크리에이티브): 평화로운 공룡 배회
    if (this.zoo && this.dinos) {
      // 🤲 안고 있는 공룡은 카메라 앞쪽에 떠서 따라옴 (큰 공룡일수록 화면을 안 가리게 멀리·낮게)
      if (this.heldDino) {
        const dir = new THREE.Vector3()
        this.camera.getWorldDirection(dir)
        const L = Math.hypot(dir.x, dir.z) || 1
        const s = this.heldDino.baseScale || 0.4
        const fwd = 2.2 + s * 9 // 몸집에 비례해 앞으로 더 멀리
        this.dinos.heldPos = new THREE.Vector3(
          this.player.pos.x + (dir.x / L) * fwd,
          this.player.pos.y + 0.3 + s * 2,
          this.player.pos.z + (dir.z / L) * fwd,
        )
      }
      this.dinos.update(dt, this.player.pos)
    }

    // 💰 유튜버 동물원 경영 — 구독자 성장 · 광고 정산 · 슈퍼챗
    if (this.zoo) this._updateEconomy(dt)

    // 시계 브리지 (1초 간격 — React 리렌더 최소화)
    this._clockTimer += dt
    if (this._clockTimer >= 1) {
      this._clockTimer = 0
      this.bridge.onTime?.({ t: this.dayNight.t, isNight: this.dayNight.isNight(), day: this.dayNight.day })
    }

    // 미니맵 (0.5초 간격)
    this._minimapTimer += dt
    if (this._minimapTimer >= MINIMAP_INTERVAL) {
      this._minimapTimer = 0
      this._drawMinimap()
    }

    // 🏡 마을: NPC idle·바라보기 + 근접 대화/대문 프롬프트
    if (this.npcs) {
      this._nearNpc = this.npcs.update(dt, this.player.pos)
      const p = this.player.pos
      this._nearGate =
        p.x > WORLD.X_MAX - 4 && p.z >= WORLD.GATE_Z0 - 1.5 && p.z <= WORLD.GATE_Z1 + 1.5
      // 대문 개구부를 넘어가면 자동 출동 (맵 밖 낙사 방지 겸)
      if (p.x > WORLD.X_MAX - 1.1 && !this.paused) {
        p.x = WORLD.X_MAX - 1.6
        this.bridge.onGate?.()
      }
      const prompt = this._nearNpc
        ? `Ⓔ ${this._nearNpc.emoji} ${this._nearNpc.name}와(과) 대화`
        : this._nearGate
          ? 'Ⓔ 🚪 대문 — 사냥 출동!'
          : null
      if (prompt !== this._lastPrompt) {
        this._lastPrompt = prompt
        this.bridge.onPrompt?.(prompt)
      }
    }

    // 조준 블록 하이라이트 (맨손·곡괭이·씨앗에서만 — 무기 들면 숨김, 마을은 항상 숨김)
    const canBuild =
      !this.villageMode &&
      (!this.survival || this.weapon === 'hand' || this.weapon === 'pickaxe' || this.weapon === 'seed')
    const target = canBuild && !this.dead ? this.actions.getTarget() : null
    if (target) {
      const [x, y, z] = target.block
      this.highlight.position.set(x + 0.5, y + 0.5, z + 0.5)
      // 채굴 진행될수록 박스가 조여들며 "곧 부서짐"을 표현
      this.highlight.scale.setScalar(1 - this._mineProgress * 0.45)
      this.highlight.visible = true
    } else {
      this.highlight.visible = false
    }

    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  // ---------- 정리 ----------
  dispose() {
    this.disposed = true
    // 섬 이동 중엔 이미 저장했고 currentIsland가 바뀌었으므로 재저장 금지 (새 섬 덮어쓰기 방지)
    if (!this._noSaveOnDispose) this.saveNow()
    this.environment?.dispose()
    this.fieldDecor?.dispose()
    this.sounds.dispose()
    if (this._locked()) document.exitPointerLock()
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('keyup', this._onKeyUp)
    document.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    document.removeEventListener('mouseup', this._onMouseUp)
    this.canvas.removeEventListener('wheel', this._onWheel)
    this.canvas.removeEventListener('contextmenu', this._onContextMenu)
    this.canvas.removeEventListener('touchstart', this._onTouchStart)
    this.canvas.removeEventListener('touchmove', this._onTouchMove)
    this.canvas.removeEventListener('touchend', this._onTouchEnd)
    this.canvas.removeEventListener('touchcancel', this._onTouchEnd)
    document.removeEventListener('pointerlockchange', this._onLockChange)
    document.removeEventListener('visibilitychange', this._onHide)
    window.removeEventListener('resize', this._onResize)
    this.renderer.dispose()
  }
}
