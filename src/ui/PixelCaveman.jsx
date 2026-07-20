// 랜딩 전경의 도스게임풍 픽셀아트 원시인 (몽둥이 든 근육질)
import { useEffect, useRef } from 'react'
import { renderCavemanCanvas } from './pixelCaveman.js'

export default function PixelCaveman({ className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    renderCavemanCanvas(ref.current, 8)
  }, [])
  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        imageRendering: 'pixelated',
        filter: 'drop-shadow(-6px 8px 6px rgba(0,0,0,0.45))',
      }}
    />
  )
}
