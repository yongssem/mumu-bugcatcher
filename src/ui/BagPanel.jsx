// 🎒 가방 — 핫바 단축 슬롯에 넣을 블록을 고른다 (크리에이티브 전용)
// 위: 현재 핫바 8칸(고를 슬롯 선택) / 아래: 모든 블록 팔레트(눌러서 그 슬롯에 배정)
import { useState } from 'react'
import { BLOCK_TYPES, PLACEABLE, blockIconURL, isPlant, BLOCK_PRICE, FOOD_SLOTS as FOODS } from '../game/textures.js'

// 🍖 먹이 — 단축키 5~8 (고기·물·물고기·건초). 고르고 닫은 뒤 던지면 공룡이 주워 먹어요

// 블록 아이콘 — 실제 블록 텍스처 그대로 (식물형은 투명 스프라이트)
function BlockIcon({ type, size = 24 }) {
  const url = blockIconURL(type)
  return (
    <span
      className={`inline-block ${isPlant(type) ? '' : 'rounded-sm border border-black/30'}`}
      style={{
        width: size, height: size,
        backgroundColor: isPlant(type) ? 'transparent' : BLOCK_TYPES[type]?.color,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: isPlant(type) ? 'contain' : 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    />
  )
}

export default function BagPanel({ hotbar, activeSlot = 0, feedItem = null, money = 0, owned = ['dirt'], onAssign, onBuyBlock, onSetFeed, onClose }) {
  const [slot, setSlot] = useState(activeSlot)
  const has = (t) => owned.includes(t)

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-t-2xl border border-white/10 bg-[#241b3a] p-4 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-lg font-bold text-[#ffe9c2]">🎒 가방 · 상점</h2>
          <span className="font-pixel text-sm text-mumu-gold">💰 {money.toLocaleString()}</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 font-sans text-sm text-white/80 hover:bg-white/20"
          >
            닫기 ✕
          </button>
        </div>

        {/* 🍖 먹이 — 고르고 닫은 뒤 던지면 공룡이 먹어요 */}
        <div>
          <p className="mb-1.5 font-sans text-[11px] text-white/55">🍖 먹이 — 단축키 5·6·7·8 (고른 뒤 닫고 클릭해 던지기)</p>
          <div className="grid grid-cols-4 gap-1.5">
            {FOODS.map((f, i) => (
              <button
                key={f.id}
                onClick={() => onSetFeed?.(f.id)}
                className={`relative flex flex-col items-center rounded-lg border-2 py-1.5 transition-all active:scale-95 ${
                  feedItem === f.id ? 'border-mumu-gold bg-white/15' : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="absolute left-1 top-0.5 font-pixel text-[9px] text-white/45">{i + 5}</span>
                <span className="text-xl leading-none">{f.emoji}</span>
                <span className="mt-0.5 font-pixel text-[11px] text-white">{f.name}</span>
                <span className="font-sans text-[9px] text-white/45">{f.diet}</span>
              </button>
            ))}
          </div>
          {feedItem && (
            <p className="mt-1 text-center font-sans text-[10px] text-mumu-gold">
              먹이를 들었어요! 닫고 <b>클릭해서 던지면</b> 공룡이 먹어요 (블록 고르면 해제)
            </p>
          )}
        </div>

        <div className="h-px bg-white/10" />

        {/* 🧱 단축 블록 — 바꿀 슬롯 선택 */}
        <div>
          <p className="mb-1.5 font-sans text-[11px] text-white/55">🧱 단축 블록 (1~4번) — ① 바꿀 칸을 골라요 (가진 블록만)</p>
          <div className="flex flex-wrap gap-1.5">
            {hotbar.slice(0, 4).map((type, i) => (
              <button
                key={i}
                onClick={() => setSlot(i)}
                className={`relative flex h-12 w-12 flex-col items-center justify-center rounded-lg border-2 transition-all ${
                  i === slot ? 'scale-105 border-mumu-gold bg-white/15' : 'border-white/20 bg-black/30'
                }`}
              >
                <BlockIcon type={type} size={24} />
                <span className="absolute left-0.5 top-0.5 font-pixel text-[9px] text-white/60">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 블록 팔레트 — 가진 블록은 슬롯 배정, 안 가진 블록은 💰로 구매 */}
        <div>
          <p className="mb-1.5 font-sans text-[11px] text-white/55">② 넣을 블록을 눌러요 (🔒는 사면 열려요)</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {PLACEABLE.map((type) => {
              const owns = has(type)
              const inSlot = hotbar[slot] === type
              const price = BLOCK_PRICE[type]
              const poor = !owns && (price == null || money < price)
              return (
                <button
                  key={type}
                  onClick={() => (owns ? onAssign(slot, type) : onBuyBlock?.(type))}
                  title={owns ? BLOCK_TYPES[type]?.name : `${BLOCK_TYPES[type]?.name} 구매 💰${price ?? '-'}`}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 py-1.5 transition-all active:scale-95 ${
                    inSlot ? 'border-mumu-gold bg-white/15' : owns ? 'border-white/15 bg-white/5 hover:bg-white/10' : poor ? 'border-white/10 bg-black/20 opacity-55' : 'border-mumu-gold/40 bg-mumu-gold/10 hover:bg-mumu-gold/20'
                  }`}
                >
                  <BlockIcon type={type} size={28} />
                  <span className="mt-0.5 font-sans text-[10px] text-white/80">{BLOCK_TYPES[type]?.name}</span>
                  {owns ? null : (
                    <span className={`font-pixel text-[9px] leading-none ${poor ? 'text-red-400' : 'text-mumu-gold'}`}>💰{price ?? '-'}</span>
                  )}
                  {!owns && <span className="absolute right-0.5 top-0.5 text-[10px]">🔒</span>}
                </button>
              )
            })}
          </div>
        </div>
        <p className="text-center font-sans text-[11px] text-white/45">
          가진 블록은 {slot + 1}번 칸에 들어가고 · 🔒 블록은 눌러서 사요
        </p>
      </div>
    </div>
  )
}
