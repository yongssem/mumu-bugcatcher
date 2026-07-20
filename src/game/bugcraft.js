// 🧱 포획 블럭 제작 (B3) — 모종삽으로 캔 소재로 폭탄·마취·함정을 조합한다.
// (다이노의 game/craft.js는 장비용 — 이건 곤충월드 포획용 별도 데이터)
// 데이터만 정의. 소모·적용은 BugHunt.jsx 씬에서 처리.

// 채굴 소재 — 곤충월드 블럭에서 모종삽으로 캔다. color는 채굴 노드/파티클 색
export const MATERIALS = {
  dirt: { name: '흙덩이', icon: '🟫', color: '#8A5A34' },
  leaf: { name: '잎조각', icon: '🍃', color: '#4E8A3A' },
  twig: { name: '나뭇가지', icon: '🪵', color: '#6B4A2A' },
  pollen: { name: '꽃가루', icon: '🌼', color: '#F2C14E' },
  sap: { name: '나무 수액', icon: '🍯', color: '#C8862E' },
  dew: { name: '이슬방울', icon: '💧', color: '#7EC8F0' },
}

// 채굴 노드 종류 → 떨어지는 소재. hits=캐는 데 필요한 타격 수
// (초딩 톤: 흙·잎은 잘 나오고, 수액·이슬은 조금 귀하게)
export const NODES = {
  dirtMound: { label: '흙더미', drop: 'dirt', hits: 2, color: '#8A5A34', top: '#6E4728' },
  leafPile: { label: '잎더미', drop: 'leaf', hits: 2, color: '#4E8A3A', top: '#3E7030' },
  twigPile: { label: '잔가지 더미', drop: 'twig', hits: 3, color: '#6B4A2A', top: '#5A3E22' },
  flowerBud: { label: '꽃봉오리', drop: 'pollen', hits: 2, color: '#E88AB0', top: '#F2C14E' },
  sapBlob: { label: '수액 덩이', drop: 'sap', hits: 3, color: '#C8862E', top: '#E0A64A' },
  dewDrop: { label: '이슬 구슬', drop: 'dew', hits: 2, color: '#8FD4F0', top: '#BFEAFF' },
}

// 포획 블럭 레시피 — mode: 씬이 해석하는 포획 방식
//   stun = 폭탄(범위 기절) · sleep = 마취 다트(재움) · trap = 함정(밟으면 가둠)
export const RECIPES = [
  {
    id: 'net', name: '잠자리채', icon: '🥅', mode: 'tool',
    cost: { twig: 2, leaf: 2 },
    effect: '얌전한 곤충 포획',
    desc: '나뭇가지와 잎으로 엮은 채집망. 만들어야 곤충을 잡을 수 있어요. (한 번 만들면 계속 사용)',
  },
  {
    id: 'bomb', name: '폭탄 블럭', icon: '💣', mode: 'stun',
    cost: { sap: 2, pollen: 1 },
    effect: '던져서 범위 기절',
    desc: '수액을 뭉쳐 만든 뻥 폭탄. 무리·중형 곤충을 한 번에 기절시켜요.',
  },
  {
    id: 'dart', name: '마취 다트', icon: '💉', mode: 'sleep',
    cost: { pollen: 2, dew: 1 },
    effect: '발사해 재움',
    desc: '꽃가루 마취약을 묻힌 다트. 사나운 대형 곤충을 잠재워요.',
  },
  {
    id: 'trap', name: '함정 블럭', icon: '🕳️', mode: 'trap',
    cost: { twig: 3, leaf: 2 },
    effect: '설치 → 밟으면 가둠',
    desc: '나뭇가지로 엮은 덫. 도망치는 곤충을 밟는 순간 가둬요.',
  },
]

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]))

// 소재가 충분한가?
export function canCraft(recipe, mats) {
  for (const [m, n] of Object.entries(recipe.cost)) {
    if ((mats?.[m] || 0) < n) return false
  }
  return true
}

// 부족 사유 (없으면 null = 제작 가능)
export function craftBlockedReason(recipe, mats) {
  for (const [m, n] of Object.entries(recipe.cost)) {
    if ((mats?.[m] || 0) < n) return `${MATERIALS[m]?.name || m} 부족`
  }
  return null
}
