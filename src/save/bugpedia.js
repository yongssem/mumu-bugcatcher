// 🐛 곤충 도감 진행도 저장 — 채집한 곤충·마리수 (월드 세이브와 분리, 아이의 누적 기록)
// 키: mumubug:bugpedia:v1 / 구조: { [bugId]: { n: 잡은수, first: 처음잡은날(선택) } }
// 처음 잡으면 도감 카드가 실루엣 → 컬러로 해금되고 진짜 곤충 지식이 열린다.

export const BUGPEDIA_KEY = 'mumubug:bugpedia:v1'

export function loadBugpedia() {
  try {
    const raw = localStorage.getItem(BUGPEDIA_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export function saveBugpedia(data) {
  try {
    localStorage.setItem(BUGPEDIA_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearBugpedia() {
  localStorage.removeItem(BUGPEDIA_KEY)
}

// 채집 1회 기록 → { id, n, isNew } 반환 (isNew=처음 발견)
export function recordCatch(id) {
  const data = loadBugpedia()
  const entry = data[id] || { n: 0 }
  const isNew = entry.n === 0
  entry.n += 1
  data[id] = entry
  saveBugpedia(data)
  return { id, n: entry.n, isNew }
}

// 여분 표본 1개 소비(가게 판매용) — n>1 일 때만 감소, 카드는 계속 해금 유지(min 1)
// 성공하면 남은 마리수 반환, 여분이 없으면 null
export function spendExtra(id) {
  const data = loadBugpedia()
  const entry = data[id]
  if (!entry || entry.n <= 1) return null
  entry.n -= 1
  data[id] = entry
  saveBugpedia(data)
  return entry.n
}

export function isCaught(id, data = null) {
  const d = data || loadBugpedia()
  return (d[id]?.n || 0) > 0
}

// 도감 완성도 { caught, total, pct }
export function bugpediaProgress(total) {
  const d = loadBugpedia()
  const caught = Object.values(d).filter((e) => (e?.n || 0) > 0).length
  return { caught, total, pct: total ? Math.round((caught / total) * 100) : 0 }
}
