// 세로 화면에서는 전체 앱을 막고 가로 방향으로 회전하도록 안내한다.
import { requestFs } from '../FullscreenButton.jsx'
export default function OrientationGate() {
  return (
    <div role="dialog" aria-modal="true" aria-label="가로 화면 전용" className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-mumu-night px-6 text-center" style={{ minHeight: '100dvh', fontSize: 16 }}>
      <div className="animate-pulse text-6xl">📱↻</div>
      <h2 className="mt-6 font-pixel font-bold text-white" style={{ fontSize: 24 }}>기기를 가로로 돌려주세요</h2>
      <p className="mt-3 font-sans text-white/70" style={{ fontSize: 15 }}>
        무무곤충잡이는 <b className="text-mumu-gold">가로 화면</b>에서 즐길 수 있어요
      </p>
      <button autoFocus onClick={() => requestFs()} className="mt-6 rounded-xl bg-[#8FE06B] px-6 py-3 font-pixel text-[#173b18]" style={{ fontSize: 16, minHeight: 48 }}>전체화면 · 가로로 보기</button>
      <p className="mt-4 max-w-sm font-sans leading-relaxed text-white/60" style={{ fontSize: 13 }}>자동으로 회전되지 않으면 기기의 세로 방향 잠금을 풀고 직접 돌려주세요.<br />진행 중인 게임은 잠시 멈춰 있어요.</p>
    </div>
  )
}
