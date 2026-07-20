// localStorage 저장/로드 — 저장 키·구조는 여기서만 관리 (CLAUDE.md 3장)
// 🏝️ 다중 섬 구조: 물리 상태(지형·공룡·확장)는 섬마다, 경제(코인·채널·소유블록)는 전역 공유
//   raw = { currentIsland, islands:[{seed,blocks,zoo,zooExpand,player}], names:[], ...전역 }
//   GameEngine은 예전처럼 '평면' 세이브를 읽고/쓰고, 이 파일이 현재 섬과 병합해준다.

export const SAVE_KEY = 'mumubug:save:v1'

const ISLAND_FIELDS = ['seed', 'blocks', 'zoo', 'zooExpand', 'player'] // 섬마다 따로
const GLOBAL_FIELDS = ['mode', 'money', 'owned', 'channel', 'hotbar', 'dayTime', 'day'] // 계정 공유

function _loadRaw() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    let data = JSON.parse(raw)
    // 구버전(평면 단일 섬) → 다중 섬 구조로 이관
    if (!Array.isArray(data.islands)) {
      if (typeof data.seed !== 'number') return null
      const island = {}
      for (const f of ISLAND_FIELDS) if (data[f] !== undefined) island[f] = data[f]
      const out = { currentIsland: 0, islands: [island], names: ['첫 번째 섬'] }
      for (const f of GLOBAL_FIELDS) if (data[f] !== undefined) out[f] = data[f]
      data = out
    }
    if (!Array.isArray(data.islands) || !data.islands.length) return null
    if (typeof data.currentIsland !== 'number' || data.currentIsland < 0 || data.currentIsland >= data.islands.length) data.currentIsland = 0
    if (!Array.isArray(data.names)) data.names = data.islands.map((_, i) => (i === 0 ? '첫 번째 섬' : `${i + 1}번째 섬`))
    return data
  } catch {
    return null
  }
}

// 현재 섬 + 전역을 합친 평면 뷰 (GameEngine이 예전처럼 읽음)
export function loadSave() {
  const raw = _loadRaw()
  if (!raw) return null
  const cur = raw.islands[raw.currentIsland] || raw.islands[0]
  if (!cur || typeof cur.seed !== 'number') {
    // 새로 분양받은 빈 섬(seed만) — seed 없으면 방어
    if (!cur || typeof cur.seed !== 'number') return null
  }
  const view = {}
  for (const f of GLOBAL_FIELDS) if (raw[f] !== undefined) view[f] = raw[f]
  Object.assign(view, cur)
  view.currentIsland = raw.currentIsland
  view.islandCount = raw.islands.length
  view.islandNames = raw.names
  return view
}

// GameEngine.getSaveData(평면)을 현재 섬 + 전역에 병합 저장
export function writeSave(data) {
  try {
    let raw = _loadRaw()
    if (!raw) raw = { currentIsland: 0, islands: [{}], names: ['첫 번째 섬'] }
    const cur = raw.currentIsland
    const island = {}
    for (const f of ISLAND_FIELDS) if (data[f] !== undefined) island[f] = data[f]
    raw.islands[cur] = island
    for (const f of GLOBAL_FIELDS) if (data[f] !== undefined) raw[f] = data[f]
    raw.savedAt = Date.now()
    localStorage.setItem(SAVE_KEY, JSON.stringify(raw))
    return true
  } catch {
    return false // 용량 초과 등 — 게임은 계속 진행
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY)
}

export function hasSave() {
  return loadSave() !== null
}

// ---------- 🏝️ 섬 관리 ----------
export function islandInfo() {
  const raw = _loadRaw()
  if (!raw) return { current: 0, count: 1, names: ['첫 번째 섬'] }
  return { current: raw.currentIsland, count: raw.islands.length, names: raw.names }
}

// 새 빈 섬 추가 (seed만 — 로드 시 새 지형 생성). 반환: 새 섬 인덱스
export function addIsland(name) {
  const raw = _loadRaw() || { currentIsland: 0, islands: [], names: [] }
  const seed = Math.floor(Math.random() * 1e9)
  raw.islands.push({ seed })
  raw.names.push(name || `${raw.islands.length}번째 섬`)
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(raw)) } catch { /* 용량 초과 무시 */ }
  return raw.islands.length - 1
}

// 현재 섬 전환 (전역 상태는 유지)
export function setCurrentIsland(i) {
  const raw = _loadRaw()
  if (!raw || i < 0 || i >= raw.islands.length) return
  raw.currentIsland = i
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(raw)) } catch { /* 무시 */ }
}
