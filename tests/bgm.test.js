import test from 'node:test'
import assert from 'node:assert/strict'
test('blocked localStorage must not prevent the app music module from loading', async () => {
  globalThis.localStorage = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('SecurityError') } }
  const bgm = await import('../src/game/bgm.js?blocked')
  assert.equal(bgm.getBgmVolume(), 0.35)
  assert.doesNotThrow(() => bgm.setBgmVolume(0.4))
  assert.equal(bgm.getBgmVolume(), 0.4)
})
