// 🏡 집(허브) — B4. 채집에서 복귀해 곤충으로 코인을 버는 곳.
//   🖼️ 전시장(유튜버): 잡은 곤충을 전시하고 방송 → 조회수·슈퍼챗으로 코인
//   🏪 곤충 가게: 여분 표본 판매 · 두 곤충을 번식시켜 새끼를 팔기
// React 전용 화면(게임 렌더 루프와 분리). 3D 미리보기는 BugViewer 재사용.
import { useMemo, useRef, useState } from 'react'
import Footer from './Footer.jsx'
import BugViewer from './BugViewer.jsx'
import { BUGS, BUG_ORDER, RARITY, FAMILIES } from '../game/bugData.js'
import { loadBugpedia, spendExtra } from '../save/bugpedia.js'
import { loadHome, addCoins, setDisplay, addStock, removeStock, bumpStat, DISPLAY_SLOTS } from '../save/home.js'
import { broadcastEarnings, extraSellPrice, breed } from '../game/economy.js'

const famIcon = (id) => FAMILIES[BUGS[id]?.fam]?.icon || '🐛'
const rarityColor = (id) => RARITY[BUGS[id]?.rarity]?.color || '#8FB98F'
const rarityLabel = (id) => RARITY[BUGS[id]?.rarity]?.label || ''

