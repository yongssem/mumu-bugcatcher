// 왼쪽 조이스틱 — 터치 드래그로 이동 벡터(-1~1)를 엔진에 전달
// 크기는 vmin 기준(글로벌 폰트 축소의 영향을 안 받음) — 작은 폰에서도 엄지에 맞게 큼
import { useRef, useState } from 'react'

export default function Joystick({ onMove }) {
  const baseRef = useRef(null)
  const touchId = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const handle = (clientX, clientY) => {
    const base = baseRef.current.getBoundingClientRect()
    const cx = base.left + base.width / 2
    const cy = base.top + base.height / 2
    const R = base.width * 0.42 // 최대 반경 = 베이스 크기에 비례 (반응형)
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > R) {
      dx = (dx / dist) * R
      dy = (dy / dist) * R
    }
    setKnob({ x: dx, y: dy })
    // y: 화면 위로 밀면(-dy) 전진(+) → moveY = -dy/R
    onMove(dx / R, -dy / R)
  }

  const start = (e) => {
    const t = e.changedTouches[0]
    touchId.current = t.identifier
    handle(t.clientX, t.clientY)
  }
  const move = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId.current) {
        handle(t.clientX, t.clientY)
        e.preventDefault()
      }
    }
  }
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId.current) {
        touchId.current = null
        setKnob({ x: 0, y: 0 })
        onMove(0, 0)
      }
    }
  }

  return (
    <div
      ref={baseRef}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
      className="pointer-events-auto absolute flex items-center justify-center rounded-full border-2 border-white/30 bg-black/30 backdrop-blur-sm"
      style={{
        touchAction: 'none',
        left: 'max(18px, 4vw)',
        bottom: 'max(18px, 5vh)',
        width: 'clamp(140px, 34vmin, 210px)',
        height: 'clamp(140px, 34vmin, 210px)',
      }}
    >
      <div
        className="rounded-full bg-white/45 shadow-lg"
        style={{ width: '42%', height: '42%', transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
