// 세로 화면일 때 "기기를 돌려주세요" 안내 (게임은 가로 전용)
export default function OrientationGate() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-mumu-night px-8 text-center">
      <div className="animate-pulse text-6xl">📱↻</div>
      <h2 className="mt-6 font-pixel text-2xl font-bold text-white">기기를 돌려주세요</h2>
      <p className="mt-3 font-sans text-sm text-white/70">
        무무곤충잡이는 <b className="text-mumu-gold">가로 화면</b>에서 즐길 수 있어요
      </p>
    </div>
  )
}
