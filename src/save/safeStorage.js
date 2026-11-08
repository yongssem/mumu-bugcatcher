// 저장이 차단되어도 이번 플레이의 성과는 메모리에 보존한다. 기존 키/형식 유지.
const pending = new Map()
let owner
function storage() {
  let current
  try { current = globalThis.localStorage } catch { /* 브라우저 저장 차단 */ }
  if (owner !== current) { pending.clear(); owner = current }
  return current
}
export function readJSON(key, fallback) {
  const store = storage()
  if (pending.has(key)) return JSON.parse(pending.get(key))
  try { return JSON.parse(store?.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
export function writeJSON(key, value) {
  const store = storage()
  const text = JSON.stringify(value)
  try {
    if (!store) throw new Error('저장소 없음')
    store.setItem(key, text)
    pending.delete(key)
    return true
  } catch {
    pending.set(key, text)
    return false
  } finally {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('mumubug:storage'))
  }
}
export function sessionOnly() { storage(); return pending.size > 0 }
export function removeJSON(key) {
  const store = storage()
  pending.delete(key)
  try { store?.removeItem(key) } catch { /* 저장 차단 */ }
}
export const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v)
export const count = v => Number.isSafeInteger(v) && v >= 0 ? v : 0
export const safeKey = k => !['__proto__', 'constructor', 'prototype'].includes(k)
export function counts(value) {
  return Object.fromEntries(Object.entries(isRecord(value) ? value : {}).filter(([k, n]) => safeKey(k) && Number.isSafeInteger(n) && n >= 0))
}
