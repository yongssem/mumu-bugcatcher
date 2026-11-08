// 곤충 채집 씬: React와 분리된 Three.js 수명주기·물리·포획·자원 관리.
import * as THREE from 'three'
import { ellipsoid, tube, voxMesh, hash3 } from './Vox.js'
import { makeBug, animateBug } from './BugGen.js'
import { BUGS, BUG_COUNT } from './bugData.js'
import { recordCatch, bugpediaProgress } from '../save/bugpedia.js'
import { MATERIALS, NODES } from './bugcraft.js'
import { addMaterial, useItem } from '../save/inventory.js'
import { HABITATS, DEFAULT_HABITAT } from './habitats.js'
import { BugViewModel } from './BugVM.js'
import { buildMega } from './megaProps.js'
import { buildSky, SKY_TYPES } from './skyProps.js'
import { HuntInput } from './HuntInput.js'
import { stepPlayer, shortestTurn } from './huntPhysics.js'
import { GameTimers } from './GameTimers.js'
import { starterNodes } from './huntResources.js'
import { disposeScene as disposeObject } from './disposeScene.js'
import { loadHuntWorld, saveHuntWorld, validHuntCell } from '../save/huntWorld.js'

const PVOX = 0.22, R = 10.5, MAX_BUGS = 8
const col = h => new THREE.Color(h)
const addV = (parent, shapes, cf, vox = PVOX) => { const m = voxMesh(shapes, cf, vox); if (m) parent.add(m) }
const RWEIGHT = { common: 6, uncommon: 3, rare: 1.4, epic: 0.6 }
const TOOLS = ['trowel', 'net', 'bomb', 'dart', 'trap']

export class BugHuntEngine {
  constructor(mount, { habitat, inventory, onToast, onInventory, onCaught, onTool, onTarget, onPause, onCraft, onInputMode }) {
    this.inventory = inventory; this.tool = 'trowel'; this.paused = true; this.disposed = false
    const H = HABITATS[habitat] || HABITATS[DEFAULT_HABITAT]
    const habitatId = HABITATS[habitat] ? habitat : DEFAULT_HABITAT
    const savedBlocks = loadHuntWorld(habitatId)
    const timers = new GameTimers()
    let cooldown = 0
    const w = mount.clientWidth || 1, h = mount.clientHeight || 1
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
    
    // ── 배치·충돌 시스템 (요소끼리 안 겹치게 · 일부는 플레이어를 막는 벽=미로) ──
    const rand = (a, b) => a + Math.random() * (b - a)
    const occ = []     // 비겹침 점유 { x, z, r }
    const solids = []  // 플레이어를 막는 원형 장애물 { x, z, r }
    occ.push({ x: 0, z: 0, r: 2.2 })       // 스폰 지점은 비워둠
    occ.push({ x: 1.6, z: -1.6, r: 1.1 })  // 조합대 자리
    for (const [key] of savedBlocks) { const [x, z] = key.split(',').map(Number); occ.push({ x: x + 0.5, z: z + 0.5, r: 0.85 }) }
    const findSpot = (foot, minR, maxR, tries = 28) => {
      for (let t = 0; t < tries; t++) {
        const a = Math.random() * Math.PI * 2, r = minR + Math.random() * (maxR - minR)
        const x = Math.cos(a) * r, z = Math.sin(a) * r
        let ok = true
        for (const o of occ) { const dx = x - o.x, dz = z - o.z, rr = foot + o.r; if (dx * dx + dz * dz < rr * rr) { ok = false; break } }
        if (ok) { const e = { x, z, r: foot }; occ.push(e); return e }
      }
      return null
    }
    const blockedBySolid = (x, z, margin = 0) => solids.some(s => Math.hypot(x - s.x, z - s.z) < s.r + margin)
    // 장식보다 먼저 필수 자원 자리를 확보한다.
    const resourceSpots = starterNodes().map((type, i) => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / 10
      const spot = { x: Math.cos(angle) * 3.6, z: Math.sin(angle) * 3.6, r: 0.8 }
      occ.push(spot)
      return { type, spot }
    })
    
