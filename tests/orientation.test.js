import test from 'node:test'
import assert from 'node:assert/strict'
import { enterFullscreen } from '../src/ui/mobile/orientation.js'
test('landscape lock is requested after fullscreen succeeds', async () => {
  const calls = []
  const doc = { documentElement: { async requestFullscreen() { calls.push('fullscreen') } } }
  const orientation = { async lock(value) { calls.push(value) } }
  const result = await enterFullscreen({ doc, orientation, landscape: true })
  assert.deepEqual(calls, ['fullscreen', 'landscape'])
  assert.equal(result.locked, true)
})
test('unsupported and rejected browser APIs resolve without blocking the game', async () => {
  assert.deepEqual(await enterFullscreen({ doc: { documentElement: {} }, landscape: true }), { fullscreen: false, locked: false })
  const doc = { documentElement: { async requestFullscreen() { throw new Error('denied') } } }
  const orientation = { async lock() { throw new Error('unsupported') } }
  assert.deepEqual(await enterFullscreen({ doc, orientation, landscape: true }), { fullscreen: false, locked: false })
})
test('desktop fullscreen never forces an orientation lock', async () => {
  let locked = false
  await enterFullscreen({ doc: { fullscreenElement: {}, documentElement: {} }, orientation: { lock() { locked = true } }, landscape: false })
  assert.equal(locked, false)
})
