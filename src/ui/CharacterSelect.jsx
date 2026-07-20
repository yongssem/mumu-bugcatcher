// 🎨 캐릭터 꾸미기 — 피부·머리·옷·모자를 자유 조합 + 회전 3D 미리보기 (프로필에 저장, 두 모드 공유)
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SKINS, loadLook } from '../game/skins.js'
import { makeCharacter, animateCharacter } from '../game/Character.js'
import { setProfileLook } from '../save/profile.js'
import Footer from './Footer.jsx'

// ---------- 옵션 팔레트 ----------
const SKIN_TONES = ['#F5D0AE', '#F0C8A0', '#E8B08A', '#D9A06A', '#B07850', '#8a5a3a', '#6a4028']
const HAIR_COLORS = ['#2e2018', '#4a3220', '#6a3a1a', '#141414', '#D9A441', '#B5654D', '#8a8f98', '#C0392B', '#3a6ea5']
const CLOTH_COLORS = ['#5F7A3A', '#4a7ab5', '#C0392B', '#F2C14E', '#9aa0aa', '#D96A8B', '#7a5233', '#33a6a6', '#3b5b8c', '#6a4c9c', '#2b2b2b', '#EDE6D6']
const HAIRS = [['bowl', '바가지'], ['bangs', '앞머리'], ['long', '긴머리'], ['band', '머리띠'], ['bald', '민머리']]
const OUTFITS = [['fur', '가죽옷'], ['plain', '기본옷'], ['armor', '갑옷'], ['dress', '원피스'], ['robe', '로브']]
const HATS = [['none', '없음'], ['cap', '모자'], ['straw', '밀짚'], ['dino', '공룡'], ['crown', '왕관'], ['party', '고깔'], ['bow', '리본']]

// 랜덤 룩
function randomLook() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)]
  return {
    skin: pick(SKIN_TONES), hairColor: pick(HAIR_COLORS), hair: pick(HAIRS)[0],
    bun: Math.random() < 0.3, bandColor: pick(CLOTH_COLORS),
    top: pick(CLOTH_COLORS), pants: pick(CLOTH_COLORS), shoes: pick(HAIR_COLORS),
    outfit: pick(OUTFITS)[0], hat: pick(HATS)[0], hatColor: pick(CLOTH_COLORS),
    glasses: Math.random() < 0.25, beard: Math.random() < 0.2 ? pick(HAIR_COLORS) : null,
  }
}

// 회전 3D 미리보기 — 렌더러는 1회 생성, 룩이 바뀌면 캐릭터만 교체
function Preview({ look }) {
  const mountRef = useRef(null)
  const stateRef = useRef(null)
  useEffect(() => {
    const mount = mountRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const resize = () => renderer.setSize(mount.clientWidth, mount.clientHeight)
    resize()
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight('#ffffff', '#55606a', 1.15))
    const sun = new THREE.DirectionalLight('#fff6e0', 1.0); sun.position.set(3, 6, 5); scene.add(sun)
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20)
    const setCam = () => { cam.aspect = mount.clientWidth / mount.clientHeight; cam.updateProjectionMatrix() }
    setCam()
    cam.position.set(0, 1.5, 3.9); cam.lookAt(0, 0.92, 0)
    stateRef.current = { scene, char: null }
    let raf, t = 0, last = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt
      const ch = stateRef.current.char
      if (ch) { ch.rotation.y = Math.sin(t * 0.7) * 0.7 + 0.1; animateCharacter(ch, t * 2.0, false) }
      renderer.render(scene, cam)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onResize = () => { resize(); setCam() }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); renderer.dispose(); renderer.domElement.remove() }
  }, [])
  // 룩 변경 → 캐릭터 교체
  useEffect(() => {
    const st = stateRef.current
    if (!st) return
    if (st.char) st.scene.remove(st.char)
    st.char = makeCharacter(look)
    st.scene.add(st.char)
  }, [look])
  return <div ref={mountRef} className="h-full w-full" />
}

