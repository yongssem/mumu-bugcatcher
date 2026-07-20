// 스테이지 클리어 진행도 — 어떤 지역을 깼는지 저장 (해금·별 표시에 사용)
// 키: mumubug:progress:v1 / 구조: { cleared: { [stageId]: true } }

export const PROGRESS_KEY = 'mumubug:progress:v1'

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { cleared: {} }
    const data = JSON.parse(raw)
    return data && data.cleared ? data : { cleared: {} }
  } catch {
    return { cleared: {} }
  }
}

export function saveProgress(data) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function markCleared(stageId) {
  const data = loadProgress()
  data.cleared[stageId] = true
  saveProgress(data)
  return data
}

export function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY)
}
