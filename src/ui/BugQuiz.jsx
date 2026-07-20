// 🧠 곤충 도감 퀴즈 — B5. 채집한 곤충의 진짜 지식으로 문제를 풀고 코인을 번다.
//   "곤충 박사가 되는 게임"의 교육 보상 루프. 맞힌 곤충 지식만 출제(배운 것 복습).
import { useMemo, useRef, useState } from 'react'
import { BUGS, BUG_ORDER, FAMILIES } from '../game/bugData.js'
import { loadBugpedia } from '../save/bugpedia.js'
import { loadHome, addCoins } from '../save/home.js'
import BugViewer from './BugViewer.jsx'

const COIN_PER = 20      // 정답 1개당 코인
const ROUND = 8          // 한 판 문항 수

const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }
const sample = (arr, n, exclude) => shuffle(arr.filter((x) => !exclude.includes(x))).slice(0, n)

// 한 문항 생성 — id(정답 곤충) + 유형
function makeQ(id, type, caughtIds) {
  const bug = BUGS[id]
  if (type === 'fam') {
    const correct = FAMILIES[bug.fam].label
    const others = sample(Object.keys(FAMILIES).map((k) => FAMILIES[k].label), 3, [correct])
    return { type, viewer: id, prompt: `‘${bug.name}’은(는) 어느 무리(과)일까요?`, options: shuffle([correct, ...others]), answer: correct }
  }
  if (type === 'habitat') {
    const allHab = [...new Set(BUG_ORDER.map((b) => BUGS[b].habitat))]
    const others = sample(allHab, 3, [bug.habitat])
    return { type, viewer: id, prompt: `‘${bug.name}’은(는) 주로 어디에 살까요?`, options: shuffle([bug.habitat, ...others]), answer: bug.habitat }
  }
  if (type === 'fact') {
    const fact = bug.facts[Math.floor(Math.random() * bug.facts.length)]
    const others = sample(caughtIds.length >= 4 ? caughtIds : BUG_ORDER, 3, [id]).map((x) => BUGS[x].name)
    return { type, viewer: null, prompt: `“${fact}”\n\n이건 어떤 곤충일까요?`, options: shuffle([bug.name, ...others]), answer: bug.name }
  }
  // name — 3D 모델 보고 이름 맞히기
  const others = sample(caughtIds.length >= 4 ? caughtIds : BUG_ORDER, 3, [id]).map((x) => BUGS[x].name)
  return { type: 'name', viewer: id, prompt: '이 곤충의 이름은 무엇일까요?', options: shuffle([bug.name, ...others]), answer: bug.name }
}

