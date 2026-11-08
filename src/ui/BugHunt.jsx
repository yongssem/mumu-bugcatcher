// 🧰 곤충월드 채집 (B3) — 모종삽 채굴 파밍 → 조합대(폭탄·마취·함정) → 대형 곤충 헌터식 포획.
// B2의 1인칭 채집 씬을 확장: 도구 전환 · 채굴 노드 · 포획 블럭 제작/사용 · 대형 곤충 무력화.
//   🪏 모종삽: 블럭 채굴(파밍) · 🥅 잠자리채: 얌전/무력화된 곤충 포획
//   💣 폭탄: 범위 기절 · 💉 마취 다트: 재움 · 🕳️ 함정: 밟으면 가둠
//   대형 곤충(👑 미니보스)은 폭탄·마취·함정으로 재우거나 가둔 뒤에만 잠자리채로 포획.
import { useEffect, useRef, useState } from 'react'
import { BugHuntEngine } from '../game/BugHuntEngine.js'
import { BUG_COUNT } from '../game/bugData.js'
import { bugpediaProgress } from '../save/bugpedia.js'
import { MATERIALS, RECIPES } from '../game/bugcraft.js'
import { loadInventory, craftItem } from '../save/inventory.js'
import { HABITATS, DEFAULT_HABITAT } from '../game/habitats.js'
import Joystick from './mobile/Joystick.jsx'
import { useIsTouch } from './mobile/useDevice.js'

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
  const invRef = useRef(null)
  if (!invRef.current) invRef.current = loadInventory()
  const [caught, setCaught] = useState(() => bugpediaProgress(BUG_COUNT).caught)
  const [mats, setMats] = useState({ ...invRef.current.mats })
  const [items, setItems] = useState({ ...invRef.current.items })
  const [tool, setTool] = useState('trowel')
  const [toast, setToast] = useState(null)
  const [paused, setPaused] = useState(true)
  const [target, setTarget] = useState(null)
  const isTouch = useIsTouch()
  const [showCraft, setShowCraft] = useState(false)
  const pause = () => { api.current.pause?.(); setPaused(true) }
  const openCraft = () => { pause(); setShowCraft(true) }
  const resume = () => { setShowCraft(false); setPaused(false); api.current.start?.(isTouch) }
  const goHome = () => { pause(); onHome() }
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!showCraft) return
    const close = e => { if (e.code === 'Escape') setShowCraft(false) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [showCraft])

  // 조합: 소재 차감 + 포획 블럭 +1 (React 쪽에서 처리 — 패널이 React라서)
  const doCraft = (recipe) => {
    if (craftItem(invRef.current, recipe)) {
      setMats({ ...invRef.current.mats }); setItems({ ...invRef.current.items })
      setToast({ txt: `${recipe.icon} ${recipe.name} 제작!`, key: Date.now() })
      if (recipe.id === 'net') api.current.selectTool?.('net')
    } else {
      setToast({ txt: '소재가 부족해요', key: Date.now() })
    }
  }

  useEffect(() => {
    const engine = new BugHuntEngine(mountRef.current, {
      habitat, inventory: invRef.current,
      onInventory: inv => { setMats({ ...inv.mats }); setItems({ ...inv.items }) },
      onToast: txt => setToast({ txt, key: performance.now() + Math.random() }),
      onCaught: setCaught, onTool: setTool, onTarget: setTarget,
      onPause: () => { engine.pause(); setPaused(true) },
      onCraft: () => { engine.pause(); setPaused(true); setShowCraft(v => !v) },
    })
    api.current = engine
    return () => { engine.dispose(); api.current = {} }
  }, [habitat])

  const activeTool = TOOLS.find((t) => t.id === tool)

  return (
    <div className="relative h-full w-full overflow-hidden select-none" style={{ background: H.sky }}>
      <div ref={mountRef} className="absolute inset-0 h-full w-full" style={{ touchAction: 'none' }} />

      {/* 조준점 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-2 w-2 rounded-full border border-black/40 bg-white/70" />
      </div>

      {/* (1인칭 손+도구는 3D 뷰모델로 표현됨) */}

      {/* 상단 HUD — 도감 진행 · 소재 */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        <div className="rounded-xl bg-black/40 px-4 py-2 font-pixel text-sm text-white backdrop-blur">{H.icon} {H.label} · 🐛 {caught}/{BUG_COUNT}</div>
        <div className="flex flex-wrap gap-1.5 max-w-[48vw]">
          {Object.keys(MATERIALS).map((k) => (
            <span key={k} className="rounded-lg bg-black/35 px-2 py-1 font-sans text-xs text-white backdrop-blur" title={MATERIALS[k].name}>
              {MATERIALS[k].icon} {mats[k] || 0}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button onClick={pause} aria-label="일시정지" className="rounded-lg bg-black/40 px-3 py-1.5 font-pixel text-sm text-white">Ⅱ</button>
        <button onClick={openCraft} className="rounded-lg bg-[#8FE06B]/90 px-3 py-1.5 font-pixel text-sm text-[#1e3a14] shadow hover:bg-[#8FE06B]">🧱 조합</button>
        <button onClick={goHome} className="rounded-lg bg-black/40 px-3 py-1.5 font-pixel text-sm text-white backdrop-blur hover:bg-black/60">🏡 집으로</button>
      </div>

      {/* 도구 벨트 */}
      <div className="absolute left-1/2 bottom-4 z-10 flex -translate-x-1/2 gap-1.5 rounded-2xl bg-black/35 p-1.5 backdrop-blur">
        {TOOLS.map((t, i) => {
          const cnt = t.kind === 'item' ? (items[t.id] || 0) : null
          const netLocked = t.id === 'net' && !(items.net > 0)
          const on = tool === t.id
          return (
            <button key={t.id} onClick={() => api.current.selectTool?.(t.id)} aria-label={`${i + 1} ${t.name}`} aria-pressed={on} title={t.name}
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
      {paused && !showCraft && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="채집 준비">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/30 bg-[#172e20]/95 p-5 text-center text-white shadow-2xl">
            <h2 className="font-pixel text-xl">{H.icon} 곤충월드 탐험</h2>
            <p className="mt-3 font-sans text-sm leading-relaxed">{items.net > 0 ? '잠자리채로 작은 곤충을 채집해요. 큰 곤충은 먼저 재워 주세요.' : '🪏 나뭇가지 2개와 잎조각 2개를 모아 🥅 잠자리채부터 만들어요.'}</p>
            <p className="mt-3 whitespace-pre-line rounded-xl bg-black/30 p-3 font-sans text-xs leading-relaxed text-white/80">{isTouch ? '왼쪽 조이스틱으로 이동 · 빈 화면을 드래그해 둘러보기 · 오른쪽 버튼을 눌러 사용·점프' : 'WASD / 방향키 이동 · Shift 달리기 · Space 점프\n마우스 시점 · 좌클릭 사용(꾹 누르기 가능) · 우클릭 설치\n1–5 도구 · C / E 조합 · Esc 일시정지'}</p>
            <button onClick={resume} autoFocus className="mt-4 w-full rounded-xl bg-[#8FE06B] py-3 font-pixel text-base text-[#173b18] shadow-[0_4px_0_#3f7a2e]">탐험 계속하기</button>
            <div className="mt-3 flex justify-center gap-5 font-sans text-sm"><button onClick={openCraft}>🧱 조합대</button><button onClick={goHome}>🏡 집으로</button></div>
          </div>
        </div>
      )}
      {!paused && target && <div className="pointer-events-none absolute left-1/2 top-[55%] -translate-x-1/2 rounded-xl bg-black/65 px-4 py-2 text-center font-sans text-sm text-white">{target}</div>}

      {/* 토스트 */}
      {toast && (
        <div role="status" key={toast.key} className="pointer-events-none tip-fade absolute left-1/2 top-[20%] z-40 w-max max-w-[90vw] -translate-x-1/2 rounded-xl bg-[#2e5a1e]/90 px-5 py-2.5 text-center font-pixel text-sm text-white shadow-lg">
          {toast.txt}
        </div>
      )}

      {/* 모바일 컨트롤 */}
      {isTouch && !paused && !showCraft && <>
        <Joystick onMove={(x, y) => api.current.setMove?.(x, y)} />
        <div className="absolute right-4 bottom-24 flex items-end gap-2">
          <HoldButton label="블럭 설치" onStart={() => api.current.place?.()}>🧱<br />설치</HoldButton>
          <HoldButton label="도구 사용" onStart={() => api.current.holdUse?.(true)} onEnd={() => api.current.holdUse?.(false)}>{activeTool?.icon}<br />사용</HoldButton>
          <HoldButton label="점프" onStart={() => api.current.jump?.()}>⤒<br />점프</HoldButton>
        </div>
      </>}

      {/* 🧱 조합 패널 */}
      {showCraft && (
        <div role="dialog" aria-modal="true" aria-label="조합대" className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-3" onClick={() => setShowCraft(false)}>
          <div style={{ width: 'min(620px, 96vw)' }} className="hunt-craft max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-2xl border-2 border-white/70 bg-[#20351a]/95 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-xl text-white">🧱 조합대 — 포획 블럭</h2>
              <button autoFocus onClick={() => setShowCraft(false)} className="rounded-lg bg-white/20 px-3 py-1 font-pixel text-sm text-white hover:bg-white/30">닫기 ✕</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.keys(MATERIALS).map((k) => (
                <span key={k} className="rounded-lg bg-black/30 px-2 py-1 font-sans text-xs text-white">{MATERIALS[k].icon} {MATERIALS[k].name} {mats[k] || 0}</span>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              {RECIPES.map((r) => {
                const enough = Object.entries(r.cost).every(([m, n]) => (mats[m] || 0) >= n)
                const owned = r.mode === 'tool' && items[r.id] > 0
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/25 p-3">
                    <span className="text-4xl">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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
                    <button aria-label={`${r.name} ${owned ? '보유 중' : '만들기'}`} onClick={() => doCraft(r)} disabled={!enough || owned}
                      className={`shrink-0 rounded-xl px-4 py-2 font-pixel text-sm ${enough ? 'bg-[#8FE06B] text-[#1e3a14] shadow-[0_4px_0_#3f7a2e] active:translate-y-0.5 active:shadow-none' : 'cursor-not-allowed bg-white/15 text-white/50'}`}>
                      {owned ? '보유 중' : '만들기'}
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

function HoldButton({ label, onStart, onEnd, children }) {
  const pointer = useRef(null)
  const endRef = useRef(onEnd); endRef.current = onEnd
  useEffect(() => () => endRef.current?.(), [])
  const release = e => { if (pointer.current !== e.pointerId) return; pointer.current = null; onEnd?.() }
  return <button aria-label={label} style={{ touchAction: 'none', width: 'clamp(52px, 14vmin, 82px)', height: 'clamp(56px, 16vmin, 90px)' }}
    onPointerDown={e => { if (pointer.current !== null) return; e.preventDefault(); pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); onStart?.() }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    className="rounded-full border-2 border-white/40 bg-[#20351a]/75 font-pixel text-sm text-white shadow-lg active:bg-[#3f7a2e]">{children}</button>
}
