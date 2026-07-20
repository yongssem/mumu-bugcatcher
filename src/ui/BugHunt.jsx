// 🧰 곤충월드 채집 (B3) — 모종삽 채굴 파밍 → 조합대(폭탄·마취·함정) → 대형 곤충 헌터식 포획.
// B2의 1인칭 채집 씬을 확장: 도구 전환 · 채굴 노드 · 포획 블럭 제작/사용 · 대형 곤충 무력화.
//   🪏 모종삽: 블럭 채굴(파밍) · 🥅 잠자리채: 얌전/무력화된 곤충 포획
//   💣 폭탄: 범위 기절 · 💉 마취 다트: 재움 · 🕳️ 함정: 밟으면 가둠
//   대형 곤충(👑 미니보스)은 폭탄·마취·함정으로 재우거나 가둔 뒤에만 잠자리채로 포획.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ellipsoid, tube, voxMesh, hash3 } from '../game/Vox.js'
import { makeBug, animateBug } from '../game/BugGen.js'
import { BUGS, BUG_COUNT, RARITY } from '../game/bugData.js'
import { recordCatch, bugpediaProgress } from '../save/bugpedia.js'
import { MATERIALS, NODES, RECIPES } from '../game/bugcraft.js'
import { loadInventory, addMaterial, craftItem, useItem } from '../save/inventory.js'
import { HABITATS, DEFAULT_HABITAT } from '../game/habitats.js'
import { BugViewModel } from '../game/BugVM.js'
import { buildMega } from '../game/megaProps.js'

const PVOX = 0.22
const col = (h) => new THREE.Color(h)
const addV = (parent, shapes, cf, vox = PVOX) => { const m = voxMesh(shapes, cf, vox); if (m) parent.add(m) }
const R = 10.5 // 채집터 반경 (원형 서식지)
const MAX_BUGS = 8
// 희귀도별 스폰 가중 — 흔할수록 자주, 전설은 귀하게 (희귀 곤충)
const RWEIGHT = { common: 6, uncommon: 3, rare: 1.4, epic: 0.6 }

const TOOLS = [
  { id: 'trowel', name: '모종삽', icon: '🪏', kind: 'mine' },
  { id: 'net', name: '잠자리채', icon: '🥅', kind: 'net' },
  { id: 'bomb', name: '폭탄', icon: '💣', kind: 'item' },
  { id: 'dart', name: '마취 다트', icon: '💉', kind: 'item' },
  { id: 'trap', name: '함정', icon: '🕳️', kind: 'item' },
]

