import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { loadInventory, craftItem, addMaterial, INVENTORY_KEY } from '../src/save/inventory.js'
import { loadBugpedia, recordCatch, spendExtra, BUGPEDIA_KEY } from '../src/save/bugpedia.js'
import { loadHome, HOME_KEY } from '../src/save/home.js'
import { RECIPES } from '../src/game/bugcraft.js'

let data
beforeEach(() => {
  data = new Map()
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }
})

test('inventory rejects malformed and negative counts without removing valid progress', () => {
  data.set(INVENTORY_KEY, JSON.stringify({ mats: { twig: 8, leaf: -2, sap: 'oops' }, items: { net: 1, bomb: null } }))
  assert.deepEqual(loadInventory(), { mats: { twig: 8 }, items: { net: 1 } })
})
test('permanent net cannot spend materials a second time', () => {
  const inv = { mats: { twig: 4, leaf: 4 }, items: {} }
  assert.equal(craftItem(inv, RECIPES[0]), true)
  assert.equal(craftItem(inv, RECIPES[0]), false)
  assert.deepEqual(inv.mats, { twig: 2, leaf: 2 })
})
test('malformed pedia entries cannot crash catching or selling', () => {
  data.set(BUGPEDIA_KEY, JSON.stringify({ ant: 'broken', bee: { n: '2' }, beetle: { n: 3 } }))
  assert.deepEqual(loadBugpedia(), { beetle: { n: 3 } })
  assert.equal(recordCatch('ant').n, 1)
  assert.equal(spendExtra('ant'), null)
})
test('blocked storage preserves newly caught insects within the current session', () => {
  localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  assert.equal(recordCatch('session-ant').n, 1)
  assert.equal(recordCatch('session-ant').n, 2)
  assert.equal(loadBugpedia()['session-ant'].n, 2)
})
test('material decrement cannot create a negative inventory', () => {
  const inv = { mats: { dirt: 1 }, items: {} }
  addMaterial(inv, 'dirt', -3)
  assert.equal(inv.mats.dirt, 0)
})
test('home normalizes corrupt collections and numeric stats', () => {
  data.set(HOME_KEY, JSON.stringify({ coins: -4, display: [17, null], stock: [null, { id: 'ant', price: 'bad' }], stats: { sold: 'oops', bred: -1 } }))
  const h = loadHome()
  assert.equal(h.coins, 0)
  assert.deepEqual(h.display, [null, null, null, null, null, null])
  assert.deepEqual(h.stock, [])
  assert.deepEqual(h.stats, { views: 0, sold: 0, bred: 0, live: 0 })
})
test('unknown or inherited insect IDs cannot remain in home displays or stock', () => {
  data.set(HOME_KEY, JSON.stringify({ display: ['missing-bug-id', 'constructor', '__proto__'], stock: [{ id: 'constructor', price: 20 }] }))
  const h = loadHome()
  assert.deepEqual(h.display, [null, null, null, null, null, null])
  assert.deepEqual(h.stock, [])
})
