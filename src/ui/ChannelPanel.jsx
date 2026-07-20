// 📺 유튜브 채널 패널 — 3일차부터 개설. 구독자·수익 현황 + 성장 팁 (유튜버 동물원 경영)
export default function ChannelPanel({ money = 0, channel = { created: false, subs: 0, day: 1 }, unlockDay = 3, onCreate, onClose }) {
  const canCreate = channel.day >= unlockDay
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-3"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-white/10 bg-[#1e1728] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-pixel text-lg font-bold text-white">
            <span className="rounded bg-[#c00] px-1.5 py-0.5 text-sm text-white">▶</span> 공룡튜브
          </h2>
          <span className="font-pixel text-sm text-mumu-gold">💰 {money.toLocaleString()}</span>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-2.5 py-1 font-sans text-xs text-white/80 hover:bg-white/20">닫기 ✕</button>
        </div>

        {!channel.created ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="text-5xl">📺</div>
            {canCreate ? (
              <>
                <p className="font-pixel text-base text-white">공룡 동물원을 방송할 준비 완료!</p>
                <p className="font-sans text-xs leading-relaxed text-white/60">
                  채널을 개설하면 관람객(구독자)이 모이고, <b className="text-white/80">광고 수익</b>과 <b className="text-white/80">슈퍼챗</b>으로
                  코인을 벌어 더 멋진 공룡·블록을 살 수 있어요.
                </p>
                <button
                  onClick={onCreate}
                  className="mt-1 rounded-xl bg-[#c00] px-8 py-3 font-pixel text-lg font-bold text-white shadow-[0_4px_0_#800] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
                >
                  🎬 채널 개설하기
                </button>
              </>
            ) : (
              <>
                <p className="font-pixel text-base text-white">아직 준비 중…</p>
                <p className="font-sans text-sm text-white/60">
                  채널은 <b className="text-mumu-gold">{unlockDay}일차</b>부터 만들 수 있어요.
                  <br />지금은 <b className="text-white/80">{channel.day}일차</b> — 그동안 흙으로 우리를 짓고 공룡을 모아 두세요!
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 구독자 현황 */}
            <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-4">
              <span className="font-sans text-xs text-white/50">구독자</span>
              <span className="font-pixel text-4xl font-bold text-white">{channel.subs.toLocaleString()}</span>
              <span className="font-sans text-[11px] text-white/45">명이 우리 동물원을 구독 중 ▶</span>
            </div>

            {/* 하루 수지 — 광고 수익 vs 공룡 운영비 */}
            <div className="rounded-xl bg-white/5 p-3">
              <p className="mb-1.5 text-center font-pixel text-xs text-white/80">📅 하루 수지</p>
              <div className="flex items-center justify-around font-pixel text-xs">
                <span className="text-mumu-gold">📺 +{(channel.adRevenue ?? 0).toLocaleString()}</span>
                <span className="text-white/40">−</span>
                <span className="text-red-300">🍽️ {(channel.upkeep ?? 0).toLocaleString()}</span>
                <span className="text-white/40">=</span>
                <span className={((channel.adRevenue ?? 0) - (channel.upkeep ?? 0)) >= 0 ? 'text-mumu-grass' : 'text-red-400'}>
                  {((channel.adRevenue ?? 0) - (channel.upkeep ?? 0)) >= 0 ? '+' : ''}{((channel.adRevenue ?? 0) - (channel.upkeep ?? 0)).toLocaleString()}
                </span>
              </div>
              <p className="mt-1.5 text-center font-sans text-[10px] leading-snug text-white/45">
                공룡이 많을수록 <b className="text-red-300">운영비</b>가 늘어요 — 구독자를 늘려 광고 수익으로 감당하세요
              </p>
            </div>

            {/* 슈퍼챗 안내 */}
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <p className="font-pixel text-xs text-pink-300">💸 슈퍼챗</p>
              <p className="mt-1 font-sans text-[11px] leading-snug text-white/60">시청자가 보내는 후원! 화면 중앙에 뜨면 <b>탭 또는 C키로 받기</b></p>
            </div>

            {/* 구독자 늘리는 팁 */}
            <div className="rounded-xl bg-mumu-dino/25 p-3">
              <p className="mb-1 font-pixel text-xs text-white/85">🚀 구독자 늘리는 법</p>
              <ul className="space-y-0.5 font-sans text-[11px] leading-relaxed text-white/65">
                <li>🦕 공룡을 더 많이·다양한 종으로 모아요</li>
                <li>😊 먹이·물·넓은 공간으로 행복하게 (행복할수록 인기!)</li>
                <li>🦖 티라노 같은 인기 공룡일수록 구독자가 쑥쑥</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
