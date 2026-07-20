// 픽셀 스킨 캐릭터 — 마인크래프트 던전스풍 복셀 인물 (얼굴·헤어·옷 디테일을 캔버스 텍스처로)
// makeCharacter(look): 머리(얼굴 텍스처)+헤어 오버레이+몸통(옷 패턴)+팔2+다리2
// userData: { head, armL, armR, legL, legR } — 애니메이션용 피벗
import * as THREE from 'three'

// 8의 배수 픽셀 캔버스에 그리기 → NearestFilter 텍스처
function pixelTex(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const M = (tex) => new THREE.MeshLambertMaterial({ map: tex })
const C = (color) => new THREE.MeshLambertMaterial({ color })
// 박스 헬퍼 (모자·장식용)
function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

// 색 밝기 조절 (음영·트림용)
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * k)))
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * k)))
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * k)))
  return `rgb(${r},${g},${b})`
}

// ---------- 얼굴 (8x8): 눈·눈썹·입·볼터치 + 옵션 안경/수염 ----------
function faceTex(look) {
  return pixelTex(8, 8, (ctx) => {
    ctx.fillStyle = look.skin
    ctx.fillRect(0, 0, 8, 8)
    // 눈 (흰자+눈동자)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(1, 3, 2, 1)
    ctx.fillRect(5, 3, 2, 1)
    ctx.fillStyle = '#3a2a20'
    ctx.fillRect(2, 3, 1, 1)
    ctx.fillRect(5, 3, 1, 1)
    // 눈썹
    ctx.fillStyle = look.hairColor
    ctx.fillRect(1, 2, 2, 1)
    ctx.fillRect(5, 2, 2, 1)
    // 입
    ctx.fillStyle = shade(look.skin, 0.6)
    ctx.fillRect(3, 6, 2, 1)
    // 볼터치
    ctx.fillStyle = 'rgba(255,120,120,0.45)'
    ctx.fillRect(0, 4, 1, 1)
    ctx.fillRect(7, 4, 1, 1)
    // 안경
    if (look.glasses) {
      ctx.fillStyle = '#2b2b2b'
      ctx.fillRect(0, 3, 1, 1); ctx.fillRect(3, 3, 2, 1); ctx.fillRect(7, 3, 1, 1)
      ctx.strokeStyle = '#2b2b2b'
      ctx.strokeRect(0.5, 2.5, 3, 2)
      ctx.strokeRect(4.5, 2.5, 3, 2)
    }
    // 수염 (턱 전체)
    if (look.beard) {
      ctx.fillStyle = look.beard
      ctx.fillRect(0, 5, 2, 3); ctx.fillRect(6, 5, 2, 3); ctx.fillRect(2, 7, 4, 1)
      ctx.fillRect(2, 6, 1, 1); ctx.fillRect(5, 6, 1, 1)
    }
  })
}

// ---------- 몸통 앞면 (8x10): 옷 스타일별 패턴 ----------
function torsoTex(look) {
  return pixelTex(8, 10, (ctx) => {
    const base = look.top
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 8, 10)
    const dark = shade(base, 0.72)
    const lite = shade(base, 1.35)
    if (look.outfit === 'fur') {
      // 원시 털옷 — 밝은 트림 + 어깨끈
      ctx.fillStyle = lite
      for (let x = 0; x < 8; x++) if (x % 2 === 0) ctx.fillRect(x, 0, 1, 1)
      for (let x = 0; x < 8; x++) if (x % 2 === 1) ctx.fillRect(x, 9, 1, 1)
      ctx.fillStyle = dark
      ctx.fillRect(1, 0, 1, 10) // 사선 어깨끈 느낌
      ctx.fillRect(2, 4, 5, 1) // 허리끈
    } else if (look.outfit === 'armor') {
      // 갑옷 — 가슴판 + 리벳 + 벨트
      ctx.fillStyle = lite
      ctx.fillRect(1, 1, 6, 4)
      ctx.fillStyle = dark
      ctx.fillRect(1, 1, 1, 1); ctx.fillRect(6, 1, 1, 1)
      ctx.fillRect(1, 4, 1, 1); ctx.fillRect(6, 4, 1, 1)
      ctx.fillRect(0, 6, 8, 2) // 벨트
      ctx.fillStyle = '#F2C14E'
      ctx.fillRect(3, 6, 2, 2) // 버클
    } else if (look.outfit === 'apron') {
      // 대장장이 앞치마
      ctx.fillStyle = '#7a5233'
      ctx.fillRect(2, 2, 4, 8)
      ctx.fillStyle = '#5f3f26'
      ctx.fillRect(2, 2, 4, 1)
      ctx.fillRect(3, 5, 2, 1) // 주머니
    } else if (look.outfit === 'dress') {
      // 원피스 — 옷깃 + 물방울
      ctx.fillStyle = lite
      ctx.fillRect(2, 0, 4, 1)
      ctx.fillRect(1, 6, 1, 1); ctx.fillRect(5, 8, 1, 1); ctx.fillRect(3, 4, 1, 1); ctx.fillRect(6, 3, 1, 1)
    } else if (look.outfit === 'robe') {
      // 촌장 로브 — 세로 여밈 + 띠
      ctx.fillStyle = dark
      ctx.fillRect(3, 0, 1, 10)
      ctx.fillRect(0, 5, 8, 1)
      ctx.fillStyle = lite
      ctx.fillRect(4, 0, 1, 10)
    } else {
      // plain — 단추 + 밑단
      ctx.fillStyle = dark
      ctx.fillRect(0, 9, 8, 1)
      ctx.fillRect(3, 2, 1, 1); ctx.fillRect(3, 4, 1, 1); ctx.fillRect(3, 6, 1, 1)
    }
  })
}

