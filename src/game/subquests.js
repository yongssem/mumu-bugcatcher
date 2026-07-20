// 서브 퀘스트(심부름) — 주민이 부탁하는 소재 배달. 보상은 골드
// 소재는 프로필(mats)에서 차감, 완료 여부는 quests.js에 기록

export const SUB_QUESTS = [
  {
    id: 'sub_bones',
    npc: 'kid',
    title: '뼈 장난감 만들기',
    ask: '공룡 뼈 3개만 구해다 주세요! 멋진 장난감을 만들 거예요.',
    thanks: '우와 고마워요! 이건 제 용돈이에요!',
    need: { bone: 3 },
    reward: { gold: 4 },
  },
  {
    id: 'sub_hide',
    npc: 'kid',
    title: '따뜻한 담요',
    ask: '겨울이 오기 전에 가죽 4장이 필요해요. 부탁해요!',
    thanks: '이제 따뜻하게 잘 수 있어요! 감사해요!',
    need: { hide: 4 },
    reward: { gold: 6 },
    after: 'sub_bones', // 이전 심부름 완료 후 등장
  },
]

// 해당 NPC의 현재 진행 가능한 심부름 (없으면 null)
export function nextSubQuestFor(npcId, questState) {
  for (const q of SUB_QUESTS) {
    if (q.npc !== npcId) continue
    if (questState.subs[q.id] === 'done') continue
    if (q.after && questState.subs[q.after] !== 'done') continue
    return q
  }
  return null
}

// 소재가 충분한가?
export function canDeliver(quest, mats) {
  return Object.entries(quest.need).every(([m, n]) => (mats[m] || 0) >= n)
}
