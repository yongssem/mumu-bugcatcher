import { useEffect, useState } from 'react'
import { sessionOnly } from '../save/safeStorage.js'
export default function StorageNotice() {
  const [temporary, setTemporary] = useState(sessionOnly)
  useEffect(() => {
    const update = () => setTemporary(sessionOnly())
    window.addEventListener('mumubug:storage', update)
    return () => window.removeEventListener('mumubug:storage', update)
  }, [])
  return temporary ? <p role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] bg-amber-100 px-3 py-1 text-center font-sans text-xs text-amber-950">기기 저장 공간이 부족하거나 저장이 차단되었어요. 이번 플레이는 유지되지만 창을 닫으면 새 기록이 사라질 수 있어요.</p> : null
}