// 색 스와치 줄
function Swatches({ colors, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button key={c} onClick={() => onPick(c)}
          className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${value === c ? 'border-white ring-2 ring-mumu-gold' : 'border-black/30'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}

// 옵션 버튼 줄 (스타일 선택)
function Options({ items, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([id, label]) => (
        <button key={id} onClick={() => onPick(id)}
          className={`rounded-lg border-2 px-2.5 py-1 font-pixel text-[11px] transition-all active:scale-95 ${value === id ? 'border-mumu-gold bg-mumu-gold/20 text-white' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl bg-white/5 p-2.5">
      <p className="mb-1.5 font-pixel text-xs text-mumu-gold">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

export default function CharacterSelect({ onDone }) {
  const [look, setLook] = useState(() => ({ ...loadLook() }))
  const set = (patch) => setLook((l) => ({ ...l, ...patch }))

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-gradient-to-b from-mumu-night to-[#2d4a6b] px-3 py-4">
      <h1 className="font-pixel text-2xl font-bold text-white md:text-3xl">🎨 캐릭터 꾸미기</h1>
      <p className="mt-0.5 font-sans text-[11px] text-white/60">나만의 사냥꾼·크리에이터를 만들어요 (두 모드 공통)</p>

      <div className="mt-3 flex w-full max-w-4xl flex-1 flex-col gap-3 overflow-hidden md:flex-row">
        {/* 미리보기 */}
        <div className="flex flex-col items-center rounded-2xl bg-black/20 p-2 md:w-72">
          <div className="h-48 w-full md:h-full">
            <Preview look={look} />
          </div>
          <div className="mt-1 flex gap-2">
            <button onClick={() => setLook(randomLook())}
              className="rounded-lg bg-mumu-gold/90 px-3 py-1.5 font-pixel text-xs font-bold text-[#5a2a00] hover:bg-mumu-gold active:scale-95">
              🎲 랜덤
            </button>
            {SKINS.slice(0, 4).map((s) => (
              <button key={s.id} onClick={() => setLook({ ...s.look })} title={s.name}
                className="rounded-lg border-2 border-white/15 bg-white/5 px-2 py-1.5 font-pixel text-[11px] text-white/70 hover:bg-white/10 active:scale-95">
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* 커스터마이즈 컨트롤 */}
        <div className="grid flex-1 grid-cols-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          <Section title="🧑 피부색">
            <Swatches colors={SKIN_TONES} value={look.skin} onPick={(c) => set({ skin: c })} />
          </Section>
          <Section title="💇 머리">
            <Options items={HAIRS} value={look.hair} onPick={(h) => set({ hair: h })} />
            <Swatches colors={HAIR_COLORS} value={look.hairColor} onPick={(c) => set({ hairColor: c })} />
          </Section>
          <Section title="👕 옷 스타일">
            <Options items={OUTFITS} value={look.outfit} onPick={(o) => set({ outfit: o })} />
          </Section>
          <Section title="🎨 옷 색 / 바지 색">
            <Swatches colors={CLOTH_COLORS} value={look.top} onPick={(c) => set({ top: c })} />
            <Swatches colors={CLOTH_COLORS} value={look.pants} onPick={(c) => set({ pants: c })} />
          </Section>
          <Section title="🎩 모자·장식">
            <Options items={HATS} value={look.hat || 'none'} onPick={(h) => set({ hat: h })} />
            {look.hat && look.hat !== 'none' && (
              <Swatches colors={CLOTH_COLORS} value={look.hatColor} onPick={(c) => set({ hatColor: c })} />
            )}
          </Section>
          <Section title="😎 소품">
            <div className="flex gap-1.5">
              <button onClick={() => set({ glasses: !look.glasses })}
                className={`rounded-lg border-2 px-2.5 py-1 font-pixel text-[11px] active:scale-95 ${look.glasses ? 'border-mumu-gold bg-mumu-gold/20 text-white' : 'border-white/15 bg-white/5 text-white/70'}`}>
                👓 안경
              </button>
              <button onClick={() => set({ beard: look.beard ? null : (look.hairColor || '#4a3220') })}
                className={`rounded-lg border-2 px-2.5 py-1 font-pixel text-[11px] active:scale-95 ${look.beard ? 'border-mumu-gold bg-mumu-gold/20 text-white' : 'border-white/15 bg-white/5 text-white/70'}`}>
                🧔 수염
              </button>
            </div>
          </Section>
        </div>
      </div>

      <button
        onClick={() => { setProfileLook(look); onDone() }}
        className="mt-3 rounded-xl bg-mumu-gold px-10 py-3 font-pixel text-lg font-bold text-[#5a2a00] shadow-[0_5px_0_#b9702b] transition-transform hover:scale-105 active:translate-y-1 active:shadow-[0_1px_0_#b9702b]"
      >
        ✓ 이 모습으로 저장!
      </button>
    </div>
  )
}
