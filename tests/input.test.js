import test from 'node:test'
import assert from 'node:assert/strict'
import { HuntInput } from '../src/game/HuntInput.js'
function setup(callbacks = {}) {
  const doc = new EventTarget(), win = new EventTarget(), canvas = new EventTarget()
  canvas.ownerDocument = doc
  canvas.style = { cursor: 'crosshair' }
  const input = new HuntInput(canvas, callbacks, { doc, win })
  const key = (code, repeat = false, type = 'keydown') => { const e = new Event(type, { cancelable: true }); Object.assign(e, { code, repeat }); doc.dispatchEvent(e) }
  return { doc, win, canvas, input, key }
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
test('desktop mouse movement changes the view without pressing a button even if lock is unavailable', () => {
  let movement = 0
  const s = setup({ onLook: x => { movement += x } })
  s.input.start(false)
  const e = new Event('mousemove')
  Object.assign(e, { movementX: 12, movementY: 0 })
  // EventTarget의 캔버스 이벤트를 문서에 버블링하는 대신 target을 실제 캔버스로 지정.
  Object.defineProperty(e, 'target', { value: s.canvas })
  s.doc.dispatchEvent(e)
  assert.equal(movement, 12)
  assert.equal(s.input.state.held, false)
  assert.equal(s.canvas.style.cursor, 'none')
  s.input.pause()
  assert.equal(s.canvas.style.cursor, 'crosshair')
  s.input.dispose()
})
test('legacy pointer lock errors use free mouse look and notify once', () => {
  let fallback = 0
  const s = setup({ onFallback: () => fallback++ })
  s.canvas.requestPointerLock = () => undefined
  s.input.start(false)
  s.doc.dispatchEvent(new Event('pointerlockerror'))
  s.doc.dispatchEvent(new Event('pointerlockerror'))
  assert.equal(fallback, 1)
  assert.equal(s.input.active, true)
  s.input.dispose()
})
test('switching from mouse to touch releases the lock and held actions without pausing', () => {
  let unlocked = 0
  const s = setup()
  s.input.start(false)
  s.doc.pointerLockElement = s.canvas
  s.doc.exitPointerLock = () => { unlocked++; s.doc.pointerLockElement = null; s.doc.dispatchEvent(new Event('pointerlockchange')) }
  s.doc.dispatchEvent(new Event('pointerlockchange'))
  s.input.state.held = true
  s.input.setMode(true)
  assert.equal(unlocked, 1)
  assert.equal(s.input.active, true)
  assert.equal(s.input.state.held, false)
  assert.equal(s.canvas.style.cursor, 'crosshair')
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
test('portrait orientation block pauses and clears keyboard and touch actions', () => {
  const s = setup()
  s.input.start(true); s.key('KeyW')
  s.input.state.moveX = 1; s.input.state.held = true
  s.win.dispatchEvent(new Event('mumubug:orientationblocked'))
  assert.equal(s.input.active, false)
  assert.deepEqual(s.input.sample(), { x: 0, y: 0, jump: false })
  assert.equal(s.input.state.moveX, 0)
  assert.equal(s.input.state.held, false)
  s.input.dispose()
})
