// 부수기/설치 — DDA 복셀 레이캐스트 (메시 재생성과 무관하게 정확)
import * as THREE from 'three'

const REACH = 6 // 손이 닿는 거리 (블록)

// 카메라 위치·방향으로 그리드를 따라가며 첫 solid 블록을 찾는다
// 반환: { block:[x,y,z], prev:[x,y,z] } | null  (prev = 설치될 인접 칸)
export function raycastVoxel(world, origin, direction) {
  const dir = direction.clone().normalize()
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z)

  const stepX = dir.x > 0 ? 1 : -1
  const stepY = dir.y > 0 ? 1 : -1
  const stepZ = dir.z > 0 ? 1 : -1

  const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity
  const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity
  const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity

  const frac = (v) => v - Math.floor(v)
  let tMaxX = dir.x !== 0 ? (dir.x > 0 ? (1 - frac(origin.x)) : frac(origin.x)) * tDeltaX : Infinity
  let tMaxY = dir.y !== 0 ? (dir.y > 0 ? (1 - frac(origin.y)) : frac(origin.y)) * tDeltaY : Infinity
  let tMaxZ = dir.z !== 0 ? (dir.z > 0 ? (1 - frac(origin.z)) : frac(origin.z)) * tDeltaZ : Infinity

  let prev = [x, y, z]
  let t = 0
  while (t <= REACH) {
    if (world.isSolid(x, y, z)) return { block: [x, y, z], prev }
    prev = [x, y, z]
    if (tMaxX < tMaxY && tMaxX < tMaxZ) { t = tMaxX; tMaxX += tDeltaX; x += stepX }
    else if (tMaxY < tMaxZ) { t = tMaxY; tMaxY += tDeltaY; y += stepY }
    else { t = tMaxZ; tMaxZ += tDeltaZ; z += stepZ }
  }
  return null
}

export class BlockActions {
  constructor(world, player, camera) {
    this.world = world
    this.player = player
    this.camera = camera
    this._dir = new THREE.Vector3()
  }

  _ray() {
    this.camera.getWorldDirection(this._dir)
    return raycastVoxel(this.world, this.camera.position, this._dir)
  }

  // 좌클릭: 부수기 — 부순 블록 타입 반환 (서바이벌 인벤토리 획득용)
  breakBlock() {
    const hit = this._ray()
    if (!hit) return null
    const [x, y, z] = hit.block
    const type = this.world.getBlock(x, y, z)
    if (type === 'bedrock') return null // 기반암은 못 부숨 (맵 밖 추락 방지)
    this.world.setBlock(x, y, z, null)
    return type
  }

  // 우클릭: 설치 (플레이어 몸과 겹치는 칸엔 설치 금지) — 성공 여부 반환
  placeBlock(type) {
    const hit = this._ray()
    if (!hit) return false
    const [x, y, z] = hit.prev
    if (this.world.isSolid(x, y, z)) return false
    if (this.player.intersectsBlock(x, y, z)) return false
    this.world.setBlock(x, y, z, type)
    return true
  }

  // 조준 중인 블록 (하이라이트용)
  getTarget() {
    return this._ray()
  }
}
