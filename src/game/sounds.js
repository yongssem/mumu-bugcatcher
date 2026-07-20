// 사운드 — WebAudio로 코드 생성하는 8비트풍 효과음 + 칩튠 BGM (외부 파일·라이브러리 없음)
// 교실 사용 전제: 전체 볼륨 낮게, 음소거 토글 지원 (localStorage 유지)

const MUTE_KEY = 'mumubug:muted'

// 음계 주파수 (칩튠 BGM용)
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.26,
}

// 낮: 밝은 펜타토닉 멜로디 / 밤: 낮고 차분한 단조 (공포 금지 — 아늑한 긴장)
const DAY_MELODY = [N.C4, null, N.E4, N.G4, N.A4, null, N.G4, N.E4, N.D4, null, N.E4, N.G4, N.C5, null, N.A4, N.G4]
const DAY_BASS = [N.C3, null, null, null, N.G3, null, null, null, N.A3, null, null, null, N.F3, null, null, null]
const NIGHT_MELODY = [N.A3, null, null, N.C4, null, null, N.E4, null, N.D4, null, null, N.C4, null, null, N.B3, null]
const NIGHT_BASS = [N.A3 / 2, null, null, null, null, null, null, null, N.E3 / 2, null, null, null, null, null, null, null]

export class Sounds {
  constructor() {
    this.ctx = null
    this.muted = localStorage.getItem(MUTE_KEY) === '1'
    this.night = false
    this._bgmTimer = null
    this._step = 0
  }

  // 브라우저 정책: 사용자 제스처 후에만 오디오 시작 가능 — 첫 입력에서 호출
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.4
      this.master.connect(this.ctx.destination)
      // 효과음/BGM 버스 분리
      this.sfxBus = this.ctx.createGain()
      this.sfxBus.gain.value = 1
      this.sfxBus.connect(this.master)
      this.bgmBus = this.ctx.createGain()
      this.bgmBus.gain.value = 0.55
      this.bgmBus.connect(this.master)
      // 칩튠 자동 BGM은 끔 — 배경음악은 public/bgm/*.mp3 파일을 넣으면 bgm.js가 재생.
      // 효과음(부수기·격퇴·낮밤 전환음)은 그대로 유지.
      if (this._rainOn) this.setRain(true) // unlock 전에 비가 시작됐으면 재적용
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  toggleMute() {
    this.muted = !this.muted
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.4
    return this.muted
  }

  suspend() {
    this.ctx?.suspend()
  }

  resume() {
    this.ctx?.resume()
  }

  dispose() {
    if (this._bgmTimer) clearInterval(this._bgmTimer)
    this.ctx?.close()
    this.ctx = null
  }

