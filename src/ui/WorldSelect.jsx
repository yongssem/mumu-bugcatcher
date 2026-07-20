// 🌍 서식지 선택 — B5. 채집 나가기 전, 어느 곤충월드로 들어갈지 고른다.
// 서식지마다 사는 곤충·무드가 달라 도감을 채우려면 여러 곳을 탐험해야 한다.
import { useMemo } from 'react'
import Footer from './Footer.jsx'
import { HABITATS, HABITAT_ORDER } from '../game/habitats.js'
import { BUGS, RARITY } from '../game/bugData.js'
import { loadBugpedia } from '../save/bugpedia.js'

export default function WorldSelect({ onPick, onBack }) {
  const ped = useMemo(() => loadBugpedia(), [])

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#7EC8F0] via-[#A7DE7B] to-[#6AB150] px-5 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="font-pixel text-2xl text-white" style={{ textShadow: '0 2px 0 #3f7a2e' }}>🌍 어느 곤충월드로 갈까?</h1>
          <button onClick={onBack} className="rounded-lg bg-white/25 px-4 py-1.5 font-pixel text-sm text-white hover:bg-white/40">← 뒤로</button>
        </div>
        <p className="mt-2 font-sans text-sm text-[#22401a]">서식지마다 사는 곤충이 달라요. 여러 곳을 탐험해 도감을 채워요!</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {HABITAT_ORDER.map((key) => {
            const H = HABITATS[key]
            const total = H.pool.length
            const got = H.pool.filter((t) => (ped[t.id]?.n || 0) > 0).length
            const hasRare = H.pool.some((t) => ['rare', 'epic'].includes(BUGS[t.id]?.rarity))
            const night = H.mood === 'night'
            return (
              <button key={key} onClick={() => onPick(key)}
                className="group relative overflow-hidden rounded-2xl border-2 border-white/70 p-5 text-left shadow-[0_6px_0_rgba(0,0,0,0.18)] transition hover:scale-[1.02]"
                style={{ background: `linear-gradient(160deg, ${H.sky}, ${H.ground[0]})` }}>
                <div className="flex items-center gap-2">
                  <span className="text-4xl drop-shadow">{H.icon}</span>
                  <h2 className={`font-pixel text-xl ${night ? 'text-white' : 'text-[#1e3312]'}`}>{H.label}</h2>
                  <span className={`ml-auto rounded-full px-2.5 py-0.5 font-sans text-[11px] font-bold ${night ? 'bg-[#1a2740] text-[#cfe0ff]' : 'bg-white/70 text-[#3a2a08]'}`}>
                    {night ? '🌙 밤' : '☀️ 낮'}
                  </span>
                </div>
                <p className={`mt-2 font-sans text-xs leading-relaxed ${night ? 'text-white/85' : 'text-[#22331a]/90'}`}>{H.blurb}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-lg px-2 py-1 font-pixel text-[11px] ${night ? 'bg-black/35 text-white' : 'bg-white/60 text-[#22331a]'}`}>
                    🐛 도감 {got}/{total}
                  </span>
                  {hasRare && <span className="rounded-lg px-2 py-1 font-pixel text-[11px]" style={{ background: RARITY.epic.color, color: '#2a1a00' }}>✨ 희귀 곤충 서식</span>}
                  <span className={`ml-auto rounded-lg px-3 py-1 font-pixel text-xs ${night ? 'bg-[#8FE06B] text-[#123312]' : 'bg-[#3f7a2e] text-white'}`}>들어가기 →</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-auto"><Footer /></div>
    </div>
  )
}
