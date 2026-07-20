// 🥅 곤충월드 채집 (B2) — 작아진 1인칭으로 곤충월드를 걸어다니며 곤충을 포획한다.
// 데스크톱: 클릭해 시점잠금 → WASD 이동 · 마우스 시점 · 클릭 채집
// 모바일: 드래그 시점 · [앞으로] 버튼 이동 · [채집] 버튼
// (전용 경량 Three.js 씬 — 큰 엔진 배선 없이 채집 루프를 먼저 완성)
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ellipsoid, tube, voxMesh, hash3 } from '../game/Vox.js'
import { makeBug, animateBug } from '../game/BugGen.js'
import { BUGS } from '../game/bugData.js'
import { recordCatch, bugpediaProgress } from '../save/bugpedia.js'
import { BUG_COUNT } from '../game/bugData.js'

const PVOX = 0.22
const col = (h) => new THREE.Color(h)
const addV = (parent, shapes, cf, vox = PVOX) => { const m = voxMesh(shapes, cf, vox); if (m) parent.add(m) }
const R = 10.5 // 채집터 반경 (원형 초원)

// 스폰 곤충 풀 — 지상/공중 섞어서 (id, 크기, 비행높이, 속도, 겁많음)
const POOL = [
  { id: 'ilbonWangGaeMi', s: 1.0, fly: 0, spd: 1.6, shy: 0.6 },
  { id: 'muDangBeolle', s: 0.9, fly: 0, spd: 1.0, shy: 0.8 },
  { id: 'byeoMettugi', s: 1.0, fly: 0, spd: 1.4, shy: 1.0 },
  { id: 'chilSeongMudang', s: 0.8, fly: 0, spd: 0.9, shy: 0.8 },
  { id: 'gochuJamJari', s: 1.1, fly: 1.8, spd: 2.2, shy: 0.9 },
  { id: 'hoRangNabi', s: 1.3, fly: 2.2, spd: 1.6, shy: 0.7 },
  { id: 'kkulBeol', s: 0.8, fly: 1.6, spd: 1.8, shy: 0.5 },
  { id: 'norangNabi', s: 1.1, fly: 2.0, spd: 1.5, shy: 0.7 },
  { id: 'dalPaengI', s: 0.9, fly: 0, spd: 0.4, shy: 0.1 },
  { id: 'jangSuPungDeng', s: 1.4, fly: 0, spd: 1.2, shy: 0.9 },
  { id: 'wangSamaGwi', s: 1.6, fly: 0, spd: 1.1, shy: 0.6 },
  { id: 'chamMaeMi', s: 1.0, fly: 0.4, spd: 1.0, shy: 0.8 },
]
const MAX_BUGS = 7

