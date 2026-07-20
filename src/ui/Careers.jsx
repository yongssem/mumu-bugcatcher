// 💼 직업 정하기 (미리보기) — 채집한 곤충으로 무엇을 할지 고르는 진로.
// 사용자가 제시한 3가지: (1) 집 전시+유튜버 (2) 곤충 가게 번식 (3) 내 추천(하이브리드)
import Footer from './Footer.jsx'

const JOBS = [
  {
    id: 'youtuber',
    icon: '🎥',
    title: '전시 유튜버',
    tag: '방송 수익',
    color: '#E0574F',
    desc: '잡은 곤충을 집에 멋지게 전시하고 방송해요. 희귀한 곤충을 보여줄수록 구독자와 슈퍼챗이 늘어요.',
    points: ['전시장 꾸미기 → 관람객·구독자 UP', '희귀 곤충 공개하면 조회수 폭발', '광고·슈퍼챗으로 코인 벌기'],
  },
  {
    id: 'shop',
    icon: '🏪',
    title: '곤충 가게 사장',
    tag: '번식 수익',
    color: '#4F9BE0',
    desc: '암수 곤충을 짝지어 번식시키고, 알에서 깨어난 곤충을 손님에게 팔아 코인을 벌어요.',
    points: ['암수 짝짓기 → 알 → 부화', '잘 기르면 더 튼튼한 곤충 판매', '사육 환경(습도·먹이)이 좋을수록 비싸게'],
  },
  {
    id: 'hybrid',
    icon: '⭐',
    title: '곤충 명소 사장 (추천)',
    tag: '내 추천',
    color: '#E8A33D',
    recommend: true,
    desc: '전시 유튜버 + 곤충 가게를 하나로! 전시로 손님과 구독자를 모으고, 번식으로 희귀 곤충을 길러 판매해요. 부지를 넓혀 나만의 곤충 왕국을 키워요.',
    points: ['전시(방송)로 인지도 ↑ · 번식(판매)로 코인 ↑', '검증된 무무 크리에이터 경제 그대로 계승', '부지 확장 → 더 많은 곤충 · 더 큰 명소'],
  },
]

export default function Careers({ onBack }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#243b52] to-[#101725] px-5 py-6 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="font-pixel text-2xl text-[#8FE06B]">💼 어떤 곤충 전문가가 될까?</h1>
          <button onClick={onBack} className="rounded-lg bg-white/10 px-4 py-1.5 font-pixel text-sm hover:bg-white/20">← 뒤로</button>
        </div>
        <p className="mt-2 font-sans text-sm text-white/70">
          오픈월드에서 곤충을 채집한 뒤, 이 중 하나(또는 모두!)를 골라 나만의 방식으로 즐겨요. <span className="text-white/50">(직업 시스템은 준비 중이에요)</span>
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {JOBS.map((j) => (
            <div
              key={j.id}
              className={`relative flex flex-col rounded-2xl border-2 p-5 ${j.recommend ? 'bg-[#E8A33D]/12' : 'bg-white/5'}`}
              style={{ borderColor: j.recommend ? j.color : 'rgba(255,255,255,0.12)' }}
            >
              {j.recommend && (
                <span className="absolute -top-3 left-4 rounded-full bg-[#E8A33D] px-3 py-0.5 font-pixel text-[11px] font-bold text-[#3a2500]">
                  ⭐ 이렇게 추천해요
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-3xl">{j.icon}</span>
                <span className="rounded-full px-2 py-0.5 font-sans text-[10px] font-bold text-white" style={{ background: j.color }}>{j.tag}</span>
              </div>
              <h2 className="mt-3 font-pixel text-lg">{j.title}</h2>
              <p className="mt-1.5 font-sans text-xs leading-relaxed text-white/80">{j.desc}</p>
              <ul className="mt-3 space-y-1.5">
                {j.points.map((p, i) => (
                  <li key={i} className="flex gap-1.5 font-sans text-xs text-white/75">
                    <span style={{ color: j.color }}>•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 진행 흐름 */}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-pixel text-sm text-[#8FE06B]">🔁 이렇게 이어져요</p>
          <p className="mt-2 font-sans text-sm text-white/80">
            🥅 오픈월드에서 채집 → 📖 도감 채우기 → 🏡 집·가게 차리기 → 💰 전시·번식으로 코인 → 🌿 부지 확장 → 🦋 더 희귀한 곤충 도전
          </p>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}
