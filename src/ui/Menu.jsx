// 메뉴 — 곤충 오픈월드 허브. 도감(지금 열기) · 채집 나가기 · 직업 정하기
import { useMemo, useState } from 'react'
import Footer from './Footer.jsx'
import { BUG_COUNT } from '../game/bugData.js'
import { bugpediaProgress } from '../save/bugpedia.js'

export default function Menu({ onOpen }) {
  const prog = useMemo(() => bugpediaProgress(BUG_COUNT), [])
  const [toast, setToast] = useState(null)

  const soon = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#7EC8F0] via-[#A7DE7B] to-[#6AB150] px-5">
      <h1 className="font-pixel text-4xl font-bold text-white md:text-5xl" style={{ textShadow: '0 3px 0 #3f7a2e' }}>
        🐛 무무곤충잡이
      </h1>
      <p className="mt-2 font-sans text-sm text-[#2e4a1e]">
        곤충 도감 <b className="text-white">{prog.caught}</b> / {prog.total} 발견 · {prog.pct}%
      </p>

      <div className="mt-8 grid w-full max-w-3xl gap-4 md:grid-cols-3">
        <Card
          icon="📖"
          title="곤충 도감"
          desc="94종 곤충을 3D로 살펴보고 진짜 지식을 배워요"
          badge="지금 열기"
          highlight
          onClick={() => onOpen('pedia')}
        />
        <Card
          icon="🧰"
          title="곤충월드 채집"
          desc="🪏 캐서 파밍 → 🧱 폭탄·마취·함정 조합 → 대형 곤충 헌터식 포획"
          badge="플레이"
          onClick={() => onOpen('hunt')}
        />
        <Card
          icon="💼"
          title="직업 정하기"
          desc="유튜버 · 곤충 가게 · 추천 코스 미리보기"
          badge="미리보기"
          onClick={() => onOpen('careers')}
        />
      </div>

      {toast && (
        <div className="tip-fade absolute bottom-[16vh] z-30 rounded-xl bg-black/70 px-5 py-3 font-sans text-sm text-white">
          {toast}
        </div>
      )}

      <Footer />
    </div>
  )
}

function Card({ icon, title, desc, badge, highlight, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start rounded-2xl border-2 p-5 text-left transition hover:scale-[1.03] ${
        highlight ? 'border-white bg-white/90 text-[#24401a] shadow-[0_8px_0_#3f7a2e]' : 'border-white/40 bg-white/25 text-white shadow-[0_6px_0_rgba(0,0,0,0.15)]'
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-4xl">{icon}</span>
        <span className={`rounded-full px-2.5 py-0.5 font-sans text-[11px] font-bold ${highlight ? 'bg-[#6AB150] text-white' : 'bg-white/30 text-white'}`}>
          {badge}
        </span>
      </div>
      <h2 className="mt-3 font-pixel text-xl">{title}</h2>
      <p className={`mt-1 font-sans text-xs ${highlight ? 'text-[#3f5a2e]' : 'text-white/85'}`}>{desc}</p>
    </button>
  )
}
