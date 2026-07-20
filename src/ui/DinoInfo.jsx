// 🦕 공룡 공부 카드 — 동물원에서 공룡을 클릭하면 뜨는 정보 팝업 (도감 지식 재사용)
export default function DinoInfo({ dino, onClose }) {
  if (!dino) return null
  const dietColor = dino.diet === '육식' ? 'text-red-300' : 'text-green-300'
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#241b3a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between bg-[#2e2350] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-1.5 font-pixel text-xl font-bold text-[#ffe9c2]">
              🦕 {dino.name}
              {dino._sex && (
                <span className={dino._sex === 'm' ? 'text-sky-300' : 'text-pink-300'}>
                  {dino._sex === 'm' ? '♂' : '♀'}
                </span>
              )}
              {dino._baby && (
                <span className="rounded-full bg-mumu-gold px-1.5 font-sans text-[10px] font-bold text-[#5a2a00]">아기</span>
              )}
            </h2>
            <p className="mt-0.5 font-sans text-xs italic text-white/50">
              {dino.latin} · “{dino.meaning}”
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 font-sans text-sm text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* 기본 정보 */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3">
          <Info label="시대" value={dino.era} />
          <Info label="식성" value={dino.diet} valueClass={dietColor} />
          <Info label="크기" value={dino.size} />
        </div>

        {/* 재미있는 사실 */}
        <div className="px-5 pb-5">
          <p className="mb-1.5 font-pixel text-sm text-mumu-gold">✨ 재미있는 사실</p>
          <ul className="space-y-1.5">
            {dino.facts?.map((f, i) => (
              <li key={i} className="flex gap-2 font-sans text-sm leading-relaxed text-white/80">
                <span className="text-mumu-gold/70">{i + 1}.</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2 text-center">
      <p className="font-sans text-[10px] text-white/45">{label}</p>
      <p className={`mt-0.5 font-pixel text-xs ${valueClass}`}>{value}</p>
    </div>
  )
}
