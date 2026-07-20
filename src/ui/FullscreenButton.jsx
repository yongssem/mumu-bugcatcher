// 전체화면 토글 버튼 — 모바일 주소창 때문에 화면이 잘리는 문제 해결.
// 카톡 등 인앱 브라우저는 Fullscreen API를 지원 안 하기도 함 → 버튼은 항상 보이게 하고,
// 지원 안 하면 "다른 브라우저로 열기" 안내(onHint)로 유도.
import { useEffect, useState } from 'react'

function fsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

function fsSupported() {
  return (
    typeof document !== 'undefined' &&
    !!(document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.mozRequestFullScreen)
  )
}

export function requestFs() {
  const el = document.documentElement
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
  if (fn) fn.call(el)
}

function exitFs() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen
  if (fn) fn.call(document)
}

// 전체화면 아이콘 (네 모서리) — 이모지는 폰에서 안 뜨는 경우가 많아 SVG로
function FsIcon({ on, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      {on ? (
        <>
          <path d="M9 4v5H4" /><path d="M15 4v5h5" /><path d="M9 20v-5H4" /><path d="M15 20v-5h5" />
        </>
      ) : (
        <>
          <path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" />
        </>
      )}
    </svg>
  )
}

export default function FullscreenButton({ className = '', compact = false, onHint }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    const sync = () => setOn(!!fsElement())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  const handle = () => {
    if (fsElement()) { exitFs(); return }
    if (fsSupported()) { requestFs(); return }
    // 카톡 인앱 브라우저 등 미지원 — 안내
    onHint?.('이 브라우저는 전체화면이 안 돼요 😥 우측 상단 ⋮ 메뉴 → "다른 브라우저로 열기"로 열면 꽉 찬 화면으로 즐길 수 있어요!')
  }

  // 항상 보이게 — 미지원 환경(카톡 등)에서도 사라지지 않도록
  if (compact) {
    return (
      <button
        onClick={handle}
        title={on ? '전체화면 나가기' : '전체화면'}
        className={`pointer-events-auto flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95 ${className}`}
      >
        <FsIcon on={on} />
        <span>{on ? '해제' : '전체화면'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={handle}
      title={on ? '전체화면 나가기' : '전체화면'}
      className={`flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-2 font-sans text-sm text-white/85 backdrop-blur-sm transition-colors hover:bg-black/60 ${className}`}
    >
      <FsIcon on={on} size={16} />
      <span>{on ? '전체화면 해제' : '전체화면'}</span>
    </button>
  )
}
