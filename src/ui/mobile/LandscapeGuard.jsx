import { useLayoutEffect } from 'react'
import { useIsPortrait, useIsTouch } from './useDevice.js'
import OrientationGate from './OrientationGate.jsx'

// 화면을 교체하지 않아 채집·메뉴 상태를 보존한다. 세로에서는 배경 입력도 차단.
export default function LandscapeGuard({ children }) {
  const touch = useIsTouch(), portrait = useIsPortrait()
  const blocked = touch && portrait
  useLayoutEffect(() => {
    if (!blocked) return
    window.dispatchEvent(new Event('mumubug:orientationblocked'))
    const blockKeys = e => { e.stopImmediatePropagation(); if (!['Tab', 'Enter', 'Space'].includes(e.code)) e.preventDefault() }
    window.addEventListener('keydown', blockKeys, true)
    window.addEventListener('keyup', blockKeys, true)
    return () => {
      window.removeEventListener('keydown', blockKeys, true)
      window.removeEventListener('keyup', blockKeys, true)
    }
  }, [blocked])
  return <>
    <div className="h-full w-full" inert={blocked ? '' : undefined} aria-hidden={blocked || undefined}>{children}</div>
    {blocked && <OrientationGate />}
  </>
}
