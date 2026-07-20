// 랜딩 — 밝은 초원 무드. 곤충들이 팔랑팔랑 날아다니는 오픈월드 예고
import Footer from './Footer.jsx'
import FullscreenButton, { requestFs } from './FullscreenButton.jsx'

const FLOATERS = [
  { e: '🦋', x: 12, y: 22, d: 0, s: 5.5, sz: 3.2 },
  { e: '🐝', x: 78, y: 30, d: 1.2, s: 4.5, sz: 2.4 },
  { e: '🪲', x: 30, y: 66, d: 0.6, s: 6.5, sz: 2.6 },
  { e: '🦗', x: 66, y: 60, d: 2.0, s: 5.0, sz: 2.4 },
  { e: '🪰', x: 50, y: 18, d: 0.9, s: 4.0, sz: 2.0 },
  { e: '🐌', x: 20, y: 82, d: 1.6, s: 7.0, sz: 2.4 },
  { e: '🕷️', x: 86, y: 74, d: 0.3, s: 6.0, sz: 2.2 },
  { e: '🦋', x: 90, y: 46, d: 2.4, s: 5.2, sz: 2.6 },
]

export default function Landing({ onStart }) {
  const handleStart = () => {
    requestFs()
    onStart()
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#7EC8F0]">
      {/* 하늘·초원 그라데이션 */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#8FD3F5 0%,#7EC8F0 38%,#A7DE7B 62%,#6AB150 100%)' }} />
      {/* 해 */}
      <div className="absolute right-[12%] top-[10%] h-24 w-24 rounded-full bg-[#FFF1B8] blur-[2px]" style={{ boxShadow: '0 0 60px 20px rgba(255,240,180,0.7)' }} />

      {/* 둥실둥실 곤충들 */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className="pointer-events-none absolute select-none"
          style={{
            left: `${f.x}%`, top: `${f.y}%`, fontSize: `${f.sz}rem`,
            animation: `bugFloat ${f.s}s ease-in-out ${f.d}s infinite`,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))',
          }}
        >
          {f.e}
        </span>
      ))}

      <div className="absolute right-3 top-3 z-30">
        <FullscreenButton />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-[10vh] text-center">
        <h1
          className="font-pixel text-6xl font-bold text-white md:text-8xl"
          style={{ textShadow: '0 3px 0 #3f7a2e, 0 0 22px rgba(255,255,255,0.5)' }}
        >
          무무곤충잡이
        </h1>
        <p className="mt-4 font-pixel text-base tracking-[0.15em] text-[#2e4a1e] md:text-2xl">
          채집하고 · 기르고 · 알아가는 곤충 오픈월드
        </p>
        <p className="mt-2 font-sans text-xs tracking-[0.3em] text-[#3f5a2e]/80 md:text-sm">
          잠자리채를 들고 100마리를 만나러 가요
        </p>

        <button
          onClick={handleStart}
          className="mt-9 rounded-xl bg-[#F2C14E] px-12 py-4 font-pixel text-xl font-bold text-[#5a3a00] shadow-[0_6px_0_#c1922f] transition-transform hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#c1922f]"
        >
          시작하기 🥅
        </button>
      </div>

      <div className="relative z-30">
        <Footer />
      </div>
    </div>
  )
}
