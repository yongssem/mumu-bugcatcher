// 파티클 — 타격 시 튀는 별/조각 + 데미지 숫자, 처치 시 터지는 폭죽 (전부 코드 생성)
import * as THREE from 'three'

const GRAV = 16

// 데미지 숫자 텍스처 캐시 (-1, -2, -4, -8 정도만 쓰이므로 재사용)
const _numTexCache = new Map()
function numberTexture(n) {
  if (_numTexCache.has(n)) return _numTexCache.get(n)
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 32
  const ctx = c.getContext('2d')
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 5
  ctx.strokeStyle = '#3A2410'
  ctx.strokeText(`-${n}`, 32, 17)
  ctx.fillStyle = '#FFE27A'
  ctx.fillText(`-${n}`, 32, 17)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  _numTexCache.set(n, tex)
  return tex
}

// 😊 이모지 텍스처 캐시 — 공룡 기분 마크(하트·물방울·배고픔 등)에 재사용
const _emojiTexCache = new Map()
export function emojiTexture(emoji) {
  if (_emojiTexCache.has(emoji)) return _emojiTexCache.get(emoji)
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  ctx.font = '52px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 32, 36)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  _emojiTexCache.set(emoji, tex)
  return tex
}

// 🫧 기분 마크 텍스처 — 위에 이모지, 아래에 이유 말풍선(예: '목말라요'). label 없으면 이모지만.
// 캔버스 비율 고정(128x96)이라 스프라이트 scale은 항상 같은 종횡비로 두면 됨.
const _moodTexCache = new Map()
export function moodTexture(emoji, label = '') {
  const key = emoji + '|' + label
  if (_moodTexCache.has(key)) return _moodTexCache.get(key)
  const c = document.createElement('canvas')
  c.width = 128; c.height = 96
  const ctx = c.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (label) {
    // 이모지 (위)
    ctx.font = '46px sans-serif'
    ctx.fillText(emoji, 64, 30)
    // 말풍선 (아래)
    ctx.font = 'bold 26px "DungGeunMo", sans-serif'
    const w = Math.min(120, ctx.measureText(label).width + 20)
    const x = 64 - w / 2, y = 58, h = 32, r = 10
    ctx.fillStyle = 'rgba(20,16,32,0.82)'
    ctx.beginPath()
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#ffe9c2'
    ctx.fillText(label, 64, y + h / 2 + 1)
  } else {
    ctx.font = '64px sans-serif'
    ctx.fillText(emoji, 64, 48)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  _moodTexCache.set(key, tex)
  return tex
}

export class Particles {
  constructor(scene) {
    this.scene = scene
    this.bits = []
    this._geo = new THREE.BoxGeometry(1, 1, 1) // scale로 크기 조절
  }

  // 💗 기분 마크 — 이모지가 위로 두둥실 떠오르며 사라짐 (먹이 먹었을 때 등)
  emote(pos, emoji = '❤️') {
    const mat = new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0.7, 0.7, 1)
    sprite.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 0.4, pos.z)
    this.scene.add(sprite)
    this.bits.push({
      mesh: sprite, mat,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.3, 0),
      life: 1.1, maxLife: 1.1, gravity: false, spin: 0, baseSize: 1, sprite: true,
    })
  }

  // 🔢 데미지 숫자 — 노란 "-N"이 위로 떠오르며 사라짐
  damageNumber(pos, dmg) {
    const mat = new THREE.SpriteMaterial({ map: numberTexture(dmg), transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0.9, 0.45, 1)
    sprite.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 0.6, pos.z)
    this.scene.add(sprite)
    this.bits.push({
      mesh: sprite,
      mat,
      vel: new THREE.Vector3(0, 1.6, 0),
      life: 0.8,
      maxLife: 0.8,
      gravity: false,
      spin: 0,
      baseSize: 1,
      sprite: true,
    })
  }

  // 한 조각 생성
  _emit(pos, color, { size = 0.12, speed = 4, up = 3, life = 0.6, gravity = true, spin = 8 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true })
    const mesh = new THREE.Mesh(this._geo, mat)
    mesh.scale.setScalar(size)
    mesh.position.copy(pos)
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * speed
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    this.scene.add(mesh)
    this.bits.push({
      mesh,
      mat,
      vel: new THREE.Vector3(Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r),
      life,
      maxLife: life,
      gravity,
      spin: (Math.random() - 0.5) * spin,
      baseSize: size,
    })
  }

  // 💥 타격: 흰 별빛 + 좀비색 조각이 소량 튀김
  hit(pos, color = '#5A8F3C') {
    for (let i = 0; i < 6; i++) this._emit(pos, '#FFFFFF', { size: 0.08 + Math.random() * 0.05, speed: 3, up: 2.5, life: 0.35, spin: 14 })
    for (let i = 0; i < 4; i++) this._emit(pos, color, { size: 0.1, speed: 2.5, up: 2, life: 0.5 })
  }

  // 🎆 처치: 좀비색 + 초록/연두 폭죽 조각이 사방으로 팡!
  burst(pos, color = '#5A8F3C', big = false) {
    const n = big ? 40 : 20
    const palette = big
      ? ['#F2C14E', '#FFE27A', '#FFFFFF', color] // 보스는 황금 폭발
      : [color, '#6BA55C', '#8FD08A', '#FFFFFF']
    for (let i = 0; i < n; i++) {
      const c = palette[i % palette.length]
      this._emit(pos, c, {
        size: (big ? 0.16 : 0.12) + Math.random() * 0.08,
        speed: big ? 7 : 5,
        up: big ? 5 : 3.5,
        life: 0.6 + Math.random() * 0.4,
        spin: 12,
      })
    }
    // 중앙 섬광 한 방 (커졌다 사라짐)
    const flashMat = new THREE.MeshBasicMaterial({ color: big ? '#FFE9A8' : '#DFF5D8', transparent: true })
    const flash = new THREE.Mesh(this._geo, flashMat)
    flash.scale.setScalar(0.6)
    flash.position.copy(pos)
    this.scene.add(flash)
    this.bits.push({ mesh: flash, mat: flashMat, vel: new THREE.Vector3(), life: 0.25, maxLife: 0.25, gravity: false, spin: 4, baseSize: 0.6, flash: true, big })
  }

  // 🎆 폭죽 — 색색 조각이 솟았다 촤라라락 흩어짐 (보스 격파 축포) + 중앙 섬광
  fireworks(pos) {
    const palette = ['#FF5A7A', '#FFD24E', '#5AE0FF', '#8FFF5A', '#C77BFF', '#FFFFFF', '#FF9E3D']
    for (let i = 0; i < 24; i++) {
      this._emit(pos, palette[Math.floor(Math.random() * palette.length)], {
        size: 0.13 + Math.random() * 0.1, speed: 5 + Math.random() * 4.5,
        up: 6 + Math.random() * 4.5, life: 0.9 + Math.random() * 0.7, gravity: true, spin: 16,
      })
    }
    const flashMat = new THREE.MeshBasicMaterial({ color: '#FFF7D8', transparent: true })
    const flash = new THREE.Mesh(this._geo, flashMat)
    flash.scale.setScalar(0.5); flash.position.copy(pos); this.scene.add(flash)
    this.bits.push({ mesh: flash, mat: flashMat, vel: new THREE.Vector3(), life: 0.3, maxLife: 0.3, gravity: false, spin: 3, baseSize: 0.5, flash: true, big: true })
  }

  // ✨ 반짝임 — 대상 주위에 흰 별빛이 깜빡 (승리 프리즈 연출)
  sparkle(pos, n = 8) {
    for (let i = 0; i < n; i++) {
      const p = pos.clone()
      p.x += (Math.random() - 0.5) * 2.6; p.y += Math.random() * 3; p.z += (Math.random() - 0.5) * 2.6
      this._emit(p, '#FFFFFF', { size: 0.15, speed: 0.4, up: 0.5, life: 0.5 + Math.random() * 0.3, gravity: false, spin: 6 })
    }
  }

  update(dt) {
    this.bits = this.bits.filter((b) => {
      b.life -= dt
      if (b.life <= 0) {
        this.scene.remove(b.mesh)
        b.mat.dispose()
        return false
      }
      const k = b.life / b.maxLife // 1 → 0
      if (b.sprite) {
        // 데미지 숫자: 위로 떠오르며 페이드
        b.mesh.position.addScaledVector(b.vel, dt)
        b.mat.opacity = k
      } else if (b.flash) {
        // 섬광: 빠르게 커지며 투명
        const s = b.baseSize * (1 + (1 - k) * (b.big ? 6 : 4))
        b.mesh.scale.setScalar(s)
        b.mat.opacity = k
      } else {
        if (b.gravity) b.vel.y -= GRAV * dt
        b.mesh.position.addScaledVector(b.vel, dt)
        b.mesh.rotation.x += b.spin * dt
        b.mesh.rotation.y += b.spin * dt
        b.mat.opacity = Math.min(1, k * 1.6)
        b.mesh.scale.setScalar(b.baseSize * (0.3 + k * 0.7)) // 점점 작아짐
      }
      return true
    })
  }

  clear() {
    for (const b of this.bits) {
      this.scene.remove(b.mesh)
      b.mat.dispose()
    }
    this.bits = []
  }
}
