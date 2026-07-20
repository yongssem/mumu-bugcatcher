// 마을 화면 — 1인칭으로 마을을 돌아다니며 NPC와 대화하고, 대문에서 사냥 출동
// 촌장=메인 의뢰 수락 / 대장장이=제작 / 박사=도감 / 꼬마=심부름. 몬스터헌터식 거점
import { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { syncBgmMute } from '../game/bgm.js'
import { loadProfile, writeProfile } from '../save/profile.js'
import { loadProgress } from '../save/progress.js'
import { loadQuestState, acceptMainQuest, completeSubQuest } from '../save/quests.js'
import { QUESTS } from '../game/stages.js'
import { MATERIALS, craftInProfile } from '../game/craft.js'
import { eraForClears, eraIndexForClears, eraBonus, nextEra } from '../game/eras.js'
import { skinById, loadLook } from '../game/skins.js'
import NpcDialog from './NpcDialog.jsx'
import GateDeploy from './GateDeploy.jsx'
import Craft from './Craft.jsx'
import Dinopedia from './Dinopedia.jsx'
import PauseMenu from './PauseMenu.jsx'
import FullscreenButton from './FullscreenButton.jsx'
import Joystick from './mobile/Joystick.jsx'
import OrientationGate from './mobile/OrientationGate.jsx'
import { useIsTouch, useIsPortrait } from './mobile/useDevice.js'

export default function VillageScreen({ onDeploy, onExit }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const [prompt, setPrompt] = useState(null) // "Ⓔ 촌장님과 대화" 등
  const [npc, setNpc] = useState(null) // 대화 중인 NPC def
  const [gateOpen, setGateOpen] = useState(false)
  const [craftOpen, setCraftOpen] = useState(false)
  const [pediaOpen, setPediaOpen] = useState(false)
  const [paused, setPaused] = useState(false)
  const [notice, setNotice] = useState(null)
  const [muted, setMuted] = useState(() => localStorage.getItem('mumubug:muted') === '1')
  const toggleMute = () => { const m = engineRef.current?.toggleMute() ?? false; setMuted(m); syncBgmMute(m) }
  const [profile, setProfile] = useState(() => loadProfile())
  const [questState, setQuestState] = useState(() => loadQuestState())
  const [progress] = useState(() => loadProgress())
  const isTouch = useIsTouch()
  const portrait = useIsPortrait()

  // 시대 정보 (의뢰 클리어 수 기준)
  const clearedCount = QUESTS.filter((q) => progress.cleared?.[q.id]).length
  const era = eraForClears(clearedCount)
  const next = nextEra(clearedCount)
  const bonus = eraBonus(eraIndexForClears(clearedCount))

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, { mode: 'village', seed: 20260101, skinTone: loadLook().skin }, {
      onPause: () => setPaused(true),
      onPrompt: setPrompt,
      onNpcTalk: (def) => {
        setNpc(def)
        engine.pause()
      },
      onGate: () => {
        setGateOpen(true)
        engine.pause()
      },
      onOpenCraft: () => {
        setCraftOpen(true)
        engine.pause()
      },
      onOpenDinopedia: () => {
        setPediaOpen(true)
        engine.pause()
      },
    })
    engineRef.current = engine
    // BGM은 App에서 화면에 맞게 단일 관리
    if (!isTouch) canvasRef.current.requestPointerLock?.()
    return () => {
      engine.dispose()
    }
  }, [isTouch])

  const resumeAll = () => {
    setNpc(null)
    setGateOpen(false)
    setCraftOpen(false)
    setPediaOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }

  // 촌장 의뢰 수락
  const acceptQuest = (questId) => {
    setQuestState(acceptMainQuest(questId))
    setNotice('📜 의뢰를 수락했어요! 동쪽 🚪 대문으로 가세요')
    resumeAll()
  }

  // 꼬마 심부름 전달 — 프로필 소재 차감 + 골드 보상
  const deliverSub = (sub) => {
    const p = { ...profile, mats: { ...profile.mats } }
    for (const [m, n] of Object.entries(sub.need)) p.mats[m] = (p.mats[m] || 0) - n
    p.mats.gold = (p.mats.gold || 0) + (sub.reward.gold || 0)
    writeProfile(p)
    setProfile(p)
    setQuestState(completeSubQuest(sub.id))
    setNotice(`🎉 심부름 완료! 골드 +${sub.reward.gold}`)
  }

  // 마을 제작 — 프로필 대상
  const craftInHub = (id) => {
    const p = { ...profile, mats: { ...profile.mats }, crafted: { ...profile.crafted } }
    const ok = craftInProfile(p, id)
    if (ok) {
      writeProfile(p)
      setProfile(p)
    }
    return ok
  }

  const anyOverlay = npc || gateOpen || craftOpen || pediaOpen

  return (
    <div className="relative h-full w-full bg-mumu-sky">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* 좌상단: 시대 + 소재 */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5">
          <span className="font-pixel text-sm font-bold text-white">{era.emoji} {era.name}</span>
          {(bonus.atk > 0 || bonus.def > 0) && (
            <span className="font-pixel text-[11px] text-mumu-gold">⚔️+{bonus.atk} 🛡️+{bonus.def}</span>
          )}
          {next && <span className="font-sans text-[10px] text-white/50">다음 {next.emoji}</span>}
        </div>
        <div className="flex gap-2 rounded-lg bg-black/40 px-3 py-1">
          {Object.entries(MATERIALS).map(([id, m]) => (
            <span key={id} className="font-pixel text-xs text-white">
              {m.icon}<span className={m.rare ? 'text-mumu-eye' : ''}>{profile.mats[id] || 0}</span>
            </span>
          ))}
          <span className="font-pixel text-xs text-white">🟡{profile.mats.gold || 0}</span>
        </div>
      </div>

      {/* 우상단: 전체화면·도감·제작·나가기 */}
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <FullscreenButton compact onHint={(text) => setNotice(text)} />
        <button
          onClick={() => { setPediaOpen(true); engineRef.current?.pause() }}
          className="rounded-lg bg-black/50 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
        >
          📖 도감 <span className="text-white/50">(P)</span>
        </button>
        <button
          onClick={() => { setCraftOpen(true); engineRef.current?.pause() }}
          className="rounded-lg bg-black/50 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
        >
          🔨 제작 <span className="text-white/50">(F)</span>
        </button>
        <button
          onClick={() => engineRef.current?.pause()}
          className="rounded-lg bg-black/50 px-3 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
        >
          ⏸ 메뉴
        </button>
      </div>

      {/* 하단 안내 — 마을 목표 */}
      {!anyOverlay && !prompt && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-full bg-black/35 px-4 py-1 font-sans text-xs text-white/80">
          🏡 마을을 돌아다니며 주민과 대화해요 · 출동은 동쪽 🚪 대문
        </div>
      )}

      {/* 근접 프롬프트 (E 대화/출동) */}
      {prompt && !anyOverlay && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-black/60 px-5 py-2.5 font-pixel text-base font-bold text-white shadow-lg">
          {prompt}
        </div>
      )}

      {/* 알림 토스트 */}
      {notice && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-xl bg-black/60 px-5 py-2.5 font-pixel text-sm font-bold text-white shadow-lg">
          {notice}
        </div>
      )}

      {/* 십자선 */}
      {!anyOverlay && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-pixel text-2xl text-white/70">
          +
        </div>
      )}

      {/* 모바일: 조이스틱 + 행동 버튼 */}
      {isTouch && !anyOverlay && !paused && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <Joystick onMove={(x, y) => engineRef.current?.setMoveAxis(x, y)} />
          <div className="pointer-events-auto absolute bottom-8 right-6 flex flex-col gap-3">
            <button
              onTouchStart={() => engineRef.current?.setJump(true)}
              onTouchEnd={() => engineRef.current?.setJump(false)}
              className="h-14 w-14 rounded-full bg-white/25 font-pixel text-xl text-white active:bg-white/40"
            >
              ⬆️
            </button>
            <button
              onClick={() => engineRef.current?.interact()}
              className="h-16 w-16 rounded-full bg-mumu-gold font-pixel text-2xl text-[#5a2a00] shadow-lg active:scale-95"
            >
              Ⓔ
            </button>
          </div>
        </div>
      )}

      {/* 오버레이 */}
      {npc && (
        <NpcDialog
          npc={npc}
          profile={profile}
          questState={questState}
          progress={progress}
          onAccept={acceptQuest}
          onDeliver={deliverSub}
          onOpenCraft={() => { setNpc(null); setCraftOpen(true) }}
          onOpenPedia={() => { setNpc(null); setPediaOpen(true) }}
          onClose={resumeAll}
        />
      )}
      {gateOpen && (
        <GateDeploy progress={progress} questState={questState} onDeploy={onDeploy} onClose={resumeAll} />
      )}
      {craftOpen && (
        <Craft inventory={profile.mats} crafted={profile.crafted} onCraft={craftInHub} onClose={resumeAll} />
      )}
      {pediaOpen && <Dinopedia onClose={resumeAll} />}
      {paused && !anyOverlay && <PauseMenu onResume={resumeAll} onExit={onExit} muted={muted} onToggleMute={toggleMute} />}
      {isTouch && portrait && <OrientationGate />}
    </div>
  )
}
