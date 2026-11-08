// 📖 곤충 도감 — 게임의 심장. 채집한 곤충이 실루엣→컬러로 해금되고 진짜 지식이 열린다.
// 왼쪽: 과(科)별 카드 갤러리 / 오른쪽: 선택 곤충 3D 뷰어 + 상세 정보
import { useEffect, useMemo, useState } from 'react'
import { BUGS, FAMILIES, RARITY, BUG_ORDER, bugsByFamily, BUG_COUNT } from '../game/bugData.js'
import { loadBugpedia, bugpediaProgress } from '../save/bugpedia.js'
import BugViewer from './BugViewer.jsx'
import BugQuiz from './BugQuiz.jsx'

export default function Bugpedia({ onClose }) {
  const caughtMap = useMemo(() => loadBugpedia(), [])
  const groups = useMemo(() => bugsByFamily(), [])
  const prog = useMemo(() => bugpediaProgress(BUG_COUNT), [])
  const [fam, setFam] = useState('all')
  const [selId, setSel] = useState(BUG_ORDER[0])
  const [quiz, setQuiz] = useState(false)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setWide(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const bug = BUGS[selId]
  const isCaught = (id) => (caughtMap[id]?.n || 0) > 0
  const selLocked = !isCaught(selId)

  const famKeys = ['all', ...Object.keys(FAMILIES)]
  const shownIds = fam === 'all' ? BUG_ORDER : (groups[fam] || []).map((x) => x.id)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#101725] text-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#16202f] px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="font-pixel text-xl text-[#8FE06B]">🐛 곤충 도감</h1>
          <span className="rounded-full bg-white/10 px-3 py-1 font-sans text-xs text-white/80">
            {prog.caught} / {prog.total} 발견 · {prog.pct}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setQuiz(true)} className="rounded-lg bg-[#8FE06B] px-4 py-1.5 font-pixel text-sm text-[#1e3a14] hover:brightness-105">🧠 퀴즈</button>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-4 py-1.5 font-pixel text-sm hover:bg-white/20">닫기 ✕</button>
        </div>
      </div>

      {quiz && <BugQuiz onClose={() => setQuiz(false)} />}

      {/* 진행 막대 */}
      <div className="h-1.5 w-full bg-black/40">
        <div className="h-full bg-gradient-to-r from-[#6AB150] to-[#8FE06B] transition-all" style={{ width: `${prog.pct}%` }} />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 왼쪽: 갤러리 */}
        <div className="flex w-full min-w-0 flex-col md:w-[58%]">
          {/* 과 탭 */}
          <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-3 py-2">
            {famKeys.map((k) => (
              <button
                key={k}
                onClick={() => setFam(k)}
                className={`rounded-full px-3 py-1 font-sans text-xs transition ${
                  fam === k ? 'bg-[#6AB150] text-white' : 'bg-white/8 text-white/70 hover:bg-white/15'
                }`}
              >
                {k === 'all' ? `전체 ${BUG_COUNT}` : `${FAMILIES[k].icon} ${FAMILIES[k].label}`}
              </button>
            ))}
          </div>
          {/* 카드 그리드 */}
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4 lg:grid-cols-5">
            {shownIds.map((id) => {
              const b = BUGS[id]
              const caught = isCaught(id)
              const rar = RARITY[b.rarity]
              return (
                <button
                  key={id}
                  onClick={() => setSel(id)}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                    selId === id ? 'border-[#8FE06B] bg-[#8FE06B]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                  style={{ borderColor: selId === id ? '#8FE06B' : undefined }}
                >
                  <span className="text-2xl leading-none" style={{ filter: caught ? 'none' : 'brightness(0.25)' }}>
                    {FAMILIES[b.fam].icon}
                  </span>
                  <span className="mt-1 line-clamp-1 font-sans text-[11px] text-white/85">
                    {caught ? b.name : '???'}
                  </span>
                  <span className="mt-0.5 h-1 w-6 rounded-full" style={{ background: caught ? rar.color : '#33384a' }} />
                </button>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 상세 + 3D 뷰어 (모바일에선 아래로 접힘 없이 항상 보이게 우측 컬럼 숨김 → 상단 요약 대신 전체폭 갤러리) */}
        <div className="hidden min-w-0 flex-col border-l border-white/10 bg-[#0c121d] md:flex md:w-[42%]">
          {wide && !quiz && <BugDetail bug={bug} locked={selLocked} caught={caughtMap[selId]} />}
        </div>
      </div>

      {/* 모바일 상세 (하단 시트) */}
      <div className="border-t border-white/10 bg-[#0c121d] md:hidden" style={{ height: '46vh' }}>
        {!wide && !quiz && <BugDetail bug={bug} locked={selLocked} caught={caughtMap[selId]} />}
      </div>
    </div>
  )
}

function BugDetail({ bug, locked, caught }) {
  if (!bug) return null
  const rar = RARITY[bug.rarity]
  const fam = FAMILIES[bug.fam]
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 3D 뷰어 */}
      <div className="relative h-[45%] min-h-0 w-full bg-gradient-to-b from-[#1a2740] to-[#0c121d]">
        <BugViewer bug={bug} locked={locked} />
        {locked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg bg-black/50 px-3 py-1 font-pixel text-sm text-white/70">채집하면 열려요 🔒</span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-pixel text-lg text-white">{locked ? '???' : bug.name}</h2>
          <span className="rounded-full px-2 py-0.5 font-sans text-[10px] font-bold text-white" style={{ background: rar.color }}>
            {rar.label}
          </span>
        </div>
        <p className="mt-0.5 font-sans text-xs italic text-white/45">{locked ? '아직 발견하지 못했어요' : bug.latin}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <Info label="과" value={`${fam.icon} ${fam.label}`} />
          <Info label="크기" value={locked ? '?' : bug.size} />
          <Info label="서식지" value={locked ? '?' : bug.habitat} />
          <Info label="활동" value={locked ? '?' : bug.active} />
        </div>

        <p className="mb-1.5 mt-3 font-pixel text-sm text-[#8FE06B]">✨ 재미있는 사실</p>
        {locked ? (
          <p className="font-sans text-sm text-white/40">이 곤충을 채집하면 진짜 지식이 열려요!</p>
        ) : (
          <ul className="space-y-1.5">
            {bug.facts.map((f, i) => (
              <li key={i} className="flex gap-2 font-sans text-sm leading-relaxed text-white/85">
                <span className="text-[#8FE06B]/70">{i + 1}.</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
        {!locked && caught?.n > 1 && (
          <p className="mt-3 font-sans text-xs text-white/50">🎒 지금까지 {caught.n}마리 채집했어요</p>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <p className="font-sans text-[10px] text-white/45">{label}</p>
      <p className="mt-0.5 font-sans text-xs text-white/90">{value}</p>
    </div>
  )
}
