// 🏡 집(허브) 저장 — 코인 지갑 · 전시 슬롯 · 번식 재고 · 통계 (B4)
// 키: mumubug:home:v1
// 구조: { coins, display:[bugId|null ×6], stock:[{id,shiny}], stats:{views,sold,bred,live} }
// 순수 저장/조작만 담당 — 경제 공식(수익·가격)은 game/economy.js 에 분리.

export const HOME_KEY = 'mumubug:home:v1'
import { readJSON, writeJSON, removeJSON, count } from './safeStorage.js'
import { BUGS } from '../game/bugData.js'
const validBug = id => typeof id === 'string' && Object.hasOwn(BUGS, id)
export const DISPLAY_SLOTS = 6

function empty() {
  return { coins: 0, display: Array(DISPLAY_SLOTS).fill(null), stock: [], stats: { views: 0, sold: 0, bred: 0, live: 0 } }
}

export function loadHome() {
  try {
    const d = readJSON(HOME_KEY, null)
    if (!d || typeof d !== 'object') return empty()
    const base = empty()
    const display = Array.isArray(d.display) ? d.display.slice(0, DISPLAY_SLOTS).map(id => validBug(id) ? id : null) : base.display
    while (display.length < DISPLAY_SLOTS) display.push(null)
    return {
      coins: count(d.coins),
      display,
      stock: Array.isArray(d.stock) ? d.stock.filter(s => s && validBug(s.id) && Number.isSafeInteger(s.price) && s.price >= 0) : [],
      stats: Object.fromEntries(Object.keys(base.stats).map(k => [k, count(d.stats?.[k])])),
    }
  } catch {
    return empty()
  }
}

export function saveHome(h) {
  return writeJSON(HOME_KEY, h)
}

export function clearHome() { removeJSON(HOME_KEY) }

// 코인 증감 (음수면 차감) — 갱신된 h 반환
export function addCoins(h, n) {
  h.coins = Math.max(0, Math.round((h.coins || 0) + n))
  saveHome(h)
  return h
}

// 전시 슬롯 지정/해제 (bugId 또는 null)
export function setDisplay(h, slot, bugId) {
  if (slot < 0 || slot >= DISPLAY_SLOTS) return h
  // 이미 다른 슬롯에 있으면 중복 방지 — 기존 슬롯 비우기
  if (bugId) h.display = h.display.map((x) => (x === bugId ? null : x))
  h.display[slot] = bugId
  saveHome(h)
  return h
}

// 번식 재고 추가/제거
export function addStock(h, entry) { h.stock.push(entry); saveHome(h); return h }
export function removeStock(h, idx) { h.stock.splice(idx, 1); saveHome(h); return h }

// 통계 누적
export function bumpStat(h, key, n = 1) { h.stats[key] = (h.stats[key] || 0) + n; saveHome(h); return h }
