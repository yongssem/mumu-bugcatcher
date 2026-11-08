// 사용자 클릭에서 전체화면에 진입한 뒤 지원되는 기기만 가로 잠금을 시도한다.
export async function enterFullscreen({ doc = document, orientation = globalThis.screen?.orientation, landscape = false } = {}) {
  let fullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement)
  if (!fullscreen) {
    const el = doc.documentElement
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
    if (request) {
      try { await request.call(el); fullscreen = true } catch { /* 미지원/거절 시 회전 안내 유지 */ }
    }
  }
  let locked = false
  if (landscape && orientation?.lock) {
    try { await orientation.lock('landscape'); locked = true } catch { /* Safari·인앱 등은 안내로 대체 */ }
  }
  return { fullscreen, locked }
}
