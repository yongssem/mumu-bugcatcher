// 🔬 곤충월드 미리보기 — 몸이 작아져 곤충 사이로 들어간 시점.
// 거대한 풀잎·꽃·조약돌 사이로 개미(눈높이)·사마귀(거대)·나비(머리 위)가 살아 움직인다.
// (실제 1인칭 채집 루프의 룩앤필 프로토타입 — React와 분리된 미니 Three.js 씬)
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ellipsoid, tube, boxShape, voxMesh, hash3 } from '../game/Vox.js'
import { makeBug, animateBug } from '../game/BugGen.js'
import { BUGS } from '../game/bugData.js'

const PVOX = 0.22 // 배경 소품용 복셀(굵게 — 성능)
const col = (h) => new THREE.Color(h)
const addV = (parent, shapes, cf, vox = PVOX) => { const m = voxMesh(shapes, cf, vox); if (m) parent.add(m) }

// 🌱 거대 풀잎 — 위로 갈수록 가늘어지는 휘어진 잎
function grassBlade(x, z, h, bendX, bendZ, shade) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  const c1 = col(shade), c2 = col('#4E8A3A')
  addV(g, [tube(0, 0, 0, bendX, h, bendZ, 0.16, 0.02)], (px, py) => (py > h * 0.6 ? c2 : c1))
  g.userData.sway = 0.04 + Math.random() * 0.05
  g.userData.phase = Math.random() * 6
  return g
}

// 🌼 큰 꽃 — 초록 줄기 + 노란 꽃심 + 흰/분홍 꽃잎
function flower(x, z, h, petal) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  addV(g, [tube(0, 0, 0, 0.1, h, 0, 0.13, 0.09)], () => col('#4E8A3A')) // 줄기
  const cx = 0.1, cy = h + 0.1
  addV(g, [ellipsoid(cx, cy, 0, 0.3, 0.22, 0.3)], () => col('#F2C14E')) // 꽃심
  const pc = col(petal)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    addV(g, [ellipsoid(cx + Math.cos(a) * 0.5, cy, Math.sin(a) * 0.5, 0.26, 0.1, 0.26)], () => pc) // 꽃잎
  }
  g.userData.sway = 0.03
  g.userData.phase = Math.random() * 6
  return g
}

// 🍄 버섯 — 줄기 + 붉은 점박이 갓
function mushroom(x, z, h) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  addV(g, [tube(0, 0, 0, 0, h, 0, 0.22, 0.16)], () => col('#EFE6D0'))
  addV(g, [ellipsoid(0, h + 0.1, 0, 0.55, 0.32, 0.55)], (px, py, pz) =>
    hash3(Math.floor(px * 4 + 9), 0, Math.floor(pz * 4 + 9)) > 0.8 ? col('#F5F0E0') : col('#C8402E'))
  return g
}

// 🪨 조약돌 (미니월드에선 바위처럼 큼)
function pebble(x, z, s) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  addV(g, [ellipsoid(0, s * 0.5, 0, s, s * 0.7, s * 0.9)], (px, py) =>
    py > s * 0.6 ? col('#9AA0A8') : col('#767C86'))
  return g
}

