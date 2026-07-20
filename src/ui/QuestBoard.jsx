// 출동 게시판 — 사냥 의뢰 목록 (몬스터헌터식: 맵 3개를 재사용하며 의뢰가 이어짐)
// 이전 의뢰를 깨야 다음 해금. 후반 의뢰는 같은 맵에 강화 개체가 등장
import { QUESTS, MAPS, questToStage, isUnlocked } from '../game/stages.js'
import { DINOS } from '../game/dinoData.js'
import Footer from './Footer.jsx'

function Stars({ n }) {
  return (
    <span className="font-pixel text-sm text-mumu-gold">
      {'★'.repeat(n)}
      <span className="text-white/25">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

export default function QuestBoard({ progress, onDeploy, onClose }) {
  const clearedCount = QUESTS.filter((q) => progress?.cleared?.[q.id]).length
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto bg-black/70 py-8 backdrop-blur-sm">
      <h2 className="font-pixel text-3xl font-bold text-white">⚔️ 사냥 의뢰</h2>
      <p className="mt-2 font-sans text-sm text-white/60">
        의뢰를 골라 출동해요. 메인 공룡을 격퇴하면 클리어! ·{' '}
        <b className="font-pixel text-mumu-gold">{clearedCount}</b>/{QUESTS.length}
      </p>

      <div className="mt-6 flex w-full max-w-md flex-col gap-3 px-6">
        {QUESTS.map((q) => {
          const cleared = !!progress?.cleared?.[q.id]
          const unlocked = isUnlocked(q, progress)
          const dino = DINOS[q.dinoId]
          const map = MAPS[q.map]
          return (
            <button
              key={q.id}
              onClick={() => unlocked && onDeploy(questToStage(q))}
              disabled={!unlocked}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
                !unlocked
                  ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-60'
                  : cleared
                    ? 'border-mumu-grass/60 bg-mumu-grass/15 hover:scale-[1.02] active:scale-95'
                    : 'border-mumu-gold/50 bg-white/15 hover:scale-[1.02] hover:bg-white/25 active:scale-95'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-4xl">{unlocked ? map.emoji : '🔒'}</span>
                <span>
                  <span className="flex flex-wrap items-center gap-2 font-pixel text-base font-bold text-white">
                    {q.title}
                    <Stars n={q.stars} />
                    {cleared && <span className="font-pixel text-xs text-mumu-grass">✓ 클리어</span>}
                  </span>
                  <span className="mt-0.5 block font-sans text-xs text-white/70">{q.desc}</span>
                  <span className="mt-1 flex items-center gap-2 font-sans text-xs">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">
                      {map.emoji} {map.name}
                    </span>
                    <span className="text-mumu-gold">🎯 {dino?.name}{q.mod ? ' (강화)' : ''}</span>
                  </span>
                </span>
              </span>
              {unlocked ? (
                <span className="shrink-0 font-pixel text-sm font-bold text-white/80">출동 ▶</span>
              ) : (
                <span className="shrink-0 font-pixel text-[11px] text-white/50">이전 의뢰<br />클리어 필요</span>
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={onClose}
        className="mt-6 rounded-xl bg-white/15 px-10 py-3 font-pixel text-lg font-bold text-white transition-transform hover:scale-105 active:scale-95"
      >
        ← 마을로
      </button>

      <Footer />
    </div>
  )
}
