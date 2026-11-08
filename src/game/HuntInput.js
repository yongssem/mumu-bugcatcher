// 키보드·마우스·터치의 수명주기를 한곳에서 관리한다.
export class HuntInput {
  constructor(canvas, callbacks = {}, env = {}) {
    this.canvas = canvas; this.cb = callbacks
    this.doc = env.doc || document; this.win = env.win || window
    this.cursorBefore = canvas.style?.cursor || ''
    this.active = false; this.listeners = []; this.reset()
    const listen = (target, name, fn) => { target.addEventListener(name, fn); this.listeners.push(() => target.removeEventListener(name, fn)) }
    listen(this.doc, 'keydown', e => this.key(e, true))
    listen(this.doc, 'keyup', e => this.key(e, false))
    listen(this.win, 'blur', () => this.pause())
    listen(this.win, 'mumubug:orientationblocked', () => this.pause())
    listen(this.doc, 'visibilitychange', () => { if (this.doc.hidden) this.pause() })
    listen(this.doc, 'pointerlockchange', () => {
      const locked = this.doc.pointerLockElement === canvas
      if (locked && (!this.active || !this.mouseMode)) { this.doc.exitPointerLock?.(); return }
      if (this.wasLocked && !locked && this.active) this.pause()
      this.wasLocked = locked; this.cb.onLock?.(locked)
    })
    listen(this.doc, 'pointerlockerror', () => this.fallback())
    listen(this.doc, 'mousemove', e => {
      if (!this.active || !this.mouseMode) return
      if (this.doc.pointerLockElement === canvas || e.target === canvas) this.cb.onLook?.(e.movementX || 0, e.movementY || 0, false)
    })
    listen(canvas, 'contextmenu', e => e.preventDefault())
    listen(canvas, 'pointerdown', e => {
      if (!this.active) return
      if (e.pointerType === 'touch') {
        if (this.mouseMode) this.setMode(true)
        if (this.look) return
        this.look = { id: e.pointerId, x: e.clientX, y: e.clientY }
        canvas.setPointerCapture?.(e.pointerId)
      } else {
        if (!this.mouseMode) this.setMode(false)
        if (e.button === 2) this.cb.onPlace?.()
        else if (e.button === 0) { this.state.held = true; this.cb.onUse?.() }
      }
    })
    listen(canvas, 'pointermove', e => {
      if (!this.active || this.mouseMode || this.look?.id !== e.pointerId || this.doc.pointerLockElement === canvas) return
      this.cb.onLook?.(e.clientX - this.look.x, e.clientY - this.look.y, e.pointerType === 'touch')
      this.look.x = e.clientX; this.look.y = e.clientY
    })
    const release = e => { if (this.look?.id === e.pointerId) this.look = null; if (e.pointerType !== 'touch') this.state.held = false }
    listen(this.doc, 'pointerup', release); listen(canvas, 'pointercancel', release); listen(canvas, 'lostpointercapture', release)
  }
  reset() { this.state = { f: false, b: false, l: false, r: false, run: false, jump: false, held: false, moveX: 0, moveY: 0 }; this.look = null }
  start(touch = false) {
    this.reset(); this.active = true
    this.setMode(touch)
  }
  setMode(touch) {
    this.reset()
    this.mouseMode = !touch; this.look = null; this.lockFailed = false
    if (this.canvas.style) this.canvas.style.cursor = touch ? this.cursorBefore : 'none'
    this.cb.onInputMode?.(touch)
    if (touch) {
      this.wasLocked = false
      if (this.doc.pointerLockElement === this.canvas) this.doc.exitPointerLock?.()
      return
    }
    if (!this.canvas.requestPointerLock) { this.fallback(); return }
    try { this.canvas.requestPointerLock()?.catch?.(() => this.fallback()) } catch { this.fallback() }
  }
  fallback() {
    if (!this.active || !this.mouseMode || this.lockFailed) return
    this.lockFailed = true; this.cb.onFallback?.()
  }
  pause(notify = true) {
    const active = this.active
    this.active = false; this.reset()
    this.mouseMode = false
    if (this.canvas.style) this.canvas.style.cursor = this.cursorBefore
    if (this.doc.pointerLockElement === this.canvas) this.doc.exitPointerLock?.()
    if (active && notify) this.cb.onPause?.()
  }
  key(e, down) {
    if (e.target?.closest?.('input,textarea,select,[contenteditable=true]')) return
    if (down && !e.repeat && ['KeyC', 'KeyE'].includes(e.code)) { e.preventDefault(); this.cb.onCraft?.(); return }
    if (down && !e.repeat && e.code === 'Escape') { this.pause(); return }
    if (!this.active) return
    const movement = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' }
    if (movement[e.code]) { this.state[movement[e.code]] = down; e.preventDefault() }
    if (e.code === 'Space') { e.preventDefault(); if (down && !e.repeat) this.state.jump = true }
    if (down && !e.repeat && /^Digit[1-5]$/.test(e.code)) this.cb.onTool?.(Number(e.code.slice(-1)) - 1)
  }
  sample() {
    if (!this.active) return { x: 0, y: 0, jump: false }
    const s = this.state
    const result = { x: Number(s.r) - Number(s.l) + s.moveX, y: Number(s.f) - Number(s.b) + s.moveY, run: s.run, jump: s.jump }
    s.jump = false
    return result
  }
  dispose() { this.pause(false); for (const off of this.listeners) off(); this.listeners = [] }
}
