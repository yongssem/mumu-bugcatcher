// 대문 출동 — 농촌(들판)·어촌(물가)·산촌(산) 중 선택해 출동
// 지역마다 현재 의뢰(다음 미클리어) 또는 재사냥(전부 클리어 시)을 보여줌
import { QUESTS, MAPS, questToStage, isUnlocked } from '../game/stages.js'
import { DINOS } from '../game/dinoData.js'
import Footer from './Footer.jsx'

const REGION_LABEL = { field: '농촌', water: '어촌', mountain: '산촌' }

export default function GateDeploy({ progress, questState, onDeploy, onClose }) {
  const regions = Object.keys(MAPS).map((mapId) => {
    const quests = QUESTS.filter((q) => q.map === mapId)
    const next = quests.find((q) => isUnlocked(q, progress) && !progress.cleared?.[q.id])
    const clearedList = quests.filter((q) => progress.cleared?.[q.id])
    const replay = clearedList[clearedList.length - 1] || null
    const quest = next || replay
    return { mapId, map: MAPS[mapId], quest, isReplay: !next && !!replay, locked: !quest }
  })

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-black/70 py-8 backdrop-blur-sm">
      <h2 className="font-pixel text-3xl font-bold text-white">🚪 어디로 출동할까요?</h2>
      <p className="mt-2 font-sans text-sm text-white/60">지역을 고르면 대문을 나서 사냥터로 갑니다</p>

      <div className="mt-6 flex w-full max-w-md flex-col gap-3 px-6">
        {regions.map(({ mapId, map, quest, isReplay, locked }) => {
          const dino = quest ? DINOS[quest.dinoId] : null
          const isAccepted = quest && questState?.accepted === quest.id && !isReplay
          return (
            <button
              key={mapId}
              onClick={() => !locked && onDeploy(questToStage(quest))}
              disabled={locked}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                locked
                  ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-60'
                  : isAccepted
                    ? 'border-mumu-gold bg-mumu-gold/15 hover:scale-[1.02] active:scale-95'
                    : 'border-white/25 bg-white/10 hover:scale-[1.02] hover:bg-white/20 active:scale-95'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-4xl">{locked ? '🔒' : map.emoji}</span>
                <span>
                  <span className="flex items-center gap-2 font-pixel text-lg font-bold text-white">
                    {REGION_LABEL[mapId]}
                    {isAccepted && (
                      <span className="rounded bg-mumu-gold px-1.5 py-0.5 font-pixel text-[10px] text-[#5a2a00]">
                        📜 진행 중
                      </span>
                    )}
                    {isReplay && <span className="font-pixel text-xs text-white/50">재사냥</span>}
                  </span>
                  {quest ? (
                    <span className="mt-0.5 block font-sans text-xs text-white/70">
                      {quest.title} <span className="text-mumu-gold">{'★'.repeat(quest.stars)}</span> · 🎯 {dino?.name}
                    </span>
                  ) : (
                    <span className="mt-0.5 block font-sans text-xs text-white/50">
                      이전 지역 의뢰를 먼저 해결해요
                    </span>
                  )}
                </span>
              </span>
              {!locked && <span className="shrink-0 font-pixel text-sm font-bold text-white/80">출동 ▶</span>}
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
