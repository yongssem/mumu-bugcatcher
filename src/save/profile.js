// 플레이어 프로필 — 사냥으로 모은 소재·골드와 제작한 장비 (마을·스테이지 간 유지)
// 키: mumubug:profile:v1 / 구조: { mats: { bone, hide, tooth, gold }, crafted: {} }
// 지형/블록은 스테이지마다 새로 생성되므로 저장하지 않음 (인스턴스형 사냥터)

export const PROFILE_KEY = 'mumubug:profile:v1'

// 스테이지↔마을을 넘나들며 유지되는 소재/화폐 키 (블록은 스테이지 일회성)
export const MAT_KEYS = ['bone', 'hide', 'tooth', 'gold']

function emptyProfile() {
  return { mats: { bone: 0, hide: 0, tooth: 0, gold: 0 }, crafted: {}, skin: 'mumu' }
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return emptyProfile()
    const data = JSON.parse(raw)
    return {
      mats: { bone: 0, hide: 0, tooth: 0, gold: 0, ...(data.mats || {}) },
      crafted: data.crafted || {},
      skin: data.skin || 'mumu',           // 선택한 프리셋 id (하위호환)
      look: data.look || null,             // 🎨 자유 꾸미기 커스텀 룩 (있으면 우선)
      skinChosen: !!data.skinChosen,       // 한 번이라도 직접 골랐는가
    }
  } catch {
    return emptyProfile()
  }
}

// 캐릭터 스킨(프리셋)만 갱신
export function setProfileSkin(skinId) {
  const p = loadProfile()
  p.skin = skinId
  p.skinChosen = true
  writeProfile(p)
  return p
}

// 🎨 커스텀 룩 저장 (자유 꾸미기)
export function setProfileLook(look) {
  const p = loadProfile()
  p.look = look
  p.skinChosen = true
  writeProfile(p)
  return p
}

// 실제 사용할 룩 — 커스텀이 있으면 커스텀, 없으면 프리셋
export function effectiveLook() {
  const p = loadProfile()
  if (p.look) return p.look
  // 프리셋 → 룩 (skins.js 순환 참조 피하려고 지연 import는 호출부에서)
  return null
}

export function writeProfile(data) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY)
}