export default function MicroScene({ onBack }) {
  const mountRef = useRef(null)
  const ctx = useRef({})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth, h = mount.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#BFE9FF')
    scene.fog = new THREE.Fog('#BFE9FF', 16, 42)
    const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 100)
    scene.add(new THREE.HemisphereLight('#ffffff', '#5a7a40', 1.05))
    const sun = new THREE.DirectionalLight('#fff6d8', 1.15)
    sun.position.set(6, 12, 5)
    scene.add(sun)

    // 🟩 땅 — 잔디 타일 (약간 울퉁불퉁한 복셀 느낌)
    const ground = new THREE.Group()
    const tile = new THREE.BoxGeometry(1, 0.5, 1)
    const gmat = [new THREE.MeshLambertMaterial({ color: 0x6AB150 }), new THREE.MeshLambertMaterial({ color: 0x62A64A })]
    const gi = [new THREE.InstancedMesh(tile, gmat[0], 22 * 22), new THREE.InstancedMesh(tile, gmat[1], 22 * 22)]
    const dummy = new THREE.Object3D()
    const cnt = [0, 0]
    for (let x = -11; x < 11; x++) for (let z = -11; z < 11; z++) {
      const alt = (x + z) & 1
      dummy.position.set(x + 0.5, -0.25 + (hash3(x + 40, 0, z + 40) > 0.85 ? 0.12 : 0), z + 0.5)
      dummy.updateMatrix()
      gi[alt].setMatrixAt(cnt[alt]++, dummy.matrix)
    }
    gi.forEach((m, i) => { m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; ground.add(m) })
    scene.add(ground)

    // 🌿 소품 배치 (거대 풀·꽃·버섯·조약돌)
    const props = new THREE.Group()
    const swayers = []
    const shades = ['#5FA34A', '#66AE4E', '#579B42']
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + hash3(i, 1, 2)
      const r = 3 + hash3(i, 2, 3) * 7
      const bl = grassBlade(Math.cos(a) * r, Math.sin(a) * r, 3.2 + hash3(i, 3, 4) * 2.6,
        (hash3(i, 4, 5) - 0.5) * 1.2, (hash3(i, 5, 6) - 0.5) * 1.2, shades[i % 3])
      props.add(bl); swayers.push(bl)
    }
    for (const [x, z, hh, p] of [[-4, -3, 3.6, '#F5F0F0'], [5, 2, 3.0, '#F49BC1'], [2, -6, 4.0, '#C9A8F0']]) {
      const fl = flower(x, z, hh, p); props.add(fl); swayers.push(fl)
    }
    props.add(mushroom(-6, 4, 1.6), mushroom(-5.4, 5, 1.1))
    props.add(pebble(6, -5, 1.4), pebble(-2, 7, 1.1))
    scene.add(props)

    // 🐛 곤충들 — 작아진 나에게 곤충은 이렇게 커 보인다
    const bugs = []
    const place = (id, x, z, scale, y = 0, flyPhase = null) => {
      const m = BUGS[id] ? BUGS[id].make() : makeBug({ gen: 'beetle', base: '#888', dark: '#333' })
      m.scale.setScalar(scale)
      m.position.set(x, y, z)
      m.rotation.y = Math.random() * Math.PI * 2
      m.userData.flyPhase = flyPhase
      m.userData.baseY = y
      scene.add(m); bugs.push(m)
      return m
    }
    place('ilbonWangGaeMi', 1.4, 2.2, 1.0)           // 개미 — 눈높이 1:1
    place('wangSamaGwi', -3.2, -1.5, 1.6)            // 사마귀 — 거대 미니보스
    place('muDangBeolle', 3.6, 1.2, 0.9)             // 무당벌레
    place('hoRangNabi', -1.5, 0.5, 1.3, 3.2, 0)      // 나비 — 머리 위로 펄럭
    place('kkulBeol', 2.4, -2.5, 0.8, 2.4, 1.6)      // 벌 — 정지비행

    Object.assign(ctx.current, { renderer, scene, camera, swayers, bugs, t: 0, mount })
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const c = ctx.current; c.t += dt
      // 카메라 — 저공에서 천천히 곤충월드를 한 바퀴 (작아진 시점)
      const a = c.t * 0.28
      c.camera.position.set(Math.cos(a) * 8.5, 2.4 + Math.sin(c.t * 0.5) * 0.3, Math.sin(a) * 8.5)
      c.camera.lookAt(0, 1.6, 0)
      for (const s of swayers) s.rotation.z = Math.sin(c.t * 1.3 + s.userData.phase) * s.userData.sway
      for (const b of bugs) {
        animateBug(b, c.t)
        if (b.userData.flyPhase != null) b.position.y = b.userData.baseY + Math.sin(c.t * 2 + b.userData.flyPhase) * 0.3
      }
      renderer.render(c.scene, c.camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => {
      const ww = mount.clientWidth, hh = mount.clientHeight
      renderer.setSize(ww, hh); camera.aspect = ww / hh; camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize)
      renderer.dispose(); if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#BFE9FF]">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* 상단 안내 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-5 text-center">
        <p className="font-pixel text-lg text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] md:text-2xl">
          🔬 몸이 작아졌어요!
        </p>
        <p className="mt-1 font-sans text-xs text-white/90 drop-shadow md:text-sm">
          곤충월드에 들어왔어요 · 곤충이 이렇게 커 보여요 (미리보기)
        </p>
      </div>

      {/* 1인칭 잠자리채 느낌 (전경) */}
      <div className="pointer-events-none absolute bottom-2 right-6 text-6xl md:text-8xl" style={{ transform: 'rotate(-18deg)', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))' }}>
        🥅
      </div>

      <button
        onClick={onBack}
        className="absolute left-4 top-4 z-10 rounded-lg bg-black/40 px-4 py-1.5 font-pixel text-sm text-white backdrop-blur hover:bg-black/60"
      >
        ← 뒤로
      </button>

      <div className="absolute bottom-4 left-4 z-10 max-w-xs rounded-xl bg-black/40 px-4 py-3 backdrop-blur">
        <p className="font-pixel text-sm text-[#8FE06B]">🥅 곧 만나요</p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-white/85">
          여기서 직접 걸어다니며 곤충을 쫓고, 잠자리채로 포획해 도감을 채우는 채집 루프를 붙일 거예요.
        </p>
      </div>
    </div>
  )
}