export default function BugQuiz({ onClose }) {
  const homeRef = useRef(loadHome())
  const caughtIds = useMemo(() => BUG_ORDER.filter((id) => (loadBugpedia()[id]?.n || 0) > 0), [])
  const questions = useMemo(() => {
    if (caughtIds.length < 2) return []
    const types = ['name', 'fam', 'habitat', 'fact']
    return Array.from({ length: ROUND }, (_, i) => {
      const id = caughtIds[Math.floor(Math.random() * caughtIds.length)]
      return makeQ(id, types[i % types.length], caughtIds)
    })
  }, [caughtIds])

  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [earned, setEarned] = useState(0)
  const [coins, setCoins] = useState(homeRef.current.coins)
  const [done, setDone] = useState(false)

  const q = questions[qi]

  const pick = (opt) => {
    if (picked != null) return
    setPicked(opt)
    if (opt === q.answer) {
      setScore((s) => s + 1)
      addCoins(homeRef.current, COIN_PER); setEarned((e) => e + COIN_PER); setCoins(homeRef.current.coins)
    }
  }
  const next = () => {
    if (qi + 1 >= questions.length) { setDone(true); return }
    setQi((i) => i + 1); setPicked(null)
  }

  // 곤충을 2종 미만 잡았으면 퀴즈 불가
  if (questions.length === 0) {
    return (
      <Shell onClose={onClose} coins={coins}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="font-pixel text-lg text-[#8FE06B]">아직 문제를 낼 곤충이 부족해요</p>
          <p className="font-sans text-sm text-white/70">곤충을 2종 이상 채집하면 퀴즈로 코인을 벌 수 있어요! 🥅</p>
          <button onClick={onClose} className="mt-2 rounded-xl bg-white/15 px-5 py-2.5 font-pixel text-sm text-white hover:bg-white/25">닫기</button>
        </div>
      </Shell>
    )
  }

  if (done) {
    const perfect = score === questions.length
    return (
      <Shell onClose={onClose} coins={coins}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-5xl">{perfect ? '🏆' : score >= questions.length / 2 ? '🎉' : '🐛'}</p>
          <p className="font-pixel text-2xl text-[#8FE06B]">{score} / {questions.length} 정답!</p>
          <p className="font-sans text-sm text-white/80">이번 판에서 <b className="text-[#F2C14E]">💰 {earned}코인</b>을 벌었어요{perfect ? ' · 만점! 곤충 박사 인정!' : ''}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setQi(0); setPicked(null); setScore(0); setEarned(0); setDone(false) }} className="rounded-xl bg-[#8FE06B] px-5 py-2.5 font-pixel text-sm text-[#1e3a14] shadow-[0_4px_0_#3f7a2e]">🔁 한 판 더</button>
            <button onClick={onClose} className="rounded-xl bg-white/15 px-5 py-2.5 font-pixel text-sm text-white hover:bg-white/25">닫기</button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onClose={onClose} coins={coins}>
      {/* 진행 */}
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-gradient-to-r from-[#6AB150] to-[#8FE06B] transition-all" style={{ width: `${(qi / questions.length) * 100}%` }} />
        </div>
        <span className="font-pixel text-xs text-white/70">{qi + 1}/{questions.length}</span>
        <span className="rounded-full bg-[#3f7a2e] px-2.5 py-0.5 font-pixel text-xs text-white">✅ {score}</span>
      </div>

      {/* 3D (해당 유형) */}
      {q.viewer && (
        <div className="mt-3 h-40 overflow-hidden rounded-xl bg-gradient-to-b from-[#1a2740] to-[#0c121d]">
          <BugViewer bug={BUGS[q.viewer]} locked={false} />
        </div>
      )}

      <p className="mt-3 whitespace-pre-line text-center font-pixel text-base text-white">{q.prompt}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer
          const chosen = picked === opt
          let cls = 'bg-white/10 text-white hover:bg-white/20'
          if (picked != null) {
            if (isAnswer) cls = 'bg-[#3f7a2e] text-white'
            else if (chosen) cls = 'bg-[#8a2e2e] text-white'
            else cls = 'bg-white/5 text-white/50'
          }
          return (
            <button key={opt} onClick={() => pick(opt)} disabled={picked != null}
              className={`rounded-xl px-3 py-3 text-center font-sans text-sm font-bold transition ${cls}`}>
              {opt}{picked != null && isAnswer ? ' ✓' : ''}
            </button>
          )
        })}
      </div>

      {picked != null && (
        <button onClick={next} className="mt-4 w-full rounded-xl bg-[#8FE06B] py-3 font-pixel text-base text-[#1e3a14] shadow-[0_4px_0_#3f7a2e] active:translate-y-0.5 active:shadow-none">
          {picked === q.answer ? `정답! +${COIN_PER}코인 · ` : '아쉬워요 · '}{qi + 1 >= questions.length ? '결과 보기' : '다음 문제 →'}
        </button>
      )}
    </Shell>
  )
}

function Shell({ children, onClose, coins }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border-2 border-white/70 bg-[#101725] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-lg text-[#8FE06B]">🧠 곤충 도감 퀴즈</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#F2C14E] px-3 py-1 font-pixel text-sm text-[#3a2a08]">💰 {coins.toLocaleString()}</span>
            <button onClick={onClose} className="rounded-lg bg-white/15 px-3 py-1 font-pixel text-xs text-white hover:bg-white/25">✕</button>
          </div>
        </div>
        <div className="mt-3 flex min-h-[300px] flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