export default function BugHunt({ onHome }) {
  const mountRef = useRef(null)
  const api = useRef({})
  const [caught, setCaught] = useState(bugpediaProgress(BUG_COUNT).caught)
  const [toast, setToast] = useState(null)
  const [locked, setLocked] = useState(false)
  const [swing, setSwing] = useState(0)

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
    scene.background = new THREE.Color('#BFE9FF')
    scene.fog = new THREE.Fog('#BFE9FF', 14, 40)
    const camera = new THREE.PerspectiveCamera(66, w / h, 0.05, 100)
    camera.rotation.order = 'YXZ'
    scene.add(new THREE.HemisphereLight('#ffffff', '#5a7a40', 1.05))
    const sun = new THREE.DirectionalLight('#fff6d8', 1.15); sun.position.set(6, 12, 5); scene.add(sun)

    // 땅 — 잔디 타일
    const tile = new THREE.BoxGeometry(1, 0.5, 1)
    const gmat = [new THREE.MeshLambertMaterial({ color: 0x6AB150 }), new THREE.MeshLambertMaterial({ color: 0x60A448 })]
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
      g.userData = { sway: 0.05, phase: Math.random() * 6 }; scene.add(g); swayers.push(g)
    }
    const flower = (x, z, hh, petal) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [tube(0, 0, 0, 0.1, hh, 0, 0.13, 0.09)], () => col('#4E8A3A'))
      addV(g, [ellipsoid(0.1, hh + 0.1, 0, 0.3, 0.22, 0.3)], () => col('#F2C14E'))
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; addV(g, [ellipsoid(0.1 + Math.cos(a) * 0.5, hh + 0.1, Math.sin(a) * 0.5, 0.26, 0.1, 0.26)], () => col(petal)) }
      g.userData = { sway: 0.03, phase: Math.random() * 6 }; scene.add(g); swayers.push(g)
    }
    const mushroom = (x, z, hh) => {
      const g = new THREE.Group(); g.position.set(x, 0, z)
      addV(g, [tube(0, 0, 0, 0, hh, 0, 0.22, 0.16)], () => col('#EFE6D0'))
      addV(g, [ellipsoid(0, hh + 0.1, 0, 0.55, 0.32, 0.55)], (px, py, pz) => hash3(Math.floor(px * 4 + 9), 0, Math.floor(pz * 4 + 9)) > 0.8 ? col('#F5F0E0') : col('#C8402E'))
      scene.add(g)
    }
    for (let i = 0; i < 40; i++) {
      const a = hash3(i, 7, 3) * Math.PI * 2, r = 2 + hash3(i, 3, 9) * (R - 1)
      grass(Math.cos(a) * r, Math.sin(a) * r, 3 + hash3(i, 4, 2) * 2.4, (hash3(i, 5, 1) - 0.5) * 1.2, (hash3(i, 6, 8) - 0.5) * 1.2, ['#5FA34A', '#66AE4E', '#579B42'][i % 3])
    }
    for (const [x, z, hh, p] of [[-4, -3, 3.4, '#F5F0F0'], [5, 2, 3.0, '#F49BC1'], [3, -6, 3.8, '#C9A8F0'], [-6, 5, 3.2, '#F2C14E']]) flower(x, z, hh, p)
    mushroom(-7, 3, 1.5); mushroom(6, -6, 1.2)

    // 곤충 스폰
    const bugs = []
    const rand = (a, b) => a + Math.random() * (b - a)
    const spawn = (edge = false) => {
      const t = POOL[Math.floor(Math.random() * POOL.length)]
      const m = BUGS[t.id] ? BUGS[t.id].make() : makeBug({ gen: 'beetle', base: '#888', dark: '#333' })
      m.scale.setScalar(t.s)
      const a = Math.random() * Math.PI * 2, r = edge ? R - 0.5 : rand(2, R - 1)
      m.position.set(Math.cos(a) * r, t.fly, Math.sin(a) * r)
      m.userData.t = { ...t, wanderCd: 0, dir: new THREE.Vector3(), baseY: t.fly, tt: Math.random() * 6, caught: false }
      scene.add(m); bugs.push(m)
    }
    for (let i = 0; i < MAX_BUGS; i++) spawn()

    // 플레이어 상태
    const player = { pos: new THREE.Vector3(0, 0, 0), yaw: 0, pitch: 0 }
    const eye = 1.35
    const keys = { f: false, b: false, l: false, r: false }
    const move = { touchFwd: false }

    // 파티클 (포획 poof)
    const poofs = []
    const poof = (pos) => {
      for (let i = 0; i < 8; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff }))
        s.position.copy(pos)
        const a = Math.random() * Math.PI * 2, up = rand(1, 3)
        s.userData.v = new THREE.Vector3(Math.cos(a) * rand(1, 2.5), up, Math.sin(a) * rand(1, 2.5))
        s.userData.life = 0.6; scene.add(s); poofs.push(s)
      }
    }

    // 채집 시도 — 시야 앞 가까운 곤충 포획
    const tryCatch = () => {
      setSwing((s) => s + 1)
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir)
      const camPos = camera.position
      let best = null, bestD = 3.4
      for (const b of bugs) {
        if (b.userData.t.caught) continue
        const to = b.position.clone().sub(camPos)
        const d = to.length()
        if (d > bestD) continue
        if (to.normalize().dot(dir) < 0.5) continue
        best = b; bestD = d
      }
      if (best) {
        best.userData.t.caught = true
        poof(best.position.clone().add(new THREE.Vector3(0, 0.4, 0)))
        const id = best.userData.t.id
        const rec = recordCatch(id)
        const name = BUGS[id]?.name || '곤충'
        setToast({ txt: rec.isNew ? `🎉 ${name} 처음 채집! 도감 해금!` : `🥅 ${name} 채집!`, key: Date.now() })
        setCaught(bugpediaProgress(BUG_COUNT).caught)
        scene.remove(best); bugs.splice(bugs.indexOf(best), 1)
        setTimeout(spawn, 1200)
      }
    }
    api.current.tryCatch = tryCatch
    api.current.setTouchFwd = (v) => { move.touchFwd = v }
    if (import.meta.env.DEV) window.__hunt = { catch: tryCatch, look: (d) => { player.yaw += d }, bugs } // 테스트/디버깅용

    // 입력 — 시점잠금(데스크톱)
    const isLocked = () => document.pointerLockElement === canvas
    const onDown = (e) => {
      if (!isLocked() && e.pointerType !== 'touch') { canvas.requestPointerLock?.(); return }
      if (isLocked()) tryCatch()
    }
    const onMove = (e) => { if (!isLocked()) return; player.yaw -= e.movementX * 0.0022; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - e.movementY * 0.0022)) }
    const onLock = () => setLocked(isLocked())
    const onKey = (e, v) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = v; break
        case 'KeyS': case 'ArrowDown': keys.b = v; break
        case 'KeyA': case 'ArrowLeft': keys.l = v; break
        case 'KeyD': case 'ArrowRight': keys.r = v; break
      }
    }
    const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false)
    // 터치 드래그 시점
    let tId = null, tLast = null
    const ts = (e) => { const t = e.changedTouches[0]; tId = t.identifier; tLast = { x: t.clientX, y: t.clientY } }
    const tm = (e) => { for (const t of e.changedTouches) { if (t.identifier !== tId) continue; player.yaw -= (t.clientX - tLast.x) * 0.005; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - (t.clientY - tLast.y) * 0.005)); tLast = { x: t.clientX, y: t.clientY }; e.preventDefault() } }
    const te = (e) => { for (const t of e.changedTouches) if (t.identifier === tId) { tId = null; tLast = null } }
    canvas.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('pointerlockchange', onLock)
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku)
    canvas.addEventListener('touchstart', ts, { passive: false })
    canvas.addEventListener('touchmove', tm, { passive: false })
    canvas.addEventListener('touchend', te)

    // 루프
    let raf, last = performance.now()
    const fwd = new THREE.Vector3(), right = new THREE.Vector3()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      // 이동
      const sp = 4.2 * dt
      fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
      right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw))
      const mv = new THREE.Vector3()
      if (keys.f || move.touchFwd) mv.add(fwd)
      if (keys.b) mv.sub(fwd)
      if (keys.l) mv.sub(right)
      if (keys.r) mv.add(right)
      if (mv.lengthSq() > 0) { mv.normalize(); player.pos.addScaledVector(mv, sp) }
      const d = Math.hypot(player.pos.x, player.pos.z)
      if (d > R) { player.pos.multiplyScalar(R / d) }
      camera.position.set(player.pos.x, eye, player.pos.z)
      camera.rotation.y = player.yaw; camera.rotation.x = player.pitch

      // 소품 흔들림
      const T = now / 1000
      for (const s of swayers) s.rotation.z = Math.sin(T * 1.3 + s.userData.phase) * s.userData.sway

      // 곤충 AI
      for (const b of bugs) {
        const u = b.userData.t; u.tt += dt; animateBug(b, u.tt)
        u.wanderCd -= dt
        // 플레이어가 가까우면 도망
        const toP = new THREE.Vector3(player.pos.x - b.position.x, 0, player.pos.z - b.position.z)
        const pd = toP.length()
        if (pd < 3.2 && Math.random() < u.shy * dt * 3) { u.dir.copy(toP).normalize().multiplyScalar(-1); u.wanderCd = 1.2 }
        else if (u.wanderCd <= 0) {
          const a = Math.random() * Math.PI * 2; u.dir.set(Math.cos(a), 0, Math.sin(a)); u.wanderCd = rand(1.5, 3.5)
        }
        b.position.x += u.dir.x * u.spd * dt
        b.position.z += u.dir.z * u.spd * dt
        const bd = Math.hypot(b.position.x, b.position.z)
        if (bd > R - 0.5) { u.dir.multiplyScalar(-1); b.position.x += u.dir.x * u.spd * dt * 2; b.position.z += u.dir.z * u.spd * dt * 2 }
        if (u.dir.lengthSq() > 0) b.rotation.y = Math.atan2(u.dir.x, u.dir.z)
        if (u.baseY > 0) b.position.y = u.baseY + Math.sin(u.tt * 2.2) * 0.28
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
      canvas.removeEventListener('mousedown', onDown); document.removeEventListener('mousemove', onMove)
      document.removeEventListener('pointerlockchange', onLock)
      document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku)
      canvas.removeEventListener('touchstart', ts); canvas.removeEventListener('touchmove', tm); canvas.removeEventListener('touchend', te)
      if (isLocked()) document.exitPointerLock?.()
      renderer.dispose(); if (canvas.parentNode === mount) mount.removeChild(canvas)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#BFE9FF] select-none">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* 조준점 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-2 w-2 rounded-full border border-black/40 bg-white/70" />
      </div>

      {/* 잠자리채 (전경, 휘두르기) */}
      <div key={swing} className="pointer-events-none absolute bottom-0 right-4 text-7xl md:text-8xl" style={{ transform: 'rotate(-18deg)', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))', animation: swing ? 'netSwing 0.32s ease-out' : undefined }}>🥅</div>

      {/* HUD */}
      <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-4 py-2 font-pixel text-sm text-white backdrop-blur">
        🐛 도감 {caught} / {BUG_COUNT}
      </div>
      <button onClick={onHome} className="absolute right-4 top-4 z-10 rounded-lg bg-black/40 px-4 py-1.5 font-pixel text-sm text-white backdrop-blur hover:bg-black/60">🏡 집으로</button>

      {/* 시작 안내 (시점잠금 전) */}
      {!locked && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-1 text-center">
          <p className="rounded-xl bg-black/55 px-5 py-2 font-pixel text-sm text-white backdrop-blur">화면을 클릭해 시작 · WASD 이동 · 클릭 채집</p>
          <p className="font-sans text-xs text-white/80 drop-shadow">📱 드래그로 둘러보고 아래 버튼으로 이동·채집</p>
        </div>
      )}

      {/* 채집 토스트 */}
      {toast && (
        <div key={toast.key} className="tip-fade absolute left-1/2 top-[22%] -translate-x-1/2 rounded-xl bg-[#2e5a1e]/90 px-5 py-2.5 font-pixel text-sm text-white shadow-lg">
          {toast.txt}
        </div>
      )}

      {/* 모바일 컨트롤 */}
      <div className="absolute bottom-6 left-6 md:hidden">
        <button
          onTouchStart={() => api.current.setTouchFwd?.(true)}
          onTouchEnd={() => api.current.setTouchFwd?.(false)}
          className="h-20 w-20 rounded-full bg-white/30 font-pixel text-sm text-white backdrop-blur active:bg-white/50"
        >▲<br />앞으로</button>
      </div>
      <div className="absolute bottom-6 right-6 md:hidden">
        <button
          onClick={() => api.current.tryCatch?.()}
          className="h-24 w-24 rounded-full bg-[#8FE06B]/80 font-pixel text-base text-[#1e3a14] shadow-lg active:scale-95"
        >🥅<br />채집</button>
      </div>
    </div>
  )
}
