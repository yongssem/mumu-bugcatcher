// 게임 화면 — 캔버스 위에 HUD·일시정지·사망 오버레이. 엔진 수명주기만 관리
import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '../game/GameEngine.js'
import { syncBgmMute } from '../game/bgm.js'
import { loadSave } from '../save/storage.js'
import { loadProfile } from '../save/profile.js'
import { markCleared } from '../save/progress.js'
import { skinById, loadLook } from '../game/skins.js'
import { DINOS } from '../game/dinoData.js'
import Hud from './Hud.jsx'
import PauseMenu from './PauseMenu.jsx'
import DeathScreen from './DeathScreen.jsx'
import Shop from './Shop.jsx'
import Craft from './Craft.jsx'
import Dinopedia from './Dinopedia.jsx'
import ZooPanel from './ZooPanel.jsx'
import BagPanel from './BagPanel.jsx'
import ChannelPanel from './ChannelPanel.jsx'
import IslandPanel from './IslandPanel.jsx'
import DinoInfo from './DinoInfo.jsx'
import StageClear from './StageClear.jsx'
import { HOTBAR } from '../game/textures.js'
import Joystick from './mobile/Joystick.jsx'
import TouchButtons from './mobile/TouchButtons.jsx'
import OrientationGate from './mobile/OrientationGate.jsx'
import { useIsTouch, useIsPortrait } from './mobile/useDevice.js'

