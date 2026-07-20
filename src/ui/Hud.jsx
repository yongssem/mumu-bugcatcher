// HUD — 십자선·핫바·시계·미니맵·체력·소재·장비 (게임 캔버스 위 오버레이, 클릭 통과)
import { BLOCK_TYPES, HOTBAR, blockIconURL, isPlant, FOOD_SLOTS } from '../game/textures.js'
// 핫바(hotbar prop)가 없으면 기본 HOTBAR 사용
import { MATERIALS } from '../game/craft.js'
import FullscreenButton from './FullscreenButton.jsx'

function Hearts({ hp }) {
  // hp 20 = 하트 10개 (2씩)
  return (
    <div className="flex flex-wrap gap-0.5" style={{ maxWidth: '9rem' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="text-sm drop-shadow">
          {hp >= (i + 1) * 2 ? '❤️' : '🤍'}
        </span>
      ))}
    </div>
  )
}

function Clock({ time }) {
  const pct = Math.round(time.t * 100)
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5">
      <span className="font-pixel text-xs font-bold text-mumu-gold">{time.day || 1}일차</span>
      <span className="text-base">{time.isNight ? '🌙' : '☀️'}</span>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full rounded-full ${time.isNight ? 'bg-indigo-300' : 'bg-mumu-gold'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-pixel text-xs text-white/80">{time.isNight ? '밤' : '낮'}</span>
    </div>
  )
}

// 서바이벌 도구·무기 6종 (맨손/곡괭이/칼/활/다이너마이트/씨앗)
const WEAPONS = [
  { id: 'hand', icon: '✊', name: '맨손', key: 'V' },
  { id: 'pickaxe', icon: '⛏️', name: '곡괭이', key: 'B' },
  { id: 'sword', icon: '🗡️', name: '칼', key: 'Z' },
  { id: 'bow', icon: '🏹', name: '활', key: 'X', ammo: 'arrow' },
  { id: 'dynamite', icon: '🧨', name: '폭탄', key: 'C', ammo: 'dynamite' },
  { id: 'seed', icon: '🌱', name: '씨앗', key: 'G', ammo: 'seed' },
]

