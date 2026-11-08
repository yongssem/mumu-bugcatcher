import { NODES } from './bugcraft.js'
export function starterNodes(random = Math.random) {
  const types = [...Object.keys(NODES), 'twigPile', 'leafPile', 'twigPile', 'leafPile']
  // 필수 자원을 먼저 확보한다. 추가 자원 순서만 섞는다.
  for (let i = types.length - 1; i > 6; i--) { const j = 6 + Math.floor(random() * (i - 5)); [types[i], types[j]] = [types[j], types[i]] }
  return types
}
