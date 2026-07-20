// 퀘스트 상태 — 촌장에게 받은 메인 의뢰 + 주민 서브 심부름 진행
// 키: mumubug:quests:v1 / 구조: { accepted: questId|null, subs: { [subId]: 'done' } }

export const QUEST_KEY = 'mumubug:quests:v1'

export function loadQuestState() {
  try {
    const raw = localStorage.getItem(QUEST_KEY)
    if (!raw) return { accepted: null, subs: {} }
    const data = JSON.parse(raw)
    return { accepted: data.accepted ?? null, subs: data.subs || {} }
  } catch {
    return { accepted: null, subs: {} }
  }
}

export function saveQuestState(state) {
  try {
    localStorage.setItem(QUEST_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

// 메인 의뢰 수락 (촌장)
export function acceptMainQuest(questId) {
  const s = loadQuestState()
  s.accepted = questId
  saveQuestState(s)
  return s
}

// 서브 심부름 완료 표시
export function completeSubQuest(subId) {
  const s = loadQuestState()
  s.subs[subId] = 'done'
  saveQuestState(s)
  return s
}
