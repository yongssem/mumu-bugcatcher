// BGM 플레이어 — public/bgm/*.mp3 루프 재생 (파일이 없으면 조용히 무시)
// 화면별 트랙: 랜딩(+메뉴), 마을 허브. 스테이지·보스는 파일 추가 시 연결
// 음소거는 기존 키(mumubug:muted)를 따름

const MUTE_KEY = 'mumubug:muted'
const VOL_KEY = 'mumubug:bgmvol'
function readSetting(key) { try { return localStorage.getItem(key) } catch { return null } }
// 저장된 음악 볼륨 (0~1), 없으면 기본 0.35
let VOLUME = (() => {
  const v = parseFloat(readSetting(VOL_KEY))
  return isNaN(v) ? 0.35 : Math.max(0, Math.min(1, v))
})()

export function getBgmVolume() {
  return VOLUME
}

// 🎵 음악 볼륨 조절 (0~1) — 즉시 반영 + 저장
export function setBgmVolume(v) {
  VOLUME = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.35
  try { localStorage.setItem(VOL_KEY, String(VOLUME)) } catch { /* 저장 차단 시 이번 재생에만 반영 */ }
  if (current && !isMuted()) current.volume = VOLUME
}

// 트랙 이름 → 파일 경로 (public/bgm/ 아래에 이 이름으로 넣으면 됨)
const TRACKS = {
  landing: '/bgm/landing.mp3',   // 1. 랜딩 페이지 (+메뉴까지 이어짐)
  village: '/bgm/village.mp3',   // 2. 마을 허브
  field: '/bgm/field.mp3',       // 3-1. 농촌(들판) — 파일 추가 시 사용
  water: '/bgm/water.mp3',       // 3-2. 어촌(물가)
  mountain: '/bgm/mountain.mp3', // 3-3. 산촌(산)
  boss: '/bgm/boss.mp3',         // 4. 보스전
  creator: '/bgm/creator.mp3',   // 5. 공룡 동물원(크리에이티브)
}

let current = null
let currentName = null

function isMuted() {
  return readSetting(MUTE_KEY) === '1'
}

export function playBgm(name) {
  if (currentName === name) return // 같은 곡이면 이어서
  stopBgm()
  const src = TRACKS[name]
  if (!src) return
  const audio = new Audio(src)
  audio.loop = true
  audio.volume = isMuted() ? 0 : VOLUME
  // 파일이 없거나(404) 로드 실패 → 조용히 무시 (기존 무음/칩튠 유지)
  audio.onerror = () => {
    if (current === audio) {
      current = null
      currentName = null
    }
  }
  audio.play().catch(() => {
    // 자동재생 차단(첫 방문 랜딩 등) → 첫 입력에서 재시도
    const kick = () => {
      cleanup()
      if (current === audio) audio.play().catch(() => {})
    }
    const cleanup = () => {
      window.removeEventListener('pointerdown', kick)
      window.removeEventListener('keydown', kick)
    }
    window.addEventListener('pointerdown', kick, { once: true })
    window.addEventListener('keydown', kick, { once: true })
    audio._cleanupKick = cleanup
  })
  current = audio
  currentName = name
}

export function stopBgm() {
  if (!current) return
  current._cleanupKick?.()
  current.pause()
  current.src = ''
  current = null
  currentName = null
}

// 게임 HUD 음소거 토글과 연동용 (BGM 볼륨만 조절)
export function syncBgmMute(muted) {
  if (current) current.volume = muted ? 0 : VOLUME
}
