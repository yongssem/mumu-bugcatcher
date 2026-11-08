import test from 'node:test'
import assert from 'node:assert/strict'
import { HuntInput } from '../src/game/HuntInput.js'
function setup(callbacks = {}) {
  const doc = new EventTarget(), win = new EventTarget(), canvas = new EventTarget()
  canvas.ownerDocument = doc
  const input = new HuntInput(canvas, callbacks, { doc, win })
  const key = (code, repeat = false, type = 'keydown') => { const e = new Event(type, { cancelable: true }); Object.assign(e, { code, repeat }); doc.dispatchEvent(e) }
  return { doc, win, input, key }
}
test('focus loss clears movement and held use and pauses', () => {
  let paused = 0
  const s = setup({ onPause: () => paused++ })
  s.input.start(true); s.key('KeyW'); s.input.state.held = true
  assert.equal(s.input.sample().y, 1)
  s.win.dispatchEvent(new Event('blur'))
  assert.equal(s.input.sample().y, 0)
  assert.equal(s.input.state.held, false)
  assert.equal(s.input.active, false)
  assert.equal(paused, 1)
  s.input.dispose()
})
test('keyboard repeat cannot repeatedly toggle craft or trigger queued jumps', () => {
  let opened = 0
  const s = setup({ onCraft: () => opened++ })
  s.input.start(true)
  s.key('Space'); s.key('Space', true)
  assert.equal(s.input.sample().jump, true)
  assert.equal(s.input.sample().jump, false)
  s.key('KeyC'); s.key('KeyC', true)
  assert.equal(opened, 1)
  s.input.dispose()
})
test('paused input cannot move or jump; disposed handlers no longer execute', () => {
  const s = setup()
  s.key('KeyW'); s.key('Space')
  assert.equal(s.input.sample().y, 0)
  assert.equal(s.input.sample().jump, false)
  s.input.start(true); s.input.dispose(); s.key('KeyW')
  assert.equal(s.input.sample().y, 0)
})
