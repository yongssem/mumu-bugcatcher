// 터치 기기 여부 + 세로/가로 방향 감지
import { useEffect, useState } from 'react'

export function useIsTouch() {
  // 터치 포인터가 있으면 모바일/태블릿으로 간주 (초기 1회 판정)
  // ?touch=1 로 데스크톱에서도 모바일 조작을 미리볼 수 있음
  const [isTouch] = useState(() => {
    if (typeof window === 'undefined') return false
    if (new URLSearchParams(window.location.search).get('touch') === '1') return true
    return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
  })
  return isTouch
}

export function useIsPortrait() {
  const [portrait, setPortrait] = useState(
    () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  )
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])
  return portrait
}
