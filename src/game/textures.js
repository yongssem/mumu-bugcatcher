// 캔버스 픽셀 텍스처 — 이미지 파일 없이 16x16 픽셀 텍스처를 코드로 생성
import * as THREE from 'three'

// 시드 고정 PRNG — 텍스처 노이즈가 매번 동일하게 나오도록
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 16

// 기본색에 픽셀 노이즈를 입힌 16x16 캔버스 생성
function pixelCanvas(hex, { noise = 14, seed = 1, draw } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  const rand = mulberry32(seed)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = Math.floor((rand() - 0.5) * 2 * noise)
      ctx.fillStyle = `rgb(${r + n},${g + n},${b + n})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  if (draw) draw(ctx, rand)
  return canvas
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter // 픽셀 느낌 유지
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 블록 정의 — 색은 무무곤충잡이 브랜드 토큰 기준
export const BLOCK_TYPES = {
  grass: { name: '잔디', color: '#6AB150' },
  dirt: { name: '흙', color: '#9B6B43' },
  stone: { name: '돌', color: '#8A8F98' },
  wood: { name: '나무', color: '#8B6239' },
  leaves: { name: '나뭇잎', color: '#4E9440' },
  gold: { name: '골드', color: '#F2C14E' },
  brick: { name: '벽돌', color: '#B5654D' },
  sand: { name: '모래', color: '#E8D6A0' },
  bedrock: { name: '기반암', color: '#3B3F46' }, // 지하 맨 밑 — 안 부서짐, 핫바 제외
  // 마을 장식용 (핫바 제외)
  plank: { name: '판자', color: '#B08850' },
  path: { name: '흙길', color: '#A98A5C' },
  water: { name: '물', color: '#3F76E4' },
  hay: { name: '건초', color: '#D9A441' },
  crop: { name: '밭', color: '#7FA045' },
  soil: { name: '갈흙', color: '#6b4a2c' },
  corn: { name: '옥수수', color: '#8FB43C' },
  rice: { name: '벼', color: '#C9B24A' },
}

// 핫바 순서 (숫자키 1~8) — 기본값. 가방에서 슬롯을 바꿀 수 있음
export const HOTBAR = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'gold', 'brick', 'sand']
export const HOTBAR_SLOTS = HOTBAR.length

// 🍖 먹이 퀵슬롯 — 동물원 핫바 5~8번 (고기·물·물고기·건초). 고르고 클릭하면 던져서 먹임
export const FOOD_SLOTS = [
  { id: 'meat', emoji: '🥩', name: '고기', diet: '육식' },
  { id: 'water', emoji: '💧', name: '물', diet: '모두' },
  { id: 'fish', emoji: '🐟', name: '물고기', diet: '익룡·수룡' },
  { id: 'hay', emoji: '🌿', name: '건초', diet: '초식' },
]

// 🌿 식물형 블록 — 큐브가 아니라 투명 십자(X) 스프라이트로 렌더 (건초·옥수수·벼)
export const PLANT_TYPES = ['hay', 'corn', 'rice']

// 🎒 가방 — 핫바에 넣을 수 있는 블록 (기반암·물·밭 제외)
export const PLACEABLE = [
  'grass', 'dirt', 'stone', 'wood', 'leaves', 'gold', 'brick', 'sand',
  'plank', 'path', 'soil', 'hay', 'corn', 'rice',
]

// 💰 유튜버 동물원 — 블록 가격 (상점에서 구매해 해금). 'dirt'는 처음부터 무료(기본 지급)
export const BLOCK_PRICE = {
  grass: 40, sand: 40, leaves: 25, stone: 60, path: 35,
  wood: 70, plank: 90, brick: 150, gold: 400,
  soil: 45, hay: 70, corn: 90, rice: 90,
}

// 🌿 식물 스프라이트 캔버스 — 투명 배경 + 식물 실루엣 (십자 평면·아이콘 공용)
function plantCanvas(type) {
  const c = document.createElement('canvas')
  c.width = SIZE; c.height = SIZE
  const ctx = c.getContext('2d') // 배경 투명 (지우지 않음)
  if (type === 'corn') {
    // 옥수수 — 초록 대 + 잎 + 노란 옥수수
    ctx.fillStyle = '#4E8A2A'; ctx.fillRect(7, 1, 2, 15)
    ctx.fillStyle = '#5CA531'
    ctx.fillRect(2, 5, 5, 2); ctx.fillRect(9, 8, 5, 2); ctx.fillRect(2, 11, 5, 2)
    ctx.fillStyle = '#F2C14E'; ctx.fillRect(9, 3, 2, 4); ctx.fillRect(5, 8, 2, 4)
    ctx.fillStyle = '#FBD87A'; ctx.fillRect(9, 3, 1, 4)
  } else if (type === 'rice') {
    // 벼 — 황금빛 줄기 + 고개 숙인 이삭
    ctx.fillStyle = '#B8A038'
    for (const x of [3, 6, 9, 12]) ctx.fillRect(x, 5, 1, 11)
    ctx.fillStyle = '#E8D07A'
    for (const x of [3, 6, 9, 12]) { ctx.fillRect(x - 1, 3, 3, 3); ctx.fillRect(x + 1, 2, 1, 2) }
  } else {
    // 건초 — 마른 풀 다발 (부챗살처럼 퍼진 금빛 줄기)
    ctx.fillStyle = '#C7962F'
    for (const [x0, y0, x1] of [[7, 15, 3], [7, 15, 6], [8, 15, 8], [8, 15, 11], [8, 15, 13]]) {
      const steps = 13
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const px = Math.round(x0 + (x1 - x0) * t)
        const py = Math.round(y0 - 13 * t)
        ctx.fillRect(px, py, 1, 2)
      }
    }
    ctx.fillStyle = '#E3B85A' // 밝은 이삭 끝
    for (const [x, y] of [[3, 2], [6, 1], [8, 1], [11, 2], [13, 3]]) ctx.fillRect(x, y, 2, 2)
  }
  return c
}

// 블록별 대표 캔버스 (아이콘·면 텍스처 공용) — 한 번 만들어 캐시 → 아이콘=실제 블록 일치
let _canvases = null
function canvases() {
  if (_canvases) return _canvases
  const grassTop = pixelCanvas('#6AB150', { seed: 11 })
  const grassSide = pixelCanvas('#9B6B43', {
    seed: 12,
    draw: (ctx, rand) => {
      for (let x = 0; x < SIZE; x++) {
        const h = 3 + Math.floor(rand() * 2)
        for (let y = 0; y < h; y++) {
          const n = Math.floor((rand() - 0.5) * 20)
          ctx.fillStyle = `rgb(${106 + n},${177 + n},${80 + n})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    },
  })
  const dirt = pixelCanvas('#9B6B43', { seed: 13 })
  const woodSide = pixelCanvas('#8B6239', {
    seed: 21,
    draw: (ctx) => { ctx.fillStyle = 'rgba(60,40,20,0.35)'; for (const x of [2, 6, 11, 14]) ctx.fillRect(x, 0, 1, SIZE) },
  })
  const woodTop = pixelCanvas('#A87D4F', {
    seed: 22,
    draw: (ctx) => { ctx.strokeStyle = 'rgba(90,60,30,0.5)'; ctx.strokeRect(3.5, 3.5, 9, 9); ctx.strokeRect(6.5, 6.5, 3, 3) },
  })
  const brick = pixelCanvas('#B5654D', {
    seed: 31,
    draw: (ctx) => {
      ctx.fillStyle = '#D8CFC4'
      for (let y = 0; y < SIZE; y += 4) ctx.fillRect(0, y, SIZE, 1)
      for (let y = 0; y < SIZE; y += 8) { ctx.fillRect(4, y + 1, 1, 3); ctx.fillRect(12, y + 1, 1, 3) }
      for (let y = 4; y < SIZE; y += 8) ctx.fillRect(8, y + 1, 1, 3)
    },
  })
  const gold = pixelCanvas('#F2C14E', {
    seed: 41,
    draw: (ctx) => { ctx.fillStyle = '#FFF3C9'; ctx.fillRect(3, 3, 2, 2); ctx.fillRect(11, 8, 2, 2); ctx.fillRect(6, 12, 1, 1) },
  })
  const plank = pixelCanvas('#B08850', {
    seed: 91, noise: 8,
    draw: (ctx) => {
      ctx.fillStyle = 'rgba(90,60,30,0.45)'
      for (const y of [0, 4, 8, 12]) ctx.fillRect(0, y, SIZE, 1)
      ctx.fillRect(5, 1, 1, 3); ctx.fillRect(11, 5, 1, 3); ctx.fillRect(3, 9, 1, 3); ctx.fillRect(9, 13, 1, 3)
    },
  })
  const water = pixelCanvas('#3F76E4', {
    seed: 92, noise: 12,
    draw: (ctx) => {
      ctx.fillStyle = 'rgba(160,210,255,0.5)'
      ctx.fillRect(1, 3, 5, 1); ctx.fillRect(9, 6, 5, 1); ctx.fillRect(3, 10, 5, 1); ctx.fillRect(10, 13, 4, 1)
    },
  })
  const crop = pixelCanvas('#8a6a3c', {
    seed: 94, noise: 10,
    draw: (ctx) => {
      ctx.fillStyle = '#5CB85C'
      for (const x of [2, 6, 10, 14]) { ctx.fillRect(x, 2, 1, 3); ctx.fillRect(x - 1, 2, 3, 1); ctx.fillRect(x, 9, 1, 3); ctx.fillRect(x - 1, 9, 3, 1) }
    },
  })
  _canvases = {
    grassTop, grassSide, dirt, woodSide, woodTop, brick, gold, plank, water, crop,
    stone: pixelCanvas('#8A8F98', { seed: 51, noise: 10 }),
    leaves: pixelCanvas('#4E9440', { seed: 61, noise: 24 }),
    sand: pixelCanvas('#E8D6A0', { seed: 71, noise: 10 }),
    bedrock: pixelCanvas('#3B3F46', { seed: 81, noise: 8 }),
    path: pixelCanvas('#A98A5C', { seed: 95, noise: 12 }),
    soil: pixelCanvas('#6b4a2c', { seed: 96, noise: 14 }),
    // 식물형 (투명 스프라이트)
    hay: plantCanvas('hay'), corn: plantCanvas('corn'), rice: plantCanvas('rice'),
  }
  return _canvases
}

