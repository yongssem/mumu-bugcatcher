// 밭 작물 데코 — 갈아엎은 흙(soil) 위에 얇은 십자(X) 작물을 심는다 (마인크래프트식)
// 비충돌 장식: 플레이어·공룡이 작물 사이로 그냥 지나감. FIELD_PLOTS 구역만 훑음
import * as THREE from 'three'
import { FIELD_PLOTS } from './World.js'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 작물 텍스처(투명 배경 + 식물 실루엣) — 십자 평면에 매핑
function cropTexture(type) {
  const c = document.createElement('canvas')
  c.width = 16; c.height = 16
  const ctx = c.getContext('2d')
  if (type === 'corn') {
    // 옥수수 — 초록 대 + 잎 + 노란 옥수수
    ctx.fillStyle = '#4E8A2A'
    ctx.fillRect(7, 1, 2, 15)
    ctx.fillStyle = '#5CA531'
    ctx.fillRect(3, 5, 4, 2); ctx.fillRect(9, 8, 4, 2); ctx.fillRect(2, 10, 5, 2)
    ctx.fillStyle = '#F2C14E'
    ctx.fillRect(9, 4, 2, 4); ctx.fillRect(5, 9, 2, 4)
  } else {
    // 밀 — 황금 줄기 + 이삭
    ctx.fillStyle = '#B8A038'
    for (const x of [3, 6, 9, 12]) ctx.fillRect(x, 5, 1, 11)
    ctx.fillStyle = '#E8D07A'
    for (const x of [3, 6, 9, 12]) { ctx.fillRect(x - 1, 3, 3, 3); ctx.fillRect(x, 1, 1, 2) }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function cropMaterial(type) {
  return new THREE.MeshLambertMaterial({
    map: cropTexture(type),
    transparent: true,
    alphaTest: 0.5, // 투명 부분 잘라내기 (정렬 문제 없음)
    side: THREE.DoubleSide,
  })
}

export class FieldDecor {
  constructor(scene, world) {
    this.scene = scene
    const g = new THREE.Group()
    this.group = g
    const rand = mulberry32((world.seed ^ 0x0c) >>> 0)

    const specs = [
      { plot: FIELD_PLOTS.corn, mat: cropMaterial('corn'), h: 1.7 },
      { plot: FIELD_PLOTS.wheat, mat: cropMaterial('wheat'), h: 0.85 },
    ]
    // 십자 지오(공유): 두 평면 교차
    for (const { plot, mat, h } of specs) {
      const geo = new THREE.PlaneGeometry(0.95, h)
      for (let x = plot.x0; x <= plot.x1; x++)
        for (let z = plot.z0; z <= plot.z1; z++) {
          const gy = world.groundY(x, z)
          if (gy === null) continue
          if (world.getBlock(x, gy - 1, z) !== 'soil') continue // 흙 위에만 (물골 제외)
          const jitterH = 0.85 + rand() * 0.3
          const p1 = new THREE.Mesh(geo, mat)
          p1.scale.y = jitterH
          p1.position.set(x + 0.5, gy + (h * jitterH) / 2, z + 0.5)
          p1.rotation.y = rand() * 0.4 - 0.2
          const p2 = p1.clone()
          p2.rotation.y += Math.PI / 2
          g.add(p1, p2)
        }
    }

    scene.add(g)
  }

  dispose() {
    this.scene.remove(this.group)
    this.group.traverse((o) => {
      if (o.isMesh) o.geometry.dispose?.()
    })
  }
}
