// 제작 — 공룡 소재로 장비를 만든다 (CLAUDE.md §4). 희귀 소재(이빨)가 최상위 장비를 잠금
// 데이터만 정의. 실제 소모·장착 처리는 GameEngine.craftItem / _applyEquipment

// 공룡 소재 메타 — HUD·제작창에서 아이콘/이름 표시. rare=true는 희귀 강조
export const MATERIALS = {
  bone: { name: '뼈', icon: '🦴', color: '#F2EFE2' },
  hide: { name: '가죽', icon: '🟫', color: '#9B6B43' },
  tooth: { name: '이빨', icon: '🦷', color: '#FDFBF0', rare: true },
}

// 제작 레시피 — tier 낮은 것부터. slot: 'weapon' | 'armor' (같은 슬롯은 최상위만 효과)
export const RECIPES = [
  {
    id: 'boneSword',
    name: '뼈 검',
    icon: '🦴',
    tier: 1,
    slot: 'weapon',
    cost: { bone: 4 },
    effect: '칼 공격력 ↑ (2 → 3)',
    desc: '티라노 뼈를 깎아 만든 튼튼한 검',
  },
  {
    id: 'hideArmor',
    name: '가죽 갑옷',
    icon: '🛡️',
    tier: 1,
    slot: 'armor',
    cost: { hide: 5 },
    effect: '방어력 +3 (덜 아파요)',
    desc: '질긴 공룡 가죽으로 만든 갑옷',
  },
  {
    id: 'toothSpear',
    name: '이빨 창',
    icon: '🦷',
    tier: 2,
    slot: 'weapon',
    cost: { tooth: 2, bone: 3 },
    effect: '칼 공격력 ↑↑ (2 → 4)',
    desc: '희귀한 티라노 이빨을 꽂은 가장 강한 무기',
    rare: 'tooth', // 이 희귀 소재가 없으면 못 만듦 — 강조 표시
  },
]

// 인벤토리로 만들 수 있나? (소재 충분 + 아직 안 만듦)
export function canCraft(recipe, inventory, crafted) {
  if (crafted?.[recipe.id]) return false
  for (const [m, n] of Object.entries(recipe.cost)) {
    if ((inventory?.[m] || 0) < n) return false
  }
  return true
}

// 소재 부족 사유 (없으면 null = 제작 가능)
export function craftBlockedReason(recipe, inventory, crafted) {
  if (crafted?.[recipe.id]) return '이미 만들었어요 ✓'
  for (const [m, n] of Object.entries(recipe.cost)) {
    if ((inventory?.[m] || 0) < n) return `${MATERIALS[m]?.name || m} 부족`
  }
  return null
}

// 프로필(마을) 대상 제작 — inventory/crafted를 직접 수정. 성공 시 true
// (게임 중 제작은 GameEngine.craftItem, 마을 제작은 이 함수)
export function craftInProfile(profile, id) {
  const recipe = RECIPES.find((r) => r.id === id)
  if (!recipe || !canCraft(recipe, profile.mats, profile.crafted)) return false
  for (const [m, n] of Object.entries(recipe.cost)) profile.mats[m] -= n
  profile.crafted[id] = true
  return true
}
