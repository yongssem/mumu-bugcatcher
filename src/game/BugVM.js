// 🖐️ 곤충월드 1인칭 뷰모델 — 손+도구를 카메라 앞에 들고 다니는 모습 (마인크래프트식 손맛).
//   모종삽 채굴, 잠자리채 휘두르기, 폭탄 던지기, 마취 발사, 함정 설치 + 걸을 때 흔들림.
// Hand.js의 주먹 손을 재사용. BugHunt가 카메라에 부착하고 update(dt, moving)·swing()을 호출.
import * as THREE from 'three'
import { makeHand } from './Hand.js'

const SWING_DUR = 0.26
// 밤(숲)에서도 도구가 보이도록 살짝 발광
const lm = (color, emiss = 0.18) => {
  const c = new THREE.Color(color)
  return new THREE.MeshLambertMaterial({ color: c, emissive: c.clone().multiplyScalar(emiss) })
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); return g }

export class BugViewModel {
  constructor(camera, skinTone = '#E9B486') {
    this.group = new THREE.Group()
    this.group.position.set(0.4, -0.4, -0.78)
    camera.add(this.group)

    const skin = lm(skinTone, 0.12)
    const wood = lm('#8A5A34'), metal = lm('#C9CED6', 0.24), pole = lm('#B98A4A')
    const dark = lm('#2A2A2E', 0.08), gold = lm('#F2C14E', 0.3), red = lm('#E85A7A', 0.3)

    const gripHand = () => {
      const h = makeHand(skin, { grip: true }); h.scale.setScalar(0.72)
      h.userData.forearm.rotation.z = 0.5; h.userData.forearm.rotation.x = 0.3
      return h
    }

    // 🪏 모종삽 — 자루 + 삽날(스페이드)
    const trowel = new THREE.Group()
    trowel.add(gripHand())
    trowel.add(box(0.07, 0.5, 0.09, wood, 0, 0.12, 0))
    trowel.add(box(0.09, 0.12, 0.09, metal, 0, 0.42, 0))
    const blade = box(0.22, 0.3, 0.04, metal, 0, 0.62, 0.02); blade.rotation.x = 0.22; trowel.add(blade)
    trowel.rotation.set(0.5, -0.18, 0.1)

    // 🥅 잠자리채 — 긴 자루 + 테 + 반투명 그물
    const net = new THREE.Group()
    net.add(gripHand())
    net.add(box(0.05, 0.95, 0.06, pole, 0, 0.22, 0))
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.028, 6, 18), lm('#F0F0F0', 0.28))
    hoop.position.set(0, 0.78, 0.02); hoop.rotation.x = Math.PI / 2 - 0.35; net.add(hoop)
    const nm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, emissive: 0x2a2a2a })
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.42, 14, 1, true), nm)
    cone.position.set(0, 0.96, 0.02); cone.rotation.x = Math.PI; net.add(cone)
    net.rotation.set(0.32, -0.16, 0.08)

    // 💣 폭탄 — 쥔 손 위 둥근 폭탄 + 심지
    const bomb = new THREE.Group()
    bomb.add(gripHand())
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), dark); ball.position.y = 0.26; bomb.add(ball)
    bomb.add(box(0.04, 0.16, 0.04, gold, 0.06, 0.46, 0))
    bomb.rotation.set(0.4, -0.16, 0.08)

    // 💉 마취 다트 — 취관(블로건) + 끝
    const dart = new THREE.Group()
    dart.add(gripHand())
    dart.add(box(0.08, 0.7, 0.08, dark, 0, 0.22, 0))
    dart.add(box(0.05, 0.14, 0.05, red, 0, 0.62, 0))
    dart.rotation.set(0.55, -0.16, 0.08)

    // 🕳️ 함정 — 손 위 나무 덫 블록
    const trap = new THREE.Group()
    trap.add(gripHand())
    trap.add(box(0.34, 0.22, 0.34, lm('#6B4A2A'), 0, 0.24, 0.02))
    trap.add(box(0.36, 0.06, 0.36, lm('#241A10', 0.06), 0, 0.36, 0.02))
    trap.rotation.set(0.42, -0.16, 0.08)

    this.tools = { trowel, net, bomb, dart, trap }
    for (const k in this.tools) this.group.add(this.tools[k])
    this.setTool('trowel')

    this._swingT = 1; this._bobT = 0
  }

  setTool(id) { for (const k in this.tools) this.tools[k].visible = k === id }
  swing() { this._swingT = 0 }

  update(dt, moving) {
    // 휘두르기 — 아래로 찍었다 복귀
    if (this._swingT < 1) this._swingT = Math.min(1, this._swingT + dt / SWING_DUR)
    const s = Math.sin(this._swingT * Math.PI)
    this.group.rotation.x = -s * 1.0
    this.group.rotation.y = s * 0.22
    this.group.position.z = -0.78 - s * 0.18

    // 걷기 bob (이동 중 크게, 서 있으면 잔잔한 숨쉬기)
    this._bobT += dt * (moving ? 9 : 2.2)
    this.group.position.y = -0.4 + Math.sin(this._bobT) * (moving ? 0.03 : 0.008)
    this.group.position.x = 0.4 + Math.cos(this._bobT * 0.5) * (moving ? 0.016 : 0)
  }
}
