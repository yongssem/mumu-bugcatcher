// 채집 모드의 수평 조작과 몸체 충돌. 프레임을 나누어 얇은 벽 통과를 막는다.
export function movementVector(x = 0, y = 0, yaw = 0) {
  const len = Math.max(1, Math.hypot(x, y))
  x /= len; y /= len
  return { x: Math.cos(yaw) * x - Math.sin(yaw) * y, z: -Math.sin(yaw) * x - Math.cos(yaw) * y }
}
export const shortestTurn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const BODY = 0.22
export function stepPlayer(p, input, dt, world) {
  const mv = movementVector(input.x, input.y, p.yaw)
  const floor = (x, z) => Math.max(...[-BODY, BODY].flatMap(dx => [-BODY, BODY].map(dz => world.heightAt(x + dx, z + dz))))
  const blocked = (x, z) => {
    if (Math.hypot(x, z) > world.radius - BODY) return true
    if (floor(x, z) > p.y + (p.onGround ? 1.01 : 0.04)) return true
    return world.solids.some(s => p.y < (s.height ?? 5) && Math.hypot(x - s.x, z - s.z) < s.r + BODY)
  }
  if (input.jump && p.onGround) { p.vy = 5.6; p.onGround = false }
  const steps = Math.max(1, Math.ceil(Math.min(0.1, dt) / (1 / 120)))
  const step = Math.min(0.1, dt) / steps
  for (let i = 0; i < steps; i++) {
    const speed = input.run ? 3.8 : 2.5
    const x = p.pos.x + mv.x * speed * step
    if (!blocked(x, p.pos.z)) p.pos.x = x
    const z = p.pos.z + mv.z * speed * step
    if (!blocked(p.pos.x, z)) p.pos.z = z
    const ground = floor(p.pos.x, p.pos.z)
    p.vy -= 18 * step
    p.y += p.vy * step
    if (p.y <= ground) { p.y = ground; p.vy = 0; p.onGround = true } else p.onGround = false
  }
  return Math.hypot(mv.x, mv.z) > 0.01
}
