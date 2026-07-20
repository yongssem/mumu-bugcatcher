// 1인칭 뷰모델 — 화면 오른쪽 아래에 보이는 손/도구 + 휘두르기·걷기 모션
// 손은 팔뚝+손바닥+손가락4+엄지 (Hand.js). 카메라에 붙어 렌더 (씬 조명 그대로)
import * as THREE from 'three'
import { makeHand } from './Hand.js'

const SWING_DUR = 0.22 // 휘두르기 시간(초)

export class ViewModel {
  /**
   * @param camera 플레이어 카메라 (scene에 add되어 있어야 함)
   * @param materials 블록 재질 맵 (손에 든 블록 표시용)
   */
  constructor(camera, materials, skinTone = '#E8B08A') {
    this.materials = materials
    this.group = new THREE.Group()
    this.group.position.set(0.42, -0.45, -0.8)
    camera.add(this.group)

    const skin = new THREE.MeshLambertMaterial({ color: skinTone }) // 선택한 캐릭터 피부톤
    const wood = new THREE.MeshLambertMaterial({ color: '#8B6239' })
    const blade = new THREE.MeshLambertMaterial({ color: '#C9CED6' })
    const gold = new THREE.MeshLambertMaterial({ color: '#F2C14E' })
    const red = new THREE.MeshLambertMaterial({ color: '#C0392B' })
    const white = new THREE.MeshLambertMaterial({ color: '#F5F0E8' })

    // --- 맨손 + 든 블록 (건축 모드) — 펼친 손 ---
    this.handGroup = new THREE.Group()
    const openHand = makeHand(skin, { grip: false })
    openHand.scale.setScalar(0.78)
    openHand.rotation.x = 0.5 // 손바닥이 살짝 위를 보게 (블록을 얹은 느낌)
    this.heldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), materials.grass)
    this.heldBlock.position.set(0, 0.34, -0.16)
    this.heldBlock.rotation.y = 0.5
    this.handGroup.add(openHand, this.heldBlock)
    // 든 블록이 화면 중앙을 가리지 않도록 오른쪽 아래로 더 이동
    this.handGroup.position.set(0.4, -0.1, 0.05)

    // --- 양손 주먹 (블록 안 들었을 때) — 걸으면 좌우가 번갈아 흔들림 ---
    // 그룹 기본 x오프셋(0.42)을 상쇄해 화면 중앙 기준 대칭 + 좌우로 넓게 벌려 중앙(십자선)을 안 가리게
    this.fistsGroup = new THREE.Group()
    this.fistsGroup.position.x = -0.42
    const fistR = makeHand(skin, { grip: true })
    fistR.scale.setScalar(0.62)
    fistR.rotation.set(-0.55, Math.PI, 0.12) // 180° 돌려 손등이 앞(카메라)을 보게 — 손가락 면이 아니라 주먹 등이 보임
    fistR.position.x = 0.8 // 화면 오른쪽 끝
    const fistL = makeHand(skin, { grip: true })
    fistL.scale.set(-0.62, 0.62, 0.62) // X 미러 → 왼손 (Three가 반전 처리)
    fistL.rotation.set(-0.55, Math.PI, -0.12)
    fistL.position.x = -0.8 // 화면 왼쪽 끝
    this.fistsGroup.add(fistL, fistR)
    this._fistL = fistL
    this._fistR = fistR

    // 도구를 쥔 손 (공통) — 자루가 y축을 따라 손을 통과, 팔뚝은 화면 오른쪽 아래(코너)로 꺾음
    const gripHand = () => {
      const h = makeHand(skin, { grip: true })
      h.scale.setScalar(0.72)
      h.userData.forearm.rotation.z = 0.5 // 팔뚝을 오른쪽 아래로
      h.userData.forearm.rotation.x = 0.3 // 살짝 카메라 쪽으로
      return h
    }

    // --- 곡괭이 ---
    this.pickGroup = new THREE.Group()
    const pHandle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.09), wood)
    pHandle.position.y = 0.18 // 자루가 주먹(원점)을 관통해 아래로도 이어짐
    const pHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.11), blade)
    pHead.position.y = 0.62
    const pTipL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.1), blade)
    pTipL.position.set(-0.2, 0.56, 0)
    const pTipR = pTipL.clone()
    pTipR.position.x = 0.2
    this.pickGroup.add(gripHand(), pHandle, pHead, pTipL, pTipR)
    this.pickGroup.rotation.set(0.42, -0.18, 0.1) // 앞으로 기울이고 주먹 앞면이 보이게 살짝 돌림

    // --- 칼 (제작 등급에 따라 칼날 색이 바뀜) ---
    this.swordGroup = new THREE.Group()
    const sHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.09), wood)
    sHandle.position.y = 0.03 // 주먹 관통 (아래 손잡이 끝이 살짝 보임)
    const sGuard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.16), gold)
    sGuard.position.y = 0.34
    const sBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.13), blade.clone())
    this._swordBlade = sBlade // setSwordTier에서 색 교체
    sBlade.position.y = 0.68
    this.swordGroup.add(gripHand(), sHandle, sGuard, sBlade)
    this.swordGroup.rotation.set(0.38, -0.18, 0.12)

    // --- 활 (쥔 손이 활대를 잡음) ---
    this.bowGroup = new THREE.Group()
    const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.07), wood)
    limbTop.position.y = 0.24
    limbTop.rotation.z = 0.35
    const limbMid = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.08), wood)
    limbMid.position.y = 0 // 주먹이 활대 가운데를 쥠
    const limbBot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.07), wood)
    limbBot.position.y = -0.24
    limbBot.rotation.z = -0.35
    const string = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.7, 0.015), white)
    string.position.set(0.09, 0, 0)
    this.bowGroup.add(gripHand(), limbTop, limbMid, limbBot, string)
    this.bowGroup.rotation.set(0.3, -0.16, 0.08)

    // --- 씨앗 (농사) — 펼친 손바닥 위 새싹 ---
    this.seedGroup = new THREE.Group()
    const seedHand = makeHand(skin, { grip: false })
    seedHand.scale.setScalar(0.78)
    seedHand.rotation.x = 0.5
    const sprout = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), new THREE.MeshLambertMaterial({ color: '#3E8F3E' }))
    sprout.position.set(0, 0.42, -0.05)
    const sLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), new THREE.MeshLambertMaterial({ color: '#5CB85C' }))
    sLeaf.position.set(0, 0.5, -0.05)
    this.seedGroup.add(seedHand, sprout, sLeaf)

    // --- 다이너마이트 (쥔 손) ---
    this.dynGroup = new THREE.Group()
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), red)
    stick.position.y = 0.05 // 주먹이 막대 중간을 쥠
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.17), white)
    band.position.y = 0.22
    const fuse = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), wood)
    fuse.position.y = 0.31
    this.dynGroup.add(gripHand(), stick, band, fuse)
    this.dynGroup.rotation.set(0.42, -0.16, 0.08)

    // --- 먹이 (동물원) — 펼친 손 위 먹이 덩이 (고기/건초/물고기, 색만 교체) ---
    this.foodGroup = new THREE.Group()
    const foodHand = makeHand(skin, { grip: false })
    foodHand.scale.setScalar(0.78)
    foodHand.rotation.x = 0.5
    this._foodMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.3), new THREE.MeshLambertMaterial({ color: '#B23A2E' }))
    this._foodMesh.position.set(0, 0.36, -0.12)
    this._foodMesh.rotation.y = 0.4
    this.foodGroup.add(foodHand, this._foodMesh)
    this.foodGroup.position.set(0.4, -0.1, 0.05)
    this.foodGroup.visible = false

    this.group.add(this.handGroup, this.fistsGroup, this.pickGroup, this.swordGroup, this.bowGroup, this.dynGroup, this.seedGroup, this.foodGroup)
    this.setWeapon('hand', true)

    this._swingT = 1 // 1 = 대기, 0→1 진행 중
    this._bobT = 0
  }

  // blockSelected: 핫바에서 블록을 고른 상태 — 블록 들면 펼친 손, 빈손이면 양주먹
  setWeapon(w, blockSelected = false) {
    this.foodGroup.visible = false // 무기·손 전환 시 먹이 내려놓음
    this.handGroup.visible = w === 'hand' && blockSelected
    this.fistsGroup.visible = w === 'hand' && !blockSelected
    this.heldBlock.visible = w === 'hand' && blockSelected
    this.pickGroup.visible = w === 'pickaxe'
    this.swordGroup.visible = w === 'sword'
    this.bowGroup.visible = w === 'bow'
    this.dynGroup.visible = w === 'dynamite'
    this.seedGroup.visible = w === 'seed'
  }

  // 🍖 먹이를 손에 들기 (동물원). food: 'meat'|'hay'|'fish' | null(내려놓기)
  setFood(food) {
    if (!food) { this.foodGroup.visible = false; return }
    this.handGroup.visible = this.fistsGroup.visible = false
    this.pickGroup.visible = this.swordGroup.visible = this.bowGroup.visible = false
    this.dynGroup.visible = this.seedGroup.visible = false
    this.foodGroup.visible = true
    const c = food === 'meat' ? '#B23A2E' : food === 'hay' ? '#8FB84E' : food === 'water' ? '#4FA9E0' : '#7FB6D6'
    this._foodMesh.material.color.set(c)
  }

  // 핫바 블록 변경 시 손에 든 블록 교체
  setBlock(type) {
    const m = this.materials[type]
    if (m) this.heldBlock.material = m
  }

  // 제작 등급별 칼날 색 (0 기본 / 1 뼈 검 / 2 이빨 창)
  setSwordTier(tier) {
    const c = tier >= 2 ? '#FDFBF0' : tier >= 1 ? '#EDE0C8' : '#C9CED6'
    this._swordBlade.material.color.set(c)
  }

  // 휘두르기 시작 (부수기·공격·설치·발사 공통)
  swing() {
    this._swingT = 0
  }

  update(dt, moving) {
    // 휘두르기: 아래로 찍었다가 복귀 (sin 곡선)
    if (this._swingT < 1) this._swingT = Math.min(1, this._swingT + dt / SWING_DUR)
    const s = Math.sin(this._swingT * Math.PI)
    this.group.rotation.x = -s * 1.0
    this.group.rotation.y = s * 0.25
    this.group.position.z = -0.8 - s * 0.2

    // 걷기 bob (이동 중엔 크게, 서 있으면 잔잔한 숨쉬기)
    this._bobT += dt * (moving ? 10 : 2.2)
    this.group.position.y = -0.45 + Math.sin(this._bobT) * (moving ? 0.028 : 0.007)
    this.group.position.x = 0.42 + Math.cos(this._bobT * 0.5) * (moving ? 0.014 : 0)

    // 양주먹: 걸으면 좌우가 번갈아 앞뒤로 (팔 흔들기) + 펀치 시 오른 주먹 잽
    if (this.fistsGroup.visible) {
      const pump = Math.sin(this._bobT) * (moving ? 0.15 : 0.02)
      this._fistR.position.z = pump - s * 0.42
      this._fistL.position.z = -pump
      this._fistR.position.y = moving ? Math.abs(Math.sin(this._bobT)) * 0.04 : 0
      this._fistL.position.y = moving ? Math.abs(Math.cos(this._bobT)) * 0.04 : 0
    }
  }
}
