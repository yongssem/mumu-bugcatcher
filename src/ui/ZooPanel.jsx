// 🦕 공룡 동물원 패널 (크리에이티브 전용) — 공룡 배치 / 치우기 / 배치 수 표시
// 종을 누르면 지금 바라보는 지면에 평화로운 공룡이 놓인다 (미니 쥬라기월드)
import { DINOS, DINO_PRICE } from '../game/dinoData.js'

// 배치 가능한 종 + 카드 이모지 (초식 → 육식 → 익룡 → 수룡)
const ZOO_SPECIES = [
  // 초식(4족·조각·후두류)
  { id: 'brachiosaurus', emoji: '🦕' },
  { id: 'diplodocus', emoji: '🦕' },
  { id: 'stegosaurus', emoji: '🦕' },
  { id: 'kentrosaurus', emoji: '🦕' },
  { id: 'triceratops', emoji: '🦕' },
  { id: 'ankylosaurus', emoji: '🦕' },
  { id: 'iguanodon', emoji: '🦕' },
  { id: 'parasaurolophus', emoji: '🦕' },
  { id: 'pachycephalosaurus', emoji: '🦕' },
  // 육식(수각류)
  { id: 'compy', emoji: '🐔' },
  { id: 'velociraptor', emoji: '🦎' },
  { id: 'dilophosaurus', emoji: '🦖' },
  { id: 'allosaurus', emoji: '🦖' },
  { id: 'carnotaurus', emoji: '🦖' },
  { id: 'trex', emoji: '🦖' },
  { id: 'giganotosaurus', emoji: '🦖' },
  { id: 'spinosaurus', emoji: '🦖' },
  // 익룡·수룡
  { id: 'pteranodon', emoji: '🦅' },
  { id: 'rhamphorhynchus', emoji: '🦇' },
  { id: 'mosasaurus', emoji: '🐊' },
  { id: 'plesiosaurus', emoji: '🐢' },
]