export default function BugHunt({ onHome, habitat = DEFAULT_HABITAT }) {
  const H = HABITATS[habitat] || HABITATS[DEFAULT_HABITAT]
  const mountRef = useRef(null)
  const api = useRef({})
  const invRef = useRef(loadInventory())
  const toolRef = useRef('trowel')
  const [caught, setCaught] = useState(bugpediaProgress(BUG_COUNT).caught)
  const [mats, setMats] = useState({ ...invRef.current.mats })
  const [items, setItems] = useState({ ...invRef.current.items })
  const [tool, setTool] = useState('trowel')
  const [toast, setToast] = useState(null)
  const [locked, setLocked] = useState(false)
  const [showCraft, setShowCraft] = useState(false)

  // 조합: 소재 차감 + 포획 블럭 +1 (React 쪽에서 처리 — 패널이 React라서)
  const doCraft = (recipe) => {
    if (craftItem(invRef.current, recipe)) {
      setMats({ ...invRef.current.mats }); setItems({ ...invRef.current.items })
      setToast({ txt: `${recipe.icon} ${recipe.name} 제작!`, key: Date.now() })
    } else {
      setToast({ txt: '소재가 부족해요', key: Date.now() })
    }
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth, h = mount.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)
    const canvas = renderer.domElement

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(H.sky)
    scene.fog = new THREE.Fog(H.sky, H.fog[0], H.fog[1])
    const camera = new THREE.PerspectiveCamera(66, w / h, 0.05, 100)
    camera.rotation.order = 'YXZ'
    scene.add(new THREE.HemisphereLight(H.hemi[0], H.hemi[1], H.hemi[2]))
    const sun = new THREE.DirectionalLight(H.sun[0], H.sun[1]); sun.position.set(6, 12, 5); scene.add(sun)
    scene.add(camera) // 카메라를 씬에 넣어야 부착된 1인칭 뷰모델이 렌더됨
    const vm = new BugViewModel(camera) // 🖐️ 손+도구 1인칭 뷰모델

    // 땅 — 잔디 타일 (서식지 색)
    const tile = new THREE.BoxGeometry(1, 0.5, 1)
    const gmat = [new THREE.MeshLambertMaterial({ color: new THREE.Color(H.ground[0]) }), new THREE.MeshLambertMaterial({ color: new THREE.Color(H.ground[1]) })]
    const gi = [new THREE.InstancedMesh(tile, gmat[0], 26 * 26), new THREE.InstancedMesh(tile, gmat[1], 26 * 26)]
    const dummy = new THREE.Object3D(); const cnt = [0, 0]
    for (let x = -13; x < 13; x++) for (let z = -13; z < 13; z++) {
      const alt = (x + z) & 1
      dummy.position.set(x + 0.5, -0.25, z + 0.5); dummy.updateMatrix()
      gi[alt].setMatrixAt(cnt[alt]++, dummy.matrix)
    }
    gi.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; scene.add(m) })

    // 소품 (거대 풀·꽃·버섯)
    const swayers = []
    const grass = (x, z, hh, bx, bz, c) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [tube(0, 0, 0, bx, hh, bz, 0.16, 0.02)], (px, py) => (py > hh * 0.6 ? col('#4E8A3A') : col(c)))
      g.userData = { sway: 0.05, phase: hash3(x | 0, 2, z | 0) * 6 }; scene.add(g); swayers.push(g)
    }
    const flower = (x, z, hh, petal) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [tube(0, 0, 0, 0.1, hh, 0, 0.13, 0.09)], () => col('#4E8A3A'))
      addV(g, [ellipsoid(0.1, hh + 0.1, 0, 0.3, 0.22, 0.3)], () => col('#F2C14E'))
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; addV(g, [ellipsoid(0.1 + Math.cos(a) * 0.5, hh + 0.1, Math.sin(a) * 0.5, 0.26, 0.1, 0.26)], () => col(petal)) }
      g.userData = { sway: 0.03, phase: hash3(x | 0, 5, z | 0) * 6 }; scene.add(g); swayers.push(g)
    }
    const mushroom = (x, z, hh) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [tube(0, 0, 0, 0, hh, 0, 0.22, 0.16)], () => col('#EFE6D0'))
      addV(g, [ellipsoid(0, hh + 0.1, 0, 0.55, 0.32, 0.55)], (px, py, pz) => hash3(Math.floor(px * 4 + 9), 0, Math.floor(pz * 4 + 9)) > 0.8 ? col('#F5F0E0') : col('#C8402E'))
      scene.add(g)
    }
    // 🌳 큰 나무 (숲) — 가장자리 랜드마크
    const bigTree = (x, z) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [tube(0, 0, 0, 0, 5.2, 0, 0.7, 0.5)], () => col('#4A3422'))
      addV(g, [ellipsoid(0, 5.8, 0, 2.4, 1.8, 2.4), ellipsoid(1.4, 5.2, 0.6, 1.4, 1.2, 1.4)], () => col('#2E4A24'))
      scene.add(g)
    }
    // 🪷 연잎 (연못) — 물 위 발판 느낌의 납작한 원반
    const lilyPad = (x, z) => {
      const g = new THREE.Group(); g.position.set(x, 0.02, z)
      addV(g, [ellipsoid(0, 0.06, 0, 0.9, 0.05, 0.9)], () => col('#3E8A4A'))
      scene.add(g)
    }
    // 서식지별 소품 배치 (해시로 결정적 배치)
    const gc = H.grassColors
    for (let i = 0; i < H.grassN; i++) {
      const a = hash3(i, 7, 3) * Math.PI * 2, r = 2 + hash3(i, 3, 9) * (R - 1)
      grass(Math.cos(a) * r, Math.sin(a) * r, 3 + hash3(i, 4, 2) * 2.4, (hash3(i, 5, 1) - 0.5) * 1.2, (hash3(i, 6, 8) - 0.5) * 1.2, gc[i % gc.length])
    }
    if (H.flowers) for (let i = 0; i < H.flowers.n; i++) {
      const a = hash3(i, 11, 5) * Math.PI * 2, r = 3 + hash3(i, 8, 2) * (R - 3.5)
      flower(Math.cos(a) * r, Math.sin(a) * r, 2.8 + hash3(i, 9, 4) * 1.2, H.flowers.petals[i % H.flowers.petals.length])
    }
    for (let i = 0; i < (H.mushroomN || 0); i++) {
      const a = hash3(i, 13, 7) * Math.PI * 2, r = 3 + hash3(i, 14, 3) * (R - 3.5)
      mushroom(Math.cos(a) * r, Math.sin(a) * r, 1.2 + hash3(i, 15, 2) * 0.8)
    }
    if (H.extra === 'tree') { bigTree(-8, -6); bigTree(7.5, 5) }
    if (H.extra === 'lily') for (let i = 0; i < 6; i++) { const a = hash3(i, 21, 9) * Math.PI * 2, r = 2 + hash3(i, 22, 4) * (R - 2.5); lilyPad(Math.cos(a) * r, Math.sin(a) * r) }

    // 🌿 빽빽한 풀숲 클러터 — 짧은 풀 다발·덤불·바위 (곤충이 사는 느낌)
    const tuft = (x, z, seed) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      const c = gc[Math.floor(hash3(seed, 1, 2) * gc.length) % gc.length]
      const blades = []
      for (let i = 0; i < 3; i++) { const a = hash3(seed, i, 3) * Math.PI * 2, rr = 0.06 + hash3(seed, i, 4) * 0.12, hh = 0.5 + hash3(seed, i, 5) * 0.6; blades.push(tube(Math.cos(a) * rr, 0, Math.sin(a) * rr, Math.cos(a) * rr * 1.5, hh, Math.sin(a) * rr * 1.5, 0.06, 0.02)) }
      addV(g, blades, (px, py) => col(py > 0.35 ? '#4E8A3A' : c))
      g.userData = { sway: 0.09, phase: hash3(seed, 6, 7) * 6 }; scene.add(g); swayers.push(g)
    }
    const bush = (x, z, seed) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [ellipsoid(0, 0.36, 0, 0.55, 0.42, 0.55), ellipsoid(0.3, 0.52, 0.12, 0.34, 0.3, 0.34), ellipsoid(-0.26, 0.46, -0.22, 0.3, 0.28, 0.3)], (px, py) => col(py > 0.5 ? '#5FA34A' : gc[0]))
      g.userData = { sway: 0.035, phase: hash3(seed, 3, 1) * 6 }; scene.add(g); swayers.push(g)
    }
    const rock = (x, z) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [ellipsoid(0, 0.22, 0, 0.46, 0.3, 0.42), ellipsoid(0.28, 0.14, 0.1, 0.24, 0.18, 0.22)], (px, py) => col(py > 0.28 ? '#9AA0A6' : '#787E84'))
      scene.add(g)
    }
    for (let i = 0; i < 84; i++) { const a = hash3(i, 31, 5) * Math.PI * 2, r = 1.6 + hash3(i, 32, 7) * (R - 1.8); tuft(Math.cos(a) * r, Math.sin(a) * r, i) }
    for (let i = 0; i < 11; i++) { const a = hash3(i, 41, 3) * Math.PI * 2, r = 3 + hash3(i, 42, 8) * (R - 4.5); bush(Math.cos(a) * r, Math.sin(a) * r, i) }
    for (let i = 0; i < 6; i++) { const a = hash3(i, 51, 9) * Math.PI * 2, r = 3 + hash3(i, 52, 2) * (R - 4.5); rock(Math.cos(a) * r, Math.sin(a) * r) }

    // 🪀 거대 인간세계 랜드마크 — 경계 밖에 우뚝 세워 '작아져서 뒷마당에 들어온' 스케일감
    if (H.mega) H.mega.forEach((type, i) => {
      const g = buildMega(type); if (!g) return
      const a = (i / H.mega.length) * Math.PI * 2 + 0.7
      const r = R + 1.8
      g.rotation.y += a + Math.PI + (hash3(i, 61, 3) - 0.5) * 0.6
      g.scale.setScalar(1.6 + hash3(i, 62, 5) * 0.5)
      g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
      g.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(g)     // 자동으로 바닥에 앉히기
      const sink = ['baseball', 'marble', 'gumball', 'dice', 'acorn'].includes(type) ? 0.7 : 0.15
      g.position.y = -box.min.y - sink                  // 최저점을 바닥에 맞추고 살짝 파묻기
      scene.add(g)
    })

    // 🧱 조합대 (월드 중앙 근처 랜드마크 — 여기서 파밍한 소재로 포획 블럭을 만든다는 상징)
    const bench = new THREE.Group(); bench.position.set(1.6, 0, -1.6)
    addV(bench, [tube(0, 0, 0, 0, 0.62, 0, 0.34, 0.3)], () => col('#7A5636'))
    addV(bench, [ellipsoid(0, 0.78, 0, 0.5, 0.14, 0.5)], () => col('#9A6E42'))
    addV(bench, [boxTop(0, 0.92, 0)], () => col('#B8894E'))
    scene.add(bench)

    const rand = (a, b) => a + Math.random() * (b - a)

    // 🪏 채굴 노드 — 곤충월드 블럭. 모종삽으로 캐면 소재가 나온다.
    const nodes = []
    const nodeTypes = Object.keys(NODES)
    const makeNode = (type, x, z) => {
      const spec = NODES[type]
      const g = new THREE.Group(); g.position.set(x, 0, z)
      // 뭉툭한 흙덩이 느낌 — 아래 큰 덩이 + 위 밝은 톱
      addV(g, [ellipsoid(0, 0.24, 0, 0.42, 0.26, 0.42)], (px, py) => (py > 0.28 ? col(spec.top) : col(spec.color)))
      if (type === 'flowerBud') addV(g, [ellipsoid(0, 0.5, 0, 0.22, 0.2, 0.22)], () => col(spec.top))
      if (type === 'dewDrop') addV(g, [ellipsoid(0, 0.44, 0, 0.2, 0.26, 0.2)], () => col(spec.top))
      if (type === 'twigPile') addV(g, [tube(-0.2, 0.2, 0, 0.24, 0.5, 0.1, 0.05, 0.04), tube(0.1, 0.2, -0.15, -0.15, 0.46, 0.14, 0.05, 0.04)], () => col(spec.top))
      g.userData.node = { type, drop: spec.drop, hitsLeft: spec.hits, color: spec.color }
      scene.add(g); nodes.push(g)
      return g
    }
    const spawnNode = (edge = false) => {
      const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)]
      const a = Math.random() * Math.PI * 2, r = edge ? R - 1 : rand(2.5, R - 1)
      makeNode(type, Math.cos(a) * r, Math.sin(a) * r)
    }
    for (let i = 0; i < 10; i++) spawnNode()

    // 곤충 스폰 — 서식지 풀에서 희귀도 가중으로 뽑기 (희귀 곤충일수록 드물게)
    const bugs = []
    const pool = H.pool
    const pickType = () => {
      let total = 0
      const ws = pool.map((t) => { const w = RWEIGHT[BUGS[t.id]?.rarity] || 3; total += w; return w })
      let r = Math.random() * total
      for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i] }
      return pool[pool.length - 1]
    }
    const spawn = (edge = false, announce = false) => {
      const t = pickType()
      const m = BUGS[t.id] ? BUGS[t.id].make() : makeBug({ gen: 'beetle', base: '#888', dark: '#333' })
      m.scale.setScalar(t.s)
      const a = Math.random() * Math.PI * 2, r = edge ? R - 0.5 : rand(2, R - 1)
      m.position.set(Math.cos(a) * r, t.fly, Math.sin(a) * r)
      m.userData.t = { ...t, wanderCd: 0, dir: new THREE.Vector3(0, 0, 1), baseY: t.fly, tt: Math.random() * 6, caught: false, state: 'active', stateT: 0, ind: null }
      // 곤충별 이동 습성(gait) — 나비 나풀·잠자리 급선회·메뚜기 점프·개미 종종·딱정벌레 기기
      const fam = BUGS[t.id]?.fam
      m.userData.t.gait = t.fly > 0 ? (fam === 'dragonfly' ? 'dart' : fam === 'butterfly' ? 'flutter' : 'hover') : (fam === 'grasshopper' ? 'hop' : fam === 'bee' ? 'scuttle' : 'crawl')
      m.userData.t.hopCd = Math.random() * 1.0; m.userData.t.hopping = false; m.userData.t.hopVy = 0
      scene.add(m); bugs.push(m)
      if (t.big) { const s = emojiSprite('👑'); if (s) { s.scale.setScalar(0.5); m.userData.t.crown = s; scene.add(s) } }
      // ✨ 희귀 곤충 출현 알림 (초기 스폰 제외)
      const rar = BUGS[t.id]?.rarity
      if (announce && (rar === 'rare' || rar === 'epic')) notify(`✨ ${rar === 'epic' ? '전설' : '희귀'} 곤충 ${BUGS[t.id].name} 출현!`)
    }
    for (let i = 0; i < MAX_BUGS; i++) spawn()

    // 플레이어 상태 — y=발 높이, vy=수직속도, onGround
    const player = { pos: new THREE.Vector3(0, 0, 0), yaw: 0, pitch: 0, y: 0, vy: 0, onGround: true }
    const eye = 1.35 // 눈높이(발 기준)
    const keys = { f: false, b: false, l: false, r: false }
    const move = { touchFwd: false }

    // 🧱 설치한 블럭 — 셀("ix,iz") → 높이(쌓인 칸 수). 위에 올라서거나 벽으로 막힘
    const blockH = new Map()
    const blockMeshes = [] // { key, mesh }
    const cellKey = (x, z) => `${Math.floor(x)},${Math.floor(z)}`
    const heightAt = (x, z) => blockH.get(cellKey(x, z)) || 0
    const blockTopMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(H.ground[0]).multiplyScalar(1.15) })
    const blockSideMat = new THREE.MeshLambertMaterial({ color: '#7A5636' })
    const blockGeo = new THREE.BoxGeometry(1, 1, 1)
    const blockMats = [blockSideMat, blockSideMat, blockTopMat, blockSideMat, blockSideMat, blockSideMat]
    const addBlockMesh = (ix, iz, level) => {
      const m = new THREE.Mesh(blockGeo, blockMats)
      m.position.set(ix + 0.5, level + 0.5, iz + 0.5); scene.add(m)
      blockMeshes.push({ key: `${ix},${iz},${level}`, mesh: m })
    }

    // 파티클 (poof)
    const poofs = []
    const poof = (pos, hex = '#ffffff', n = 8) => {
      for (let i = 0; i < n; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: hex }))
        s.position.copy(pos)
        const a = Math.random() * Math.PI * 2, up = rand(1, 3)
        s.userData.v = new THREE.Vector3(Math.cos(a) * rand(1, 2.5), up, Math.sin(a) * rand(1, 2.5))
        s.userData.life = 0.6; scene.add(s); poofs.push(s)
      }
    }

    const notify = (txt) => setToast({ txt, key: (perf() + Math.random()) })
    const syncInv = () => { setMats({ ...invRef.current.mats }); setItems({ ...invRef.current.items }) }

    // 조준 대상 — 시야 원뿔 안, 가장 가까운 것
    const dirV = new THREE.Vector3()
    const nearestInCone = (list, maxD, minDot = 0.5, posOf = (o) => o.position) => {
      camera.getWorldDirection(dirV)
      const camPos = camera.position
      let best = null, bestD = maxD
      for (const o of list) {
        const p = posOf(o)
        const to = p.clone().sub(camPos); const d = to.length()
        if (d > bestD) continue
        if (to.normalize().dot(dirV) < minDot) continue
        best = o; bestD = d
      }
      return best
    }

    // 🧱 블럭 설치/제거 — 우클릭 설치, 모종삽으로 제거 (마인크래프트식 건축)
    const useMat = (mat) => { if ((invRef.current.mats[mat] || 0) < 1) return false; addMaterial(invRef.current, mat, -1); syncInv(); return true }
    const placeBlock = () => {
      vm.swing()
      camera.getWorldDirection(dirV); dirV.y = 0
      if (dirV.lengthSq() < 1e-4) return
      dirV.normalize()
      const ix = Math.floor(player.pos.x + dirV.x * 1.4), iz = Math.floor(player.pos.z + dirV.z * 1.4)
      if (ix === Math.floor(player.pos.x) && iz === Math.floor(player.pos.z)) { notify('한 발짝 물러나서 설치해요'); return }
      if (Math.hypot(ix + 0.5, iz + 0.5) > R) return
      if (!useMat('dirt')) { notify('🟫 흙덩이가 필요해요 (🪏로 흙더미 캐기)'); return }
      const lvl = blockH.get(`${ix},${iz}`) || 0
      addBlockMesh(ix, iz, lvl); blockH.set(`${ix},${iz}`, lvl + 1)
      poof(new THREE.Vector3(ix + 0.5, lvl + 0.5, iz + 0.5), '#8A5A34', 5)
    }
    const nearestBlock = () => {
      if (!blockMeshes.length) return null
      camera.getWorldDirection(dirV)
      let best = null, bestD = 3.2
      for (const bm of blockMeshes) {
        const to = bm.mesh.position.clone().sub(camera.position); const d = to.length()
        if (d > bestD) continue
        if (to.normalize().dot(dirV) < 0.55) continue
        const [ix, iz] = bm.key.split(',').map(Number)
        best = { ix, iz, d }; bestD = d
      }
      return best
    }
    const removeBlock = (ix, iz) => {
      const key = `${ix},${iz}`; const lvl = blockH.get(key) || 0
      if (lvl <= 0) return
      const topKey = `${ix},${iz},${lvl - 1}`
      const idx = blockMeshes.findIndex((b) => b.key === topKey)
      if (idx >= 0) { scene.remove(blockMeshes[idx].mesh); blockMeshes.splice(idx, 1) }
      if (lvl - 1 <= 0) blockH.delete(key); else blockH.set(key, lvl - 1)
      addMaterial(invRef.current, 'dirt', 1); syncInv()
      poof(new THREE.Vector3(ix + 0.5, lvl - 0.5, iz + 0.5), '#8A5A34', 5)
    }

    // 🪏 채굴 — 노드 or 설치한 블럭 캐기
    const tryMine = () => {
      // 먼저 정면의 설치 블럭을 캐서 되돌려받기
      const nb = nearestBlock()
      const node = nearestInCone(nodes, 3.0, 0.45)
      if (nb && (!node || nb.d < node.position.distanceTo(camera.position))) { removeBlock(nb.ix, nb.iz); return }
      if (!node) return
      const nd = node.userData.node
      poof(node.position.clone().add(new THREE.Vector3(0, 0.3, 0)), MATERIALS[nd.drop]?.color || '#caa', 5)
      nd.hitsLeft -= 1
      if (nd.hitsLeft <= 0) {
        addMaterial(invRef.current, nd.drop, 1); syncInv()
        const M = MATERIALS[nd.drop]
        notify(`${M?.icon || '🎁'} ${M?.name || nd.drop} +1`)
        scene.remove(node); nodes.splice(nodes.indexOf(node), 1)
        setTimeout(() => spawnNode(true), 9000)
      } else {
        node.position.y = -0.06; node.userData.bounce = 0.14 // 살짝 눌리는 피드백
      }
    }

    // 🥅 잠자리채 포획 — 얌전한 곤충 or 무력화(기절/재움/가둠)된 곤충
    const doCatch = (best) => {
      best.userData.t.caught = true
      poof(best.position.clone().add(new THREE.Vector3(0, 0.4, 0)), '#ffffff', 10)
      const id = best.userData.t.id
      const rec = recordCatch(id)
      const name = BUGS[id]?.name || '곤충'
      notify(rec.isNew ? `🎉 ${name} 처음 채집! 도감 해금!` : `🥅 ${name} 채집!`)
      setCaught(bugpediaProgress(BUG_COUNT).caught)
      removeBug(best)
      setTimeout(() => spawn(false, true), 1200)
    }
    const tryNet = () => {
      if (!(invRef.current.items.net > 0)) { notify('🥅 먼저 잠자리채를 만들어요! (🧱 조합 · 🪏로 나뭇가지·잎 파밍)'); return }
      const best = nearestInCone(bugs.filter((b) => !b.userData.t.caught), 3.4, 0.5)
      if (!best) return
      const u = best.userData.t
      if (u.big && u.state === 'active') { notify('👑 너무 커요! 폭탄·마취·함정으로 먼저 재워야 해요'); return }
      doCatch(best)
    }

    // 💣 폭탄 — 던져서 착지 지점 범위 기절
    const bombs = []
    const throwBomb = () => {
      if (!useItem(invRef.current, 'bomb')) { notify('💣 폭탄이 없어요 · 🧱 조합에서 만들어요'); syncInv(); return }
      syncInv()
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshLambertMaterial({ color: 0x222222 }))
      camera.getWorldDirection(dirV)
      b.position.copy(camera.position).addScaledVector(dirV, 0.4)
      b.userData.v = dirV.clone().multiplyScalar(6.5).add(new THREE.Vector3(0, 3.8, 0))
      scene.add(b); bombs.push(b)
    }
    const explode = (pos) => {
      poof(pos.clone().add(new THREE.Vector3(0, 0.2, 0)), '#F2C14E', 14)
      poof(pos.clone().add(new THREE.Vector3(0, 0.2, 0)), '#E8763A', 10)
      let hit = 0
      for (const b of bugs) {
        const u = b.userData.t; if (u.caught) continue
        if (b.position.distanceTo(pos) <= 4.2) { setState(b, 'stunned', 5.0); hit++ }
      }
      if (hit) notify(`💥 ${hit}마리 기절! 지금 🥅 잠자리채로!`)
    }

    // 💉 마취 다트 — 조준한 곤충을 향해 발사해 재움
    const darts = []
    const fireDart = () => {
      const target = nearestInCone(bugs.filter((b) => !b.userData.t.caught && b.userData.t.state === 'active'), 9, 0.9)
      if (!target) { notify('💉 조준점을 곤충에 맞춰 쏘세요'); return }
      if (!useItem(invRef.current, 'dart')) { notify('💉 마취 다트가 없어요 · 🧱 조합에서 만들어요'); syncInv(); return }
      syncInv()
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0xE85A7A }))
      d.position.copy(camera.position)
      d.userData.target = target
      scene.add(d); darts.push(d)
    }

    // 🕳️ 함정 — 앞쪽 땅에 설치, 곤충이 밟으면 가둠
    const traps = []
    const placeTrap = () => {
      if (!useItem(invRef.current, 'trap')) { notify('🕳️ 함정이 없어요 · 🧱 조합에서 만들어요'); syncInv(); return }
      syncInv()
      camera.getWorldDirection(dirV); dirV.y = 0; dirV.normalize()
      const p = new THREE.Vector3(player.pos.x, 0, player.pos.z).addScaledVector(dirV, 2.2)
      const dd = Math.hypot(p.x, p.z); if (dd > R - 0.5) p.multiplyScalar((R - 0.5) / dd)
      const g = new THREE.Group(); g.position.copy(p)
      addV(g, [ellipsoid(0, 0.05, 0, 0.55, 0.06, 0.55)], () => col('#241a10'))
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; addV(g, [tube(Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4, Math.cos(a) * 0.55, 0.34, Math.sin(a) * 0.55, 0.05, 0.03)], () => col('#6B4A2A')) }
      g.userData.trap = { r: 0.95, life: 22 }
      scene.add(g); traps.push(g)
      notify('🕳️ 함정 설치! 곤충이 밟으면 갇혀요')
    }

    // 곤충 상태 세팅 + 표시 아이콘
    const setState = (b, st, t) => {
      const u = b.userData.t; u.state = st; u.stateT = t
      if (u.ind) { scene.remove(u.ind); u.ind = null }
      const emo = st === 'stunned' ? '💫' : st === 'asleep' ? '💤' : st === 'trapped' ? '🔒' : ''
      if (emo) { const s = emojiSprite(emo); if (s) { s.scale.setScalar(0.5); u.ind = s; scene.add(s) } }
    }
    const removeBug = (b) => {
      const u = b.userData.t
      if (u.ind) scene.remove(u.ind)
      if (u.crown) scene.remove(u.crown)
      scene.remove(b); bugs.splice(bugs.indexOf(b), 1)
    }

    // 🐛 곤충별 리얼 이동(gait) — 몸 방향을 부드럽게 돌리고, 습성대로 움직인다
    const turnTo = (b, ang, rate, dt) => {
      const d = ((ang - b.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI
      b.rotation.y += d * Math.min(1, rate * dt)
    }
    const gaitStep = (b, u, dt, pd, toP) => {
      const scared = pd < 3.0 && u.shy > 0.05
      u.wanderCd -= dt
      if (scared && Math.random() < u.shy * dt * 3.5) { u.dir.copy(toP).setY(0).normalize().multiplyScalar(-1); u.wanderCd = rand(0.6, 1.3) }
      else if (u.wanderCd <= 0) {
        const base = Math.atan2(u.dir.x, u.dir.z)
        const spread = u.gait === 'dart' ? 2.2 : u.gait === 'flutter' ? 1.6 : 1.0
        const a = base + rand(-spread, spread); u.dir.set(Math.sin(a), 0, Math.cos(a))
        u.wanderCd = u.gait === 'dart' ? rand(0.5, 1.1) : u.gait === 'scuttle' ? rand(0.4, 1.0) : rand(1.2, 2.8)
      }
      let mul = scared ? 1.7 : 1
      if (u.gait === 'hop') { // 🦗 메뚜기 — 앉았다가 톡톡 튀어오름
        if (u.hopping) {
          u.hopVy -= 11 * dt; b.position.y += u.hopVy * dt
          b.position.x += u.dir.x * u.spd * 2.6 * dt; b.position.z += u.dir.z * u.spd * 2.6 * dt
          if (b.position.y <= 0) { b.position.y = 0; u.hopping = false; u.hopCd = rand(0.5, scared ? 0.6 : 1.6) }
        } else { u.hopCd -= dt; if (u.hopCd <= 0) { u.hopping = true; u.hopVy = 2.6 + (scared ? 0.7 : 0) } }
        turnTo(b, Math.atan2(u.dir.x, u.dir.z), 6, dt)
      } else if (u.baseY > 0) { // 🦋🪰🐝 나는 곤충
        if (u.gait === 'dart') mul *= 1.5
        else if (u.gait === 'flutter') { const a = Math.atan2(u.dir.x, u.dir.z) + Math.sin(u.tt * 4) * 0.5; u.dir.set(Math.sin(a), 0, Math.cos(a)); mul *= 0.8 }
        else mul *= 0.7
        b.position.x += u.dir.x * u.spd * mul * dt; b.position.z += u.dir.z * u.spd * mul * dt
        b.position.y = u.baseY + Math.sin(u.tt * (u.gait === 'dart' ? 9 : 4.5)) * (u.gait === 'dart' ? 0.12 : u.gait === 'hover' ? 0.22 : 0.3)
        turnTo(b, Math.atan2(u.dir.x, u.dir.z), u.gait === 'dart' ? 4 : 3, dt)
      } else { // 🐜🪲 기어다니는 곤충
        if (u.gait === 'scuttle') { const a = Math.atan2(u.dir.x, u.dir.z) + Math.sin(u.tt * 6) * 0.15; u.dir.set(Math.sin(a), 0, Math.cos(a)) }
        else mul *= 0.85
        b.position.x += u.dir.x * u.spd * mul * dt; b.position.z += u.dir.z * u.spd * mul * dt
        b.position.y = 0
        turnTo(b, Math.atan2(u.dir.x, u.dir.z), u.gait === 'scuttle' ? 7 : 4, dt)
      }
      const bd = Math.hypot(b.position.x, b.position.z)
      if (bd > R - 0.5) { u.dir.multiplyScalar(-1); b.position.x += u.dir.x * u.spd * dt * 2; b.position.z += u.dir.z * u.spd * dt * 2 }
    }

    // 도구별 액션 실행
    const useTool = () => {
      vm.swing()
      switch (toolRef.current) {
        case 'trowel': tryMine(); break
        case 'net': tryNet(); break
        case 'bomb': throwBomb(); break
        case 'dart': fireDart(); break
        case 'trap': placeTrap(); break
      }
    }

    api.current.useTool = useTool
    api.current.setTouchFwd = (v) => { move.touchFwd = v }
    api.current.jump = () => { keys.jump = true }
    api.current.place = placeBlock
    api.current.selectTool = (id) => { toolRef.current = id; setTool(id); vm.setTool(id) }
    if (import.meta.env.DEV) window.__hunt = { // 테스트/디버깅용
      use: useTool, tool: (id) => { toolRef.current = id }, look: (d) => { player.yaw += d },
      mine: tryMine, net: tryNet, bomb: throwBomb, dart: fireDart, trap: placeTrap,
      inv: invRef.current, bugs, nodes, bombs, darts, traps, blocks: blockMeshes,
      place: placeBlock, jump: () => { keys.jump = true },
      give: (mat, n = 1) => { addMaterial(invRef.current, mat, n); syncInv() }, // 소재 지급(실제 인벤 경로) — 조합 검증용
      soloBig: () => { // 대형 곤충 1마리만 정면에 두고 플레이어를 원점으로 — 헌터 포획 결정적 검증용
        for (const b of [...bugs]) removeBug(b)
        const t = POOL.find((p) => p.big)
        const m = BUGS[t.id].make(); m.scale.setScalar(t.s); m.position.set(0, 0, -2.6)
        m.userData.t = { ...t, spd: 0, wanderCd: 1e9, dir: new THREE.Vector3(), baseY: 0, tt: 0, caught: false, state: 'active', stateT: 0, ind: null }
        scene.add(m); bugs.push(m)
        const s = emojiSprite('👑'); if (s) { s.scale.setScalar(0.5); m.userData.t.crown = s; scene.add(s) }
        player.pos.set(0, 0, 0); player.yaw = 0; player.pitch = 0
        camera.position.set(0, eye, 0); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld(true)
        return t.id
      },
      mineNearest: () => { // 가장 가까운 노드 옆으로 이동·조준 후 채굴 (결정적 파밍 테스트용)
        if (!nodes.length) return false
        let best = nodes[0], bd = Infinity
        for (const n of nodes) { const d = n.position.distanceToSquared(player.pos); if (d < bd) { bd = d; best = n } }
        const dir = best.position.clone().sub(new THREE.Vector3(player.pos.x, 0, player.pos.z)); dir.y = 0; dir.normalize()
        player.pos.set(best.position.x - dir.x * 1.4, 0, best.position.z - dir.z * 1.4)
        player.yaw = Math.atan2(-dir.x, -dir.z); player.pitch = Math.atan2(best.position.y + 0.2 - eye, 1.4)
        camera.position.set(player.pos.x, eye, player.pos.z); camera.rotation.y = player.yaw; camera.rotation.x = player.pitch
        camera.updateMatrixWorld(true)
        tryMine(); return true
      },
      faceNearestBug: (big) => { // 조준을 가장 가까운 (대형) 곤충으로
        const list = bugs.filter((b) => !b.userData.t.caught && (big == null || !!b.userData.t.big === big))
        if (!list.length) return null
        list.sort((a, c) => a.position.distanceToSquared(camera.position) - c.position.distanceToSquared(camera.position))
        const b = list[0]
        const dx = b.position.x - camera.position.x, dz = b.position.z - camera.position.z
        const flat = Math.hypot(dx, dz)
        player.yaw = Math.atan2(-dx, -dz); player.pitch = Math.atan2(b.position.y + 0.2 - eye, flat)
        camera.position.set(player.pos.x, eye, player.pos.z); camera.rotation.y = player.yaw; camera.rotation.x = player.pitch
        camera.updateMatrixWorld(true)
        return b.userData.t.id
      },
    }

    // 입력 — 시점잠금(데스크톱)
    const isLocked = () => document.pointerLockElement === canvas
    const onDown = (e) => {
      if (!isLocked() && e.pointerType !== 'touch') { canvas.requestPointerLock?.(); return }
      if (!isLocked()) return
      if (e.button === 2) placeBlock()   // 우클릭: 블럭 설치
      else useTool()                     // 좌클릭: 도구 사용
    }
    const onCtx = (e) => e.preventDefault() // 우클릭 메뉴 차단
    const onMove = (e) => { if (!isLocked()) return; player.yaw -= e.movementX * 0.0022; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - e.movementY * 0.0022)) }
    const onLock = () => setLocked(isLocked())
    const onKey = (e, v) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = v; break
        case 'KeyS': case 'ArrowDown': keys.b = v; break
        case 'KeyA': case 'ArrowLeft': keys.l = v; break
        case 'KeyD': case 'ArrowRight': keys.r = v; break
        case 'Digit1': if (v) api.current.selectTool('trowel'); break
        case 'Digit2': if (v) api.current.selectTool('net'); break
        case 'Digit3': if (v) api.current.selectTool('bomb'); break
        case 'Digit4': if (v) api.current.selectTool('dart'); break
        case 'Digit5': if (v) api.current.selectTool('trap'); break
        case 'Space': keys.jump = v; e.preventDefault(); break
        case 'KeyC': if (v) setShowCraft((s) => !s); break
      }
    }
    const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false)
    // 터치 드래그 시점
    let tId = null, tLast = null
    const ts = (e) => { const t = e.changedTouches[0]; tId = t.identifier; tLast = { x: t.clientX, y: t.clientY } }
    const tm = (e) => { for (const t of e.changedTouches) { if (t.identifier !== tId) continue; player.yaw -= (t.clientX - tLast.x) * 0.005; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - (t.clientY - tLast.y) * 0.005)); tLast = { x: t.clientX, y: t.clientY }; e.preventDefault() } }
    const te = (e) => { for (const t of e.changedTouches) if (t.identifier === tId) { tId = null; tLast = null } }
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('contextmenu', onCtx)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('pointerlockchange', onLock)
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku)
    canvas.addEventListener('touchstart', ts, { passive: false })
    canvas.addEventListener('touchmove', tm, { passive: false })
    canvas.addEventListener('touchend', te)

    // 루프
    let raf, last = perf(), walkPhase = 0
    const fwd = new THREE.Vector3(), right = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      // 수평 이동 — 블럭 벽(1칸 초과)은 막고, 1칸까지는 자동으로 오름
      const sp = 4.2 * dt
      fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
      right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw))
      const mv = new THREE.Vector3()
      if (keys.f || move.touchFwd) mv.add(fwd)
      if (keys.b) mv.sub(fwd)
      if (keys.l) mv.sub(right)
      if (keys.r) mv.add(right)
      const moving = mv.lengthSq() > 0
      if (moving) {
        mv.normalize()
        const canStep = (nx, nz) => (heightAt(nx, nz) - player.y) <= 1.05
        const nx = player.pos.x + mv.x * sp; if (canStep(nx, player.pos.z)) player.pos.x = nx
        const nz = player.pos.z + mv.z * sp; if (canStep(player.pos.x, nz)) player.pos.z = nz
      }
      const pd0 = Math.hypot(player.pos.x, player.pos.z)
      if (pd0 > R) { player.pos.multiplyScalar(R / pd0) }
      // 수직 물리 — 점프·중력·블럭 위 착지
      const groundY = heightAt(player.pos.x, player.pos.z)
      if (keys.jump && player.onGround) { player.vy = 5.6; player.onGround = false; keys.jump = false }
      player.vy -= 18 * dt
      player.y += player.vy * dt
      if (player.y <= groundY) { player.y = groundY; player.vy = 0; player.onGround = true } else player.onGround = false
      // 카메라 — 눈높이 + 걷기 상하 bob
      if (moving && player.onGround) walkPhase += dt * 9
      const bob = Math.sin(walkPhase) * (moving && player.onGround ? 0.045 : 0)
      camera.position.set(player.pos.x, player.y + eye + bob, player.pos.z)
      camera.rotation.y = player.yaw; camera.rotation.x = player.pitch
      vm.update(dt, moving && player.onGround)

      // 소품 흔들림
      const T = now / 1000
      for (const s of swayers) s.rotation.z = Math.sin(T * 1.3 + s.userData.phase) * s.userData.sway

      // 채굴 노드 눌림 복원
      for (const n of nodes) { if (n.userData.bounce) { n.position.y = Math.min(0, n.position.y + dt * 0.8); n.userData.bounce -= dt; if (n.userData.bounce <= 0) { n.userData.bounce = 0; n.position.y = 0 } } }

      // 곤충 AI + 상태
      for (const b of bugs) {
        const u = b.userData.t; u.tt += dt; animateBug(b, u.tt)
        // 무력화 상태 처리
        if (u.state !== 'active') {
          if (u.state === 'trapped') { /* 잡을 때까지 유지(함정 life가 끝나면 풀림) */ }
          else { u.stateT -= dt; if (u.stateT <= 0) setState(b, 'active', 0) }
          if (u.state === 'asleep') b.position.y = Math.max(0, (u.baseY || 0) * 0.15) // 스르륵 내려앉음
          if (u.ind) { u.ind.position.set(b.position.x, b.position.y + 0.9 + (u.state === 'stunned' ? Math.sin(u.tt * 8) * 0.05 : 0), b.position.z) }
          if (u.crown) u.crown.position.set(b.position.x, b.position.y + 1.15, b.position.z)
          continue
        }
        const toP = new THREE.Vector3(player.pos.x - b.position.x, 0, player.pos.z - b.position.z)
        const pd = toP.length()
        gaitStep(b, u, dt, pd, toP)
        if (u.crown) u.crown.position.set(b.position.x, b.position.y + 1.15, b.position.z)

        // 함정 밟음 판정
        for (const tr of traps) {
          if (Math.hypot(b.position.x - tr.position.x, b.position.z - tr.position.z) < tr.userData.trap.r) {
            setState(b, 'trapped', 999); b.position.x = tr.position.x; b.position.z = tr.position.z
            poof(tr.position.clone().add(new THREE.Vector3(0, 0.2, 0)), '#8A6A3A', 8)
            notify('🔒 곤충이 함정에 걸렸어요! 🥅 잠자리채로!')
            scene.remove(tr); traps.splice(traps.indexOf(tr), 1)
            break
          }
        }
      }

      // 함정 수명
      for (let i = traps.length - 1; i >= 0; i--) { const tr = traps[i]; tr.userData.trap.life -= dt; if (tr.userData.trap.life <= 0) { scene.remove(tr); traps.splice(i, 1) } }

      // 폭탄 물리
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i]; b.userData.v.y -= 12 * dt
        b.position.addScaledVector(b.userData.v, dt); b.rotation.x += dt * 8
        const bd = Math.hypot(b.position.x, b.position.z)
        if (bd > R) { b.position.multiplyScalar(R / bd); b.userData.v.x *= -0.4; b.userData.v.z *= -0.4 }
        if (b.position.y <= 0.16) { explode(b.position.clone().setY(0.16)); scene.remove(b); bombs.splice(i, 1) }
      }

      // 다트 유도
      for (let i = darts.length - 1; i >= 0; i--) {
        const d = darts[i]; const tg = d.userData.target
        if (!tg || tg.userData.t.caught || bugs.indexOf(tg) < 0) { scene.remove(d); darts.splice(i, 1); continue }
        const to = tg.position.clone().setY(tg.position.y + 0.2).sub(d.position)
        const dist = to.length()
        d.quaternion.setFromUnitVectors(up, to.clone().normalize())
        d.position.addScaledVector(to.normalize(), Math.min(dist, 18 * dt))
        if (dist < 0.35) {
          setState(tg, 'asleep', 9.0)
          poof(tg.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#E85A7A', 8)
          notify('💤 곤충이 잠들었어요! 🥅 잠자리채로!')
          scene.remove(d); darts.splice(i, 1)
        }
      }

      // 포획 파티클
      for (let i = poofs.length - 1; i >= 0; i--) {
        const p = poofs[i]; p.userData.life -= dt
        p.userData.v.y -= 8 * dt
        p.position.addScaledVector(p.userData.v, dt)
        p.scale.multiplyScalar(1 - dt * 2)
        if (p.userData.life <= 0) { scene.remove(p); poofs.splice(i, 1) }
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => { const ww = mount.clientWidth, hh = mount.clientHeight; renderer.setSize(ww, hh); camera.aspect = ww / hh; camera.updateProjectionMatrix() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize)
      canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('contextmenu', onCtx); document.removeEventListener('mousemove', onMove)
      document.removeEventListener('pointerlockchange', onLock)
      document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku)
      canvas.removeEventListener('touchstart', ts); canvas.removeEventListener('touchmove', tm); canvas.removeEventListener('touchend', te)
      if (isLocked()) document.exitPointerLock?.()
      renderer.dispose(); if (canvas.parentNode === mount) mount.removeChild(canvas)
    }
  }, [])

  const activeTool = TOOLS.find((t) => t.id === tool)

  return (
    <div className="relative h-full w-full overflow-hidden select-none" style={{ background: H.sky }}>
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* 조준점 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-2 w-2 rounded-full border border-black/40 bg-white/70" />
      </div>

      {/* (1인칭 손+도구는 3D 뷰모델로 표현됨) */}

      {/* 상단 HUD — 도감 진행 · 소재 */}
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        <div className="rounded-xl bg-black/40 px-4 py-2 font-pixel text-sm text-white backdrop-blur">{H.icon} {H.label} · 🐛 {caught}/{BUG_COUNT}</div>
        <div className="flex flex-wrap gap-1.5 max-w-[62vw]">
          {Object.keys(MATERIALS).map((k) => (
            <span key={k} className="rounded-lg bg-black/35 px-2 py-1 font-sans text-xs text-white backdrop-blur" title={MATERIALS[k].name}>
              {MATERIALS[k].icon} {mats[k] || 0}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button onClick={() => setShowCraft(true)} className="rounded-lg bg-[#8FE06B]/90 px-4 py-1.5 font-pixel text-sm text-[#1e3a14] shadow hover:bg-[#8FE06B]">🧱 조합</button>
        <button onClick={onHome} className="rounded-lg bg-black/40 px-4 py-1.5 font-pixel text-sm text-white backdrop-blur hover:bg-black/60">🏡 집으로</button>
      </div>

      {/* 도구 벨트 */}
      <div className="absolute left-1/2 bottom-4 z-10 flex -translate-x-1/2 gap-1.5 rounded-2xl bg-black/35 p-1.5 backdrop-blur">
        {TOOLS.map((t, i) => {
          const cnt = t.kind === 'item' ? (items[t.id] || 0) : null
          const netLocked = t.id === 'net' && !(items.net > 0)
          const on = tool === t.id
          return (
            <button key={t.id} onClick={() => api.current.selectTool?.(t.id)}
              className={`relative flex h-14 w-14 flex-col items-center justify-center rounded-xl font-pixel text-[10px] leading-tight transition ${on ? 'bg-white text-[#24401a] scale-105 shadow-[0_4px_0_#3f7a2e]' : 'bg-white/15 text-white hover:bg-white/25'} ${netLocked ? 'opacity-50' : ''}`}>
              <span className="text-2xl">{t.icon}</span>
              <span className="mt-0.5">{i + 1}</span>
              {cnt !== null && <span className={`absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 text-[10px] font-bold ${cnt > 0 ? 'bg-[#F2C14E] text-[#3a2a08]' : 'bg-black/60 text-white/70'}`}>{cnt}</span>}
              {netLocked && <span className="absolute -right-1 -top-1 text-xs">🔒</span>}
            </button>
          )
        })}
      </div>

      {/* 시작 안내 */}
      {!locked && !showCraft && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[24%] flex flex-col items-center gap-1 text-center">
          <p className="rounded-xl bg-black/55 px-5 py-2 font-pixel text-sm text-white backdrop-blur">클릭 → 시작 · WASD 이동 · Space 점프 · 좌클릭 사용 · 우클릭 블럭설치 · C 조합</p>
          <p className="font-sans text-xs text-white/80 drop-shadow">🪏 모종삽으로 캐서 파밍 → 🧱 잠자리채·폭탄·마취 제작 → 곤충 사냥! (맨손으론 못 잡아요)</p>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div key={toast.key} className="tip-fade absolute left-1/2 top-[20%] -translate-x-1/2 rounded-xl bg-[#2e5a1e]/90 px-5 py-2.5 text-center font-pixel text-sm text-white shadow-lg">
          {toast.txt}
        </div>
      )}

      {/* 모바일 컨트롤 */}
      <div className="absolute bottom-24 left-6 flex flex-col items-center gap-2 md:hidden">
        <button onTouchStart={() => api.current.setTouchFwd?.(true)} onTouchEnd={() => api.current.setTouchFwd?.(false)}
          className="h-20 w-20 rounded-full bg-white/30 font-pixel text-sm text-white backdrop-blur active:bg-white/50">▲<br />앞으로</button>
        <button onClick={() => api.current.jump?.()} className="h-14 w-20 rounded-full bg-white/25 font-pixel text-xs text-white backdrop-blur active:bg-white/45">⤒ 점프</button>
      </div>
      <div className="absolute bottom-24 right-6 flex flex-col items-center gap-2 md:hidden">
        <button onClick={() => api.current.useTool?.()} className="h-24 w-24 rounded-full bg-[#8FE06B]/80 font-pixel text-base text-[#1e3a14] shadow-lg active:scale-95">{activeTool?.icon}<br />사용</button>
        <button onClick={() => api.current.place?.()} className="h-14 w-24 rounded-full bg-[#7A5636]/80 font-pixel text-xs text-white shadow active:scale-95">🧱 설치</button>
      </div>

      {/* 🧱 조합 패널 */}
      {showCraft && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowCraft(false)}>
          <div className="w-full max-w-lg rounded-2xl border-2 border-white/70 bg-[#20351a]/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-xl text-white">🧱 조합대 — 포획 블럭</h2>
              <button onClick={() => setShowCraft(false)} className="rounded-lg bg-white/20 px-3 py-1 font-pixel text-sm text-white hover:bg-white/30">닫기 ✕</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.keys(MATERIALS).map((k) => (
                <span key={k} className="rounded-lg bg-black/30 px-2 py-1 font-sans text-xs text-white">{MATERIALS[k].icon} {MATERIALS[k].name} {mats[k] || 0}</span>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              {RECIPES.map((r) => {
                const enough = Object.entries(r.cost).every(([m, n]) => (mats[m] || 0) >= n)
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/25 p-3">
                    <span className="text-4xl">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-pixel text-base text-white">{r.name}</h3>
                        <span className="rounded-full bg-[#F2C14E]/90 px-2 py-0.5 font-sans text-[10px] font-bold text-[#3a2a08]">{r.effect}</span>
                        <span className="ml-auto font-sans text-xs text-white/70">보유 {items[r.id] || 0}</span>
                      </div>
                      <p className="mt-0.5 font-sans text-xs text-white/75">{r.desc}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(r.cost).map(([m, n]) => (
                          <span key={m} className={`rounded px-1.5 py-0.5 font-sans text-[11px] ${(mats[m] || 0) >= n ? 'bg-[#3f7a2e] text-white' : 'bg-[#7a2e2e] text-white/90'}`}>
                            {MATERIALS[m].icon} {MATERIALS[m].name} {mats[m] || 0}/{n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => doCraft(r)} disabled={!enough}
                      className={`shrink-0 rounded-xl px-4 py-2 font-pixel text-sm ${enough ? 'bg-[#8FE06B] text-[#1e3a14] shadow-[0_4px_0_#3f7a2e] active:translate-y-0.5 active:shadow-none' : 'cursor-not-allowed bg-white/15 text-white/50'}`}>
                      만들기
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-center font-sans text-xs text-white/60">🪏 모종삽으로 곤충월드 블럭을 캐서 소재를 모아요</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 헬퍼 ──
// perf(): 테스트/SSR 안전한 타임스탬프 (Date.now 금지 환경 대비 performance.now 우선)
function perf() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0 }

// 조합대 상판(넓적한 박스) — Vox boxShape 대체 (얇은 판)
function boxTop(cx, cy, cz) { return tube(cx - 0.42, cy, cz, cx + 0.42, cy, cz, 0.44, 0.44) }

// 이모지 스프라이트 — 곤충 위에 상태(💫💤🔒)·👑 표시. 캔버스 없으면 null (헤드리스 안전)
function emojiSprite(emoji) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 64
    const ctx = c.getContext('2d'); if (!ctx) return null
    ctx.font = '48px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 32, 36)
    const tex = new THREE.CanvasTexture(c)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
    return sp
  } catch { return null }
}
