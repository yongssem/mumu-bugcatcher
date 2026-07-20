// 1인칭 오른손 — 팔뚝 + 손바닥 + 손가락 4개 + 엄지 (막대기 금지, CLAUDE.md §8)
// 카메라 기준 로컬 프레임: +Z가 카메라 쪽, 자루는 Y축(수직)으로 원점을 통과
// grip=true: 주먹 그립 — 손가락이 세로로 쌓여 자루를 '가로로' 감싸고(검지 위→새끼 아래),
//            엄지는 위쪽에서 앞을 가로질러 검지를 누름(오른손), 손등은 오른쪽
// grip=false: 펼친 손 — 손가락이 +Y로 뻗고 엄지는 왼쪽(-X, 오른손 손바닥 위 시점)
import * as THREE from 'three'

function bx(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

// 펼친 손가락 하나 (마디 2개) — 굽힘 각도로 이완 표현
function makeFinger(mat, w, proxLen, distLen) {
  const g = new THREE.Group()
  const prox = bx(w, proxLen, w * 1.15, mat, 0, proxLen / 2, 0)
  const distG = new THREE.Group()
  distG.position.y = proxLen
  distG.add(bx(w * 0.9, distLen, w * 1.05, mat, 0, distLen / 2, 0))
  g.add(prox, distG)
  return {
    group: g,
    curl(a, b) {
      g.rotation.x = a
      distG.rotation.x = b
    },
  }
}

// 주먹 그립 (오른손) — 뭉툭한 주먹 덩어리에 자루를 꽂는 단순 구조 (마인크래프트식)
// 주먹 본체 + 앞면 손가락 마디 4줄 + 위에서 누르는 엄지. 자루(Y축)가 주먹 중앙을 관통
function gripFist(mat) {
  const g = new THREE.Group()
  // 손가락 마디는 반 톤 밝게 — 덩어리에서 마디가 읽히게 (복셀식 음영)
  const fMat = mat.clone()
  fMat.color.multiplyScalar(1.08)

  // 주먹 본체 — 자루를 가운데 두고 감싼 한 덩어리
  g.add(bx(0.34, 0.34, 0.26, mat, 0.03, 0, 0.0))

  // 앞면 손가락 마디 4줄 (검지 위 → 새끼 아래) — 살짝 튀어나와 경계가 보임
  const ys = [0.12, 0.04, -0.04, -0.12]
  for (const y of ys) g.add(bx(0.3, 0.07, 0.06, fMat, 0.02, y, 0.145))

  // 엄지 (오른손) — 위쪽 앞에서 사선으로 검지를 누름
  const thumb = bx(0.2, 0.09, 0.08, fMat, -0.03, 0.15, 0.13)
  thumb.rotation.z = 0.3
  g.add(thumb)
  g.add(bx(0.11, 0.13, 0.12, mat, 0.14, 0.12, 0.08)) // 엄지 뿌리(두덩)

  return g
}

export function makeHand(skinMat, { grip = false } = {}) {
  const hand = new THREE.Group()
  const mat = skinMat

  if (grip) {
    hand.add(gripFist(mat))
    // 팔뚝 — 손목(주먹 오른쪽 아래) 피벗, ViewModel이 코너로 기울임
    const forearm = new THREE.Group()
    forearm.position.set(0.17, -0.17, 0.02)
    forearm.add(bx(0.2, 0.55, 0.2, mat, 0.02, -0.26, 0.05))
    hand.add(forearm)
    hand.userData = { forearm }
    return hand
  }

  // --- 펼친 손 (손바닥 위에 블록/씨앗 얹는 용) ---
  const palm = bx(0.28, 0.3, 0.17, mat, 0, 0.03, 0)
  const knuckle = bx(0.28, 0.08, 0.18, mat, 0, 0.19, -0.01)
  hand.add(palm, knuckle)

  // 손가락 4개 (+Y로 뻗음, 살짝 이완)
  const xs = [-0.096, -0.032, 0.032, 0.096]
  const proxL = [0.14, 0.17, 0.16, 0.13]
  const distL = [0.09, 0.11, 0.1, 0.08]
  const w = [0.058, 0.06, 0.058, 0.052]
  for (let i = 0; i < 4; i++) {
    const f = makeFinger(mat, w[i], proxL[i], distL[i])
    f.group.position.set(xs[i], 0.21, -0.02)
    f.curl(-0.16, -0.28)
    hand.add(f.group)
  }

  // 엄지 — 오른손 손바닥을 위로 보인 시점이므로 왼쪽(-X)
  const thumb = makeFinger(mat, 0.07, 0.13, 0.11)
  thumb.group.position.set(-0.15, 0.0, 0.0)
  thumb.group.rotation.z = 0.7
  thumb.curl(-0.2, -0.2)
  hand.add(thumb.group)

  // 팔뚝
  const forearm = new THREE.Group()
  forearm.position.set(0, -0.05, 0.03)
  forearm.add(bx(0.21, 0.6, 0.21, mat, 0.02, -0.34, 0.03))
  hand.add(forearm)
  hand.userData = { forearm }
  return hand
}
