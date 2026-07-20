// 사망 화면 — 밝은 톤, 무섭지 않게. 건축물은 유지된다는 안심 메시지
export default function DeathScreen({ onRespawn }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-mumu-night/80 backdrop-blur-sm">
      <span className="text-6xl">😵</span>
      <h2 className="mt-4 font-pixel text-3xl font-bold text-white">앗! 쓰러졌어요</h2>
      <p className="mt-3 font-sans text-sm text-white/70">
        괜찮아요, 내가 만든 건축물은 <b className="text-mumu-gold">그대로</b> 있어요.
      </p>
      <button
        onClick={onRespawn}
        className="mt-8 rounded-xl bg-mumu-grass px-10 py-4 font-pixel text-xl font-bold text-white shadow-[0_5px_0_#4a7d38] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
      >
        🌱 다시 일어나기
      </button>
      <p className="mt-4 font-sans text-xs text-white/40">운동장 가운데에서 다시 시작해요</p>
    </div>
  )
}
