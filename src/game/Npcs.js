// 마을 NPC — 광장·오두막 앞에 서서 플레이어를 맞이한다 (조우 → E키 대화)
// 촌장=메인 의뢰 / 대장장이=제작 / 박사=도감 / 꼬마=서브 심부름
// 픽셀 스킨 캐릭터(Character.js)로 렌더 — 얼굴·헤어·옷 디테일
import * as THREE from 'three'
import { makeCharacter, animateCharacter } from './Character.js'

const TALK_R = 2.6  // 대화 가능 거리
const FACE_R = 7    // 이 거리 안이면 플레이어를 바라봄

// NPC 정의 — 위치는 마을(village) 맵 기준. look은 Character.js 형식
export const NPC_DEFS = [
  {
    id: 'chief', name: '촌장님', emoji: '👴', role: 'main',
    pos: [18.5, 18.5], scale: 1.0,
    look: { skin: '#E0A87E', hairColor: '#e8e8e8', hair: 'bald', beard: '#e8e8e8', top: '#8a6a44', pants: '#5f4a30', outfit: 'robe' },
    greet: '오, 우리 마을의 사냥꾼! 공룡 때문에 걱정이 많다네.',
  },
  {
    id: 'smith', name: '대장장이', emoji: '🔨', role: 'craft',
    pos: [24.5, 12.5], scale: 1.05,
    look: { skin: '#C08050', hairColor: '#2e2018', hair: 'band', bandColor: '#3a3a42', beard: '#2e2018', top: '#6a4a2c', pants: '#4a3a28', outfit: 'apron' },
    greet: '소재를 가져오면 뚝딱뚝딱 장비를 만들어주지!',
  },
  {
    id: 'doc', name: '공룡 박사', emoji: '📖', role: 'pedia',
    pos: [8.5, 13.5], scale: 0.98,
    look: { skin: '#F0C8A0', hairColor: '#6a4a2c', hair: 'bowl', glasses: true, top: '#4a7ab5', pants: '#33507a', outfit: 'plain' },
    greet: '공룡을 관찰하고 왔는가? 도감을 함께 보세!',
  },
  {
    id: 'kid', name: '꼬마 무무', emoji: '🧒', role: 'sub',
    pos: [33.5, 17.8], scale: 0.72,
    look: { skin: '#F0BC96', hairColor: '#2e2018', hair: 'bowl', top: '#e8963c', pants: '#4a7ab5', outfit: 'fur' },
    greet: '사냥꾼 아저씨! 부탁이 있어요!',
  },
]

// 이름표 스프라이트 (캔버스 텍스트)
function nameTag(text) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.font = 'bold 30px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  const w = ctx.measureText(text).width + 28
  ctx.beginPath()
  ctx.roundRect((256 - w) / 2, 10, w, 44, 10)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, 128, 33)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }))
  sprite.scale.set(2.0, 0.5, 1)
  return sprite
}

// 주민 캐릭터 (픽셀 스킨 + 이름표)
function makeNpcMesh(def) {
  const g = makeCharacter(def.look)
  g.scale.setScalar(def.scale || 1)
  const tag = nameTag(`${def.emoji} ${def.name}`)
  tag.position.y = 2.35
  g.add(tag)
  return g
}

// NPC가 발 디딜 자연 지면 (건물 지붕·벽·나무 위에 서는 버그 방지)
const NATURAL_GROUND = new Set(['grass', 'path', 'sand', 'dirt', 'soil'])

// (x,z) 주변에서 자연 지면 칸을 찾아 발 높이를 반환. 지붕 위면 근처로 밀어냄
function placeOnGround(world, x, z) {
  const check = (px, pz) => {
    const ix = Math.floor(px), iz = Math.floor(pz)
    const gy = world.groundY(ix, iz)
    if (gy == null) return null
    const below = world.getBlock(ix, gy - 1, iz)
    return NATURAL_GROUND.has(below) ? gy : null
  }
  let gy = check(x, z)
  if (gy != null) return { x, z, gy }
  // 나선형으로 가까운 자연 지면 탐색
  for (let r = 1; r <= 6; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue
        gy = check(x + dx, z + dz)
        if (gy != null) return { x: x + dx, z: z + dz, gy }
      }
  return { x, z, gy: world.groundY(Math.floor(x), Math.floor(z)) ?? 1 }
}

// 각도 보간
function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * Math.min(1, t)
}

export class Npcs {
  constructor(scene, world) {
    this.scene = scene
    this.npcs = NPC_DEFS.map((def) => {
      const group = makeNpcMesh(def)
      // 자연 지면(잔디·흙길 등) 위에만 세운다 — 지붕·나무 위에 서는 버그 방지
      const spot = placeOnGround(world, def.pos[0], def.pos[1])
      group.position.set(spot.x, spot.gy, spot.z)
      scene.add(group)
      return { def, group, yaw: Math.random() * Math.PI * 2, bob: Math.random() * Math.PI * 2 }
    })
  }

  // 매 프레임: idle + 근처 플레이어 바라보기. 반환: 대화 가능한 NPC def (없으면 null)
  update(dt, playerPos) {
    let nearest = null
    let nearestDist = TALK_R
    for (const n of this.npcs) {
      n.bob += dt * 2
      animateCharacter(n.group, n.bob, false) // 팔 잔잔히 흔들 (idle)
      const dx = playerPos.x - n.group.position.x
      const dz = playerPos.z - n.group.position.z
      const dist = Math.hypot(dx, dz)
      if (dist < FACE_R) {
        n.yaw = lerpAngle(n.yaw, Math.atan2(dx, dz), 4 * dt)
      }
      n.group.rotation.y = n.yaw
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = n.def
      }
    }
    return nearest
  }

  clear() {
    for (const n of this.npcs) this.scene.remove(n.group)
    this.npcs = []
  }
}
