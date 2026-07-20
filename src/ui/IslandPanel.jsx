// 🏝️ 섬 분양·이동 패널 — 소유한 섬 목록에서 이동하거나, 100만 코인으로 새 섬을 분양
export default function IslandPanel({ info = { current: 0, count: 1, names: ['첫 번째 섬'], price: 1000000 }, money = 0, onSwitch, onBuy, onClose }) {
  const price = info.price ?? 1000000
  const canBuy = money >= price
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#1b2436] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-pixel text-lg font-bold text-[#bfe6ff]">🏝️ 내 섬들</h2>
          <span className="font-pixel text-sm text-mumu-gold">💰 {money.toLocaleString()}</span>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-2.5 py-1 font-sans text-xs text-white/80 hover:bg-white/20">닫기 ✕</button>
        </div>

        {/* 섬 목록 — 눌러서 이동 */}
        <div className="flex flex-col gap-2">
          {info.names.map((name, i) => {
            const here = i === info.current
            return (
              <button
                key={i}
                onClick={() => !here && onSwitch?.(i)}
                disabled={here}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-95 ${
                  here ? 'cursor-default border-mumu-gold bg-mumu-gold/15' : 'border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2 font-pixel text-sm text-white">
                  🏝️ {name || `${i + 1}번째 섬`}
                </span>
                <span className={`font-pixel text-[11px] ${here ? 'text-mumu-gold' : 'text-white/55'}`}>
                  {here ? '지금 여기 ●' : '🚤 이동'}
                </span>
              </button>
            )
          })}
        </div>

        {/* 새 섬 분양 */}
        <div className="h-px bg-white/10" />
        <button
          onClick={onBuy}
          disabled={!canBuy}
          className={`rounded-xl px-4 py-3 font-pixel text-sm font-bold transition-all active:scale-95 ${
            canBuy ? 'bg-[#2f6b8f] text-white shadow-[0_4px_0_#1d4258] hover:brightness-110' : 'cursor-not-allowed bg-white/10 text-white/40'
          }`}
        >
          🏝️ 새 섬 분양받기 · 💰 {price.toLocaleString()}
        </button>
        <p className="text-center font-sans text-[11px] leading-snug text-white/50">
          코인·구독자·채널은 <b className="text-white/70">모든 섬이 함께</b> 써요 · 섬마다 <b className="text-white/70">공룡·건물·확장</b>은 따로예요.
          {!canBuy && <span className="text-red-300"><br />코인이 {(price - money).toLocaleString()} 더 필요해요</span>}
        </p>
      </div>
    </div>
  )
}
