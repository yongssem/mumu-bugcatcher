// 공룡 도감 — 게임의 심장 (CLAUDE.md §6)
// 격자 카드 갤러리(해금=컬러 / 미해금=실루엣) + 상세(복셀 3D 회전 뷰 + 진짜 공룡 정보)
// 부위 관찰(격퇴)로 단계 공개: 실루엣 → 외형 → 식성·시대 → 특징 완성(★)
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DINOS, PART_ORDER, PART_INFO } from '../game/dinoData.js'
import { loadDinopedia, partCount } from '../save/dinopedia.js'
import Footer from './Footer.jsx'

// 복셀 공룡을 천천히 돌리는 미니 3D 뷰어 (해금 전엔 검은 실루엣)
function DinoViewer({ dino, silhouette }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth
    const h = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight('#ffffff', '#6b5030', 1.0))
    const sun = new THREE.DirectionalLight('#fff6e0', 1.1)
    sun.position.set(6, 10, 6)
    scene.add(sun)

    const mesh = dino.make()
    if (silhouette) {
      // 미해금 — 검은 실루엣으로 덮어 "???" 느낌
      mesh.traverse((o) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          o.material = mats.map(() => new THREE.MeshLambertMaterial({ color: '#20252b' }))
        }
      })
    }
    // 원점(발밑)·중앙 정렬 후 화면에 맞게 스케일
    const bbox = new THREE.Box3().setFromObject(mesh)
    const size = bbox.getSize(new THREE.Vector3())
    const center = bbox.getCenter(new THREE.Vector3())
    const pivot = new THREE.Group()
    mesh.position.sub(center)
    pivot.add(mesh)
    scene.add(pivot)

    const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    const dist = Math.max(size.x, size.y, size.z) * 1.5
    cam.position.set(dist * 0.8, dist * 0.35, dist)
    cam.lookAt(0, 0, 0)

    let raf
    let angle = 0.6
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      angle += dt * 0.6
      pivot.rotation.y = angle
      renderer.render(scene, cam)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [dino, silhouette])

  return <div ref={mountRef} className="h-full w-full" />
}

