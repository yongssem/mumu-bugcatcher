// 오른쪽 액션 버튼 — 실행(선택한 아이템 사용/공격) / 점프. 크리에이티브에선 설치도 표시
// 크기는 vmin/px 기준 — 글로벌 폰트 축소의 영향을 안 받아 작은 폰에서도 엄지에 맞게 큼
function ActionBtn({ label, icon, onStart, onEnd, size, iconSize }) {
  const handlers = {
    onTouchStart: (e) => { e.preventDefault(); onStart?.() },
    onTouchEnd: (e) => { e.preventDefault(); onEnd?.() },
    onTouchCancel: () => onEnd?.(),
    // 데스크톱 테스트 대비 마우스도 지원
    onMouseDown: onStart,
    onMouseUp: onEnd,
  }
  return (
    <button
      {...handlers}
      style={{ touchAction: 'none', width: size, height: size }}
      className="pointer-events-auto flex flex-col items-center justify-center rounded-full border-2 border-white/30 bg-black/40 active:bg-white/30"
    >
      <span style={{ fontSize: iconSize, lineHeight: 1 }}>{icon}</span>
      {label && (
        <span className="text-white/85" style={{ fontSize: 'clamp(11px, 2.6vmin, 14px)', marginTop: 2 }}>
          {label}
        </span>
      )}
    </button>
  )
}

export default function TouchButtons({
  onBreakStart,
  onBreakEnd,
  onPlace,
  onJumpStart,
  onJumpEnd,
  actionIcon = '✊',
  showPlace = false,
}) {
  // 버튼을 한 줄로 두고 핫바 위로 띄운다 → 핫바(가방 포함)·미니맵과 절대 안 겹침
  const BIG = 'clamp(74px, 19vmin, 112px)'
  const BIG_ICON = 'clamp(25px, 7vmin, 40px)'
  const GAP = 'clamp(10px, 2.6vmin, 20px)'
  return (
    <div
      className="pointer-events-none absolute flex items-end"
      style={{ right: 'max(14px, 3.5vw)', bottom: 'max(70px, 12vh)', gap: GAP }}
    >
      {/* 설치 — 크리에이티브(자유 건축)에서만 */}
      {showPlace && <ActionBtn icon="🧱" label="설치" onStart={onPlace} size={BIG} iconSize={BIG_ICON} />}
      {/* 실행 — 선택한 아이템으로 공격/채굴/사용 (꾹 누르면 계속) */}
      <ActionBtn icon={actionIcon} label="실행" onStart={onBreakStart} onEnd={onBreakEnd} size={BIG} iconSize={BIG_ICON} />
      {/* 점프 */}
      <ActionBtn icon="⤴️" label="점프" onStart={onJumpStart} onEnd={onJumpEnd} size={BIG} iconSize={BIG_ICON} />
    </div>
  )
}