// 몸통 옆·뒤 (민패턴 + 밑단)
function torsoSideTex(look) {
  return pixelTex(8, 10, (ctx) => {
    ctx.fillStyle = look.top
    ctx.fillRect(0, 0, 8, 10)
    ctx.fillStyle = shade(look.top, 0.72)
    ctx.fillRect(0, 9, 8, 1)
  })
}

// 팔 (소매+손): 위 2/3 소매색, 아래 1/3 피부
function armTex(look) {
  return pixelTex(4, 10, (ctx) => {
    ctx.fillStyle = look.top
    ctx.fillRect(0, 0, 4, 7)
    ctx.fillStyle = shade(look.top, 0.8)
    ctx.fillRect(0, 6, 4, 1) // 소매 끝
    ctx.fillStyle = look.skin
    ctx.fillRect(0, 7, 4, 3) // 손
  })
}

// 다리 (바지+신발)
function legTex(look) {
  return pixelTex(4, 10, (ctx) => {
    ctx.fillStyle = look.pants
    ctx.fillRect(0, 0, 4, 8)
    ctx.fillStyle = look.shoes || shade(look.pants, 0.55)
    ctx.fillRect(0, 8, 4, 2)
  })
}

// 헤어 앞면 (앞머리 모양)
function hairFrontTex(look) {
  return pixelTex(8, 3, (ctx) => {
    ctx.fillStyle = look.hairColor
    ctx.fillRect(0, 0, 8, 3)
    if (look.hair === 'bangs') {
      // 지그재그 앞머리
      ctx.clearRect(1, 2, 1, 1); ctx.clearRect(3, 2, 1, 1); ctx.clearRect(5, 2, 1, 1); ctx.clearRect(7, 2, 1, 1)
    }
    if (look.hair === 'band') {
      ctx.fillStyle = look.bandColor || '#C0392B'
      ctx.fillRect(0, 2, 8, 1) // 헤드밴드
    }
  })
}

/**
 * 캐릭터 생성 — 원점: 발밑, 정면 +Z, 키 ~1.9
 * look: { skin, hairColor, hair('bowl'|'bangs'|'long'|'band'|'bald'), top, pants, shoes,
 *         outfit('plain'|'fur'|'armor'|'apron'|'dress'|'robe'), glasses, beard, bandColor }
 */
