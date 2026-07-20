// 화면 라우팅: 랜딩 → 메뉴 → (곤충 도감 / 직업 미리보기)
// ※ 오픈월드 채집 루프(GameScreen)는 다음 단계에서 연결 예정
import { useState, useEffect } from 'react'
import Landing from './ui/Landing.jsx'
import Cutscene from './ui/Cutscene.jsx'
import Menu from './ui/Menu.jsx'
import Bugpedia from './ui/Bugpedia.jsx'
import Careers from './ui/Careers.jsx'
import MicroScene from './ui/MicroScene.jsx'
import BugHunt from './ui/BugHunt.jsx'
import Home from './ui/Home.jsx'
import WorldSelect from './ui/WorldSelect.jsx'
import { DEFAULT_HABITAT } from './game/habitats.js'
import { playBgm } from './game/bgm.js'

export default function App() {
  const [screen, setScreen] = useState('landing') // 'landing' | 'intro' | 'menu' | 'pedia' | 'careers' | 'micro' | 'worldselect' | 'hunt' | 'home'
  const [habitat, setHabitat] = useState(DEFAULT_HABITAT) // 선택한 서식지

  // 🎵 BGM — 화면에 맞는 곡 (곤충 오픈월드는 밝은 크리에이터 무드 재사용)
  useEffect(() => {
    if (screen === 'landing' || screen === 'intro' || screen === 'menu' || screen === 'careers' || screen === 'home' || screen === 'worldselect') playBgm('landing')
    else if (screen === 'pedia' || screen === 'micro' || screen === 'hunt') playBgm('creator')
  }, [screen])

  // 📱 글로벌 UI 스케일 — 루트 폰트 크기를 뷰포트에 맞춰 조절
  useEffect(() => {
    const apply = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const size = Math.min(16, Math.max(9.5, Math.min(vw / 34, vh / 38)))
      document.documentElement.style.fontSize = size + 'px'
    }
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [])

  if (screen === 'landing') return <Landing onStart={() => setScreen('intro')} />
  if (screen === 'intro') return <Cutscene onDone={() => setScreen('menu')} />
  if (screen === 'menu') return <Menu onOpen={(k) => setScreen(['pedia', 'careers', 'micro', 'worldselect', 'home'].includes(k) ? k : 'menu')} />
  if (screen === 'pedia') return <Bugpedia onClose={() => setScreen('menu')} />
  if (screen === 'careers') return <Careers onBack={() => setScreen('menu')} />
  if (screen === 'micro') return <MicroScene onBack={() => setScreen('menu')} />
  if (screen === 'worldselect') return <WorldSelect onPick={(hb) => { setHabitat(hb); setScreen('hunt') }} onBack={() => setScreen('menu')} />
  if (screen === 'hunt') return <BugHunt key={habitat} habitat={habitat} onHome={() => setScreen('home')} />
  if (screen === 'home') return <Home onHunt={() => setScreen('worldselect')} onPedia={() => setScreen('pedia')} onMenu={() => setScreen('menu')} />
  return null
}
