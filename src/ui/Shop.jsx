// 골드 상점 — 캐거나 농사지은 골드로 화살·다이너마이트·씨앗·회복·강아지 구매
import { useState } from 'react'
import { SHOP_ITEMS } from '../game/GameEngine.js'
import Footer from './Footer.jsx'

export default function Shop({ engine, onClose }) {
  const [, bump] = useState(0) // 구매 후 강제 리렌더

  if (!engine) return null
  const gold = engine.inventory?.gold || 0

  // 품목별 구매 가능/불가 사유
  const status = (item) => {
    if (item.id === 'dog' && engine.hasDog) return '함께하는 중 🐶'
    if (item.id === 'heal' && engine.player.hp >= 20) return '체력이 가득해요'
    if (item.id === 'arrow5' && engine.ammo.arrow >= 20) return '화살이 가득해요'
    if (item.id === 'dyn1' && engine.ammo.dynamite >= 3) return '가득해요'
    if (gold < item.cost) return '골드 부족'
    return null
  }

  const buy = (id) => {
    engine.buyShopItem(id)
    bump((n) => n + 1)
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <h2 className="font-pixel text-3xl font-bold text-white">🏪 골드 상점</h2>
      <p className="mt-2 flex items-center gap-1.5 font-sans text-sm text-white">
        내 골드: <span className="font-pixel text-lg font-bold text-mumu-gold">{gold}</span>
        <span className="inline-block h-4 w-4 rounded-sm bg-mumu-gold" />
      </p>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-2 px-6">
        {SHOP_ITEMS.map((item) => {
          const blocked = status(item)
          return (
            <button
              key={item.id}
              onClick={() => !blocked && buy(item.id)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                blocked
                  ? 'bg-white/5 opacity-60'
                  : 'bg-white/15 hover:scale-[1.02] hover:bg-white/25 active:scale-95'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-sans text-sm font-bold text-white">{item.name}</span>
              </span>
              <span className="font-pixel text-sm font-bold text-mumu-gold">
                {blocked || `골드 ${item.cost}`}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-4 font-sans text-xs text-white/50">
        골드는 파밍 월드에서 캐거나, 씨앗을 심어 수확하면 얻어요
      </p>

      <button
        onClick={onClose}
        className="mt-6 rounded-xl bg-mumu-grass px-10 py-3 font-pixel text-lg font-bold text-white shadow-[0_4px_0_#4a7d38] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
      >
        게임으로 돌아가기
      </button>

      <Footer />
    </div>
  )
}
