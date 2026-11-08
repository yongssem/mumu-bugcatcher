import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { voxMesh, ellipsoid, VOX_MAT } from '../src/game/Vox.js'
import { disposeScene } from '../src/game/disposeScene.js'
import { loadHuntWorld, saveHuntWorld } from '../src/save/huntWorld.js'
test('disposal frees per-model instance buffers without destroying the next viewers voxel cube', () => {
  const mesh = voxMesh([ellipsoid(0, 0, 0, 0.2, 0.2, 0.2)], () => new THREE.Color('red'))
  let geometryDisposed = 0, materialDisposed = 0, instanceDisposed = 0
  mesh.geometry.addEventListener('dispose', () => geometryDisposed++)
  VOX_MAT.addEventListener('dispose', () => materialDisposed++)
  mesh.addEventListener('dispose', () => instanceDisposed++)
  mesh.material = new THREE.MeshBasicMaterial({ color: 'black' })
  disposeScene(mesh)
  assert.equal(geometryDisposed, 0)
  assert.equal(materialDisposed, 0)
  assert.equal(instanceDisposed, 1)
})
test('placed blocks survive returning home and remain separate by habitat', () => {
  const data = new Map()
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) }
  saveHuntWorld('meadow', [['0,-2', 2]])
  assert.deepEqual(loadHuntWorld('meadow'), [['0,-2', 2]])
  assert.deepEqual(loadHuntWorld('pond'), [])
})
test('invalid saved blocks cannot create infinite towers or corrupt the spawn', () => {
  globalThis.localStorage = { getItem: () => JSON.stringify({ meadow: [['0,0', 2], ['100,0', 3], ['1,1', 900], ['bad', 2], ['0,-2', 2]] }) }
  assert.deepEqual(loadHuntWorld('meadow'), [['0,-2', 2]])
})
