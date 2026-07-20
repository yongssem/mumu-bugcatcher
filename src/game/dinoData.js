// 공룡 데이터 — 로스터·도감 정보 상수 (코드와 데이터 분리, CLAUDE.md §5·§6)
// stats: 게임플레이 수치 / pedia 필드: 도감 카드용 진짜 공룡 지식 / parts: 도감 해금 부위
import {
  makeTrexMesh, makeTriceratopsMesh, makeStegosaurusMesh, makeCompyMesh,
  makeBrachiosaurusMesh, makeVelociraptorMesh, makeAllosaurusMesh,
} from './Dino.js'
import {
  makeTrexVox, makePteranodonVox, makeRhamphorhynchusVox,
  makeMosasaurusVox, makePlesiosaurusVox,
  makeTriceratopsVox, makeStegosaurusVox, makeBrachiosaurusVox,
  makeVelociraptorVox, makeAllosaurusVox, makeCompyVox,
} from './DinoVoxModels.js'
import { makeGen } from './DinoGen.js' // 파라메트릭 생성기 (신규 종 대량)

// 도감 부위 — 격퇴할 때마다 순서대로 관찰(해금). 부위마다 새 지식이 공개됨 (CLAUDE.md §4·§6)
// head(머리)→외형 / tail(꼬리)→식성·시대 / leg(다리)→특징 완성 ★
// 💰 유튜버 동물원 — 공룡 구매가 (희귀·인기일수록 비쌈). 비싼 공룡일수록 구독자 인기 UP
export const DINO_PRICE = {
  compy: 60, rhamphorhynchus: 140, velociraptor: 160,
  stegosaurus: 220, allosaurus: 320, pteranodon: 300, plesiosaurus: 360,
  triceratops: 280, brachiosaurus: 450, mosasaurus: 520, trex: 900,
  // 신규 종
  kentrosaurus: 240, pachycephalosaurus: 260, parasaurolophus: 300, iguanodon: 320,
  dilophosaurus: 340, ankylosaurus: 420, carnotaurus: 520, diplodocus: 620,
  giganotosaurus: 820, spinosaurus: 880,
}

export const PART_ORDER = ['head', 'tail', 'leg']
export const PART_INFO = {
  head: { label: '머리', icon: '🦷', reveal: '외형을 알게 됐어요' },
  tail: { label: '꼬리', icon: '🦴', reveal: '식성과 시대를 알게 됐어요' },
  leg: { label: '다리', icon: '🪝', reveal: '특징까지 완성했어요 ★' },
}

