// 독립 포인터 캡처로 이동·시점·액션 동시 조작.
import { useEffect, useRef, useState } from 'react'
export default function Joystick({ onMove }) {
  const pointer = useRef(null), callback = useRef(onMove)
  callback.current = onMove
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const stop = () => { pointer.current = null; setKnob({ x: 0, y: 0 }); callback.current(0, 0) }
  useEffect(() => {
    window.addEventListener('blur', stop)
    return () => { window.removeEventListener('blur', stop); callback.current(0, 0) }
  }, [])
  const move = e => {
    if (pointer.current !== e.pointerId) return
    const b = e.currentTarget.getBoundingClientRect(), radius = b.width * 0.36
    let x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2
    const d = Math.hypot(x, y), scale = Math.min(1, radius / (d || 1))
    x *= scale; y *= scale; setKnob({ x, y })
    const magnitude = Math.max(0, (Math.min(1, d / radius) - 0.12) / 0.88)
    callback.current(d ? x / (d * scale) * magnitude : 0, d ? -y / (d * scale) * magnitude : 0)
  }
  const end = e => { if (pointer.current === e.pointerId) stop() }
  return <div role="group" aria-label="이동 조이스틱"
    onPointerDown={e => { if (pointer.current !== null) return; e.preventDefault(); pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
    onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    className="pointer-events-auto absolute flex items-center justify-center rounded-full border-2 border-white/40 bg-black/35 backdrop-blur-sm"
    style={{ touchAction: 'none', left: 'max(14px, env(safe-area-inset-left))', bottom: 'max(88px, 17vh)', width: 'clamp(104px, 28vmin, 156px)', height: 'clamp(104px, 28vmin, 156px)' }}>
    <span className="pointer-events-none absolute top-1 text-xs text-white/60">▲</span>
    <div className="pointer-events-none rounded-full bg-white/55 shadow-lg" style={{ width: '42%', height: '42%', transform: `translate(${knob.x}px, ${knob.y}px)` }} />
  </div>
}
