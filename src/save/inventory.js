// 🎒 곤충월드 인벤토리 저장 (B3) — 채굴 소재 + 제작한 포획 블럭 수량을 누적한다.
// 키: mumubug:inventory:v1 / 구조: { mats: { [소재]: n }, items: { [레시피]: n } }
// 도감(bugpedia)과 분리 — 파밍/제작의 성취를 세션 간에도 유지한다.

export const INVENTORY_KEY = 'mumubug:inventory:v1'

const empty = () => ({ mats: {}, items: {} })

export function loadInventory() {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY)
    if (!raw) return empty()
    const d = JSON.parse(raw)
    if (!d || typeof d !== 'object') return empty()
    return { mats: d.mats && typeof d.mats === 'object' ? d.mats : {}, items: d.items && typeof d.items === 'object' ? d.items : {} }
  } catch {
    return empty()
  }
}

export function saveInventory(inv) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify({ mats: inv.mats || {}, items: inv.items || {} }))
    return true
  } catch {
    return false
  }
}

export function clearInventory() {
  localStorage.removeItem(INVENTORY_KEY)
}

// 소재 n개 추가 → 갱신된 인벤토리 반환
export function addMaterial(inv, mat, n = 1) {
  inv.mats[mat] = (inv.mats[mat] || 0) + n
  saveInventory(inv)
  return inv
}

// 레시피 제작: 소재 차감 + 아이템 +1 (소재 부족이면 false)
export function craftItem(inv, recipe) {
  for (const [m, n] of Object.entries(recipe.cost)) {
    if ((inv.mats[m] || 0) < n) return false
  }
  for (const [m, n] of Object.entries(recipe.cost)) inv.mats[m] -= n
  inv.items[recipe.id] = (inv.items[recipe.id] || 0) + 1
  saveInventory(inv)
  return true
}

// 제작품 1개 사용 (없으면 false)
export function useItem(inv, id) {
  if ((inv.items[id] || 0) <= 0) return false
  inv.items[id] -= 1
  saveInventory(inv)
  return true
}
