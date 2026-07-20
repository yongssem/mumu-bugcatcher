// 일시정지 — Esc(포인터락 해제) 시 표시. 이미 저장 완료 상태
import { useState, useEffect } from 'react'
import Footer from './Footer.jsx'
import FullscreenButton from './FullscreenButton.jsx'
import { getBgmVolume, setBgmVolume } from '../game/bgm.js'

// 💡 게임 팁 — 쉬는 동안 이것저것 돌아가며 보여줘요
const TIPS = [
  '🍖 먹이는 단축키 5·6·7·8! 고기·물·물고기·건초를 손에 들고 클릭해서 던져요.',
  '💧 공룡도 목이 말라요. 연못 근처에 두거나 물(6번)을 던져주면 수분이 차올라요.',
  '🏡 우리가 너무 붐비면 공룡이 답답해해요. 넓게 지어주면 만족도가 올라가요.',
  '🦕 초식공룡은 외로움을 타요 — 같은 종 친구를 곁에 두면 훨씬 행복해져요.',
  '🦖 육식공룡은 좁은 곳에 여럿 모이면 예민해져요. 사이를 넉넉히 띄워주세요.',
  '😊 행복한 공룡은 알(🥚)을 낳고, 채널 구독자도 쑥쑥 늘어나요.',
  '▶ 3일차부터 Y키로 유튜브 채널을 열어 광고·슈퍼챗 수익을 올려요.',
  '💸 슈퍼챗이 화면에 뜨면 탭해서 코인을 받아요 — 놓치면 사라져요!',
  '🧱 핫바 1~4번 블록으로 우리를 짓고, 가방(B)에서 새 블록을 사요.',
  '🦴 헌터스 모드에선 공룡의 머리·꼬리·다리를 공략해 이빨·뼈·가죽을 모아요.',
  '📖 새로 만난 공룡은 클릭해서 도감 정보를 읽어봐요.',
  '🌙 밤이 오면 육식공룡이 나타나요 — 침착하게 대비해요.',
  '🔈 소리는 주변에 방해되지 않게 적당히 맞춰서 즐겨요.',
]

export default function PauseMenu({ onResume, onExit, muted, onToggleMute }) {
  const [vol, setVol] = useState(() => Math.round(getBgmVolume() * 100))
  // 팁을 무작위 시작점부터 4.5초마다 순환
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length))
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 4500)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* 전체화면 버튼 — 카톡에서 나갔다 오면 주소창이 다시 생겨 여기서 다시 켤 수 있게 */}
      <div className="absolute right-3 top-3">
        <FullscreenButton />
      </div>
      <h2 className="font-pixel text-3xl font-bold text-white">잠깐 쉬는 중</h2>
      <p className="mt-2 font-sans text-sm text-mumu-gold">✓ 작품이 저장되었어요</p>

      <button
        onClick={() => setTip((i) => (i + 1) % TIPS.length)}
        className="mt-6 flex min-h-[7rem] w-full max-w-sm flex-col items-center justify-center gap-2 rounded-xl bg-white/10 p-5 text-center transition-colors hover:bg-white/15"
        title="눌러서 다음 팁"
      >
        <h3 className="font-pixel text-sm font-bold text-mumu-gold">💡 게임 팁</h3>
        <p key={tip} className="tip-fade font-sans text-sm leading-relaxed text-white/90">{TIPS[tip]}</p>
        {/* 진행 점 */}
        <div className="mt-1 flex gap-1">
          {TIPS.map((_, i) => (
            <span key={i} className={`h-1 w-1 rounded-full ${i === tip ? 'bg-mumu-gold' : 'bg-white/25'}`} />
          ))}
        </div>
      </button>

      {/* 🎵 음악 볼륨 조절 */}
      <div className="mt-5 flex w-full max-w-sm items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
        <button
          onClick={onToggleMute}
          className="shrink-0 rounded-lg bg-black/30 px-3 py-1.5 text-lg hover:bg-black/50 active:scale-95"
          title={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <span className="shrink-0 font-pixel text-xs text-white/80">음악</span>
        <input
          type="range" min="0" max="100" value={vol}
          onChange={(e) => { const v = Number(e.target.value); setVol(v); setBgmVolume(v / 100) }}
          className="h-2 flex-1 cursor-pointer accent-mumu-gold"
        />
        <span className="w-8 shrink-0 text-right font-pixel text-xs text-mumu-gold">{vol}</span>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={onResume}
          className="rounded-xl bg-mumu-grass px-8 py-3 font-pixel text-lg font-bold text-white shadow-[0_4px_0_#4a7d38] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
        >
          계속하기
        </button>
        <button
          onClick={onExit}
          className="rounded-xl bg-white/15 px-8 py-3 font-pixel text-lg font-bold text-white shadow-[0_4px_0_rgba(255,255,255,0.1)] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none"
        >
          나가기
        </button>
      </div>

      <Footer />
    </div>
  )
}
