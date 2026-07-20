// 시대 진행 — 캐릭터(원시인)가 사냥 진행에 따라 구석기→현대로 성장 (인류 기술 발전사 = 두 번째 교육 축)
// 현대는 비살상·포획 컨셉 (죽이지 않고 '잡아서 도감에' — 초딩 비폭력 톤 유지)

export const ERAS = [
  { id: 'paleo', name: '구석기', emoji: '🪨', weapon: '돌도끼', desc: '나뭇잎 팬티와 돌도끼로 시작해요.' },
  { id: 'neo', name: '신석기', emoji: '🌾', weapon: '활', desc: '가죽옷을 걸치고 활을 씁니다.' },
  { id: 'bronze', name: '청동기', emoji: '⚒️', weapon: '청동검', desc: '청동 갑옷과 청동검을 만들었어요.' },
  { id: 'iron', name: '철기·중세', emoji: '🛡️', weapon: '석궁', desc: '단단한 철갑옷과 석궁을 갖췄어요.' },
  { id: 'modernEarly', name: '근대', emoji: '🎆', weapon: '화승총', desc: '제복을 입고 화약 무기를 다뤄요.' },
  { id: 'modern', name: '현대', emoji: '🚀', weapon: '포획총(넷건)', desc: '탐사 슈트와 넷건으로 공룡을 잡아 도감에 담아요.' },
]

export function eraIndexForClears(clearedCount) {
  return Math.min(clearedCount || 0, ERAS.length - 1)
}

// 클리어한 지역 수로 시대 결정 (사냥을 진행할수록 시대가 오름)
export function eraForClears(clearedCount) {
  return ERAS[eraIndexForClears(clearedCount)]
}

// 다음 시대 (마지막이면 null)
export function nextEra(clearedCount) {
  const i = eraIndexForClears(clearedCount)
  return i < ERAS.length - 1 ? ERAS[i + 1] : null
}

// 시대 = 실제 파워 — 시대가 오를수록 공격/방어 보너스 (기술 발전의 체감)
// 구석기 +0/+0 → 신석기 +0/+1 → 청동기 +1/+1 → 철기 +1/+2 → 근대 +2/+2 → 현대 +2/+3
export function eraBonus(eraIndex) {
  return { atk: Math.floor(eraIndex / 2), def: Math.ceil(eraIndex / 2) }
}
