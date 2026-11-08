// 🔎 곤충 3D 뷰어 — 선택한 곤충의 복셀 모델을 작은 씬에서 회전시키며 보여준다.
// React와 분리된 미니 Three.js 루프. 잠금 상태면 검은 실루엣으로.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { animateBug } from '../game/BugGen.js'
import { disposeScene } from '../game/disposeScene.js'

export default function BugViewer({ bug, locked }) {
  const mountRef = useRef(null)
  const ctx = useRef({}) // { renderer, scene, camera, pivot, raf, t }

  // 마운트: 렌더러·씬·루프 1회 구성
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth || 300
    const h = mount.clientHeight || 240
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)
    camera.position.set(0, 1.1, 5.2)
    camera.lookAt(0, 0.5, 0)
    scene.add(new THREE.HemisphereLight('#ffffff', '#6a5540', 1.05))
    const dir = new THREE.DirectionalLight('#fff6e0', 1.1)
    dir.position.set(3, 6, 4)
    scene.add(dir)

    const pivot = new THREE.Group()
    scene.add(pivot)

    const c = ctx.current
    Object.assign(c, { renderer, scene, camera, pivot, t: 0, mount })

    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      c.t += dt
      pivot.rotation.y += dt * 0.7
      if (c.model) animateBug(c.model, c.t)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => {
      const ww = mount.clientWidth || 300, hh = mount.clientHeight || 240
      renderer.setSize(ww, hh)
      camera.aspect = ww / hh
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      if (c.model) { pivot.remove(c.model); disposeScene(c.model); c.model = null }
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  // 곤충/잠금 변경: 모델 교체
  useEffect(() => {
    const c = ctx.current
    if (!c.pivot || !bug) return
    if (c.model) { c.pivot.remove(c.model); disposeScene(c.model); c.model = null }
    const model = bug.make()
    // 잠긴 곤충: 전부 검은 실루엣으로 (색·정보는 채집해야 열림)
    if (locked) {
      const silhouette = new THREE.MeshLambertMaterial({ color: 0x14161f })
      model.traverse((o) => { if (o.isMesh) { o.material = silhouette; if (o.instanceColor) o.instanceColor = null } })
    }
    // 화면에 맞게 크기·중심 조정
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const scale = 3.0 / maxDim
    model.scale.setScalar(scale)
    model.position.set(-center.x * scale, -center.y * scale + 0.4, -center.z * scale)
    c.pivot.add(model)
    c.model = model
    c.pivot.rotation.y = 0
  }, [bug, locked])

  return <div ref={mountRef} className="h-full w-full" />
}