export const DINOS = {
  trex: {
    id: 'trex',
    name: '티라노사우루스',
    latin: 'Tyrannosaurus rex',
    meaning: '폭군 도마뱀',
    era: '백악기 후기',
    diet: '육식',
    size: '12~13m, 약 8톤',
    facts: [
      '이빨이 바나나만큼 컸어요.',
      '앞발은 짧지만 힘은 셌대요.',
      '후각이 발달해서 냄새를 잘 맡았어요.',
    ],
    make: makeTrexVox, // 고해상도 복셀 메쉬 (기존 makeTrexMesh는 보관)
    stats: {
      hp: 18,          // 보스급 — 칼(2) 9방 / 뼈 검(3) 6방 / 이빨 창(4) 5방
      dmg: 4,          // 물기 공격 (가죽 갑옷 방어력 3이면 1로 감소)
      wanderSpeed: 1.3,
      chaseSpeed: 4.8, // 걷기(4.3)보다 빠르고 달리기(6.0)보다 느림 — 달리면 도망 가능
      aggroRange: 11,  // 이 거리 안에 들어오면 포효 후 추적
      loseRange: 20,   // 이 거리 밖으로 벗어나면 포기하고 어슬렁
      attackRange: 2.6,
      scale: 0.45,     // 실측 12m 메쉬 → 플레이 5~6m급으로 축소
    },
    // 격퇴 시 드롭 — 뼈·가죽은 넉넉히(제작용), 이빨은 희귀(이빨 창 잠금 해제)
    drops: { bone: 4, hide: 3 },
    rareDrop: { type: 'tooth', chance: 0.45 },
  },

  triceratops: {
    id: 'triceratops',
    name: '트리케라톱스',
    latin: 'Triceratops',
    meaning: '세 개의 뿔 얼굴',
    era: '백악기 후기',
    diet: '초식',
    size: '8~9m, 약 6톤',
    facts: [
      '얼굴에 뿔이 세 개 있었어요.',
      '목을 지키는 큰 프릴(목 방패)이 있었어요.',
      '단단한 부리로 질긴 식물을 잘랐어요.',
    ],
    make: makeTriceratopsVox,
    stats: {
      hp: 14, dmg: 3, wanderSpeed: 1.2, chaseSpeed: 4.4,
      aggroRange: 9, loseRange: 17, attackRange: 2.8, scale: 0.52,
    },
    drops: { hide: 4, bone: 2 },
  },

  stegosaurus: {
    id: 'stegosaurus',
    name: '스테고사우루스',
    latin: 'Stegosaurus',
    meaning: '지붕 도마뱀',
    era: '쥐라기 후기',
    diet: '초식',
    size: '7~9m, 약 5톤',
    facts: [
      '등에 커다란 골판이 줄지어 있었어요.',
      '꼬리 끝 가시로 자신을 지켰어요.',
      '뇌가 작아 호두만 했다고 해요.',
    ],
    make: makeStegosaurusVox,
    stats: {
      hp: 16, dmg: 3, wanderSpeed: 1.15, chaseSpeed: 4.0,
      aggroRange: 8, loseRange: 16, attackRange: 3.0, scale: 0.6,
    },
    drops: { hide: 3, bone: 3 },
  },

  brachiosaurus: {
    id: 'brachiosaurus',
    name: '브라키오사우루스',
    latin: 'Brachiosaurus',
    meaning: '팔 도마뱀',
    era: '쥐라기 후기',
    diet: '초식',
    size: '22~23m, 약 35톤',
    facts: [
      '앞다리가 뒷다리보다 길어 등이 앞으로 기울었어요.',
      '목을 높이 들어 나무 꼭대기 잎을 먹었어요.',
      '키가 아파트 4층만큼 컸어요.',
    ],
    make: makeBrachiosaurusVox,
    stats: {
      hp: 20, dmg: 2, wanderSpeed: 1.0, chaseSpeed: 3.4,
      aggroRange: 7, loseRange: 14, attackRange: 3.2, scale: 0.92,
    },
    drops: { hide: 5, bone: 3 },
  },

  velociraptor: {
    id: 'velociraptor',
    name: '벨로시랩터',
    latin: 'Velociraptor',
    meaning: '빠른 도둑',
    era: '백악기 후기',
    diet: '육식',
    size: '약 2m, 15kg',
    facts: [
      '칠면조만 한 크기에 깃털이 있었어요.',
      '뒷발에 낫처럼 굽은 큰 발톱이 있었어요.',
      '아주 빠르고 영리하게 사냥했어요.',
    ],
    make: makeVelociraptorVox,
    stats: {
      hp: 9, dmg: 3, wanderSpeed: 2.0, chaseSpeed: 5.6,
      aggroRange: 11, loseRange: 19, attackRange: 2.0, scale: 0.19,
    },
    drops: { bone: 2 },
    rareDrop: { type: 'tooth', chance: 0.25 },
  },

  allosaurus: {
    id: 'allosaurus',
    name: '알로사우루스',
    latin: 'Allosaurus',
    meaning: '다른 도마뱀',
    era: '쥐라기 후기',
    diet: '육식',
    size: '8~9m, 약 2톤',
    facts: [
      '눈 위에 작은 볏(뿔)이 있었어요.',
      '쥐라기를 대표하는 사냥꾼이었어요.',
      '입을 아주 크게 벌릴 수 있었어요.',
    ],
    make: makeAllosaurusVox,
    stats: {
      hp: 16, dmg: 4, wanderSpeed: 1.3, chaseSpeed: 4.9,
      aggroRange: 10, loseRange: 18, attackRange: 2.6, scale: 0.44,
    },
    drops: { bone: 3, hide: 2 },
    rareDrop: { type: 'tooth', chance: 0.35 },
  },

  // ===== 익룡 (하늘을 난 파충류) =====
  pteranodon: {
    id: 'pteranodon',
    name: '프테라노돈',
    latin: 'Pteranodon',
    meaning: '이빨 없는 날개',
    era: '백악기 후기',
    diet: '육식(물고기)',
    size: '날개폭 6~7m',
    facts: [
      '이빨이 없는 긴 부리로 물고기를 낚아챘어요.',
      '날개를 펴면 6~7m나 됐어요.',
      '머리 뒤 큰 볏으로 균형과 방향을 잡았대요.',
    ],
    make: makePteranodonVox,
    stats: {
      hp: 5, dmg: 1, wanderSpeed: 1.8, chaseSpeed: 5.0,
      aggroRange: 8, loseRange: 15, attackRange: 2.0, scale: 0.61, flying: true,
    },
    drops: { bone: 1, hide: 1 },
  },

  rhamphorhynchus: {
    id: 'rhamphorhynchus',
    name: '람포링쿠스',
    latin: 'Rhamphorhynchus',
    meaning: '부리 주둥이',
    era: '쥐라기 후기',
    diet: '육식(물고기)',
    size: '날개폭 1~1.8m',
    facts: [
      '꼬리 끝에 방향타 같은 마름모 판이 있었어요.',
      '뾰족한 이빨로 물고기를 잡았어요.',
      '까마귀만 한 작은 익룡이었어요.',
    ],
    make: makeRhamphorhynchusVox,
    stats: {
      hp: 4, dmg: 1, wanderSpeed: 2.0, chaseSpeed: 5.2,
      aggroRange: 7, loseRange: 13, attackRange: 1.8, scale: 0.24, flying: true,
    },
    drops: { bone: 1 },
  },

  // ===== 수룡 (바다에 산 파충류) =====
  mosasaurus: {
    id: 'mosasaurus',
    name: '모사사우루스',
    latin: 'Mosasaurus',
    meaning: '뫼즈강의 도마뱀',
    era: '백악기 후기',
    diet: '육식',
    size: '12~18m',
    facts: [
      '공룡시대 바다의 최상위 포식자였어요.',
      '몸길이가 15m가 넘기도 했어요.',
      '네 지느러미로 헤엄치고 꼬리로 밀어냈어요.',
    ],
    make: makeMosasaurusVox,
    stats: {
      hp: 12, dmg: 3, wanderSpeed: 1.1, chaseSpeed: 4.2,
      aggroRange: 9, loseRange: 16, attackRange: 3.0, scale: 0.8, swimming: true,
    },
    drops: { hide: 4, bone: 2 },
    rareDrop: { type: 'tooth', chance: 0.3 },
  },

  plesiosaurus: {
    id: 'plesiosaurus',
    name: '플레시오사우루스',
    latin: 'Plesiosaurus',
    meaning: '가까운 도마뱀',
    era: '쥐라기 초기',
    diet: '육식(물고기)',
    size: '3~5m',
    facts: [
      '목이 아주 길고 머리는 작았어요.',
      '네 개의 큰 지느러미로 노 젓듯 헤엄쳤어요.',
      '네스호 괴물의 모델로도 유명해요.',
    ],
    make: makePlesiosaurusVox,
    stats: {
      hp: 9, dmg: 2, wanderSpeed: 1.2, chaseSpeed: 4.0,
      aggroRange: 8, loseRange: 15, attackRange: 2.4, scale: 0.39, swimming: true,
    },
    drops: { hide: 3, bone: 2 },
  },

  // ===== 신규 육식(수각류) — 파라메트릭 생성기 =====
  spinosaurus: {
    id: 'spinosaurus', name: '스피노사우루스', latin: 'Spinosaurus', meaning: '가시 도마뱀',
    era: '백악기 중기', diet: '육식', size: '15~18m, 약 7톤',
    facts: ['등에 커다란 돛(가시 지느러미)이 있었어요.', '악어 같은 긴 주둥이로 물고기를 잡았어요.', '티라노보다 몸길이가 더 길었어요.'],
    make: () => makeGen({ gen: 'biped', base: '#4E7C59', dark: '#33553C', belly: '#D6C583', accent: '#7C3F63', snout: 4.4, narrowSnout: true, back: 'sail', build: 1.1 }),
    stats: { hp: 20, dmg: 4, wanderSpeed: 1.25, chaseSpeed: 4.7, aggroRange: 10, loseRange: 18, attackRange: 2.8, scale: 0.44 },
    drops: { bone: 3, hide: 2 }, rareDrop: { type: 'tooth', chance: 0.4 },
  },
  giganotosaurus: {
    id: 'giganotosaurus', name: '기가노토사우루스', latin: 'Giganotosaurus', meaning: '거대한 남쪽 도마뱀',
    era: '백악기 후기', diet: '육식', size: '12~13m, 약 8톤',
    facts: ['남아메리카에 살던 거대한 사냥꾼이었어요.', '티라노만큼 크고 더 날렵했어요.', '무리 지어 큰 공룡을 사냥했을 수 있어요.'],
    make: () => makeGen({ gen: 'biped', base: '#7A6242', dark: '#54432C', belly: '#CDB98A', accent: '#8A5A3A', snout: 3.8, build: 1.15 }),
    stats: { hp: 20, dmg: 4, wanderSpeed: 1.3, chaseSpeed: 4.9, aggroRange: 11, loseRange: 19, attackRange: 2.7, scale: 0.46 },
    drops: { bone: 3, hide: 3 }, rareDrop: { type: 'tooth', chance: 0.4 },
  },
  carnotaurus: {
    id: 'carnotaurus', name: '카르노타우루스', latin: 'Carnotaurus', meaning: '고기 먹는 황소',
    era: '백악기 후기', diet: '육식', size: '8~9m, 약 1.5톤',
    facts: ['눈 위에 황소 같은 뿔 두 개가 있었어요.', '아주 빠르게 달리는 사냥꾼이었어요.', '앞발이 티라노보다도 더 짧았어요.'],
    make: () => makeGen({ gen: 'biped', base: '#A9503A', dark: '#7A3527', belly: '#D8B48A', brow: true, snout: 2.6, build: 0.95 }),
    stats: { hp: 15, dmg: 4, wanderSpeed: 1.5, chaseSpeed: 5.3, aggroRange: 11, loseRange: 19, attackRange: 2.4, scale: 0.4 },
    drops: { bone: 3, hide: 1 }, rareDrop: { type: 'tooth', chance: 0.3 },
  },
  dilophosaurus: {
    id: 'dilophosaurus', name: '딜로포사우루스', latin: 'Dilophosaurus', meaning: '두 개의 볏 도마뱀',
    era: '쥐라기 초기', diet: '육식', size: '약 6m, 400kg',
    facts: ['머리 위에 얇은 볏이 두 개 있었어요.', '가늘고 날렵한 초기 육식공룡이었어요.', '(영화와 달리) 목주름·독은 상상이에요.'],
    make: () => makeGen({ gen: 'biped', base: '#C7A03A', dark: '#8A6A22', belly: '#E8D8A0', accent: '#C0392B', crest: 'twin', snout: 3.2, build: 0.8 }),
    stats: { hp: 12, dmg: 3, wanderSpeed: 1.6, chaseSpeed: 5.2, aggroRange: 10, loseRange: 18, attackRange: 2.2, scale: 0.34 },
    drops: { bone: 2, hide: 1 }, rareDrop: { type: 'tooth', chance: 0.25 },
  },

  // ===== 신규 초식(4족·조각·후두류) =====
  pachycephalosaurus: {
    id: 'pachycephalosaurus', name: '파키케팔로사우루스', latin: 'Pachycephalosaurus', meaning: '두꺼운 머리 도마뱀',
    era: '백악기 후기', diet: '초식', size: '약 4.5m, 450kg',
    facts: ['머리뼈가 25cm나 두꺼운 돔이었어요.', '머리로 박치기를 했을 거라고 해요.', '돔 둘레에 작은 혹·가시가 돋아 있었어요.'],
    make: () => makeGen({ gen: 'biped', jaw: false, base: '#9A7A5A', dark: '#6E543A', belly: '#D8C8A0', accent: '#C08A4A', dome: true, snout: 2.2, build: 0.9 }),
    stats: { hp: 13, dmg: 3, wanderSpeed: 1.4, chaseSpeed: 4.6, aggroRange: 8, loseRange: 16, attackRange: 2.2, scale: 0.36 },
    drops: { hide: 2, bone: 2 },
  },
  ankylosaurus: {
    id: 'ankylosaurus', name: '안킬로사우루스', latin: 'Ankylosaurus', meaning: '뻣뻣한 도마뱀',
    era: '백악기 후기', diet: '초식', size: '약 8m, 6톤',
    facts: ['온몸이 뼈 갑옷으로 덮인 탱크 같았어요.', '꼬리 끝에 무거운 뼈 곤봉이 있었어요.', '곤봉으로 육식공룡의 다리를 후려쳤어요.'],
    make: () => makeGen({ gen: 'quad', base: '#6E6E52', dark: '#4C4C38', belly: '#B8AE90', accent: '#8E8E6A', back: 'armor', club: true, beak: true, build: 1.0 }),
    stats: { hp: 18, dmg: 2, wanderSpeed: 1.0, chaseSpeed: 3.6, aggroRange: 7, loseRange: 15, attackRange: 3.0, scale: 0.5 },
    drops: { hide: 4, bone: 3 },
  },
  diplodocus: {
    id: 'diplodocus', name: '디플로도쿠스', latin: 'Diplodocus', meaning: '두 개의 들보',
    era: '쥐라기 후기', diet: '초식', size: '약 27m, 15톤',
    facts: ['목과 꼬리가 아주 길어 몸이 27m나 됐어요.', '채찍 같은 꼬리를 휘둘렀을 거예요.', '이빨로 나뭇잎을 훑어 먹었어요.'],
    make: () => makeGen({ gen: 'quad', base: '#8A7350', dark: '#5E4C33', belly: '#CDBE96', neck: 3.4, build: 1.15 }),
    stats: { hp: 16, dmg: 2, wanderSpeed: 0.95, chaseSpeed: 3.3, aggroRange: 7, loseRange: 14, attackRange: 3.2, scale: 0.7 },
    drops: { hide: 5, bone: 3 },
  },
  parasaurolophus: {
    id: 'parasaurolophus', name: '파라사우롤로푸스', latin: 'Parasaurolophus', meaning: '사우롤로푸스와 비슷한',
    era: '백악기 후기', diet: '초식', size: '약 10m, 2.5톤',
    facts: ['머리 뒤로 긴 관 모양 볏이 뻗어 있었어요.', '볏으로 나팔 같은 소리를 냈을 거예요.', '오리 같은 부리로 식물을 잘랐어요.'],
    make: () => makeGen({ gen: 'quad', base: '#3F8A6E', dark: '#2A5E49', belly: '#CDBE96', accent: '#E0A24A', crest: 'tube', beak: true, build: 0.9 }),
    stats: { hp: 12, dmg: 2, wanderSpeed: 1.2, chaseSpeed: 4.2, aggroRange: 8, loseRange: 16, attackRange: 2.6, scale: 0.44 },
    drops: { hide: 3, bone: 2 },
  },
  kentrosaurus: {
    id: 'kentrosaurus', name: '켄트로사우루스', latin: 'Kentrosaurus', meaning: '뾰족한 도마뱀',
    era: '쥐라기 후기', diet: '초식', size: '약 4.5m, 1톤',
    facts: ['스테고사우루스의 친척이에요.', '등과 꼬리에 뾰족한 가시가 줄지어 났어요.', '어깨에도 큰 가시가 있어 몸을 지켰어요.'],
    make: () => makeGen({ gen: 'quad', base: '#8A7A46', dark: '#5E5230', belly: '#CDBE96', accent: '#4A4030', back: 'spikes', beak: true, build: 0.85 }),
    stats: { hp: 12, dmg: 2, wanderSpeed: 1.15, chaseSpeed: 4.0, aggroRange: 8, loseRange: 16, attackRange: 2.8, scale: 0.38 },
    drops: { hide: 3, bone: 2 },
  },
  iguanodon: {
    id: 'iguanodon', name: '이구아노돈', latin: 'Iguanodon', meaning: '이구아나 이빨',
    era: '백악기 초기', diet: '초식', size: '약 10m, 3톤',
    facts: ['엄지에 뾰족한 스파이크가 있었어요.', '두 발과 네 발로 모두 다닐 수 있었어요.', '가장 먼저 발견된 공룡 중 하나예요.'],
    make: () => makeGen({ gen: 'quad', base: '#7A8A56', dark: '#54603A', belly: '#CDBE96', beak: true, build: 1.0 }),
    stats: { hp: 13, dmg: 2, wanderSpeed: 1.2, chaseSpeed: 4.2, aggroRange: 8, loseRange: 16, attackRange: 2.6, scale: 0.5 },
    drops: { hide: 4, bone: 2 },
  },

  // 서브퀘스트 몹 — 작고 겁많은 육식공룡. 도감 갤러리엔 숨김(hidden)
  compy: {
    id: 'compy',
    name: '콤프소그나투스',
    latin: 'Compsognathus',
    meaning: '우아한 턱',
    era: '쥐라기 후기',
    diet: '육식',
    size: '1~1.4m, 약 2.5kg',
    facts: ['닭만큼 작은 공룡이었어요.', '아주 빨리 달렸어요.', '작은 벌레와 도마뱀을 먹었어요.'],
    make: makeCompyVox,
    hidden: true, // 도감 갤러리 제외 (서브 몹)
    stats: {
      hp: 2, dmg: 1, wanderSpeed: 2.2, chaseSpeed: 5.5,
      aggroRange: 0, loseRange: 0, attackRange: 1.6, scale: 0.2,
    },
    drops: { bone: 1 },
    rareDrop: { type: 'hide', chance: 0.5 },
  },
}