export function makeCharacter(look) {
  const g = new THREE.Group()
  const skinM = C(look.skin)
  const sideM = M(torsoSideTex(look))

  // 다리 (피벗: 골반)
  const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.25)
  const legM = M(legTex(look))
  const mkLeg = (x) => {
    const p = new THREE.Group()
    p.position.set(x, 0.75, 0)
    const m = new THREE.Mesh(legGeo, legM)
    m.position.y = -0.375
    p.add(m)
    g.add(p)
    return p
  }
  const legL = mkLeg(-0.125)
  const legR = mkLeg(0.125)

  // 몸통 (앞면만 패턴)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.26), [
    sideM, sideM, sideM, sideM, M(torsoTex(look)), sideM,
  ])
  torso.position.y = 1.025
  g.add(torso)

  // 팔 (피벗: 어깨)
  const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.24)
  const armM = M(armTex(look))
  const mkArm = (x) => {
    const p = new THREE.Group()
    p.position.set(x, 1.28, 0)
    const m = new THREE.Mesh(armGeo, armM)
    m.position.y = -0.33
    p.add(m)
    g.add(p)
    return p
  }
  const armL = mkArm(-0.36)
  const armR = mkArm(0.36)

  // 머리 (앞면=얼굴)
  const headSkin = C(look.skin)
  const head = new THREE.Group()
  head.position.y = 1.3
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), [
    headSkin, headSkin, headSkin, headSkin, M(faceTex(look)), headSkin,
  ])
  skull.position.y = 0.25
  head.add(skull)

  // 헤어 (스타일별 오버레이)
  if (look.hair !== 'bald') {
    const hairM = C(look.hairColor)
    // 윗머리 (모두 공통)
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), hairM)
    top.position.y = 0.51
    head.add(top)
    // 앞머리 띠 (bangs/bowl/band)
    const frontM = M(hairFrontTex(look))
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.06), frontM)
    fringe.position.set(0, 0.4, 0.26)
    head.add(fringe)
    // 옆·뒤 (bowl/long)
    if (look.hair === 'bowl' || look.hair === 'long') {
      const sideGeo = new THREE.BoxGeometry(0.06, look.hair === 'long' ? 0.44 : 0.24, 0.56)
      const sL = new THREE.Mesh(sideGeo, hairM)
      sL.position.set(-0.26, look.hair === 'long' ? 0.28 : 0.38, 0)
      const sR = sL.clone()
      sR.position.x = 0.26
      head.add(sL, sR)
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, look.hair === 'long' ? 0.55 : 0.26, 0.06),
        hairM
      )
      back.position.set(0, look.hair === 'long' ? 0.24 : 0.37, -0.26)
      head.add(back)
    }
    // 똥머리 (bun)
    if (look.bun) {
      const bun = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), hairM)
      bun.position.set(0, 0.62, -0.1)
      head.add(bun)
    }
  }

  // ---------- 모자·장식 (hat) ----------
  if (look.hat && look.hat !== 'none') {
    const hc = look.hatColor || '#C0392B'
    const hat = new THREE.Group()
    hat.position.y = 0.5
    if (look.hat === 'cap') {
      hat.add(box(0.58, 0.18, 0.58, C(hc), 0, 0.09, 0))
      hat.add(box(0.5, 0.05, 0.3, C(hc), 0, 0.03, 0.42)) // 챙
    } else if (look.hat === 'straw') {
      hat.add(box(0.5, 0.18, 0.5, C('#E3C16A'), 0, 0.11, 0))
      hat.add(box(0.9, 0.05, 0.9, C('#D9A441'), 0, 0.02, 0)) // 넓은 챙
    } else if (look.hat === 'dino') {
      // 공룡 두건 — 초록 후드 + 등가시 3개
      hat.add(box(0.62, 0.28, 0.62, C('#5F9E3A'), 0, 0.12, 0))
      for (const z of [0.16, 0, -0.16]) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), C('#4A7D2C'))
        sp.position.set(0, 0.34, z)
        hat.add(sp)
      }
    } else if (look.hat === 'crown') {
      hat.add(box(0.56, 0.14, 0.56, C('#F2C14E'), 0, 0.12, 0))
      for (const [x, z] of [[0, 0.26], [0, -0.26], [0.26, 0], [-0.26, 0]]) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), C('#F2C14E'))
        p.position.set(x, 0.26, z)
        hat.add(p)
      }
    } else if (look.hat === 'party') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 8), C(hc))
      cone.position.y = 0.3
      hat.add(cone)
      hat.add(box(0.1, 0.1, 0.1, C('#FFF3C9'), 0, 0.56, 0))
    } else if (look.hat === 'bow') {
      hat.add(box(0.14, 0.14, 0.1, C(hc), -0.14, 0.16, 0.22))
      hat.add(box(0.14, 0.14, 0.1, C(hc), 0.14, 0.16, 0.22))
      hat.add(box(0.08, 0.08, 0.11, C(shade(hc, 0.7)), 0, 0.16, 0.24))
    }
    head.add(hat)
  }
  g.add(head)

  g.userData = { head, torso, armL, armR, legL, legR }
  return g
}

// 걷기/idle 애니 헬퍼 — phase에 따라 팔다리 스윙
export function animateCharacter(char, phase, walking = false) {
  const u = char.userData
  const amp = walking ? 0.55 : 0.04
  u.armL.rotation.x = Math.sin(phase) * amp
  u.armR.rotation.x = -Math.sin(phase) * amp
  u.legL.rotation.x = -Math.sin(phase) * amp
  u.legR.rotation.x = Math.sin(phase) * amp
}
