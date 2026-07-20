// 🎬 인트로 컷신 — 풀숲을 걷다 곤충채집통을 주워 버튼을 누르니 몸이 작아져 통 속으로.
// DOM/CSS 시네마틱 (단계 상태머신). 아무 곳이나 누르면 다음으로, 스킵 가능.
import { useEffect, useState } from 'react'

// 단계별 자막 + 진행 시간(ms)
const STEPS = [
  { cap: '어느 여름날, 풀숲을 걷고 있었어요…', ms: 2600 },
  { cap: '어? 저기 반짝이는 게 뭐지?', ms: 2600 },
  { cap: '곤충채집통이다! 초록 버튼을 눌러볼까?', ms: 2800 },
  { cap: '우웅— 몸이 점점 작아져요!', ms: 2400 },
  { cap: '곤충채집통 속, 거대한 곤충월드에 도착!', ms: 0 },
]

export default function Cutscene({ onDone }) {
  const [step, setStep] = useState(0)

  // 자동 진행 (마지막 단계는 버튼 대기)
  useEffect(() => {
    if (step >= STEPS.length - 1) return
    const t = setTimeout(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), STEPS[step].ms)
    return () => clearTimeout(t)
  }, [step])

  const advance = () => {
    if (step >= STEPS.length - 1) onDone()
    else setStep(step + 1)
  }

  const shrinking = step === 3
  const inside = step >= 4
  // 캐릭터 위치: 걷다가 채집통 옆으로
  const charLeft = step === 0 ? '18%' : '40%'
  // 축소 순간엔 바깥 세계를 확대(통 속으로 빨려드는 느낌) → 통 속 도착하면 1로 리셋
  const worldScale = shrinking ? 3.6 : 1

  return (
    <div
      className="relative h-full w-full cursor-pointer select-none overflow-hidden"
      onClick={advance}
      style={{ background: inside ? '#16351f' : 'linear-gradient(#8FD3F5 0%,#7EC8F0 40%,#A7DE7B 66%,#6AB150 100%)' }}
    >
      {/* 해 + 구름 (바깥 세계) */}
      {!inside && (
        <>
          <div className="absolute right-[14%] top-[10%] h-20 w-20 rounded-full bg-[#FFF1B8]" style={{ boxShadow: '0 0 50px 16px rgba(255,240,180,0.7)' }} />
          <div className="absolute left-[12%] top-[16%] text-5xl opacity-90" style={{ animation: 'cutDrift 6s ease-in-out infinite alternate' }}>☁️</div>
          <div className="absolute right-[30%] top-[24%] text-4xl opacity-80" style={{ animation: 'cutDrift 8s ease-in-out infinite alternate' }}>☁️</div>
        </>
      )}

      {/* 통 속 곤충월드 벽 (안쪽) — 그물망 느낌 */}
      {inside && (
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#ffffff22 1px,transparent 1px),linear-gradient(90deg,#ffffff22 1px,transparent 1px)', backgroundSize: '34px 34px' }} />
      )}

      {/* 월드 레이어 (땅·채집통·풀) — 축소 연출 때 확대됨 */}
      <div
        className="absolute inset-0"
        style={{ transform: `scale(${worldScale})`, transformOrigin: '46% 68%', transition: 'transform 1.4s cubic-bezier(0.5,0,0.3,1)' }}
      >
        {/* 땅 */}
        <div className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: inside ? '#1e4a2b' : '#5FA34A' }} />
        {/* 풀 포기 몇 개 */}
        {[10, 26, 60, 74, 88].map((x, i) => (
          <div key={i} className="absolute bottom-[30%] text-3xl" style={{ left: `${x}%`, animation: 'cutBob 2.4s ease-in-out infinite', animationDelay: `${i * 0.3}s` }}>🌿</div>
        ))}

        {/* 🧰 곤충채집통 (2단계부터 보임) */}
        {step >= 1 && !inside && (
          <div className="absolute bottom-[30%] left-[46%] -translate-x-1/2" style={{ animation: 'cutBob 2s ease-in-out infinite' }}>
            <div className="relative h-24 w-24 rounded-lg border-4 border-[#7a4a24] bg-[#a9713e] shadow-[0_8px_0_#5a3418]">
              {/* 그물 창 */}
              <div className="absolute inset-2 rounded bg-[#cfe8d8]/70" style={{ backgroundImage: 'linear-gradient(#00000033 1px,transparent 1px),linear-gradient(90deg,#00000033 1px,transparent 1px)', backgroundSize: '8px 8px' }} />
              {/* 초록 버튼 */}
              <div className="absolute -top-3 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full border-2 border-[#2e6a2e] bg-[#54d454]" style={step >= 2 ? { animation: 'cutPulse 0.9s ease-in-out infinite' } : undefined} />
            </div>
            {/* 반짝임 */}
            {step >= 1 && ['−12px:-8px', '96px:6px', '40px:-20px'].map((p, i) => {
              const [l, t] = p.split(':')
              return <span key={i} className="absolute text-xl" style={{ left: l, top: t, animation: 'cutSparkle 1.4s ease-in-out infinite', animationDelay: `${i * 0.4}s` }}>✨</span>
            })}
          </div>
        )}

        {/* 통 속 거대 곤충월드 (마지막) */}
        {inside && (
          <>
            {[['🦋', 20, 30], ['🐝', 68, 26], ['🪲', 44, 12], ['🐛', 82, 16]].map(([e, x, y], i) => (
              <div key={i} className="absolute text-5xl" style={{ left: `${x}%`, bottom: `${y}%`, animation: 'cutBob 2.6s ease-in-out infinite', animationDelay: `${i * 0.35}s` }}>{e}</div>
            ))}
          </>
        )}
      </div>

      {/* 🧒 주인공 (축소 연출 때 작아지며 사라짐) */}
      {!inside && (
        <div
          className="absolute bottom-[30%] z-10"
          style={{
            left: charLeft,
            transform: `scale(${shrinking ? 0.12 : 1})`,
            opacity: shrinking ? 0 : 1,
            transition: 'left 1.6s ease-in-out, transform 1.3s ease-in, opacity 1.3s ease-in',
          }}
        >
          <div style={{ animation: step === 0 ? 'cutWalk 0.5s ease-in-out infinite' : 'cutBob 2s ease-in-out infinite' }}>
            {/* 머리 */}
            <div className="mx-auto h-10 w-10 rounded-full bg-[#f2c79a]" />
            {/* 모자 */}
            <div className="mx-auto -mt-12 h-4 w-12 rounded-t-full bg-[#3f9a4a]" />
            <div className="mx-auto h-1.5 w-14 rounded bg-[#2e7a38]" />
            {/* 몸 */}
            <div className="mx-auto mt-1 h-10 w-9 rounded-md bg-[#F2C14E]" />
            {/* 잠자리채 */}
            <div className="absolute -right-3 top-1 h-14 w-1.5 rotate-[24deg] rounded bg-[#8a5a2e]" />
            <div className="absolute -right-6 -top-2 text-2xl">🥅</div>
          </div>
        </div>
      )}

      {/* 하얀 섬광 (축소 순간) */}
      {shrinking && <div className="absolute inset-0 z-20 bg-white" style={{ animation: 'cutFlash 1.3s ease-out forwards' }} />}

      {/* 자막 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[10%] z-30 flex justify-center px-6">
        <p key={step} className="rounded-2xl bg-black/55 px-6 py-3 text-center font-pixel text-base text-white backdrop-blur md:text-xl" style={{ animation: 'cutCaption 0.4s ease-out both' }}>
          {STEPS[step].cap}
        </p>
      </div>

      {/* 마지막: 시작 버튼 */}
      {inside && (
        <button
          onClick={(e) => { e.stopPropagation(); onDone() }}
          className="absolute bottom-[22%] left-1/2 z-30 -translate-x-1/2 rounded-xl bg-[#8FE06B] px-10 py-3 font-pixel text-lg font-bold text-[#1e3a14] shadow-[0_5px_0_#4f9b3a] transition-transform hover:scale-105 active:translate-y-1"
        >
          채집 시작 →
        </button>
      )}

      {/* 스킵 */}
      <button
        onClick={(e) => { e.stopPropagation(); onDone() }}
        className="absolute right-4 top-4 z-30 rounded-lg bg-black/35 px-4 py-1.5 font-sans text-xs text-white backdrop-blur hover:bg-black/55"
      >
        건너뛰기 ⏭
      </button>
    </div>
  )
}
