// 스테이지 클리어 — 메인 공룡을 격퇴하면 표시. 승리 포즈 + 전리품 강조 + 콘페티
import { DINOS } from '../game/dinoData.js'
import { MATERIALS } from '../game/craft.js'
import Footer from './Footer.jsx'

const CONF_COLORS = ['#FF5A7A', '#FFD24E', '#5AE0FF', '#8FFF5A', '#C77BFF', '#FF9E3D']

// 콘페티 조각들 (한 번 생성)
function Confetti() {
  const bits = Array.from({ length: 40 }, (_, i) => ({
    left: (i * 2.5 + (i % 5) * 3) % 100,
    delay: (i % 10) * 0.18,
    dur: 2.4 + (i % 6) * 0.4,
    color: CONF_COLORS[i % CONF_COLORS.length],
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}
        />
      ))}
    </div>
  )
}

export default function StageClear({ stage, loot = {}, onContinue }) {
  const dino = stage ? DINOS[stage.dinoId] : null
  const lootEntries = Object.entries(loot).filter(([, n]) => n > 0)

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-black/80 backdrop-blur-sm">
      <Confetti />

      <div className="relative flex flex-col items-center">
        <p className="loot-pop font-pixel text-lg text-mumu-gold">🎉 스테이지 클리어!</p>
        {/* 승리 포즈 */}
        <div className="loot-pop my-1 text-6xl md:text-7xl" style={{ animationDelay: '0.1s' }}>🧍‍♂️✨</div>
        <h2 className="loot-pop font-pixel text-4xl font-bold text-white drop-shadow-[0_0_20px_rgba(255,160,60,0.7)] md:text-5xl" style={{ animationDelay: '0.15s' }}>
          {stage?.emoji} {stage?.name}
        </h2>
        {dino && (
          <p className="loot-pop mt-2 font-sans text-base text-white/90" style={{ animationDelay: '0.2s' }}>
            🦖 <b className="text-mumu-gold">{dino.name}</b> 격파 성공!
          </p>
        )}

        {/* 🏆 전리품 강조 */}
        <div className="loot-pop mt-4 w-[min(88vw,22rem)] rounded-2xl border-2 border-mumu-gold/50 bg-black/40 p-4" style={{ animationDelay: '0.3s' }}>
          <p className="mb-2 text-center font-pixel text-sm text-mumu-gold">🏆 전리품 획득!</p>
          {lootEntries.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {lootEntries.map(([type, n]) => {
                const m = MATERIALS[type]
                return (
                  <span
                    key={type}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-pixel text-sm ${m?.rare ? 'bg-mumu-eye/30 text-mumu-eye' : 'bg-white/10 text-white'}`}
                  >
                    <span className="text-lg">{m?.icon || '📦'}</span>
                    {m?.name || type} <b className="text-mumu-gold">×{n}</b>
                    {m?.rare && ' ✨'}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-center font-sans text-xs text-white/60">소재를 얻었어요!</p>
          )}
          <p className="mt-2 text-center font-sans text-[11px] text-white/50">마을에 저장됐어요 · 도감도 채워졌어요 📖</p>
        </div>

        <button
          onClick={onContinue}
          className="loot-pop mt-6 rounded-xl bg-mumu-grass px-12 py-4 font-pixel text-xl font-bold text-white shadow-[0_5px_0_#4a7d38] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
          style={{ animationDelay: '0.4s' }}
        >
          🏡 마을로 돌아가기
        </button>
      </div>

      <Footer />
    </div>
  )
}