    // 소품 빌더
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
    const gc = H.grassColors
    
    // 🌿 풀숲 클러터 빌더 — 짧은 풀 다발·덤불·바위·키큰풀 벽(미로)
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
      addV(g, [ellipsoid(0, 0.32, 0, 0.62, 0.46, 0.58), ellipsoid(0.36, 0.2, 0.14, 0.32, 0.24, 0.3)], (px, py) => col(py > 0.38 ? '#9AA0A6' : '#787E84'))
      scene.add(g)
    }
    const hedge = (x, z, seed) => {  // 키 큰 풀 벽 — 미로(플레이어를 막음)
      const g = new THREE.Group(); g.position.set(x, 0, z)
      const blades = []
      for (let i = 0; i < 9; i++) { const a = hash3(seed, i, 3) * Math.PI * 2, rr = hash3(seed, i, 8) * 0.85, hh = 2.6 + hash3(seed, i, 5) * 1.9; blades.push(tube(Math.cos(a) * rr, 0, Math.sin(a) * rr, Math.cos(a) * rr * 1.1, hh, Math.sin(a) * rr * 1.1, 0.15, 0.03)) }
      addV(g, blades, (px, py) => col(py > 1.4 ? '#4E8A3A' : gc[0]))
      g.userData = { sway: 0.04, phase: hash3(seed, 6, 2) * 6 }; scene.add(g); swayers.push(g)
    }
    
    // ── 배치: 큰 것/벽부터 자리 선점 → 작은 장식이 빈틈 채움 (서로 안 겹침) ──
    // 🪀 거대 랜드마크 (경계 밖, 서로 안 겹침)
    if (H.mega) H.mega.forEach((type) => {
      const g = buildMega(type); if (!g) return
      let spot = null
      for (let t = 0; t < 22 && !spot; t++) {
        const a = Math.random() * Math.PI * 2, r = R + rand(1.2, 3.4), x = Math.cos(a) * r, z = Math.sin(a) * r
        let ok = true; for (const o of occ) { const dx = x - o.x, dz = z - o.z, rr = 3.6 + o.r; if (dx * dx + dz * dz < rr * rr) { ok = false; break } }
        if (ok) { occ.push({ x, z, r: 3.6 }); spot = { x, z } }
      }
      if (!spot) return
      g.rotation.y += Math.random() * Math.PI * 2
      g.scale.setScalar(1.6 + Math.random() * 0.5)
      g.position.set(spot.x, 0, spot.z); g.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(g)
      const sink = ['baseball', 'marble', 'gumball', 'dice', 'acorn'].includes(type) ? 0.7 : 0.15
      g.position.y = -box.min.y - sink; scene.add(g)
    })
    // 🌳 나무·바위·키큰풀 벽·덤불 — 플레이어를 막음(미로처럼 사이를 헤집고 다님)
    if (H.extra === 'tree') for (const [tx, tz] of [[-8, -6], [7.5, 5]]) { occ.push({ x: tx, z: tz, r: 2.6 }); solids.push({ x: tx, z: tz, r: 1.5 }); bigTree(tx, tz) }
    for (let i = 0; i < 6; i++) { const s = findSpot(1.1, 3, R - 1.5); if (s) { solids.push({ x: s.x, z: s.z, r: 0.68, height: 0.8 }); rock(s.x, s.z) } }
    for (let i = 0; i < 8; i++) { const s = findSpot(1.45, 6.8, R - 1.4); if (s) { solids.push({ x: s.x, z: s.z, r: 1.15 }); hedge(s.x, s.z, i) } }
    for (let i = 0; i < 7; i++) { const s = findSpot(0.95, 3, R - 2); if (s) { solids.push({ x: s.x, z: s.z, r: 0.6, height: 1.0 }); bush(s.x, s.z, i) } }
    // 🍄버섯·🌸꽃·🪷연잎 (장식, 안 막음)
    for (let i = 0; i < (H.mushroomN || 0); i++) { const s = findSpot(0.85, 3, R - 3.5); if (s) mushroom(s.x, s.z, 1.2 + Math.random() * 0.8) }
    if (H.flowers) for (let i = 0; i < H.flowers.n; i++) { const s = findSpot(0.7, 3, R - 3.5); if (s) flower(s.x, s.z, 2.8 + Math.random() * 1.2, H.flowers.petals[i % H.flowers.petals.length]) }
    if (H.extra === 'lily') for (let i = 0; i < 6; i++) { const s = findSpot(1.0, 2, R - 2.5); if (s) lilyPad(s.x, s.z) }
    
    // 🪏 채굴 노드 — 파밍 자원(눈에 잘 띄게 소재 아이콘이 위에 둥실). 벽/장식 사이 빈 곳에.
    const nodes = []
    const nodeTypes = Object.keys(NODES)
    const makeNode = (type, e) => {
      const spec = NODES[type], x = e.x, z = e.z
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [ellipsoid(0, 0.26, 0, 0.46, 0.3, 0.46)], (px, py) => (py > 0.3 ? col(spec.top) : col(spec.color)))
      if (type === 'flowerBud') addV(g, [ellipsoid(0, 0.56, 0, 0.24, 0.22, 0.24)], () => col(spec.top))
      if (type === 'dewDrop') addV(g, [ellipsoid(0, 0.5, 0, 0.22, 0.28, 0.22)], () => col(spec.top))
      if (type === 'twigPile') addV(g, [tube(-0.22, 0.2, 0, 0.26, 0.54, 0.1, 0.05, 0.04), tube(0.12, 0.2, -0.16, -0.16, 0.5, 0.15, 0.05, 0.04)], () => col(spec.top))
      const M = MATERIALS[spec.drop]; const icon = emojiSprite(M?.icon || '❓')
      if (icon) { icon.scale.setScalar(0.62); icon.position.set(x, 1.0, z); scene.add(icon); g.userData.icon = icon }
      g.userData.node = { type, drop: spec.drop, hitsLeft: spec.hits, color: spec.color }
      g.userData.bobPhase = Math.random() * 6; g.userData.occSpot = e
      scene.add(g); nodes.push(g)
      return g
    }
    const spawnNode = (type, spot) => {
      const e = spot || findSpot(0.75, 2.5, R - 1.4, 120)
      if (e) makeNode(type || nodeTypes[Math.floor(Math.random() * nodeTypes.length)], e)
      else timers.after(1, () => spawnNode(type, spot))
    }
    resourceSpots.forEach(({ type, spot }) => spawnNode(type, spot))
    
    // 🌿 키 큰 풀 · 짧은 풀 다발 (빽빽하게, 빈틈을 채움 — 곤충이 사는 밀림)
    for (let i = 0; i < H.grassN + 6; i++) { const s = findSpot(0.5, 2, R - 1); if (s) grass(s.x, s.z, 3 + Math.random() * 2.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, gc[i % gc.length]) }
    for (let i = 0; i < 64; i++) { const s = findSpot(0.42, 1.6, R - 1); if (s) tuft(s.x, s.z, i) }
    
    // ☁️ 하늘 거대 실루엣 flyby — 주기적으로 머리 위를 가로지른다 (작아진 스케일감)
    const skyTint = H.mood === 'night' ? '#C6D2E4' : '#33404E'
    const flybys = []
    let flybyCd = 4 + Math.random() * 5 // 첫 등장까지 (rand는 아래에서 정의됨)
    const spawnFlyby = () => {
      const type = SKY_TYPES[Math.floor(Math.random() * SKY_TYPES.length)]
      const g = buildSky(type, skyTint); if (!g) return
      g.scale.setScalar(3 + Math.random() * 2.5)
      const ang = Math.random() * Math.PI * 2
      const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang))
      const perpAng = ang + Math.PI / 2, off = rand(-8, 8), startDist = 26
      g.position.set(-dir.x * startDist + Math.cos(perpAng) * off, 13 + Math.random() * 9, -dir.z * startDist + Math.sin(perpAng) * off)
      g.rotation.y = Math.atan2(dir.x, dir.z)
      g.userData.fly = { vel: dir.multiplyScalar(rand(3.5, 6)), tt: Math.random() * 6 }
      scene.add(g); flybys.push(g)
    }
    
    // 🧱 조합대 (월드 중앙 근처 랜드마크 — 여기서 파밍한 소재로 포획 블럭을 만든다는 상징)
    const bench = new THREE.Group(); bench.position.set(1.6, 0, -1.6)
    addV(bench, [tube(0, 0, 0, 0, 0.62, 0, 0.34, 0.3)], () => col('#7A5636'))
    addV(bench, [ellipsoid(0, 0.78, 0, 0.5, 0.14, 0.5)], () => col('#9A6E42'))
    addV(bench, [boxTop(0, 0.92, 0)], () => col('#B8894E'))
    scene.add(bench)
    
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
      for (let attempt = 0; attempt < 60; attempt++) {
        const a = Math.random() * Math.PI * 2, r = edge ? R - 0.5 : rand(2, R - 1)
        m.position.set(Math.cos(a) * r, t.fly, Math.sin(a) * r)
        if (!blockedBySolid(m.position.x, m.position.z, 0.2) && !savedBlocks.some(([key]) => key === `${Math.floor(m.position.x)},${Math.floor(m.position.z)}`)) break
      }
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
    camera.position.set(0, eye, 0)
    
    
    // 🧱 설치한 블럭 — 셀("ix,iz") → 높이(쌓인 칸 수). 위에 올라서거나 벽으로 막힘
    const blockH = new Map(savedBlocks)
    const persistBlocks = () => saveHuntWorld(habitatId, [...blockH])
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
      m.updateMatrixWorld(true)
    }
    for (const [key, height] of savedBlocks) { const [x, z] = key.split(',').map(Number); for (let y = 0; y < height; y++) addBlockMesh(x, z, y) }
    
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
    
    const notify = onToast
    const syncInv = () => onInventory(this.inventory)
    
    // 조준 대상 — 시야 원뿔 안, 가장 가까운 것
    const dirV = new THREE.Vector3()
    const sightRay = new THREE.Raycaster()
    const visibleTo = (p, distance, ignoreBlock) => {
      const delta = p.clone().sub(camera.position)
      for (const s of solids) {
        const flat = delta.x * delta.x + delta.z * delta.z
        const t = flat ? Math.max(0, Math.min(1, ((s.x - camera.position.x) * delta.x + (s.z - camera.position.z) * delta.z) / flat)) : 0
        if (camera.position.y + delta.y * t < (s.height ?? 5) && Math.hypot(camera.position.x + delta.x * t - s.x, camera.position.z + delta.z * t - s.z) < s.r) return false
      }
      sightRay.set(camera.position, delta.normalize()); sightRay.far = Math.max(0, distance - 0.1)
      return !sightRay.intersectObjects(blockMeshes.filter(b => b.mesh !== ignoreBlock).map(b => b.mesh), false).length
    }
    const aimAt = o => o.position.clone().add(new THREE.Vector3(0, o.userData.t ? 0.35 : 0.3, 0))
    const nearestInCone = (list, maxD, minDot = 0.8) => {
      camera.getWorldDirection(dirV)
      let best = null, score = Infinity
      for (const o of list) {
        const p = aimAt(o), to = p.clone().sub(camera.position), d = to.length()
        if (d > maxD) continue
        const dot = to.normalize().dot(dirV)
        if (dot < Math.max(0.8, minDot) || !visibleTo(p, d)) continue
        const candidate = (1 - dot) * 5 + d * 0.04
        if (candidate < score) { best = o; score = candidate }
      }
      return best
    }

    // 🧱 블럭 설치/제거 — 우클릭 설치, 모종삽으로 제거 (마인크래프트식 건축)
    const useMat = (mat) => { if ((this.inventory.mats[mat] || 0) < 1) return false; addMaterial(this.inventory, mat, -1); syncInv(); return true }
    const placeBlock = () => {
      if (this.paused || cooldown > 0) return
      cooldown = 0.3
      vm.swing()
      camera.getWorldDirection(dirV); dirV.y = 0
      if (dirV.lengthSq() < 1e-4) return
      dirV.normalize()
      const ix = Math.floor(player.pos.x + dirV.x * 1.4), iz = Math.floor(player.pos.z + dirV.z * 1.4)
      if (!validHuntCell(ix, iz)) { notify('시작 지점과 경계에는 설치할 수 없어요'); return }
      if (ix === Math.floor(player.pos.x) && iz === Math.floor(player.pos.z)) { notify('한 발짝 물러나서 설치해요'); return }
      if (Math.hypot(ix + 0.5, iz + 0.5) > R - 0.8 || blockedBySolid(ix + 0.5, iz + 0.5, 0.7) || resourceSpots.some(({ spot }) => Math.hypot(spot.x - ix - 0.5, spot.z - iz - 0.5) < 1) || Math.hypot(ix + 0.5 - 1.6, iz + 0.5 + 1.6) < 1) { notify('빈 땅에 설치해 주세요'); return }
      if ((blockH.get(`${ix},${iz}`) || 0) >= 4) { notify('블럭은 4칸까지 쌓을 수 있어요'); return }
      if (!useMat('dirt')) { notify('🟫 흙덩이가 필요해요 (🪏로 흙더미 캐기)'); return }
      const lvl = blockH.get(`${ix},${iz}`) || 0
      addBlockMesh(ix, iz, lvl); blockH.set(`${ix},${iz}`, lvl + 1)
      persistBlocks()
      poof(new THREE.Vector3(ix + 0.5, lvl + 0.5, iz + 0.5), '#8A5A34', 5)
    }
    const nearestBlock = () => {
      if (!blockMeshes.length) return null
      camera.getWorldDirection(dirV)
      let best = null, bestD = 3.2
      for (const bm of blockMeshes) {
        const to = bm.mesh.position.clone().sub(camera.position); const d = to.length()
        if (d > bestD) continue
        if (to.normalize().dot(dirV) < 0.8 || !visibleTo(bm.mesh.position, d, bm.mesh)) continue
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
      persistBlocks()
      addMaterial(this.inventory, 'dirt', 1); syncInv()
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
        addMaterial(this.inventory, nd.drop, 1); syncInv()
        const M = MATERIALS[nd.drop]
        notify(`${M?.icon || '🎁'} ${M?.name || nd.drop} +1`)
        if (node.userData.icon) { scene.remove(node.userData.icon); disposeObject(node.userData.icon) }
        // 재생성할 자리를 예약한 채 유지한다.
        scene.remove(node); disposeObject(node); nodes.splice(nodes.indexOf(node), 1)
        timers.after(9, () => spawnNode(nd.type, node.userData.occSpot))
      } else {
        node.userData.bounce = 0.16 // 캐는 피드백(살짝 눌림)
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
      onCaught(bugpediaProgress(BUG_COUNT).caught)
      removeBug(best)
      timers.after(1.2, () => spawn(false, true))
    }
    const tryNet = () => {
      if (!(this.inventory.items.net > 0)) { notify('🥅 먼저 잠자리채를 만들어요! (🧱 조합 · 🪏로 나뭇가지·잎 파밍)'); return }
      const best = nearestInCone(bugs.filter((b) => !b.userData.t.caught), 3.4, 0.5)
      if (!best) return
      const u = best.userData.t
      if (u.big && u.state === 'active') { notify('👑 너무 커요! 폭탄·마취·함정으로 먼저 재워야 해요'); return }
      doCatch(best)
    }
    
    // 💣 폭탄 — 던져서 착지 지점 범위 기절
    const bombs = []
    const throwBomb = () => {
      if (!useItem(this.inventory, 'bomb')) { notify('💣 폭탄이 없어요 · 🧱 조합에서 만들어요'); syncInv(); return }
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
      if (!useItem(this.inventory, 'dart')) { notify('💉 마취 다트가 없어요 · 🧱 조합에서 만들어요'); syncInv(); return }
      syncInv()
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0xE85A7A }))
      d.position.copy(camera.position)
      d.userData.target = target
      scene.add(d); darts.push(d)
    }
    
    // 🕳️ 함정 — 앞쪽 땅에 설치, 곤충이 밟으면 가둠
    const traps = []
    const placeTrap = () => {
      camera.getWorldDirection(dirV); dirV.y = 0; dirV.normalize()
      const p = new THREE.Vector3(player.pos.x, 0, player.pos.z).addScaledVector(dirV, 2.2)
      const dd = Math.hypot(p.x, p.z); if (dd > R - 0.5) p.multiplyScalar((R - 0.5) / dd)
      if (blockedBySolid(p.x, p.z, 0.6) || heightAt(p.x, p.z) > 0 || traps.some(t => t.position.distanceTo(p) < 1.2)) { notify('빈 땅을 향해 함정을 놓아 주세요'); return }
      if (!useItem(this.inventory, 'trap')) { notify('🕳️ 함정이 없어요 · 🧱 조합에서 만들어요'); syncInv(); return }
      syncInv()
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
      if (u.ind) { scene.remove(u.ind); disposeObject(u.ind); u.ind = null }
      const emo = st === 'stunned' ? '💫' : st === 'asleep' ? '💤' : st === 'trapped' ? '🔒' : ''
      if (emo) { const s = emojiSprite(emo); if (s) { s.scale.setScalar(0.5); u.ind = s; scene.add(s) } }
    }
    const removeBug = (b) => {
      const u = b.userData.t
      if (u.ind) { scene.remove(u.ind); disposeObject(u.ind) }
      if (u.crown) { scene.remove(u.crown); disposeObject(u.crown) }
      scene.remove(b); disposeObject(b); bugs.splice(bugs.indexOf(b), 1)
    }
    
    // 🐛 곤충별 리얼 이동(gait) — 몸 방향을 부드럽게 돌리고, 습성대로 움직인다
    const turnTo = (b, ang, rate, dt) => {
      const d = shortestTurn(b.rotation.y, ang)
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
      if (this.paused || cooldown > 0) return
      cooldown = this.tool === 'trowel' ? 0.32 : this.tool === 'net' ? 0.45 : 0.65
      vm.swing()
      switch (this.tool) {
        case 'trowel': tryMine(); break
        case 'net': tryNet(); break
        case 'bomb': throwBomb(); break
        case 'dart': fireDart(); break
        case 'trap': placeTrap(); break
      }
    }
    
    this.useTool = useTool
    
    
    this.place = placeBlock
    this.selectTool = (id) => { if (!TOOLS.includes(id)) return; this.tool = id; onTool(id); vm.setTool(id) }
    if (import.meta.env.DEV) window.__hunt = { // 테스트/디버깅용
      use: useTool, tool: (id) => { this.tool = id }, look: (d, p) => { player.yaw += d; if (p != null) player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch + p)) },
      mine: tryMine, net: tryNet, bomb: throwBomb, dart: fireDart, trap: placeTrap,
      inv: this.inventory, bugs, nodes, bombs, darts, traps, blocks: blockMeshes, flybys,
      place: placeBlock, jump: () => this.jump(), flyby: spawnFlyby,
      give: (mat, n = 1) => { addMaterial(this.inventory, mat, n); syncInv() }, // 소재 지급(실제 인벤 경로) — 조합 검증용
      soloBig: () => { // 대형 곤충 1마리만 정면에 두고 플레이어를 원점으로 — 헌터 포획 결정적 검증용
        for (const b of [...bugs]) removeBug(b)
        const t = pool.find((p) => p.big) || pool[0]
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
    
    // 입력은 전용 컨트롤러가 해제·포커스·멀티터치를 관리한다.
    const controls = new HuntInput(canvas, {
      onPause, onCraft, onInputMode, onUse: () => useTool(), onPlace: () => placeBlock(),
      onTool: i => this.selectTool(TOOLS[i]),
      onLook: (dx, dy, touch) => {
        const sensitivity = touch ? 0.004 : 0.0022
        player.yaw -= dx * sensitivity
        player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - dy * sensitivity))
      },
      onFallback: () => notify('마우스로 둘러보세요 · 화면 끝에서는 계속 회전해요 · Esc 일시정지'),
    })
    this.controls = controls
    this.pause = () => { this.paused = true; controls.pause(false); onTarget(null) }
    this.start = touch => { this.paused = false; controls.start(touch) }
    this.setMove = (x, y) => { if (controls.active) { controls.state.moveX = x; controls.state.moveY = y } }
    this.holdUse = value => { if (controls.mouseMode) return; controls.state.held = controls.active && value; if (value) useTool() }
    this.jump = () => { if (controls.active) controls.state.jump = true }
    if (import.meta.env.DEV) Object.assign(window.__hunt, { player, controls, engine: this, camera, solids, timers })
    
    // 루프
    let raf, last = perf(), walkPhase = 0, gameTime = 0, targetCd = 0
    const up = new THREE.Vector3(0, 1, 0)
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (this.paused || !controls.active) { renderer.render(scene, camera); raf = requestAnimationFrame(loop); return }
      gameTime += dt; cooldown = Math.max(0, cooldown - dt); timers.update(dt)
      controls.update(dt)
      if (controls.state.held) useTool()
      const moving = stepPlayer(player, controls.sample(), dt, { radius: R, heightAt, solids })
      // 카메라 — 눈높이 + 걷기 상하 bob
      if (moving && player.onGround) walkPhase += dt * 6
      const bob = Math.sin(walkPhase) * (moving && player.onGround ? 0.045 : 0)
      camera.position.set(player.pos.x, player.y + eye + bob, player.pos.z)
      camera.rotation.y = player.yaw; camera.rotation.x = player.pitch
      vm.update(dt, moving && player.onGround)
      camera.updateMatrixWorld(true)
      targetCd -= dt
      if (targetCd <= 0) {
        targetCd = 0.12
        const target = this.tool === 'trowel' ? nearestInCone(nodes, 3) : nearestInCone(bugs, this.tool === 'dart' ? 9 : 3.4)
        if (target?.userData.node) {
          const n = target.userData.node
          onTarget(`${NODES[n.type].label} · 🪏 ${n.hitsLeft}번 더 캐기`)
        } else if (target?.userData.t) {
          const u = target.userData.t
          onTarget(`${BUGS[u.id]?.name || '곤충'} · ${u.big && u.state === 'active' ? '먼저 폭탄·마취·함정으로 재우기' : this.inventory.items.net > 0 ? '🥅 잠자리채로 채집' : '조합대에서 잠자리채 만들기'}`)
        } else onTarget(null)
      }
    
      // 소품 흔들림
      const T = gameTime
      for (const s of swayers) s.rotation.z = Math.sin(T * 1.3 + s.userData.phase) * s.userData.sway
    
      // 채굴 노드 — 잘 보이게 살짝 둥실 + 캐면 눌림 피드백, 소재 아이콘도 따라 뜸
      for (const n of nodes) {
        const bob = Math.sin(T * 2 + (n.userData.bobPhase || 0)) * 0.07
        n.position.y = n.userData.bounce ? -0.1 : bob
        if (n.userData.bounce) { n.userData.bounce -= dt; if (n.userData.bounce <= 0) n.userData.bounce = 0 }
        if (n.userData.icon) n.userData.icon.position.y = n.position.y + 1.0 + bob * 0.4
      }
    
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
        const oldX = b.position.x, oldZ = b.position.z
        gaitStep(b, u, dt, pd, toP)
        if (solids.some(s => b.position.y < (s.height ?? 5) && Math.hypot(b.position.x - s.x, b.position.z - s.z) < s.r + 0.12) || heightAt(b.position.x, b.position.z) > b.position.y + 0.1) {
          b.position.x = oldX; b.position.z = oldZ; u.dir.multiplyScalar(-1); u.wanderCd = 0
        }
        if (u.crown) u.crown.position.set(b.position.x, b.position.y + 1.15, b.position.z)
    
        // 함정 밟음 판정
        for (const tr of traps) {
          if (b.position.y < 0.8 && Math.hypot(b.position.x - tr.position.x, b.position.z - tr.position.z) < tr.userData.trap.r) {
            setState(b, 'trapped', 999); b.position.x = tr.position.x; b.position.z = tr.position.z
            poof(tr.position.clone().add(new THREE.Vector3(0, 0.2, 0)), '#8A6A3A', 8)
            notify('🔒 곤충이 함정에 걸렸어요! 🥅 잠자리채로!')
            scene.remove(tr); disposeObject(tr); traps.splice(traps.indexOf(tr), 1)
            break
          }
        }
      }
    
      // 함정 수명
      for (let i = traps.length - 1; i >= 0; i--) { const tr = traps[i]; tr.userData.trap.life -= dt; if (tr.userData.trap.life <= 0) { scene.remove(tr); disposeObject(tr); traps.splice(i, 1) } }
    
      // 폭탄 물리
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i]; b.userData.v.y -= 12 * dt
        b.position.addScaledVector(b.userData.v, dt); b.rotation.x += dt * 8
        const bd = Math.hypot(b.position.x, b.position.z)
        if (bd > R) { b.position.multiplyScalar(R / bd); b.userData.v.x *= -0.4; b.userData.v.z *= -0.4 }
        if (b.position.y <= 0.16) { explode(b.position.clone().setY(0.16)); scene.remove(b); disposeObject(b); bombs.splice(i, 1) }
      }
    
      // 다트 유도
      for (let i = darts.length - 1; i >= 0; i--) {
        const d = darts[i]; const tg = d.userData.target
        if (!tg || tg.userData.t.caught || bugs.indexOf(tg) < 0) { scene.remove(d); disposeObject(d); darts.splice(i, 1); continue }
        const to = tg.position.clone().setY(tg.position.y + 0.2).sub(d.position)
        const dist = to.length()
        d.quaternion.setFromUnitVectors(up, to.clone().normalize())
        d.position.addScaledVector(to.normalize(), Math.min(dist, 18 * dt))
        if (dist < 0.35) {
          setState(tg, 'asleep', 9.0)
          poof(tg.position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#E85A7A', 8)
          notify('💤 곤충이 잠들었어요! 🥅 잠자리채로!')
          scene.remove(d); disposeObject(d); darts.splice(i, 1)
        }
      }
    
      // 포획 파티클
      for (let i = poofs.length - 1; i >= 0; i--) {
        const p = poofs[i]; p.userData.life -= dt
        p.userData.v.y -= 8 * dt
        p.position.addScaledVector(p.userData.v, dt)
        p.scale.multiplyScalar(1 - dt * 2)
        if (p.userData.life <= 0) { scene.remove(p); disposeObject(p); poofs.splice(i, 1) }
      }
    
      // ☁️ 하늘 실루엣 flyby — 스폰·드리프트·소멸
      flybyCd -= dt
      if (flybyCd <= 0 && flybys.length < 2) { spawnFlyby(); flybyCd = rand(11, 20) }
      for (let i = flybys.length - 1; i >= 0; i--) {
        const g = flybys[i]; const f = g.userData.fly; f.tt += dt
        g.position.addScaledVector(f.vel, dt)
        g.position.y += Math.sin(f.tt * 0.8) * dt * 0.5
        g.rotation.z = Math.sin(f.tt * 0.6) * 0.06
        if (g.userData.flap) { const a = Math.sin(f.tt * 4) * 0.5; g.userData.flap[0].rotation.x = a; g.userData.flap[1].rotation.x = -a }
        if (Math.hypot(g.position.x, g.position.z) > 36) { scene.remove(g); disposeObject(g); flybys.splice(i, 1) }
      }
    
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    
    const onResize = () => { const ww = mount.clientWidth || 1, hh = mount.clientHeight || 1; renderer.setSize(ww, hh); camera.aspect = ww / hh; camera.updateProjectionMatrix() }
    window.addEventListener('resize', onResize)
    
    this.dispose = () => {
      this.paused = true; this.disposed = true
      timers.clear(); controls.dispose()
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize)
      disposeObject(scene)
      blockGeo.dispose(); blockTopMat.dispose(); blockSideMat.dispose()
      renderer.dispose()
      if (canvas.parentNode === mount) mount.removeChild(canvas)
      if (import.meta.env.DEV && window.__hunt?.engine === this) delete window.__hunt
    }
  }
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

