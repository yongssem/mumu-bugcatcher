// 복셀 프리미티브 — 암시적 도형(타원체·튜브·박스)을 격자로 채워 1 드로우콜 메쉬로 (곤충 모델러 공용)
// 암시적 도형(타원체·테이퍼 튜브)을 격자로 채우고, 표면 셀만 남겨 하나의 지오메트리로
// 병합(파트당 1 드로우콜). 정점 색으로 무늬·배·이빨·눈을 칠한다. 애니메이션 파트 유지.
import * as THREE from 'three'

export const VOX = 0.18 // 복셀 한 칸(모델 단위) — 작을수록 고해상도. 게임에선 dino scale로 더 작아짐

// 공용 재질 + 공용 큐브 지오메트리 (인스턴싱으로 수천 복셀도 1 드로우콜)
export const VOX_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff })
const CUBE = new THREE.BoxGeometry(1, 1, 1)

// ---------- 암시적 도형 (inside 함수 + .bb 경계상자) ----------
export function ellipsoid(cx, cy, cz, rx, ry, rz) {
  const f = (x, y, z) => {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz
    return dx * dx + dy * dy + dz * dz <= 1
  }
  f.bb = [cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz]
  return f
}

// 테이퍼 캡슐: a(반지름 ra)→b(반지름 rb)
export function tube(ax, ay, az, bx, by, bz, ra, rb) {
  const abx = bx - ax, aby = by - ay, abz = bz - az
  const L2 = abx * abx + aby * aby + abz * abz || 1e-6
  const f = (x, y, z) => {
    let t = ((x - ax) * abx + (y - ay) * aby + (z - az) * abz) / L2
    if (t < 0) t = 0; else if (t > 1) t = 1
    const px = ax + abx * t, py = ay + aby * t, pz = az + abz * t
    const r = ra + (rb - ra) * t
    const dx = x - px, dy = y - py, dz = z - pz
    return dx * dx + dy * dy + dz * dz <= r * r
  }
  const rM = Math.max(ra, rb)
  f.bb = [Math.min(ax, bx) - rM, Math.min(ay, by) - rM, Math.min(az, bz) - rM,
          Math.max(ax, bx) + rM, Math.max(ay, by) + rM, Math.max(az, bz) + rM]
  return f
}

// 사각 블록 (가시·이빨 등 각진 부분)
export function boxShape(cx, cy, cz, hx, hy, hz) {
  const f = (x, y, z) => Math.abs(x - cx) <= hx && Math.abs(y - cy) <= hy && Math.abs(z - cz) <= hz
  f.bb = [cx - hx, cy - hy, cz - hz, cx + hx, cy + hy, cz + hz]
  return f
}

// 결정론적 노이즈 (무늬용)
export function hash3(i, j, k) {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// 도형 목록을 복셀로 채워 표면 셀 좌표+색을 수집. {pos:[{x,y,z,col}]}
export function voxelize(shapes, colorFn, vox = VOX) {
  let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity
  for (const s of shapes) {
    const b = s.bb
    if (b[0] < mnx) mnx = b[0]; if (b[1] < mny) mny = b[1]; if (b[2] < mnz) mnz = b[2]
    if (b[3] > mxx) mxx = b[3]; if (b[4] > mxy) mxy = b[4]; if (b[5] > mxz) mxz = b[5]
  }
  const i0 = Math.floor(mnx / vox) - 1, i1 = Math.ceil(mxx / vox) + 1
  const j0 = Math.floor(mny / vox) - 1, j1 = Math.ceil(mxy / vox) + 1
  const k0 = Math.floor(mnz / vox) - 1, k1 = Math.ceil(mxz / vox) + 1
  const W = i1 - i0 + 1, H = j1 - j0 + 1, D = k1 - k0 + 1
  const filled = new Uint8Array(W * H * D)
  const idx = (i, j, k) => ((i - i0) * H + (j - j0)) * D + (k - k0)
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
    const x = (i + 0.5) * vox, y = (j + 0.5) * vox, z = (k + 0.5) * vox
    for (const s of shapes) {
      if (x >= s.bb[0] && x <= s.bb[3] && y >= s.bb[1] && y <= s.bb[4] && z >= s.bb[2] && z <= s.bb[5] && s(x, y, z)) {
        filled[idx(i, j, k)] = 1; break
      }
    }
  }
  const cells = []
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
    if (!filled[idx(i, j, k)]) continue
    if (filled[idx(i + 1, j, k)] && filled[idx(i - 1, j, k)] && filled[idx(i, j + 1, k)] &&
        filled[idx(i, j - 1, k)] && filled[idx(i, j, k + 1)] && filled[idx(i, j, k - 1)]) continue // 내부 생략
    const x = (i + 0.5) * vox, y = (j + 0.5) * vox, z = (k + 0.5) * vox
    cells.push({ x, y, z, col: colorFn(x, y, z) })
  }
  return cells
}

// 도형→인스턴스드 복셀 메쉬 (1 드로우콜). 없으면 null
export function voxMesh(shapes, colorFn, vox = VOX) {
  const cells = voxelize(shapes, colorFn, vox)
  if (!cells.length) return null
  const mesh = new THREE.InstancedMesh(CUBE, VOX_MAT, cells.length)
  const m = new THREE.Matrix4()
  const s = vox * 1.03
  for (let n = 0; n < cells.length; n++) {
    const c = cells[n]
    m.makeScale(s, s, s); m.setPosition(c.x, c.y, c.z)
    mesh.setMatrixAt(n, m)
    mesh.setColorAt(n, c.col)
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.frustumCulled = false // 파트가 애니메이션으로 움직이므로 컬링 끔
  return mesh
}

// colorFn 헬퍼: 배(아래)·등(위) 그라데이션 + 얼룩 무늬
export function skinColor({ base, dark, belly, midY, bellyDrop = 0.45, blotch = 0.7, stripes = false }) {
  return (x, y, z) => {
    if (y < midY - bellyDrop) return belly
    let c = base
    const n = hash3(Math.floor(x * 2.1), Math.floor(y * 1.4), Math.floor(z * 2.1))
    if (n > blotch) c = dark
    if (stripes && Math.sin(z * 2.6 + x * 0.6) > 0.55) c = dark
    return c
  }
}
