// 제작대 — 공룡 소재로 장비 만들기 (뼈 검·가죽 갑옷·이빨 창)
// 소스에 독립적: inventory/crafted를 받고, 제작은 onCraft(id)로 위임
// (게임 중: 엔진 / 마을: 프로필)
import { useState } from 'react'
import { RECIPES, MATERIALS, craftBlockedReason } from '../game/craft.js'
import Footer from './Footer.jsx'

export default function Craft({ inventory, crafted, onCraft, onClose }) {
  const [, bump] = useState(0) // 제작 후 강제 리렌더
  const inv = inventory || {}
  const made = crafted || {}

  const make = (id) => {
    if (onCraft?.(id)) bump((n) => n + 1)
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-black/60 py-6 backdrop-blur-sm">
      <h2 className="font-pixel text-3xl font-bold text-white">🔨 제작대</h2>

      {/* 내 소재 */}
      <div className="mt-3 flex gap-4 rounded-xl bg-white/10 px-5 py-2">
        {Object.entries(MATERIALS).map(([id, m]) => (
          <span key={id} className="flex items-center gap-1.5 font-sans text-sm text-white">
            <span className="text-lg">{m.icon}</span>
            {m.name}
            <b className={`font-pixel ${m.rare ? 'text-mumu-eye' : 'text-mumu-gold'}`}>{inv[id] || 0}</b>
          </span>
        ))}
      </div>

      <div className="mt-5 flex w-full max-w-md flex-col gap-3 px-6">
        {RECIPES.map((r) => {
          const done = !!made[r.id]
          const blocked = craftBlockedReason(r, inv, made)
          return (
            <button
              key={r.id}
              onClick={() => !blocked && make(r.id)}
              className={`flex items-start justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                done
                  ? 'border-mumu-grass/60 bg-mumu-grass/15'
                  : blocked
                    ? 'border-white/10 bg-white/5 opacity-70'
                    : 'border-mumu-gold/50 bg-white/15 hover:scale-[1.02] hover:bg-white/25 active:scale-95'
              }`}
            >
              <span className="flex items-start gap-3">
                <span className="text-3xl">{r.icon}</span>
                <span>
                  <span className="flex items-center gap-2 font-sans text-base font-bold text-white">
                    {r.name}
                    {r.rare && (
                      <span className="rounded bg-mumu-eye/30 px-1.5 py-0.5 font-pixel text-[10px] text-mumu-eye">
                        희귀
                      </span>
                    )}
                    {done && <span className="font-pixel text-xs text-mumu-grass">✓ 완성</span>}
                  </span>
                  <span className="mt-0.5 block font-sans text-xs text-white/60">{r.desc}</span>
                  <span className="mt-1 block font-sans text-xs font-bold text-mumu-gold">{r.effect}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {Object.entries(r.cost).map(([m, n]) => {
                  const have = inv[m] || 0
                  return (
                    <span
                      key={m}
                      className={`font-pixel text-xs ${have >= n ? 'text-white/80' : 'text-red-300'}`}
                    >
                      {MATERIALS[m]?.icon} {have}/{n}
                    </span>
                  )
                })}
                {blocked && !done && (
                  <span className="mt-0.5 font-pixel text-[10px] text-red-300">{blocked}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-4 max-w-md px-6 text-center font-sans text-xs text-white/50">
        소재는 공룡을 격퇴하면 얻어요. 🦷 이빨은 희귀해서 가끔만 나와요!
      </p>

      <button
        onClick={onClose}
        className="mt-5 rounded-xl bg-mumu-grass px-10 py-3 font-pixel text-lg font-bold text-white shadow-[0_4px_0_#4a7d38] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
      >
        닫기
      </button>

      <Footer />
    </div>
  )
}
