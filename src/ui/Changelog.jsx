// 📢 업데이트 소식 위젯 — 기본은 접힌 상태로 최신 1개만, 눌러서 전체 펼침(스크롤)
// 랜딩 좌하단에 반투명 다크 패널로 얹어 씀 (Landing.jsx)
import { useState } from 'react'
import { CHANGELOG } from './changelog.js'

// 한 항목 카드 — 버전(작게) · 제목(강조) · 세부 리스트(· 불릿)
function Entry({ e, latest }) {
  return (
    <div className="border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 font-pixel text-[10px] font-bold ${
            latest ? 'bg-mumu-gold text-[#5a2a00]' : 'bg-white/10 text-white/55'
          }`}
        >
          {e.ver}
        </span>
        <h4 className="font-pixel text-sm text-white">{e.title}</h4>
      </div>
      <ul className="mt-1 space-y-0.5">
        {e.items.map((it, j) => (
          <li key={j} className="flex gap-1.5 font-sans text-[12px] leading-snug text-white/75">
            <span className="text-mumu-gold/70">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Changelog() {
  const [open, setOpen] = useState(false)
  const rest = CHANGELOG.length - 1
  const shown = open ? CHANGELOG : CHANGELOG.slice(0, 1)

  return (
    <div className="w-[min(86vw,20rem)] rounded-xl bg-black/35 p-3 text-left shadow-lg backdrop-blur">
      {/* 헤더 — 제목 + 펼치기/접기 토글 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 active:scale-[0.99]"
      >
        <span className="font-pixel text-sm font-bold text-[#ffe9c2]">📢 업데이트 소식</span>
        <span className="shrink-0 font-sans text-[11px] text-white/70 transition-colors hover:text-white">
          {open ? '접기 ▲' : `이전 소식 ${rest}개 더보기 ▼`}
        </span>
      </button>

      {/* 목록 — 접힘: 최신 1개 / 펼침: 전체(스크롤) */}
      <div className={`mt-2 space-y-2 ${open ? 'max-h-[46vh] overflow-y-auto pr-1' : ''}`}>
        {shown.map((e, i) => (
          <Entry key={e.ver} e={e} latest={i === 0} />
        ))}
      </div>
    </div>
  )
}
