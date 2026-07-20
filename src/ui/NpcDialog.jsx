// NPC 대화창 — 역할별 분기: 촌장(메인 의뢰)·대장장이(제작)·박사(도감)·꼬마(심부름)
import { useState } from 'react'
import { QUESTS, MAPS, isUnlocked } from '../game/stages.js'
import { DINOS } from '../game/dinoData.js'
import { MATERIALS } from '../game/craft.js'
import { nextSubQuestFor, canDeliver } from '../game/subquests.js'

function Btn({ onClick, primary = false, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-2.5 font-pixel text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${
        primary
          ? 'bg-mumu-gold text-[#5a2a00] shadow-[0_3px_0_#b9702b]'
          : 'bg-white/15 text-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function NpcDialog({ npc, profile, questState, progress, onAccept, onDeliver, onOpenCraft, onOpenPedia, onClose }) {
  const [phase, setPhase] = useState('talk') // 'talk' | 'thanks'

  // 역할별 내용 구성
  let body = null
  let buttons = null

  if (npc.role === 'main') {
    const nextMain = QUESTS.find((q) => isUnlocked(q, progress) && !progress.cleared?.[q.id])
    if (!nextMain) {
      body = <p>모든 의뢰를 해결했구먼! 자네는 우리 마을의 영웅일세! 🏆</p>
      buttons = <Btn onClick={onClose}>감사합니다!</Btn>
    } else {
      const map = MAPS[nextMain.map]
      const dino = DINOS[nextMain.dinoId]
      const accepted = questState.accepted === nextMain.id
      body = (
        <>
          <p>{npc.greet}</p>
          <div className="mt-2 rounded-xl bg-white/10 p-3">
            <p className="font-pixel text-sm font-bold text-mumu-gold">
              📜 {nextMain.title}{' '}
              <span className="text-white/60">{'★'.repeat(nextMain.stars)}</span>
            </p>
            <p className="mt-1 font-sans text-xs text-white/80">{nextMain.desc}</p>
            <p className="mt-1 font-sans text-xs text-white/70">
              {map.emoji} {map.name} · 🎯 {dino?.name}
              {nextMain.mod ? ' (강화)' : ''}
            </p>
          </div>
          {accepted && (
            <p className="mt-2 font-sans text-xs text-mumu-gold">
              이미 수락했네! 동쪽 🚪 대문으로 가서 출동하게나.
            </p>
          )}
        </>
      )
      buttons = accepted ? (
        <Btn primary onClick={onClose}>알겠어요!</Btn>
      ) : (
        <>
          <Btn primary onClick={() => onAccept(nextMain.id)}>⚔️ 의뢰 수락!</Btn>
          <Btn onClick={onClose}>다음에요</Btn>
        </>
      )
    }
  } else if (npc.role === 'craft') {
    body = <p>{npc.greet}</p>
    buttons = (
      <>
        <Btn primary onClick={onOpenCraft}>🔨 제작대 열기</Btn>
        <Btn onClick={onClose}>다음에요</Btn>
      </>
    )
  } else if (npc.role === 'pedia') {
    body = <p>{npc.greet}</p>
    buttons = (
      <>
        <Btn primary onClick={onOpenPedia}>📖 도감 보기</Btn>
        <Btn onClick={onClose}>다음에요</Btn>
      </>
    )
  } else {
    // 서브 심부름 (꼬마)
    const sub = nextSubQuestFor(npc.id, questState)
    if (phase === 'thanks') {
      body = <p>🎉 {questState._lastThanks || '고마워요!'}</p>
      buttons = <Btn primary onClick={onClose}>천만에!</Btn>
    } else if (!sub) {
      body = <p>지난번엔 정말 고마웠어요! 또 놀러 오세요! 😊</p>
      buttons = <Btn onClick={onClose}>안녕!</Btn>
    } else {
      const ok = canDeliver(sub, profile.mats)
      body = (
        <>
          <p>{sub.ask}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(sub.need).map(([m, n]) => {
              const have = profile.mats[m] || 0
              return (
                <span
                  key={m}
                  className={`rounded-lg px-2 py-1 font-pixel text-xs ${
                    have >= n ? 'bg-mumu-grass/30 text-white' : 'bg-white/10 text-red-300'
                  }`}
                >
                  {MATERIALS[m]?.icon} {have}/{n}
                </span>
              )
            })}
            <span className="rounded-lg bg-mumu-gold/20 px-2 py-1 font-pixel text-xs text-mumu-gold">
              보상 🟡 골드 {sub.reward.gold}
            </span>
          </div>
        </>
      )
      buttons = ok ? (
        <>
          <Btn
            primary
            onClick={() => {
              onDeliver(sub)
              questState._lastThanks = sub.thanks
              setPhase('thanks')
            }}
          >
            🎁 전달하기
          </Btn>
          <Btn onClick={onClose}>다음에요</Btn>
        </>
      ) : (
        <Btn onClick={onClose}>아직 소재가 부족해요…</Btn>
      )
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-4 pb-8">
      <div className="w-full max-w-lg rounded-2xl border-2 border-white/20 bg-black/75 p-4 backdrop-blur-sm">
        <p className="font-pixel text-base font-bold text-mumu-gold">
          {npc.emoji} {npc.name}
        </p>
        <div className="mt-1.5 font-sans text-sm leading-relaxed text-white">{body}</div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">{buttons}</div>
      </div>
    </div>
  )
}
