// 공통 푸터 (CLAUDE.md 11장 — 필수)
export default function Footer({ light = false }) {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 pb-6 text-center">
      <a
        href="https://mumuclass.kr"
        target="_blank"
        rel="noreferrer"
        className={`text-xs ${light ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-300'}`}
      >
        © 2026 무궁무진클래스 · 바이브용샘
      </a>
    </footer>
  )
}