export default function Hud({
  hotbarIndex,
  inventory,
  hp,
  mode,
  time,
  minimapRef,
  weapon,
  blockSelected,
  ammo,
  crafted,
  onSelectWeapon,
  onSelectBlock,
  onPause,
  onOpenShop,
  onOpenCraft,
  onOpenDinopedia,
  onOpenZoo,
  onOpenBag,
  hotbar = HOTBAR,
  muted,
  onToggleMute,
  onHint,
  money = 0,
  channel = { created: false, subs: 0 },
  day = 1,
  onOpenChannel,
  feedItem = null,
  onSelectFood,
  heldDino = null,
  onGrabDino,
  onSellHeld,
  onOpenIsland,
}) {
  const survival = mode === 'survival'
  const creative = mode === 'creative' // 🦕 공룡 동물원
  // 장착 중인 장비 배지 (최상위 무기 + 갑옷)
  const gearBadges = []
  if (crafted?.toothSpear) gearBadges.push('🦷 이빨 창')
  else if (crafted?.boneSword) gearBadges.push('🦴 뼈 검')
  if (crafted?.hideArmor) gearBadges.push('🛡️ 가죽 갑옷')
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* 십자선 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-pixel text-2xl text-white/80 drop-shadow">
        +
      </div>

      {/* 좌상단: 체력 + 공룡 소재 + 장착 장비 (서바이벌) */}
      {survival && (
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <div className="rounded-lg bg-black/30 p-2">
            <Hearts hp={hp} />
          </div>
          {/* 소재 카운터 — 하나라도 있으면 표시 */}
          {Object.keys(MATERIALS).some((m) => (inventory?.[m] ?? 0) > 0) && (
            <div className="flex gap-2 rounded-lg bg-black/30 px-2.5 py-1">
              {Object.entries(MATERIALS).map(([id, m]) =>
                (inventory?.[id] ?? 0) > 0 ? (
                  <span key={id} className="font-pixel text-xs text-white">
                    {m.icon}
                    <span className={m.rare ? 'text-mumu-eye' : ''}>×{inventory[id]}</span>
                  </span>
                ) : null
              )}
            </div>
          )}
          {/* 장착 장비 배지 */}
          {gearBadges.map((g) => (
            <div key={g} className="rounded-lg bg-mumu-dino/50 px-2.5 py-0.5 font-pixel text-[11px] text-white">
              {g}
            </div>
          ))}
        </div>
      )}

      {/* 좌상단(동물원): 코인 + 구독자 */}
      {creative && (
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-black/45 px-3 py-1.5 font-pixel text-sm text-mumu-gold">
            💰 {money.toLocaleString()}
          </div>
          {channel.created && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[#c00]/70 px-3 py-1 font-pixel text-xs text-white">
              ▶ 구독자 {channel.subs.toLocaleString()}명
            </div>
          )}
        </div>
      )}

      {/* 우상단: 일시정지·음소거 버튼 + 시계 + 미니맵 */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {survival && (
            <>
              <button
                onClick={onOpenDinopedia}
                className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
              >
                📖 도감 <span className="text-white/50">(P)</span>
              </button>
              <button
                onClick={onOpenCraft}
                className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
              >
                🔨 제작 <span className="text-white/50">(F)</span>
              </button>
              <button
                onClick={onOpenShop}
                className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
              >
                🏪 상점 <span className="text-white/50">(E)</span>
              </button>
            </>
          )}
          {creative && (
            <>
              <button
                onClick={onOpenChannel}
                className={`pointer-events-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-pixel text-xs text-white active:scale-95 ${
                  channel.created ? 'bg-[#c00]/80 hover:bg-[#c00]' : day >= 3 ? 'bg-[#c00]/80 hover:bg-[#c00] animate-pulse' : 'bg-black/40 hover:bg-black/60'
                }`}
              >
                ▶ {channel.created ? '채널' : day >= 3 ? '채널 개설! 💰' : `채널 🔒 ${day}/3일`}
                <span className="text-white/55">(Y)</span>
              </button>
              <button
                onClick={onOpenZoo}
                className="pointer-events-auto flex items-center gap-1 rounded-lg bg-mumu-grass/80 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-mumu-grass active:scale-95"
              >
                🦕 공룡 <span className="text-white/60">(G)</span>
              </button>
              <button
                onClick={onOpenIsland}
                className="pointer-events-auto flex items-center gap-1 rounded-lg bg-[#2f6b8f]/80 px-2.5 py-1.5 font-pixel text-xs text-white hover:bg-[#2f6b8f] active:scale-95"
              >
                🏝️ 섬 <span className="text-white/60">(I)</span>
              </button>
            </>
          )}
          <FullscreenButton compact onHint={onHint} />
          <button
            onClick={onToggleMute}
            className="pointer-events-auto flex items-center rounded-lg bg-black/50 px-2.5 py-1.5 text-sm hover:bg-black/70 active:scale-95"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={onPause}
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 font-pixel text-xs text-white hover:bg-black/70 active:scale-95"
          >
            <span className="text-sm">⏸</span> 그만 / 저장
          </button>
        </div>
        <Clock time={time} />
        {/* 미니맵 — 운동장 + 파밍 월드 (2:1 비율) */}
        <canvas
          ref={minimapRef}
          width={160}
          height={80}
          className="rounded-lg border-2 border-white/25 bg-black/40"
        />
      </div>

      {/* 하단 무기 바 (서바이벌) — 블록 핫바 위 */}
      {survival && (
        <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 gap-2 rounded-xl bg-black/40 p-2">
          {WEAPONS.map((w) => {
            const count = w.ammo ? (ammo?.[w.ammo] ?? 0) : null
            const empty = count !== null && count <= 0
            return (
              <button
                key={w.id}
                onClick={() => onSelectWeapon?.(w.id)}
                className={`pointer-events-auto relative flex h-14 w-16 flex-col items-center justify-center rounded-lg border-2 transition-all ${
                  !blockSelected && weapon === w.id
                    ? 'scale-110 border-mumu-gold bg-white/20'
                    : 'border-white/20 bg-black/30'
                } ${empty ? 'opacity-45' : ''}`}
              >
                <span className="text-xl leading-none">{w.icon}</span>
                <span className="mt-0.5 font-sans text-[10px] text-white/90">{w.name}</span>
                <span className="font-pixel text-[9px] text-white/50">{w.key}</span>
                {count !== null && (
                  <span className="absolute right-1 top-0.5 font-pixel text-[11px] font-bold text-white drop-shadow">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 🤲 안는 중 배너 (동물원) */}
      {creative && heldDino && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full bg-[#c98a2b]/85 px-4 py-1.5 font-pixel text-xs text-white">
          🤲 {heldDino.name}{heldDino.baby ? ' 아기' : ''} 안는 중 — 옮길 곳을 보고 놓기(Q) · 팔기(T)
        </div>
      )}

      {/* 🤲 공룡 잡기·놓기·팔기 (동물원 — 몰림 정리). 모바일은 탭, PC는 Q/T키 */}
      {creative && (
        <div className="absolute bottom-28 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <button
            onClick={onGrabDino}
            className={`pointer-events-auto flex items-center gap-1 rounded-xl px-4 py-2 font-pixel text-xs text-white shadow-md active:scale-95 ${
              heldDino ? 'bg-[#c98a2b] hover:brightness-110' : 'bg-black/55 hover:bg-black/70'
            }`}
          >
            {heldDino ? '🖐️ 놓기' : '🤲 공룡 잡기'} <span className="text-white/55">(Q)</span>
          </button>
          {heldDino && (
            <button
              onClick={onSellHeld}
              className="pointer-events-auto flex items-center gap-1 rounded-xl bg-mumu-gold px-4 py-2 font-pixel text-xs font-bold text-[#5a2a00] shadow-md hover:brightness-110 active:scale-95"
            >
              💰 팔기 <span className="text-[#5a2a00]/50">(T)</span>
            </button>
          )}
        </div>
      )}

      {/* 핫바 — 크리에이티브(동물원): 1~4 건축 블록 · 5~8 먹이 · 끝에 가방 */}
      {!survival && (
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-xl bg-black/40 p-2">
        {(creative ? hotbar.slice(0, 4) : hotbar).map((type, i) => {
          const count = inventory ? inventory[type] || 0 : null
          const empty = count !== null && count <= 0
          const active = i === hotbarIndex && (blockSelected ?? true) && !feedItem
          return (
            <button
              key={i}
              onClick={() => onSelectBlock?.(i)}
              className={`pointer-events-auto relative flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 transition-all ${
                active ? 'scale-110 border-mumu-gold bg-white/20' : 'border-white/20 bg-black/30'
              } ${empty ? 'opacity-40' : ''}`}
            >
              <div
                className={isPlant(type) ? 'h-6 w-6' : 'h-6 w-6 rounded-sm border border-black/30'}
                style={{
                  backgroundColor: isPlant(type) ? 'transparent' : BLOCK_TYPES[type].color,
                  backgroundImage: blockIconURL(type) ? `url(${blockIconURL(type)})` : undefined,
                  backgroundSize: isPlant(type) ? 'contain' : 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated',
                }}
              />
              <span className="mt-0.5 font-sans text-[10px] text-white/90">{BLOCK_TYPES[type].name}</span>
              <span className="font-pixel text-[9px] text-white/50">{i + 1}</span>
              {count !== null && (
                <span className="absolute right-0.5 top-0.5 font-pixel text-[10px] font-bold text-white drop-shadow">
                  {count}
                </span>
              )}
            </button>
          )
        })}
        {/* 🍖 먹이 슬롯 5~8 (고기·물·물고기·건초) — 눌러서 손에 들고 클릭해 던지기 */}
        {creative && (
          <>
            <div className="mx-0.5 h-10 w-px bg-white/20" />
            {FOOD_SLOTS.map((f, i) => {
              const on = feedItem === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectFood?.(f.id)}
                  className={`pointer-events-auto relative flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 transition-all ${
                    on ? 'scale-110 border-mumu-gold bg-white/20' : 'border-white/20 bg-black/30'
                  }`}
                >
                  <span className="text-2xl leading-none">{f.emoji}</span>
                  <span className="mt-0.5 font-sans text-[10px] text-white/90">{f.name}</span>
                  <span className="font-pixel text-[9px] text-white/50">{i + 5}</span>
                </button>
              )
            })}
          </>
        )}
        {/* 🎒 가방 — 핫바 끝. 눌러서 핫바 블록을 바꿈 */}
        {creative && (
          <button
            onClick={onOpenBag}
            className="pointer-events-auto ml-1 flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-white/25 bg-mumu-dino/40 hover:bg-mumu-dino/60 active:scale-95"
          >
            <span className="text-2xl leading-none">🎒</span>
            <span className="mt-0.5 font-sans text-[10px] text-white/90">가방 (B)</span>
          </button>
        )}
      </div>
      )}
    </div>
  )
}
