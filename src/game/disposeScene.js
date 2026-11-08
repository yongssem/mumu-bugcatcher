import { VOX_MAT, VOX_GEOMETRY } from './Vox.js'
// 재질이 실루엣으로 교체되어도 공유 큐브는 보존한다.
export function disposeScene(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  root.traverse(o => {
    if (o.isInstancedMesh) o.dispose()
    if (o.geometry && o.geometry !== VOX_GEOMETRY) geometries.add(o.geometry)
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const mat of mats) if (mat && mat !== VOX_MAT) {
      materials.add(mat)
      for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value)
    }
  })
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose())
}