// 상세 카드 — 관찰 단계에 따라 정보가 하나씩 열림
function Detail({ dino, count, onBack }) {
  const revealed = count >= 1
  const complete = count >= PART_ORDER.length
  return (
    <div className="flex w-full max-w-md flex-col items-center px-6">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-mumu-sky/40 to-mumu-grass/30">
        <DinoViewer dino={dino} silhouette={!revealed} />
        {complete && (
          <span className="absolute right-3 top-3 rounded-full bg-mumu-gold px-2.5 py-1 font-pixel text-xs font-bold text-[#5a4200]">
            ★ 완성
          </span>
        )}
        {/* 관찰 진행 점 */}
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {PART_ORDER.map((p, i) => (
            <span
              key={p}
              className={`h-2.5 w-2.5 rounded-full ${i < count ? 'bg-mumu-gold' : 'bg-white/25'}`}
              title={PART_INFO[p].label}
            />
          ))}
        </div>
      </div>

      <h2 className="mt-4 font-pixel text-2xl font-bold text-white">
        {revealed ? dino.name : '??? 알 수 없는 공룡'}
      </h2>
      {revealed && (
        <p className="font-sans text-sm italic text-white/60">
          {dino.latin} · &ldquo;{dino.meaning}&rdquo;
        </p>
      )}

      {!revealed && (
        <p className="mt-4 text-center font-sans text-sm text-white/70">
          아직 만난 적 없는 공룡이에요.
          <br />
          파밍 월드에서 격퇴하고 관찰하면 도감이 채워져요!
        </p>
      )}

      {count >= 2 && (
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          <Info label="식성" value={dino.diet} />
          <Info label="시대" value={dino.era} />
          <Info label="크기" value={dino.size} />
        </div>
      )}

      {revealed && count < 2 && (
        <p className="mt-4 font-sans text-xs text-white/50">🦴 꼬리를 더 관찰하면 식성·시대가 열려요</p>
      )}

      {complete ? (
        <div className="mt-4 w-full rounded-xl bg-white/10 p-4">
          <h3 className="mb-2 font-pixel text-sm font-bold text-mumu-gold">🔎 알고 있나요?</h3>
          <ul className="space-y-1.5">
            {dino.facts.map((f) => (
              <li key={f} className="font-sans text-sm leading-relaxed text-white/85">
                • {f}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        count >= 2 && (
          <p className="mt-4 font-sans text-xs text-white/50">🪝 다리를 관찰하면 재미있는 특징이 열려요</p>
        )
      )}

      <button
        onClick={onBack}
        className="mt-6 rounded-xl bg-white/15 px-8 py-2.5 font-pixel text-base font-bold text-white transition-transform hover:scale-105 active:scale-95"
      >
        ← 도감으로
      </button>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
      <div className="font-pixel text-[10px] text-white/50">{label}</div>
      <div className="mt-0.5 font-sans text-xs font-bold text-white">{value}</div>
    </div>
  )
}

export default function Dinopedia({ onClose }) {
  const [progress] = useState(() => loadDinopedia()) // 열 때 스냅샷 (엔진이 저장해둔 진행도)
  const [selected, setSelected] = useState(null)

  const list = Object.values(DINOS).filter((d) => !d.hidden) // 서브 몹(콤프소) 제외
  const completedCount = list.filter((d) => partCount(progress[d.id], PART_ORDER) >= PART_ORDER.length).length

  if (selected) {
    const dino = DINOS[selected]
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-black/70 py-6 backdrop-blur-sm">
        <Detail dino={dino} count={partCount(progress[selected], PART_ORDER)} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center overflow-y-auto bg-black/70 py-8 backdrop-blur-sm">
      <h2 className="font-pixel text-3xl font-bold text-white">📖 공룡 도감</h2>
      <p className="mt-2 font-sans text-sm text-white/60">
        완성한 공룡 <b className="font-pixel text-mumu-gold">{completedCount}</b> / {list.length}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 px-6 sm:grid-cols-3">
        {list.map((d) => {
          const count = partCount(progress[d.id], PART_ORDER)
          const seen = count >= 1
          const complete = count >= PART_ORDER.length
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`flex h-36 w-32 flex-col items-center justify-center rounded-2xl border-2 p-2 transition-all hover:scale-105 active:scale-95 ${
                complete
                  ? 'border-mumu-gold bg-mumu-dino/40'
                  : seen
                    ? 'border-white/30 bg-mumu-dino/20'
                    : 'border-white/10 bg-white/5'
              }`}
            >
              <span className={`text-4xl ${seen ? '' : 'opacity-25 grayscale'}`}>🦖</span>
              <span className="mt-2 font-pixel text-sm font-bold text-white">
                {seen ? d.name.length > 7 ? d.name.slice(0, 6) + '…' : d.name : '???'}
              </span>
              {/* 관찰 진행 점 */}
              <div className="mt-1.5 flex gap-1">
                {PART_ORDER.map((p, i) => (
                  <span key={p} className={`h-2 w-2 rounded-full ${i < count ? 'bg-mumu-gold' : 'bg-white/20'}`} />
                ))}
              </div>
              {complete && <span className="mt-1 font-pixel text-[10px] text-mumu-gold">★ 완성</span>}
            </button>
          )
        })}
      </div>

      <p className="mt-6 max-w-sm px-6 text-center font-sans text-xs text-white/50">
        공룡을 격퇴할 때마다 부위를 하나씩 관찰해서 도감이 채워져요.
        <br />
        머리 🦷 → 꼬리 🦴 → 다리 🪝 순서로 열려요!
      </p>

      <button
        onClick={onClose}
        className="mt-6 rounded-xl bg-mumu-grass px-10 py-3 font-pixel text-lg font-bold text-white shadow-[0_4px_0_#4a7d38] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
      >
        게임으로 돌아가기
      </button>

      <Footer />
    </div>
  )
}