// 🗺️ 부지 확장 — 확장 현황 카드 (구독자 목표 달성 시 +16마리)
function ExpandCard({ expand, total, max, onExpand }) {
  if (!expand) return null
  const { level, subs, nextSubs, maxLevel, canExpand } = expand
  const pct = nextSubs ? Math.min(100, Math.round((subs / nextSubs) * 100)) : 100
  return (
    <div className="rounded-xl bg-black/25 p-2.5">
      <div className="mb-1 flex items-center justify-between font-pixel text-[11px]">
        <span className="text-white/85">🗺️ 동물원 부지 <span className="text-mumu-gold">Lv.{level}/{maxLevel}</span></span>
        <span className="text-white/60">최대 {max}마리 (지금 {total})</span>
      </div>
      {nextSubs != null ? (
        <>
          <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#c00]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-[10px] text-white/55">
              ▶ 구독자 {subs.toLocaleString()} / {nextSubs.toLocaleString()}명
            </span>
            <button
              onClick={onExpand}
              disabled={!canExpand}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-pixel text-[11px] transition-all active:scale-95 ${
                canExpand ? 'bg-mumu-grass text-white hover:brightness-110 animate-pulse' : 'cursor-not-allowed bg-white/10 text-white/40'
              }`}
            >
              {canExpand ? '🗺️ 부지 확장! (+16)' : '🔒 구독자 더 모으기'}
            </button>
          </div>
        </>
      ) : (
        <p className="text-center font-pixel text-[11px] text-mumu-gold">🎉 최대까지 확장 완료! (96마리)</p>
      )}
    </div>
  )
}

export default function ZooPanel({ counts = {}, total = 0, max = 16, money = 0, expand = null, onPlace, onRemove, onSell, onExpand, onClose }) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-2"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-[#241b3a] p-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-base font-bold text-[#ffe9c2]">🦕 공룡 상점</h2>
          <span className="font-pixel text-xs text-mumu-gold">💰 {money.toLocaleString()} · 배치 {total}/{max}</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-2.5 py-1 font-sans text-xs text-white/80 hover:bg-white/20"
          >
            닫기 ✕
          </button>
        </div>

        {/* 종 선택 — 누르면 바라보는 곳에 배치 (촘촘한 4열 카드) */}
        <div className="grid grid-cols-4 gap-1.5">
          {ZOO_SPECIES.map(({ id, emoji }) => {
            const d = DINOS[id]
            if (!d) return null
            const n = counts[id] || 0
            const price = DINO_PRICE[id] ?? 100
            const poor = money < price
            return (
              <button
                key={id}
                onClick={() => onPlace(id)}
                title={`${d.name} · ${d.diet} · 💰${price}`}
                className={`relative flex flex-col items-center rounded-lg border-2 px-1 py-1.5 transition-colors active:scale-95 ${
                  poor ? 'border-white/10 bg-white/5 opacity-45' : 'border-white/15 bg-white/5 hover:border-mumu-gold hover:bg-white/10'
                }`}
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className="mt-0.5 w-full truncate text-center font-pixel text-[10px] leading-tight text-white">{d.name}</span>
                <span className={`font-pixel text-[9px] leading-none ${poor ? 'text-red-400' : 'text-mumu-gold'}`}>💰{price}</span>
                {n > 0 && (
                  <span className="absolute right-0.5 top-0.5 rounded-full bg-mumu-grass px-1 font-pixel text-[9px] font-bold text-white">
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 🗺️ 부지 확장 */}
        <ExpandCard expand={expand} total={total} max={max} onExpand={onExpand} />

        {/* 안내 */}
        <p className="text-center font-sans text-[10px] leading-snug text-white/45">
          🍖 먹이(5·6·7·8)·💧 물로 <b className="text-white/70">행복</b>하게 → 암수는 🥚 알을 낳아요.
          공룡을 <b className="text-mumu-gold">잡아서(Q)</b> 옮기거나 <b className="text-mumu-gold">팔(T)</b> 수 있어요. 방치하면 떠나요 😢
        </p>

        {/* 😊 행복도(만족도) 계산법 — 눌러서 펼치기 */}
        <details className="rounded-lg bg-black/25 px-3 py-2 text-white/75">
          <summary className="cursor-pointer select-none font-pixel text-[11px] text-white/85">
            😊 공룡 행복도(만족도)는 어떻게 정해질까? ▾
          </summary>
          <div className="mt-2 space-y-2 font-sans text-[11px] leading-relaxed">
            <p>행복도는 <b className="text-white/90">세 가지</b>를 합쳐서 정해져요:</p>
            <ul className="space-y-1">
              <li>🍖 <b className="text-white/90">배고픔</b> — 먹이를 던져 채워요 <span className="text-white/45">(비중 40%)</span></li>
              <li>💧 <b className="text-white/90">목마름</b> — 연못 근처거나 물을 주면 채워져요 <span className="text-white/45">(30%)</span></li>
              <li>🏡 <b className="text-white/90">공간 쾌적도</b> — 넓고 알맞은 이웃일수록 좋아요 <span className="text-white/45">(30%)</span></li>
            </ul>
            <p className="mt-1 rounded-md bg-white/5 px-2 py-1.5">
              <b className="text-mumu-gold">🏡 공간 쾌적도</b>는 만점에서 시작해서…
            </p>
            <ul className="space-y-1">
              <li>👥 반경 10칸 안 이웃이 <b className="text-white/90">3마리를 넘으면</b> 붐벼서 점점 낮아져요</li>
              <li>🦕 <b className="text-white/90">초식공룡</b>은 같은 종 친구가 <b>하나도 없으면</b> 외로워해요</li>
              <li>🦖 <b className="text-white/90">육식공룡</b>은 좁은 곳에 <b>여럿(3마리 이상)</b> 모이면 예민해져요</li>
            </ul>
            <p className="mt-1 text-white/60">
              ⚠️ 셋 중 <b className="text-white/90">하나라도 바닥</b>이면 전체 행복도가 크게 떨어져요.
              행복하면 건강이 회복돼 🥚 알을 낳고 <b className="text-white/90">구독자</b>가 늘고, 오래 불행하면 쇠약해져 떠나요 😢
            </p>
            <p className="text-white/45">공룡 머리 위 마크: 😢 아픔 · 🍖 배고픔 · 💧 목마름 · ❤️ 행복</p>
          </div>
        </details>
      </div>
    </div>
  )
}
