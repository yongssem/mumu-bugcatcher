import { readJSON, writeJSON, isRecord, safeKey } from './safeStorage.js'
export const HUNT_WORLD_KEY = 'mumubug:hunt-world:v1'
export const validHuntCell = (x, z) => Number.isInteger(x) && Number.isInteger(z) && Math.hypot(x + 0.5, z + 0.5) <= 9.7 && Math.hypot(x + 0.5, z + 0.5) >= 1.1
function validBlocks(entries) {
  if (!Array.isArray(entries)) return []
  return [...new Map(entries.filter(e => {
    if (!Array.isArray(e) || typeof e[0] !== 'string' || !/^-?\d+,-?\d+$/.test(e[0]) || !Number.isInteger(e[1]) || e[1] < 1 || e[1] > 4) return false
    const [x, z] = e[0].split(',').map(Number)
    return validHuntCell(x, z)
  })).entries()]
}
export function loadHuntWorld(habitat) {
  const data = readJSON(HUNT_WORLD_KEY, {})
  return validBlocks(isRecord(data) && safeKey(habitat) ? data[habitat] : [])
}
export function saveHuntWorld(habitat, blocks) {
  if (!safeKey(habitat)) return false
  const old = readJSON(HUNT_WORLD_KEY, {})
  return writeJSON(HUNT_WORLD_KEY, { ...(isRecord(old) ? old : {}), [habitat]: validBlocks(blocks) })
}
