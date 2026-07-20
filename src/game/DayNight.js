// 낮밤 사이클 — 로컬 시계 기준. 하늘·안개·조명을 lerp로 전환 (동기화 불필요)
import * as THREE from 'three'

export const CYCLE_SECONDS = 180 // 1주기 3분

// 시간 구간: 0~0.6 낮 / 0.6~0.7 노을 / 0.7~0.95 밤 / 0.95~1.0 새벽
export class DayNight {
  constructor(scene, hemi, sun) {
    this.scene = scene
    this.hemi = hemi
    this.sun = sun
    this.t = 0.15 // 아침부터 시작
    this.day = 1  // 1일차부터 — 사이클이 한 바퀴 돌 때마다 +1
    this._day = new THREE.Color('#7EC8F0')
    this._night = new THREE.Color('#1A2B4A')
    this._dusk = new THREE.Color('#E8956D')
    this._sunDay = new THREE.Color('#fff6e0')
    this._sunNight = new THREE.Color('#b9c8ff')
    this._sky = new THREE.Color()
    this._sunColor = new THREE.Color()
  }

  setTime(t) {
    this.t = ((t % 1) + 1) % 1
  }

  isNight() {
    return this.t >= 0.7
  }

  // 0=완전 낮, 1=완전 밤
  darkness() {
    const t = this.t
    if (t < 0.6) return 0
    if (t < 0.7) return (t - 0.6) / 0.1
    if (t < 0.95) return 1
    return 1 - (t - 0.95) / 0.05
  }

  // 노을 강도 (전환 구간에서만 봉우리)
  duskAmount() {
    const t = this.t
    if (t >= 0.6 && t < 0.7) return Math.sin(((t - 0.6) / 0.1) * Math.PI) * 0.55
    if (t >= 0.95) return Math.sin(((t - 0.95) / 0.05) * Math.PI) * 0.45
    return 0
  }

  update(dt) {
    const prev = this.t
    this.t = (this.t + dt / CYCLE_SECONDS) % 1
    if (this.t < prev) this.day++ // 자정(새벽) 넘김 = 다음 날
    const k = this.darkness()

    this._sky.lerpColors(this._day, this._night, k)
    const dusk = this.duskAmount()
    if (dusk > 0) this._sky.lerp(this._dusk, dusk)

    this.scene.background.copy(this._sky)
    this.scene.fog.color.copy(this._sky)
    // 밤엔 안개를 바짝 당겨 아늑한 긴장감 (공포 금지 — 새카맣게 하지 않음)
    this.scene.fog.near = 40 - 22 * k
    this.scene.fog.far = 90 - 40 * k

    this.hemi.intensity = 0.9 - 0.6 * k
    this.sun.intensity = 1.2 - 1.0 * k
    this._sunColor.lerpColors(this._sunDay, this._sunNight, k)
    this.sun.color.copy(this._sunColor)
  }
}
