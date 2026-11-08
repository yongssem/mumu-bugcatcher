import test from 'node:test'
import assert from 'node:assert/strict'
import { stepPlayer, movementVector, shortestTurn } from '../src/game/huntPhysics.js'
import { GameTimers } from '../src/game/GameTimers.js'
import { starterNodes } from '../src/game/huntResources.js'

const player = () => ({ pos: { x: 0, z: 0 }, y: 0, vy: 0, yaw: 0, onGround: true })
const world = { radius: 10.5, heightAt: () => 0, solids: [] }
test('diagonal movement is normalized while analog movement keeps its magnitude', () => {
  assert.ok(Math.abs(Math.hypot(...Object.values(movementVector(1, 1, 0))) - 1) < 1e-8)
  assert.deepEqual(movementVector(0, 0.25, 0), { x: 0, z: -0.25 })
})
test('body cannot pass through a thin obstacle even during a slow frame', () => {
  const p = player()
  for (let i = 0; i < 10; i++) stepPlayer(p, { x: 1, y: 0 }, 0.1, { ...world, solids: [{ x: 0.6, z: 0, r: 0.05, height: 5 }] })
  assert.ok(p.pos.x <= 0.34, `position ${p.pos.x}`)
})
test('wall sliding preserves motion along the free axis', () => {
  const p = player()
  stepPlayer(p, { x: 1, y: 1 }, 0.1, { ...world, heightAt: x => x > 0.25 ? 3 : 0 })
  assert.ok(p.pos.z < -0.1)
  assert.ok(p.pos.x < 0.1)
})
test('player climbs one-block steps but cannot climb two-block walls', () => {
  const p = player(), q = player()
  for (let i = 0; i < 20; i++) {
    stepPlayer(p, { x: 1, y: 0 }, 0.05, { ...world, heightAt: x => x >= 1 ? 1 : 0 })
    stepPlayer(q, { x: 1, y: 0 }, 0.05, { ...world, heightAt: x => x >= 1 ? 2 : 0 })
  }
  assert.ok(p.pos.x > 1.2 && p.y === 1)
  assert.ok(q.pos.x < 0.8 && q.y === 0)
})
test('jump is consumed once and lands back on the ground', () => {
  const p = player()
  stepPlayer(p, { jump: true }, 0.05, world)
  assert.ok(p.y > 0)
  for (let i = 0; i < 40; i++) stepPlayer(p, {}, 0.05, world)
  assert.equal(p.y, 0)
  assert.equal(p.onGround, true)
})
test('turn interpolation crosses the angle seam by the shortest route', () => {
  assert.ok(Math.abs(shortestTurn(3.1, -3.1)) < 0.1)
  assert.ok(Math.abs(shortestTurn(-3.1, 3.1)) < 0.1)
})
test('respawn timers advance only with simulation and can be disposed', () => {
  const timers = new GameTimers()
  let called = 0
  timers.after(1, () => called++)
  timers.update(0.5)
  assert.equal(called, 0)
  timers.update(0.5)
  assert.equal(called, 1)
  timers.after(1, () => called++)
  timers.clear()
  timers.update(2)
  assert.equal(called, 1)
})
test('starter resources always include every material and enough net ingredients', () => {
  for (const random of [() => 0, () => 0.999, Math.random]) {
    const types = starterNodes(random)
    assert.ok(types.includes('twigPile') && types.includes('leafPile'))
    assert.ok(new Set(types).size === 6)
    assert.ok(types.filter(t => t === 'twigPile').length >= 2)
    assert.ok(types.filter(t => t === 'leafPile').length >= 2)
  }
})