export default function Home({ onHunt, onPedia, onMenu }) {
  const homeRef = useRef(loadHome())
  const [home, setHome] = useState(homeRef.current)
  const [pedia, setPedia] = useState(loadBugpedia())
  const [tab, setTab] = useState('stage') // 'stage' | 'shop'
  const [picker, setPicker] = useState(null) // { slot }
  const [parents, setParents] = useState([null, null])
  const [featured, setFeatured] = useState(null)
  const [live, setLive] = useState(null) // 방송 결과
  const [toast, setToast] = useState(null)
  const [baby, setBaby] = useState(null) // 방금 태어난 새끼 연출

  const sync = () => setHome({ ...homeRef.current })
  const notify = (txt) => setToast({ txt, key: Date.now() + Math.random() })

  // 잡은 곤충 목록 (도감 순서)
  const caught = useMemo(
    () => BUG_ORDER.filter((id) => (pedia[id]?.n || 0) > 0).map((id) => ({ id, n: pedia[id].n })),
    [pedia]
  )
  const displayFeatured = [featured, ...home.display, caught[0]?.id].find(id => BUGS[id]) || null

  // ── 전시장 ──
  const fillSlot = (slot, id) => { setDisplay(homeRef.current, slot, id); sync(); setFeatured(id); setPicker(null) }
  const clearSlot = (slot) => { setDisplay(homeRef.current, slot, null); sync() }
  const doBroadcast = () => {
    const res = broadcastEarnings(home.display)
    if (res.empty) { notify('먼저 곤충을 전시해 주세요 🖼️'); return }
    addCoins(homeRef.current, res.coins)
    bumpStat(homeRef.current, 'views', res.viewers)
    bumpStat(homeRef.current, 'live', 1)
    sync()
    setLive({ ...res, key: Date.now() })
  }

  // ── 가게: 판매 ──
  const sellExtra = (id) => {
    const left = spendExtra(id)
    if (left == null) { notify('여분 표본이 없어요'); return }
    const price = extraSellPrice(id)
    addCoins(homeRef.current, price); bumpStat(homeRef.current, 'sold', 1); sync()
    setPedia(loadBugpedia())
    notify(`💵 ${BUGS[id].name} 표본 판매 +${price}코인`)
  }

  // ── 가게: 번식 ──
  const pickParent = (id) => {
    setParents((p) => {
      if (p[0] === id) return [p[1], null]
      if (p[1] === id) return [p[0], null]
      if (!p[0]) return [id, p[1]]
      if (!p[1]) return [p[0], id]
      return [p[1], id] // 둘 다 찼으면 밀어내기
    })
  }
  const doBreed = () => {
    const [a, b] = parents
    if (!a || !b) { notify('부모 곤충 2마리를 골라 주세요'); return }
    const r = breed(a, b)
    if (!r) return
    addStock(homeRef.current, { id: r.babyId, shiny: r.shiny, price: r.price }); bumpStat(homeRef.current, 'bred', 1); sync()
    setBaby({ ...r, key: Date.now() }); setFeatured(r.babyId)
    setParents([null, null])
  }
  const sellBaby = (idx) => {
    const s = home.stock[idx]; if (!s) return
    addCoins(homeRef.current, s.price); bumpStat(homeRef.current, 'sold', 1)
    removeStock(homeRef.current, idx); sync()
    notify(`🐛 새끼 판매 +${s.price}코인`)
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#7EC8F0] via-[#A7DE7B] to-[#6AB150] text-[#22331a]">
      {/* 상단바 — 코인 · 이동 */}
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-[#2e5a1e]/85 px-4 py-2.5 backdrop-blur">
        <h1 className="font-pixel text-lg text-white md:text-xl">🏡 무무의 집</h1>
        <span className="ml-1 rounded-full bg-[#F2C14E] px-3 py-1 font-pixel text-sm text-[#3a2a08] shadow">💰 {home.coins.toLocaleString()}</span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={onHunt} className="rounded-lg bg-[#8FE06B] px-3 py-1.5 font-pixel text-xs text-[#1e3a14] shadow hover:brightness-105">🥅 채집</button>
          <button onClick={onPedia} className="rounded-lg bg-white/15 px-3 py-1.5 font-pixel text-xs text-white hover:bg-white/25">📖 도감</button>
          <button onClick={onMenu} className="rounded-lg bg-white/15 px-3 py-1.5 font-pixel text-xs text-white hover:bg-white/25">← 메뉴</button>
        </div>
      </div>

      {/* 탭 */}
      <div className="mx-auto mt-4 flex gap-2 px-4">
        <Tab on={tab === 'stage'} onClick={() => setTab('stage')}>🖼️ 전시장</Tab>
        <Tab on={tab === 'shop'} onClick={() => setTab('shop')}>🏪 곤충 가게</Tab>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 pb-6 pt-4">
        {caught.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-white/60 bg-white/40 p-8 text-center">
            <p className="font-pixel text-base text-[#2e5a1e]">아직 잡은 곤충이 없어요!</p>
            <p className="mt-2 font-sans text-sm text-[#3f5a2e]">🥅 채집을 나가 곤충을 잡아오면 전시·번식으로 코인을 벌 수 있어요.</p>
            <button onClick={onHunt} className="mt-4 rounded-xl bg-[#8FE06B] px-5 py-2.5 font-pixel text-sm text-[#1e3a14] shadow-[0_4px_0_#3f7a2e]">🥅 채집하러 가기</button>
          </div>
        )}

        {/* ───── 전시장 ───── */}
        {caught.length > 0 && tab === 'stage' && (
          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            {/* 간판 3D + 방송 */}
            <div className="rounded-2xl border-2 border-white/70 bg-white/55 p-4">
              <div className="relative h-52 overflow-hidden rounded-xl bg-gradient-to-b from-[#dff4ff] to-[#eafbe3]">
                {displayFeatured ? <BugViewer bug={BUGS[displayFeatured]} locked={false} /> : null}
                {displayFeatured && (
                  <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/45 px-2 py-1 font-pixel text-xs text-white">
                    {famIcon(displayFeatured)} {BUGS[displayFeatured].name}
                    <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px]" style={{ background: rarityColor(displayFeatured), color: '#1a1a1a' }}>{rarityLabel(displayFeatured)}</span>
                  </div>
                )}
                {live && (
                  <div key={live.key} className="superchat-pop absolute right-2 top-2 rounded-xl bg-[#E0574F] px-3 py-1.5 text-right font-pixel text-xs text-white shadow-lg">
                    🔴 LIVE · 👀 {live.viewers.toLocaleString()}<br />+{live.coins} 코인{live.superchat ? ` (💸${live.superchat})` : ''}
                  </div>
                )}
              </div>
              <button onClick={doBroadcast} className="mt-3 w-full rounded-xl bg-[#E0574F] py-3 font-pixel text-base text-white shadow-[0_4px_0_#9c342e] active:translate-y-0.5 active:shadow-none">
                📢 방송하기
              </button>
              <p className="mt-2 text-center font-sans text-xs text-[#3f5a2e]">희귀하고 다양한 과(科)를 전시할수록 조회수·코인이 늘어요</p>
            </div>

            {/* 전시 슬롯 */}
            <div className="rounded-2xl border-2 border-white/70 bg-white/45 p-4">
              <p className="font-pixel text-sm text-[#2e5a1e]">전시 슬롯 {home.display.filter(Boolean).length}/{DISPLAY_SLOTS}</p>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {home.display.map((id, i) => (
                  <button key={i} onClick={() => (id ? setFeatured(id) : setPicker({ slot: i }))}
                    onDoubleClick={() => id && clearSlot(i)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-1 text-center transition ${id ? 'border-white bg-white/70' : 'border-dashed border-white/60 bg-white/20 hover:bg-white/35'}`}>
                    {id ? (
                      <>
                        <span className="text-3xl">{famIcon(id)}</span>
                        <span className="mt-0.5 line-clamp-1 font-sans text-[10px] font-bold text-[#22331a]">{BUGS[id].name}</span>
                        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full" style={{ background: rarityColor(id) }} />
                        <span onClick={(e) => { e.stopPropagation(); clearSlot(i) }} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#c8402e] text-[11px] text-white shadow">✕</span>
                      </>
                    ) : (
                      <span className="font-pixel text-2xl text-white/70">＋</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 font-sans text-xs text-[#3f5a2e]">빈 칸(＋)을 눌러 곤충을 전시하고, ✕로 내려요.</p>
            </div>
          </div>
        )}

        {/* ───── 곤충 가게 ───── */}
        {caught.length > 0 && tab === 'shop' && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* 번식 */}
            <div className="rounded-2xl border-2 border-white/70 bg-white/50 p-4">
              <p className="font-pixel text-sm text-[#2e5a1e]">🥚 번식 — 두 곤충을 짝지어요</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#6AB150] bg-white/60 text-center">
                    {parents[i] ? (<><span className="text-3xl">{famIcon(parents[i])}</span><span className="line-clamp-1 font-sans text-[10px] font-bold">{BUGS[parents[i]].name}</span></>) : <span className="font-pixel text-xs text-[#6AB150]">부모 {i + 1}</span>}
                  </div>
                ))}
                <span className="font-pixel text-2xl text-[#3f7a2e]">→</span>
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-[#F2C14E] bg-[#fff7e0]">
                  {baby ? <span className="text-4xl">{baby.shiny ? '✨' : famIcon(baby.babyId)}</span> : <span className="text-3xl">🥚</span>}
                </div>
              </div>
              <button onClick={doBreed} disabled={!parents[0] || !parents[1]}
                className={`mt-3 w-full rounded-xl py-2.5 font-pixel text-sm ${parents[0] && parents[1] ? 'bg-[#8FE06B] text-[#1e3a14] shadow-[0_4px_0_#3f7a2e] active:translate-y-0.5 active:shadow-none' : 'cursor-not-allowed bg-black/10 text-black/30'}`}>
                💞 짝짓기
              </button>
              {baby && (
                <p key={baby.key} className="tip-fade mt-2 text-center font-sans text-xs text-[#2e5a1e]">
                  {baby.shiny ? '✨반짝이 ' : ''}{baby.sameFam ? '순종' : '잡종'} {baby.famLabel} 새끼 탄생! 가게 재고로 (판매가 {baby.price})
                </p>
              )}
              {/* 부모 후보 (잡은 곤충) */}
              <p className="mt-3 font-sans text-[11px] text-[#3f5a2e]">잡은 곤충을 눌러 부모로 골라요 (같은 과끼리 = 비싼 새끼)</p>
              <div className="mt-1.5 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {caught.map(({ id }) => {
                  const on = parents.includes(id)
                  return (
                    <button key={id} onClick={() => pickParent(id)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-[11px] transition ${on ? 'bg-[#3f7a2e] text-white' : 'bg-white/70 text-[#22331a] hover:bg-white'}`}>
                      {famIcon(id)} {BUGS[id].name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 판매 (여분 표본 + 새끼 재고) */}
            <div className="rounded-2xl border-2 border-white/70 bg-white/50 p-4">
              <p className="font-pixel text-sm text-[#2e5a1e]">💵 판매</p>

              {/* 새끼 재고 */}
              {home.stock.length > 0 && (
                <div className="mt-2">
                  <p className="font-sans text-[11px] font-bold text-[#3f5a2e]">🐛 번식한 새끼 재고</p>
                  <div className="mt-1 flex flex-col gap-1.5">
                    {home.stock.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5">
                        <span className="text-xl">{s.shiny ? '✨' : famIcon(s.id)}</span>
                        <span className="font-sans text-xs font-bold">{s.shiny ? '반짝이 ' : ''}{BUGS[s.id]?.name} 새끼</span>
                        <button onClick={() => sellBaby(idx)} className="ml-auto rounded-md bg-[#F2C14E] px-2.5 py-1 font-pixel text-[11px] text-[#3a2a08] hover:brightness-105">+{s.price} 팔기</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 여분 표본 */}
              <p className="mt-3 font-sans text-[11px] font-bold text-[#3f5a2e]">📦 여분 표본 (2마리 이상 잡은 곤충)</p>
              <div className="mt-1 flex max-h-52 flex-col gap-1.5 overflow-y-auto">
                {caught.filter(({ n }) => n > 1).length === 0 && (
                  <p className="rounded-lg bg-white/40 px-2 py-3 text-center font-sans text-xs text-[#3f5a2e]">같은 곤충을 여러 번 잡으면 여분을 팔 수 있어요.</p>
                )}
                {caught.filter(({ n }) => n > 1).map(({ id, n }) => (
                  <div key={id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5">
                    <span className="text-xl">{famIcon(id)}</span>
                    <span className="font-sans text-xs font-bold">{BUGS[id].name}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: rarityColor(id), color: '#1a1a1a' }}>여분 ×{n - 1}</span>
                    <button onClick={() => sellExtra(id)} className="ml-auto rounded-md bg-[#F2C14E] px-2.5 py-1 font-pixel text-[11px] text-[#3a2a08] hover:brightness-105">+{extraSellPrice(id)} 팔기</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 통계 */}
        {caught.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 font-sans text-xs text-[#2e5a1e]">
            <Stat>👀 누적 조회수 {home.stats.views.toLocaleString()}</Stat>
            <Stat>📢 방송 {home.stats.live}</Stat>
            <Stat>🐛 판매 {home.stats.sold}</Stat>
            <Stat>🥚 번식 {home.stats.bred}</Stat>
          </div>
        )}
      </div>

      {/* 곤충 선택 모달 (전시) */}
      {picker && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4" onClick={() => setPicker(null)}>
          <div className="w-full max-w-md rounded-2xl border-2 border-white/70 bg-[#20351a]/95 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-pixel text-base text-white">전시할 곤충 고르기</h3>
              <button onClick={() => setPicker(null)} className="rounded-lg bg-white/20 px-3 py-1 font-pixel text-xs text-white">닫기 ✕</button>
            </div>
            <div className="mt-3 grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {caught.map(({ id }) => (
                <button key={id} onClick={() => fillSlot(picker.slot, id)}
                  className="flex flex-col items-center rounded-xl border border-white/20 bg-white/10 p-2 hover:bg-white/20">
                  <span className="text-3xl">{famIcon(id)}</span>
                  <span className="mt-1 line-clamp-1 font-sans text-[11px] text-white">{BUGS[id].name}</span>
                  <span className="mt-0.5 rounded px-1.5 py-0.5 text-[9px]" style={{ background: rarityColor(id), color: '#1a1a1a' }}>{rarityLabel(id)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.key} className="tip-fade absolute left-1/2 top-[14%] z-40 -translate-x-1/2 rounded-xl bg-[#2e5a1e]/90 px-5 py-2.5 font-pixel text-sm text-white shadow-lg">
          {toast.txt}
        </div>
      )}

      <Footer />
    </div>
  )
}

function Tab({ on, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-t-xl px-5 py-2 font-pixel text-sm transition ${on ? 'bg-white/55 text-[#22331a]' : 'bg-white/25 text-white/90 hover:bg-white/35'}`}>{children}</button>
  )
}
function Stat({ children }) {
  return <span className="rounded-full bg-white/50 px-3 py-1">{children}</span>
}
