// 사냥터 맵 + 의뢰(퀘스트) — 몬스터헌터식: 맵은 3개를 재사용하고, 의뢰가 계속 추가된다
// 의뢰 = 어느 맵 + 어떤 공룡(+강화 배율). 이전 의뢰를 깨야 다음 해금.
// 의뢰 클리어 수가 시대(eras.js)를 올린다 — 6개를 다 깨면 현대(🚀)

// 재사용 맵 3종 — 테마(하늘색)만 다름. 지형은 출동마다 새로 생성
export const MAPS = {
  field: { name: '들판', emoji: '🌾', theme: { sky: '#8FD3F0' }, terrain: 'field' }, // 농촌 허허벌판
  water: { name: '물가', emoji: '🐟', theme: { sky: '#7EC2CE' } },      // 바다 청록 (지형 추후)
  mountain: { name: '산', emoji: '⛰️', theme: { sky: '#D99B72' } },    // 산기운·노을빛 (지형 추후)
}

// 의뢰 목록 — 순서대로 해금. 뒤로 갈수록 같은 맵을 재방문하며 강화 개체 등장
export const QUESTS = [
  {
    id: 'nongchon', // (구버전 저장 호환 — 초기 3개는 예전 스테이지 id 유지)
    map: 'field', dinoId: 'triceratops', stars: 1,
    title: '들판의 세뿔 공룡',
    desc: '밭 근처에 트리케라톱스가 어슬렁거려요.',
  },
  {
    id: 'eochon',
    map: 'water', dinoId: 'stegosaurus', stars: 2,
    title: '물가의 지붕 도마뱀',
    desc: '물가에 등판을 세운 스테고사우루스가 나타났어요.',
    unlockAfter: 'nongchon',
  },
  {
    id: 'sanchon',
    map: 'mountain', dinoId: 'trex', stars: 3,
    title: '산속의 폭군',
    desc: '깊은 산속, 티라노사우루스가 기다립니다.',
    unlockAfter: 'eochon',
  },
  {
    id: 'nongchon2',
    map: 'field', dinoId: 'triceratops', stars: 4,
    title: '사나운 트리케라톱스',
    desc: '들판에 훨씬 튼튼한 개체가 돌아왔어요!',
    unlockAfter: 'sanchon',
    mod: { hpMul: 1.5, dmgAdd: 1 },
  },
  {
    id: 'eochon2',
    map: 'water', dinoId: 'stegosaurus', stars: 4,
    title: '성난 스테고사우루스',
    desc: '꼬리 가시를 세운 강한 개체예요. 조심!',
    unlockAfter: 'nongchon2',
    mod: { hpMul: 1.5, dmgAdd: 1 },
  },
  {
    id: 'sanchon2',
    map: 'mountain', dinoId: 'trex', stars: 5,
    title: '폭군의 왕 (최종)',
    desc: '가장 크고 강한 티라노. 최고 장비로 도전하세요!',
    unlockAfter: 'eochon2',
    mod: { hpMul: 1.8, dmgAdd: 1, scaleMul: 1.15 },
  },
]

// 의뢰 → 엔진에 넘길 스테이지 객체 (맵 테마 병합)
export function questToStage(q) {
  const m = MAPS[q.map]
  // BGM — 티라노/최종(5성) 의뢰는 보스곡, 그 외엔 맵별 곡
  const bgm = q.dinoId === 'trex' || q.stars >= 5 ? 'boss' : q.map
  return {
    id: q.id,
    name: q.title,
    emoji: m.emoji,
    mapName: m.name,
    dinoId: q.dinoId,
    stars: q.stars,
    theme: m.theme,
    terrain: m.terrain || null, // 전용 지형 변형 (없으면 기본)
    mod: q.mod || null,
    bgm, // 재생할 BGM 트랙 (field/water/mountain/boss)
  }
}

// 해금 여부 — 이전 의뢰를 클리어했으면 열림
export function isUnlocked(quest, progress) {
  if (!quest.unlockAfter) return true
  return !!progress?.cleared?.[quest.unlockAfter]
}
