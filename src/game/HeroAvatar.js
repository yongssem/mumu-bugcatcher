// 주인공 아바타 — 시대별로 외형·무기가 바뀌는 복셀 원시인→현대인 (마을 허브에 전시)
// 원점: 발밑 지면, 정면 +Z. userData.arm(무기 든 팔)로 살짝 idle 애니
import * as THREE from 'three'

const SKIN = '#c98d5a'
const HAIR = '#3a2a1c'

function box(w, h, d, color, x, y, z) {
  const mat = color instanceof THREE.Material ? color : new THREE.MeshLambertMaterial({ color })
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

// 시대별 복장/무기 설정
const LOOK = {
  paleo: { torso: null, loin: '#4E9440', legwrap: null, head: null, weapon: 'axe' }, // 알몸+나뭇잎 팬티
  neo: { torso: '#8a6a44', loin: '#6b4a2c', legwrap: '#7a5233', head: '#7a5233', weapon: 'bow' },
  bronze: { torso: '#c08a3c', loin: '#7a5a2c', legwrap: null, head: '#d0a23a', weapon: 'sword' },
  iron: { torso: '#9aa0aa', loin: '#6b6f77', legwrap: '#7f858f', head: '#aab0ba', weapon: 'crossbow' },
  modernEarly: { torso: '#3b5b8c', loin: '#2c3a52', legwrap: '#2c3a52', head: '#243b6b', weapon: 'musket' },
  modern: { torso: '#33a6a6', loin: '#2c6a6a', legwrap: '#2c6a6a', head: '#6ad0d0', weapon: 'netgun' },
}

// 손에 드는 무기 (작은 그룹)
function makeWeapon(kind) {
  const g = new THREE.Group()
  const wood = '#6b4a2c'
  const stone = '#8a8f98'
  const metal = '#c9ced6'
  if (kind === 'axe') {
    g.add(box(0.08, 0.9, 0.08, wood, 0, 0, 0))
    g.add(box(0.34, 0.28, 0.12, stone, 0.02, 0.42, 0))
  } else if (kind === 'bow') {
    g.add(box(0.07, 1.0, 0.07, wood, 0, 0, 0))
    g.add(box(0.015, 0.95, 0.015, '#efe6d0', 0.09, 0, 0)) // 시위
    g.children[0].rotation.z = 0.12
  } else if (kind === 'sword') {
    g.add(box(0.09, 0.75, 0.12, metal, 0, 0.28, 0))
    g.add(box(0.26, 0.07, 0.16, '#d0a23a', 0, -0.05, 0))
    g.add(box(0.08, 0.2, 0.1, wood, 0, -0.2, 0))
  } else if (kind === 'crossbow') {
    g.add(box(0.1, 0.5, 0.1, wood, 0, 0, 0.1)) // 개머리
    g.add(box(0.7, 0.06, 0.08, wood, 0, 0.1, -0.05)) // 활대 (가로)
    g.add(box(0.06, 0.06, 0.4, metal, 0, 0.1, 0.15)) // 화살홈
  } else if (kind === 'musket') {
    g.add(box(0.07, 1.1, 0.07, metal, 0, 0.2, 0)) // 총열
    g.add(box(0.12, 0.4, 0.14, wood, 0, -0.35, 0)) // 개머리
  } else if (kind === 'netgun') {
    // 넷건(포획총) — 통통한 몸체 + 청록 그물 총구 (비살상)
    g.add(box(0.22, 0.34, 0.6, '#e8e8e8', 0, 0, 0.1))
    g.add(box(0.16, 0.3, 0.16, '#333a44', 0, -0.28, -0.05)) // 손잡이
    g.add(box(0.3, 0.3, 0.12, '#33d0c0', 0, 0.02, 0.42)) // 그물 발사구
  }
  return g
}

export function makeHero(eraId = 'paleo') {
  const look = LOOK[eraId] || LOOK.paleo
  const g = new THREE.Group()
  const skin = new THREE.MeshLambertMaterial({ color: SKIN })

  // 다리
  const legL = box(0.34, 0.8, 0.36, look.legwrap || skin, -0.2, 0.4, 0)
  const legR = box(0.34, 0.8, 0.36, look.legwrap || skin, 0.2, 0.4, 0)
  g.add(legL, legR)
  // 나뭇잎 팬티 / 허리 두름
  if (look.loin) g.add(box(0.86, 0.34, 0.5, look.loin, 0, 0.72, 0))

  // 몸통 (구석기는 알몸 = 맨살, 이후엔 복장색)
  g.add(box(0.82, 0.95, 0.5, look.torso || skin, 0, 1.2, 0))
  // 팔
  const armL = box(0.22, 0.8, 0.24, look.torso || skin, -0.54, 1.25, 0)
  g.add(armL)

  // 머리 + 머리카락/투구
  g.add(box(0.5, 0.5, 0.5, skin, 0, 1.95, 0))
  g.add(box(0.56, 0.26, 0.56, look.head || HAIR, 0, 2.22, 0))
  // 눈 (귀여움)
  g.add(box(0.08, 0.1, 0.05, '#2b2b2b', 0.13, 1.98, 0.26))
  g.add(box(0.08, 0.1, 0.05, '#2b2b2b', -0.13, 1.98, 0.26))

  // 무기 든 오른팔 (앞으로 살짝) — idle 애니 대상
  const arm = new THREE.Group()
  arm.position.set(0.54, 1.5, 0.1)
  arm.add(box(0.22, 0.8, 0.24, look.torso || skin, 0, -0.35, 0))
  const weapon = makeWeapon(look.weapon)
  weapon.position.set(0, -0.55, 0.18)
  arm.add(weapon)
  arm.rotation.x = -0.25
  g.add(arm)

  g.userData = { arm }
  return g
}
