// 공룡 도감 진행도 저장 — 월드 세이브와 분리 (아이의 누적 지식은 게임을 새로 시작해도 남음)
// 키: mumubug:dinopedia:v1 / 구조: { [dinoId]: { head:bool, tail:bool, leg:bool } }
// 부위는 공룡을 격퇴할 때마다 순서대로 해금되고, 다 모으면 카드 완성(★)

export const DINOPEDIA_KEY = 'mumubug:dinopedia:v1'

export function loadDinopedia() {
  try {
    const raw = localStorage.getItem(DINOPEDIA_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export function saveDinopedia(data) {
  try {
    localStorage.setItem(DINOPEDIA_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearDinopedia() {
  localStorage.removeItem(DINOPEDIA_KEY)
}

// 해금된 부위 수 (0~order.length) — 카드 공개 단계 결정에 사용
export function partCount(entry, order) {
  if (!entry) return 0
  return order.filter((p) => entry[p]).length
}

// 격퇴 1회 → 아직 안 모은 부위 하나 해금. 반환: { part, count, total, complete } | null(이미 완성)
export function recordDinoPart(id, order) {
  const data = loadDinopedia()
  const entry = data[id] || {}
  for (const part of order) {
    if (!entry[part]) {
      entry[part] = true
      data[id] = entry
      saveDinopedia(data)
      const count = partCount(entry, order)
      return { part, count, total: order.length, complete: count === order.length }
    }
  }
  return null // 모든 부위 이미 해금 — 소재만 드롭
}
