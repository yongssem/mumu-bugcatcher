// 플레이어 캐릭터 스킨 로스터 — 캐릭터 선택 화면에서 고름 (프로필에 저장)
// look 형식은 Character.js 참고

export const SKINS = [
  {
    id: 'mumu', name: '무무',
    look: { skin: '#E8B08A', hairColor: '#4a3220', hair: 'bowl', top: '#5F7A3A', pants: '#7a5233', shoes: '#4a3220', outfit: 'fur' },
  },
  {
    id: 'mimi', name: '미미',
    look: { skin: '#F0BC96', hairColor: '#2e2018', hair: 'long', bun: true, top: '#D96A8B', pants: '#8a4a5e', shoes: '#5a3040', outfit: 'dress' },
  },
  {
    id: 'kanku', name: '칸쿠',
    look: { skin: '#B07850', hairColor: '#141414', hair: 'bangs', top: '#F2C14E', pants: '#3a5a8a', shoes: '#2b2b2b', outfit: 'plain' },
  },
  {
    id: 'ruru', name: '루루',
    look: { skin: '#F0C8A0', hairColor: '#D9A441', hair: 'long', top: '#4a7ab5', pants: '#33507a', shoes: '#7a5233', outfit: 'plain' },
  },
  {
    id: 'toto', name: '토토',
    look: { skin: '#E8B08A', hairColor: '#6a3a1a', hair: 'band', bandColor: '#C0392B', top: '#C0392B', pants: '#4a4a52', shoes: '#2b2b2b', outfit: 'fur' },
  },
  {
    id: 'gangchul', name: '강철',
    look: { skin: '#D9A06A', hairColor: '#3a3a42', hair: 'bangs', top: '#9aa0aa', pants: '#5a5f68', shoes: '#3a3a42', outfit: 'armor' },
  },
]

export function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0]
}

// 🎨 실제 사용할 캐릭터 룩 — 커스텀 꾸미기가 있으면 그것, 없으면 선택한 프리셋
import { loadProfile } from '../save/profile.js'
export function loadLook() {
  const p = loadProfile()
  if (p.look) return { ...skinById(p.skin).look, ...p.look } // 프리셋 위에 커스텀 덮어쓰기
  return skinById(p.skin).look
}
