// 💰 집(허브) 경제 공식 — 방송 수익 · 표본 판매가 · 번식 결과 (B4)
// 순수 계산만. 저장은 save/home.js, 데이터는 bugData.js.
import { BUGS, RARITY, FAMILIES } from './bugData.js'

const coinOf = (id) => RARITY[BUGS[id]?.rarity]?.coin || 20
const rand = (a, b) => a + Math.random() * (b - a)

// 📢 전시 방송 수익 — 전시한 곤충들이 조회수·코인을 만든다.
//   희귀할수록 · 여러 과(科)를 골고루 전시할수록 대박. 가끔 슈퍼챗 팁.
export function broadcastEarnings(displayIds) {
  const ids = displayIds.filter(Boolean)
  if (!ids.length) return { viewers: 0, coins: 0, superchat: 0, empty: true }
  let viewers = 8
  for (const id of ids) viewers += coinOf(id) * 0.4
  const fams = new Set(ids.map((id) => BUGS[id]?.fam))
  viewers += fams.size * 12 // 다양성 보너스
  viewers = Math.round(viewers * rand(0.85, 1.25))
  let coins = Math.round(viewers * 0.9)
  // 15% 확률 슈퍼챗 — 팬이 쏘는 응원 팁
  let superchat = 0
  if (Math.random() < 0.15) { superchat = Math.round(rand(30, 130)); coins += superchat }
  return { viewers, coins, superchat, empty: false }
}

// 💵 여분 표본 판매가 — 도감에 여러 번 잡은 곤충의 남는 표본을 판다.
export function extraSellPrice(id) {
  return Math.round(coinOf(id) * 0.8)
}

// 🥚 번식 결과 — 두 곤충을 짝지어 새끼를 얻는다.
//   같은 과끼리 = 순종(비싼 새끼) · 다른 과 = 잡종(싸지만 가능) · 낮은 확률로 ✨반짝이 개체.
export function breed(idA, idB) {
  const A = BUGS[idA], B = BUGS[idB]
  if (!A || !B) return null
  const sameFam = A.fam === B.fam
  // 새끼가 닮는 부모: 순종이면 더 희귀한 쪽, 잡종이면 무작위
  const babyId = sameFam ? (coinOf(idA) >= coinOf(idB) ? idA : idB) : (Math.random() < 0.5 ? idA : idB)
  const shiny = Math.random() < 0.08
  const base = (coinOf(idA) + coinOf(idB)) / 2
  const quality = sameFam ? 1.4 : 0.7
  const price = Math.max(10, Math.round(base * quality * (shiny ? 2.2 : 1) * rand(0.9, 1.15)))
  return {
    babyId, shiny, sameFam, price,
    famLabel: FAMILIES[BUGS[babyId]?.fam]?.label || '곤충',
  }
}