// 블록별 재질 생성 — grass·wood·crop은 6면 분리, 식물형은 투명 십자 재질, 나머지는 단일
export function createMaterials() {
  const C = canvases()
  const mat = (canvas) => new THREE.MeshLambertMaterial({ map: toTexture(canvas) })
  const plantMat = (canvas) => new THREE.MeshLambertMaterial({ map: toTexture(canvas), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })
  return {
    grass: [mat(C.grassSide), mat(C.grassSide), mat(C.grassTop), mat(C.dirt), mat(C.grassSide), mat(C.grassSide)],
    dirt: mat(C.dirt),
    stone: mat(C.stone),
    wood: [mat(C.woodSide), mat(C.woodSide), mat(C.woodTop), mat(C.woodTop), mat(C.woodSide), mat(C.woodSide)],
    leaves: mat(C.leaves),
    gold: mat(C.gold),
    brick: mat(C.brick),
    sand: mat(C.sand),
    bedrock: mat(C.bedrock),
    plank: mat(C.plank),
    path: mat(C.path),
    water: mat(C.water),
    crop: [mat(C.dirt), mat(C.dirt), mat(C.crop), mat(C.dirt), mat(C.dirt), mat(C.dirt)],
    soil: mat(C.soil),
    // 🌿 식물형 — 투명 십자 스프라이트
    hay: plantMat(C.hay),
    corn: plantMat(C.corn),
    rice: plantMat(C.rice),
  }
}

// 🖼️ UI 아이콘용 데이터 URL (실제 블록 텍스처 그대로) — 캐시. 식물형은 투명 스프라이트
const _iconURL = {}
export function blockIconURL(type) {
  if (_iconURL[type]) return _iconURL[type]
  const C = canvases()
  const key = type === 'grass' ? 'grassTop' : type === 'wood' ? 'woodSide' : type
  const canvas = C[key]
  if (!canvas) return null
  _iconURL[type] = canvas.toDataURL()
  return _iconURL[type]
}

// 식물형 블록인지
export function isPlant(type) {
  return PLANT_TYPES.includes(type)
}

// 🌿 십자(X) 지오메트리 — 식물 블록 렌더용 (수직 두 평면 교차, 한 칸 크기)
export function crossGeometry() {
  const g = new THREE.BufferGeometry()
  const h = 0.5
  // 평면 A(±Z 향), 평면 B(±X 향)
  const pos = new Float32Array([
    -h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0, // A
    0, -h, -h, 0, -h, h, 0, h, h, 0, h, -h, // B
  ])
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1])
  const norm = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0])
  const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('normal', new THREE.BufferAttribute(norm, 3))
  g.setIndex(idx)
  return g
}