  // ---------- 신스 프리미티브 ----------
  // 단음 블립 (게임보이 느낌). slide: 재생 중 주파수 이동(Hz)
  _blip(freq, dur, type = 'square', vol = 0.12, slide = 0, when = 0) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g)
    g.connect(this.sfxBus)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  // 노이즈 버스트 (부수기·폭발·휘두르기). filterFreq에서 아래로 슬라이드
  _noise(dur, filterFreq, vol = 0.2, slideDown = true) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime
    const len = Math.ceil(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(filterFreq, t)
    if (slideDown) filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.15), t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.sfxBus)
    src.start(t)
  }

  // ---------- 효과음 ----------
  mineTick() { this._noise(0.05, 1400, 0.05) } // 채굴 중 틱틱
  pickup() { this._blip(660, 0.09, 'triangle', 0.11, 240) } // 아이템 획득 뿅
  blockBreak() { this._noise(0.14, 1000, 0.22) }
  blockPlace() { this._blip(190, 0.07, 'square', 0.14, -40) }
  goldDing() { this._blip(1046, 0.25, 'triangle', 0.12, 0); this._blip(1568, 0.3, 'triangle', 0.1, 0, 0.07) }
  // 🏆 승리 팡파레 — 도-미-솔-도 상승 아르페지오 (SFC 격파 느낌)
  fanfare() {
    const notes = [523, 659, 784, 1046, 1319]
    notes.forEach((f, i) => this._blip(f, 0.22, 'square', 0.12, 0, i * 0.11))
    this._blip(1046, 0.5, 'triangle', 0.1, 0, 0.55) // 마무리 롱톤
    this._blip(1568, 0.5, 'triangle', 0.08, 0, 0.55)
  }
  swing() { this._noise(0.1, 2600, 0.07) }
  arrowShot() { this._noise(0.18, 4200, 0.09) }
  dynamiteThrow() { this._blip(500, 0.15, 'triangle', 0.08, -300) }
  explosion() { this._noise(0.65, 420, 0.45); this._blip(60, 0.5, 'sine', 0.3, -20) }
  hurt() { this._blip(320, 0.18, 'sawtooth', 0.13, -160) }
  zombieHit() { this._blip(160, 0.1, 'square', 0.13, -50) }
  zombieDie() { this._blip(400, 0.1, 'square', 0.12, -100); this._blip(250, 0.12, 'square', 0.1, -100, 0.09); this._blip(140, 0.18, 'square', 0.09, -80, 0.19) }
  playerDie() { this._blip(440, 0.15, 'triangle', 0.12, -100); this._blip(330, 0.15, 'triangle', 0.11, -80, 0.15); this._blip(220, 0.35, 'triangle', 0.1, -120, 0.3) }
  daybreak() { this._blip(N.C5, 0.12, 'triangle', 0.1); this._blip(N.E5, 0.2, 'triangle', 0.09, 0, 0.1) }
  nightfall() { this._blip(N.A3, 0.3, 'triangle', 0.1, -30); this._blip(N.E3, 0.45, 'triangle', 0.09, -20, 0.2) }
  bark() { this._blip(520, 0.07, 'square', 0.12, 120); this._blip(660, 0.08, 'square', 0.1, 100, 0.09) }
  bossAppear() { this._blip(110, 0.5, 'sawtooth', 0.16, -40); this._blip(82, 0.7, 'sawtooth', 0.14, -20, 0.3) }
  // 🦖 티라노 포효 — 낮게 우르릉 (무섭기보다 우당탕 긴장감)
  roar() { this._blip(95, 0.7, 'sawtooth', 0.17, -35); this._blip(70, 0.9, 'sawtooth', 0.14, -22, 0.25); this._noise(0.55, 320, 0.16) }
  // 🦖 격퇴 poof — 통통 내려가는 3음 + 뿅
  dinoPoof() { this._blip(520, 0.12, 'square', 0.12, -80); this._blip(390, 0.12, 'square', 0.11, -70, 0.11); this._blip(260, 0.2, 'square', 0.1, -60, 0.22); this._blip(880, 0.15, 'triangle', 0.09, 200, 0.36) }
  buy() { this._blip(880, 0.08, 'triangle', 0.11); this._blip(1174, 0.12, 'triangle', 0.1, 0, 0.08) }
  // 🍖 냠냠 — 씹는 소리 2번 + 만족의 "냠!"
  nom() {
    this._blip(170, 0.07, 'square', 0.11, -40)
    this._noise(0.05, 480, 0.08)
    this._blip(150, 0.08, 'square', 0.1, -30, 0.09)
    this._blip(560, 0.12, 'triangle', 0.09, 140, 0.2)
  }
  // 🦕 종류별 공룡 울음소리 (동물원 생동감)
  dinoVoice(kind) {
    if (kind === 'roar') { // 육식 대형 — 낮은 으르렁
      this._blip(92, 0.5, 'sawtooth', 0.13, -30); this._blip(68, 0.6, 'sawtooth', 0.11, -18, 0.2); this._noise(0.4, 300, 0.1)
    } else if (kind === 'bellow') { // 초식 대형 — 소·코끼리 같은 저음 울음
      this._blip(125, 0.55, 'sine', 0.15, -35); this._blip(98, 0.7, 'triangle', 0.11, -22, 0.14)
    } else if (kind === 'chirp') { // 소형 — 짹짹 종종
      this._blip(720, 0.06, 'square', 0.1, 220); this._blip(920, 0.06, 'square', 0.09, 160, 0.08); this._blip(800, 0.06, 'square', 0.08, 120, 0.16)
    } else if (kind === 'screech') { // 익룡 — 끼이익 하강
      this._blip(1450, 0.13, 'sawtooth', 0.09, -650); this._blip(1150, 0.1, 'sawtooth', 0.08, -430, 0.1)
    } else if (kind === 'whale') { // 수룡 — 낮고 긴 고래 울음
      this._blip(185, 0.85, 'sine', 0.12, -60); this._blip(140, 1.05, 'sine', 0.1, -40, 0.3)
    }
  }
  // 🔨 제작 완성 — 망치질 2번 + 밝은 상승음
  craft() { this._noise(0.08, 1200, 0.14); this._noise(0.08, 1200, 0.14, true); this._blip(660, 0.1, 'square', 0.1, 0, 0.12); this._blip(990, 0.16, 'triangle', 0.11, 120, 0.22) }

  // 빗소리 — 루프 노이즈 (비 오는 동안만)
  setRain(on) {
    this._rainOn = on
    if (!this.ctx) return
    if (on && !this._rainSrc) {
      const len = this.ctx.sampleRate * 2
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 850
      const g = this.ctx.createGain()
      g.gain.value = 0.035
      src.connect(filter); filter.connect(g); g.connect(this.sfxBus)
      src.start()
      this._rainSrc = src
    } else if (!on && this._rainSrc) {
      this._rainSrc.stop()
      this._rainSrc = null
    }
  }

  // ---------- BGM (16스텝 루프 시퀀서) ----------
  setNight(night) {
    if (this.night === night) return
    this.night = night
    if (night) this.nightfall()
    else this.daybreak()
  }

  _startBGM() {
    const stepDur = () => (this.night ? 0.34 : 0.24) // 밤엔 느리게
    const tick = () => {
      if (!this.ctx || this.muted || this.ctx.state !== 'running') return
      const melody = this.night ? NIGHT_MELODY : DAY_MELODY
      const bass = this.night ? NIGHT_BASS : DAY_BASS
      const i = this._step % 16
      const t = this.ctx.currentTime + 0.05
      const m = melody[i]
      const b = bass[i]
      if (m) this._bgmNote(m, stepDur() * 0.9, 'triangle', this.night ? 0.05 : 0.06, t)
      if (b) this._bgmNote(b, stepDur() * 3.2, 'sine', 0.05, t)
      this._step++
    }
    // 스텝 간격은 낮/밤에 따라 다름 — 짧은 인터벌로 돌리며 시간 체크
    let last = 0
    this._bgmTimer = setInterval(() => {
      if (!this.ctx) return
      const now = this.ctx.currentTime
      if (now - last >= stepDur()) {
        last = now
        tick()
      }
    }, 40)
  }

  _bgmNote(freq, dur, type, vol, when) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(vol, when + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, when + dur)
    osc.connect(g)
    g.connect(this.bgmBus)
    osc.start(when)
    osc.stop(when + dur + 0.05)
  }
}