export default function GameScreen({ continuing, mode, stage = null, onExit }) {
  const canvasRef = useRef(null)
  const minimapRef = useRef(null)
  const engineRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)
  const [hotbarIndex, setHotbarIndex] = useState(0)
  const [inventory, setInventory] = useState(null)
  const [hp, setHp] = useState(20)
  const [flash, setFlash] = useState(0) // 피격 시 증가 → 붉은 플래시 리마운트
  const [time, setTime] = useState({ t: 0.15, isNight: false, day: 1 })
  const [weapon, setWeapon] = useState('hand')
  const [blockSelected, setBlockSelected] = useState(true)
  const [ammo, setAmmo] = useState(null)
  const [muted, setMuted] = useState(() => localStorage.getItem('mumubug:muted') === '1')
  const [shopOpen, setShopOpen] = useState(false)
  const [craftOpen, setCraftOpen] = useState(false)
  const [dinopediaOpen, setDinopediaOpen] = useState(false)
  const [zooOpen, setZooOpen] = useState(false) // 🦕 동물원 패널 (크리에이티브)
  const [zooCounts, setZooCounts] = useState({}) // 종별 배치 수
  const [feedItem, setFeedItem] = useState(null) // 🍖 든 먹이 (meat/hay/fish)
  const [bagOpen, setBagOpen] = useState(false) // 🎒 가방 패널 (핫바 설정)
  const [hotbar, setHotbar] = useState(HOTBAR) // 현재 핫바 구성
  const [dinoInfo, setDinoInfo] = useState(null) // 🦕 공룡 공부 카드 (클릭 시)
  const [crafted, setCrafted] = useState({}) // 제작 완료 장비 (HUD 배지)
  const [stageCleared, setStageCleared] = useState(false) // 스테이지 클리어 오버레이
  const [clearLoot, setClearLoot] = useState({}) // 🏆 보스 전리품 요약
  const [bossFlash, setBossFlash] = useState(null) // 🏆 '격파!' 플래시 { id, name }
  const [notice, setNotice] = useState(null) // { id, text } — 상단 토스트
  // 💰 유튜버 동물원 경영
  const [money, setMoney] = useState(0)
  const [owned, setOwned] = useState(['dirt'])
  const [channel, setChannel] = useState({ created: false, subs: 0, day: 1 })
  const [channelOpen, setChannelOpen] = useState(false)
  const [superchats, setSuperchats] = useState([]) // 떠 있는 슈퍼챗들
  const [splashes, setSplashes] = useState([]) // ✨ 슈퍼챗 받기 스플래시
  const [heldDino, setHeldDino] = useState(null) // 🤲 안고 있는 공룡 { id, name, baby }
  const [islandVer, setIslandVer] = useState(0) // 🏝️ 섬 이동 시 증가 → 엔진 재장착
  const [islandOpen, setIslandOpen] = useState(false)
  const [islandInfo, setIslandInfo] = useState({ current: 0, count: 1, names: ['첫 번째 섬'], price: 1000000 })

  // ✨ 화면 중앙에 코인 폭발 스플래시 하나 띄우기 (1.1초 뒤 사라짐)
  const pushSplash = useCallback((amount) => {
    const id = Date.now() + Math.random()
    const coins = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4
      const d = 90 + Math.random() * 80
      return { tx: Math.cos(a) * d, ty: Math.sin(a) * d - 20, rot: Math.random() * 720 - 360, delay: Math.random() * 90 }
    })
    setSplashes((l) => [...l, { id, amount, coins }])
    setTimeout(() => setSplashes((l) => l.filter((s) => s.id !== id)), 1100)
  }, [])
  const isTouch = useIsTouch()
  const portrait = useIsPortrait()

  // 알림 토스트 자동 사라짐
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2800)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    // BGM은 App에서 화면·모드에 맞게 단일 관리 (여기서 재생/정지 안 함)
    // 스테이지: 프로필 소재·장비를 얹은 새 사냥터 / 크리에이티브: 이어하기 또는 새 월드
    let saveData
    const skinTone = loadLook().skin // 선택 캐릭터 피부톤 (1인칭 손)
    if (stage) {
      const profile = loadProfile()
      saveData = { mode: 'survival', stage, mats: profile.mats, crafted: profile.crafted, skinTone }
    } else {
      // 이어하기이거나 섬 이동(islandVer>0) 후면 저장본(현재 섬) 로드, 아니면 새 월드
      saveData = (continuing || islandVer > 0) ? loadSave() : { mode }
      if (saveData) saveData.skinTone = skinTone
      else saveData = { mode, skinTone }
    }
    const engine = new GameEngine(canvasRef.current, saveData, {
      onPause: () => setPaused(true),
      onHotbar: setHotbarIndex,
      onInventory: setInventory,
      onHp: (v, damaged) => {
        setHp(v)
        if (damaged) setFlash((f) => f + 1)
      },
      onDeath: () => setDead(true),
      onTime: setTime,
      onWeapon: (w, bs) => {
        setWeapon(w)
        setBlockSelected(bs)
      },
      onAmmo: setAmmo,
      onCrafted: setCrafted,
      onStageClear: (s, loot) => {
        markCleared(s.id) // 진행도에 클리어 기록
        setClearLoot(loot || {})
        setStageCleared(true)
        engine.pause() // 캔버스가 포인터락을 잡지 않도록 정지 (클리어 버튼 클릭 보장)
      },
      onBossDefeated: (name) => {
        // 🏆 SFC식 '격파!' 플래시 (슬로우모션 동안 화면에 크게)
        setBossFlash({ id: Date.now(), name })
        setTimeout(() => setBossFlash(null), 1600)
      },
      onNotice: (text) => setNotice({ id: Date.now(), text }),
      onOpenShop: () => {
        // E키로 상점 열기 (게임이 스스로 일시정지 + 저장)
        setShopOpen(true)
        engine.pause()
      },
      onOpenCraft: () => {
        setCraftOpen(true)
        engine.pause()
      },
      onOpenDinopedia: () => {
        setDinopediaOpen(true)
        engine.pause()
      },
      onOpenZoo: () => {
        setZooCounts(engine.zooCounts())
        setZooOpen(true)
        engine.pause()
      },
      onZoo: (counts) => setZooCounts(counts),
      onFeed: (food) => setFeedItem(food), // 엔진이 먹이 해제(블록 선택 시)
      onMoney: (v) => setMoney(v),
      onOwned: (list) => setOwned(list),
      onChannel: (ch) => setChannel(ch),
      onSuperchat: (sc) => {
        setSuperchats((list) => [...list, sc])
        setTimeout(() => setSuperchats((list) => list.filter((s) => s.id !== sc.id)), 7000) // 7초 뒤 사라짐(놓침)
      },
      onCollectSuperchats: () => {
        // C키 — 화면의 슈퍼챗을 한 번에 모두 받기 (PC는 포인터락으로 클릭이 어려움)
        setSuperchats((list) => {
          const sum = list.reduce((a, s) => a + s.amount, 0)
          if (sum > 0) { engine.collectSuperchat(sum); pushSplash(sum) }
          else setNotice({ id: Date.now(), text: '받을 슈퍼챗이 없어요' })
          return []
        })
      },
      onHeld: (info) => setHeldDino(info), // 🤲 안고 있는 공룡 표시
      onOpenIsland: () => {
        setIslandInfo(engine.islandInfo())
        setIslandOpen(true)
        engine.pause()
      },
      onReloadWorld: () => {
        // 🏝️ 섬 이동/분양 → 엔진 재장착 (useEffect가 새 현재 섬을 로드)
        setIslandOpen(false)
        setPaused(false)
        setHeldDino(null)
        setIslandVer((v) => v + 1)
      },
      onHotbarConfig: (hb) => setHotbar(hb),
      onOpenBag: () => {
        setBagOpen(true)
        engine.pause()
      },
      onOpenChannel: () => {
        // Y키 — 채널 패널 열기 (게임 정지로 포인터락 해제 → 클릭 가능)
        setChannel(engine.channelState() || { created: false, subs: 0, day: 1 })
        setChannelOpen(true)
        engine.pause()
      },
      onDinoInfo: (data) => {
        setDinoInfo(data)
        engine.pause()
      },
    })
    engineRef.current = engine
    engine.setMinimapCanvas(minimapRef.current)
    if (engine.inventory) setInventory({ ...engine.inventory })
    if (engine.hotbar) setHotbar([...engine.hotbar])
    if (engine.ammo) setAmmo({ ...engine.ammo })
    if (engine.crafted) setCrafted({ ...engine.crafted })
    if (engine.zoo) {
      setMoney(engine.moneyAmount())
      setOwned(engine.ownedBlocks() || ['dirt'])
      setChannel(engine.channelState() || { created: false, subs: 0, day: 1 })
    }
    setHp(engine.player.hp)
    // 데스크톱만 입장 즉시 포인터락 시도 (모바일은 터치 조작이라 불필요)
    if (!isTouch) canvasRef.current.requestPointerLock?.()

    return () => engine.dispose() // 언마운트 시 즉시 저장 포함
  }, [continuing, mode, stage, isTouch, islandVer])

  const resume = () => {
    setPaused(false)
    engineRef.current?.resume()
  }

  const respawn = () => {
    setDead(false)
    engineRef.current?.respawnPlayer()
  }

  const selectWeapon = (w) => engineRef.current?.selectWeapon(w)
  const selectBlock = (i) => engineRef.current?.setHotbar(i)
  const pauseGame = () => engineRef.current?.pause()
  const toggleMute = () => {
    const m = engineRef.current?.toggleMute() ?? false
    setMuted(m)
    syncBgmMute(m) // 🎵 음악(BGM)도 함께 음소거 — 예전엔 효과음만 꺼졌음
  }
  const openShop = () => {
    setShopOpen(true)
    engineRef.current?.pause() // 상점 보는 동안 게임(좀비) 정지 + 자동 저장
  }
  const closeShop = () => {
    setShopOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }
  const openCraft = () => {
    setCraftOpen(true)
    engineRef.current?.pause()
  }
  const closeCraft = () => {
    setCraftOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }
  const openDinopedia = () => {
    setDinopediaOpen(true)
    engineRef.current?.pause()
  }
  const closeDinopedia = () => {
    setDinopediaOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }
  const openZoo = () => {
    setZooCounts(engineRef.current?.zooCounts() || {})
    setZooOpen(true)
    engineRef.current?.pause()
  }
  const closeZoo = () => {
    setZooOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }
  const openBag = () => {
    setBagOpen(true)
    engineRef.current?.pause()
  }
  const closeBag = () => {
    setBagOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }
  const closeChannel = () => {
    setChannelOpen(false)
    setPaused(false)
    engineRef.current?.resume()
  }
  const closeDinoInfo = () => {
    setDinoInfo(null)
    setPaused(false)
    engineRef.current?.resume()
  }
  const showTouch = isTouch && !paused && !dead
  // 실행 버튼에 표시할 아이콘 — 선택한 무기(또는 건축 블록이면 곡괭이)
  const WEAPON_ICONS = { hand: '✊', pickaxe: '⛏️', sword: '🗡️', bow: '🏹', dynamite: '🧨', seed: '🌱' }
  const survivalMode = (engineRef.current?.mode || mode) === 'survival'
  // 실행 버튼 아이콘 — 먹이를 들었으면 먹이/물(던지기), 아니면 무기/곡괭이
  const FEED_ICONS = { meat: '🥩', hay: '🌿', fish: '🐟', water: '💧' }
  const actionIcon = feedItem
    ? FEED_ICONS[feedItem]
    : blockSelected ? '⛏️' : WEAPON_ICONS[weapon] || '✊'

  return (
    <div className="relative h-full w-full bg-mumu-sky">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <Hud
        hotbarIndex={hotbarIndex}
        inventory={inventory}
        hp={hp}
        mode={engineRef.current?.mode || mode}
        time={time}
        minimapRef={minimapRef}
        weapon={weapon}
        blockSelected={blockSelected}
        ammo={ammo}
        crafted={crafted}
        onSelectWeapon={selectWeapon}
        onSelectBlock={selectBlock}
        onPause={pauseGame}
        onOpenShop={openShop}
        onOpenCraft={openCraft}
        onOpenDinopedia={openDinopedia}
        onOpenZoo={openZoo}
        onOpenBag={openBag}
        hotbar={hotbar}
        muted={muted}
        onToggleMute={toggleMute}
        onHint={(text) => setNotice({ id: Date.now(), text })}
        money={money}
        channel={channel}
        day={time.day}
        feedItem={feedItem}
        onSelectFood={(food) => {
          engineRef.current?.setFeedItem(food) // 엔진이 토글 처리 + onFeed로 상태 갱신
        }}
        heldDino={heldDino}
        onGrabDino={() => engineRef.current?.grabDino()}
        onSellHeld={() => engineRef.current?.sellHeldDino()}
        onOpenIsland={() => {
          setIslandInfo(engineRef.current?.islandInfo() || islandInfo)
          setIslandOpen(true)
          engineRef.current?.pause()
        }}
        onOpenChannel={() => {
          setChannel(engineRef.current?.channelState() || channel)
          setChannelOpen(true)
          engineRef.current?.pause()
        }}
      />
      {/* 스테이지 목표 배너 (출동 중) */}
      {stage && !stageCleared && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/45 px-4 py-1 font-pixel text-xs text-white">
          {stage.emoji} {stage.name} · 🎯 {DINOS[stage.dinoId]?.name} 격퇴!
        </div>
      )}

      {/* 상단 알림 토스트 (수확·보스·날씨) */}
      {notice && (
        <div
          key={notice.id}
          className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-xl bg-black/60 px-5 py-2.5 font-pixel text-sm font-bold text-white shadow-lg"
        >
          {notice.text}
        </div>
      )}
      {/* 🍖 먹이 모드 표시 (동물원) */}
      {feedItem && !zooOpen && !bagOpen && !dinoInfo && !paused && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 font-pixel text-xs text-white">
          {feedItem === 'meat' ? '🥩 고기' : feedItem === 'hay' ? '🌿 건초' : feedItem === 'fish' ? '🐟 물고기' : '💧 물'} — 클릭해 던지기! 공룡이 {feedItem === 'water' ? '마셔요' : '주워 먹어요'} (블록 선택하면 해제)
        </div>
      )}
      {/* 피격 플래시 */}
      {flash > 0 && <div key={flash} className="damage-flash pointer-events-none absolute inset-0 z-10" />}

      {/* 모바일/태블릿 터치 조작 */}
      {showTouch && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <Joystick onMove={(x, y) => engineRef.current?.setMoveAxis(x, y)} />
          <TouchButtons
            onBreakStart={() => engineRef.current?.mobileBreakStart()}
            onBreakEnd={() => engineRef.current?.mobileBreakEnd()}
            onPlace={() => engineRef.current?.mobilePlace()}
            onJumpStart={() => engineRef.current?.setJump(true)}
            onJumpEnd={() => engineRef.current?.setJump(false)}
            actionIcon={actionIcon}
            showPlace={!survivalMode}
          />
        </div>
      )}

      {/* 💸 슈퍼챗 — 화면 중앙. 탭(또는 C키)해서 코인 받기 (놓치면 사라짐) */}
      {superchats.length > 0 && !paused && (
        <div className="pointer-events-none absolute left-1/2 top-[28%] z-30 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="rounded-full bg-black/55 px-3 py-1 font-pixel text-[11px] text-white/85">💸 슈퍼챗 도착! 탭 또는 C키로 받기</span>
          {superchats.map((sc) => (
            <button
              key={sc.id}
              onClick={() => {
                engineRef.current?.collectSuperchat(sc.amount)
                setSuperchats((list) => list.filter((s) => s.id !== sc.id))
                pushSplash(sc.amount)
              }}
              className="superchat-pop pointer-events-auto flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-red-500 px-6 py-3 font-pixel text-lg text-white shadow-[0_6px_22px_rgba(0,0,0,0.45)] active:scale-95"
            >
              💸 {sc.from} <span className="font-bold text-yellow-200">+{sc.amount}</span> <span className="text-xs text-white/85">받기!</span>
            </button>
          ))}
        </div>
      )}

      {/* ✨ 받기 스플래시 — 화면 중앙 코인 폭발 */}
      {splashes.map((s) => (
        <div key={s.id} className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden">
          <div className="splash-flash absolute h-44 w-44 rounded-full bg-yellow-300/60" />
          <div className="splash-ring absolute h-24 w-24 rounded-full border-4 border-yellow-200" />
          {s.coins.map((c, i) => (
            <span
              key={i}
              className="splash-coin absolute text-3xl drop-shadow"
              style={{ '--tx': `${c.tx}px`, '--ty': `${c.ty}px`, '--rot': `${c.rot}deg`, animationDelay: `${c.delay}ms` }}
            >
              🪙
            </span>
          ))}
          <span className="splash-text relative font-pixel text-4xl font-bold text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            +{s.amount.toLocaleString()} 💰
          </span>
        </div>
      ))}

      {paused && !shopOpen && !craftOpen && !dinopediaOpen && !zooOpen && !bagOpen && !channelOpen && !dinoInfo && !islandOpen && (
        <PauseMenu onResume={resume} onExit={onExit} muted={muted} onToggleMute={toggleMute} />
      )}
      {islandOpen && (
        <IslandPanel
          info={islandInfo}
          money={money}
          onSwitch={(i) => engineRef.current?.switchIsland(i)}
          onBuy={() => engineRef.current?.buyIsland()}
          onClose={() => {
            setIslandOpen(false)
            setPaused(false)
            engineRef.current?.resume()
          }}
        />
      )}
      {dinoInfo && <DinoInfo dino={dinoInfo} onClose={closeDinoInfo} />}
      {channelOpen && (
        <ChannelPanel
          money={money}
          channel={channel}
          unlockDay={3}
          onCreate={() => {
            engineRef.current?.createChannel()
            setChannel(engineRef.current?.channelState() || channel)
          }}
          onClose={closeChannel}
        />
      )}
      {bagOpen && (
        <BagPanel
          hotbar={hotbar}
          activeSlot={hotbarIndex}
          money={money}
          owned={owned}
          onAssign={(slot, type) => engineRef.current?.setHotbarSlot(slot, type)}
          onBuyBlock={(type) => engineRef.current?.buyBlock(type)}
          feedItem={feedItem}
          onSetFeed={(food) => {
            engineRef.current?.setFeedItem(food) // 엔진이 토글 + onFeed로 상태 갱신
          }}
          onClose={closeBag}
        />
      )}
      {zooOpen && (
        <ZooPanel
          counts={zooCounts}
          total={Object.values(zooCounts).reduce((a, b) => a + b, 0)}
          max={engineRef.current?.zooMax?.() || 16}
          expand={engineRef.current?.zooExpandInfo?.() || null}
          money={money}
          onPlace={(id) => {
            engineRef.current?.placeDino(id)
            setZooCounts(engineRef.current?.zooCounts() || {})
          }}
          onRemove={() => {
            engineRef.current?.removeDino()
            setZooCounts(engineRef.current?.zooCounts() || {})
          }}
          onSell={() => {
            engineRef.current?.sellDino()
            setZooCounts(engineRef.current?.zooCounts() || {})
            setMoney(engineRef.current?.moneyAmount?.() ?? money)
          }}
          onExpand={() => {
            engineRef.current?.expandZoo()
            setZooCounts(engineRef.current?.zooCounts() || {}) // 재렌더 → 확장 현황 갱신
          }}
          onClose={closeZoo}
        />
      )}
      {shopOpen && <Shop engine={engineRef.current} onClose={closeShop} />}
      {craftOpen && (
        <Craft
          inventory={engineRef.current?.inventory}
          crafted={engineRef.current?.crafted}
          onCraft={(id) => engineRef.current?.craftItem(id)}
          onClose={closeCraft}
        />
      )}
      {dinopediaOpen && <Dinopedia onClose={closeDinopedia} />}
      {dead && !stageCleared && <DeathScreen onRespawn={respawn} />}
      {/* 🏆 SFC식 '격파!' 플래시 (슬로우모션 동안) */}
      {bossFlash && (
        <div key={bossFlash.id} className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
          <div className="boss-flash-bg absolute inset-0 bg-white" />
          <div className="boss-flash relative text-center">
            <div className="font-pixel text-2xl text-mumu-gold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{bossFlash.name}</div>
            <div className="font-pixel text-7xl font-bold text-white drop-shadow-[0_0_24px_rgba(255,180,60,0.95)] md:text-8xl">격파!</div>
          </div>
        </div>
      )}
      {stageCleared && <StageClear stage={stage} loot={clearLoot} onContinue={onExit} />}
      {/* 세로 화면이면 가로 안내 (터치 기기 한정) */}
      {isTouch && portrait && <OrientationGate />}
    </div>
  )
}
