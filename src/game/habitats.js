// 🌍 서식지(곤충월드 biome) 정의 — B5. 계절·환경별로 다른 곤충월드로 들어간다.
//   각 서식지: 하늘/안개/조명/땅/소품 무드 + 곤충 스폰 풀(희귀도 포함).
// BugHunt.jsx가 habitat 설정을 읽어 씬을 꾸미고, 희귀도 가중으로 곤충을 스폰한다.
// 곤충 파라미터: { id, s(크기), fly(비행높이), spd(속도), shy(겁많음), big?(대형=헌터식) }

export const HABITATS = {
  // 🌿 풀숲 — 기본 초원. 메뚜기·사마귀·매미·무당벌레. 낮.
  meadow: {
    id: 'meadow', label: '풀숲 초원', icon: '🌿', mood: 'day',
    blurb: '메뚜기·무당벌레·사마귀가 뛰노는 햇살 풀밭. 첫 채집에 딱!',
    sky: '#BFE9FF', fog: [16, 42], hemi: ['#ffffff', '#5a7a40', 1.05], sun: ['#fff6d8', 1.15],
    ground: ['#6AB150', '#60A448'],
    grassColors: ['#5FA34A', '#66AE4E', '#579B42'], grassN: 32,
    flowers: { petals: ['#F5F0F0', '#F49BC1', '#F2C14E'], n: 4 }, mushroomN: 2, extra: null,
    mega: ['baseball', 'redcap', 'coin'], // ⚾ 거대 인간세계 랜드마크
    pool: [
      { id: 'byeoMettugi', s: 1.0, fly: 0, spd: 1.4, shy: 1.0 },
      { id: 'bangAkkaeBi', s: 1.1, fly: 0, spd: 1.5, shy: 1.0 },
      { id: 'muDangBeolle', s: 0.9, fly: 0, spd: 1.0, shy: 0.8 },
      { id: 'chilSeongMudang', s: 0.8, fly: 0, spd: 0.9, shy: 0.8 },
      { id: 'ilbonWangGaeMi', s: 1.0, fly: 0, spd: 1.6, shy: 0.6 },
      { id: 'gomGaeMi', s: 0.8, fly: 0, spd: 1.5, shy: 0.6 },
      { id: 'chamMaeMi', s: 1.0, fly: 0.4, spd: 1.0, shy: 0.8 },
      { id: 'yeoChi', s: 1.0, fly: 0, spd: 1.4, shy: 0.9 },
      { id: 'norinJae', s: 0.8, fly: 0, spd: 0.8, shy: 0.7 },
      { id: 'samaGwi', s: 1.4, fly: 0, spd: 1.1, shy: 0.6, big: true },
      { id: 'wangSamaGwi', s: 1.8, fly: 0, spd: 1.1, shy: 0.6, big: true },
    ],
  },

  // 🌼 꽃밭 — 나비·벌·꽃등에가 나풀나풀. 얌전한 곤충 많아 잠자리채로 즐겁게. 낮.
  flower: {
    id: 'flower', label: '꽃밭 정원', icon: '🌼', mood: 'day',
    blurb: '나비와 벌이 꽃 사이를 나는 화사한 정원. 잠자리채가 빛나는 곳.',
    sky: '#FBE3F1', fog: [16, 44], hemi: ['#fff4fb', '#8a9a55', 1.1], sun: ['#fff2e0', 1.15],
    ground: ['#78BE58', '#6AAF4C'],
    grassColors: ['#63A84C', '#6EB552'], grassN: 22,
    flowers: { petals: ['#F49BC1', '#C9A8F0', '#F2C14E', '#F5F0F0', '#F27EA8', '#8FD0F0'], n: 12 }, mushroomN: 0, extra: null,
    mega: ['juice', 'marble', 'crayon'], // 🧃 주스갑·구슬·크레용
    pool: [
      { id: 'hoRangNabi', s: 1.3, fly: 2.2, spd: 1.6, shy: 0.7 },
      { id: 'norangNabi', s: 1.1, fly: 2.0, spd: 1.5, shy: 0.7 },
      { id: 'baechuHuinNabi', s: 1.0, fly: 2.0, spd: 1.5, shy: 0.7 },
      { id: 'kkulBeol', s: 0.8, fly: 1.6, spd: 1.8, shy: 0.5 },
      { id: 'hobakBeol', s: 1.0, fly: 1.5, spd: 1.6, shy: 0.6 },
      { id: 'kkotDeungE', s: 0.7, fly: 1.7, spd: 1.7, shy: 0.5 },
      { id: 'geoGeoMi', s: 0.7, fly: 0, spd: 0.6, shy: 0.5 },
      { id: 'gongjakNabi', s: 1.2, fly: 2.1, spd: 1.5, shy: 0.7 },
      { id: 'wangNabi', s: 1.5, fly: 2.0, spd: 1.3, shy: 0.7 },
      { id: 'malBeol', s: 1.4, fly: 1.4, spd: 2.0, shy: 0.7, big: true },
    ],
  },

  // 🌳 참나무 숲 — 밤. 장수풍뎅이·사슴벌레·하늘소·반딧불이. 대형 헌터 곤충의 성지.
  forest: {
    id: 'forest', label: '참나무 숲', icon: '🌳', mood: 'night',
    blurb: '밤의 참나무 숲. 장수풍뎅이·사슴벌레가 사는 헌터의 무대! 폭탄·마취 필수.',
    sky: '#1B2740', fog: [12, 34], hemi: ['#8899cc', '#20304a', 0.6], sun: ['#9fb4e0', 0.5],
    ground: ['#2E4A2A', '#284224'],
    grassColors: ['#2E4A28', '#35522E'], grassN: 20,
    flowers: { petals: ['#C9A8F0', '#8FD0F0'], n: 2 }, mushroomN: 6, extra: 'tree',
    mega: ['acorn', 'dice', 'stick'], // 🌰 도토리·주사위·막대기
    pool: [
      { id: 'jangSuPungDeng', s: 1.6, fly: 0, spd: 1.2, shy: 0.9, big: true },
      { id: 'saseumBeolle', s: 1.5, fly: 0, spd: 1.1, shy: 0.9, big: true },
      { id: 'neopjeokSaseum', s: 1.4, fly: 0, spd: 1.1, shy: 0.9, big: true },
      { id: 'topSaseum', s: 1.4, fly: 0, spd: 1.2, shy: 0.9, big: true },
      { id: 'haneulSo', s: 1.2, fly: 0, spd: 1.3, shy: 0.8 },
      { id: 'pungDeng', s: 0.9, fly: 0.8, spd: 1.2, shy: 0.7 },
      { id: 'sanNueNaBang', s: 1.3, fly: 1.8, spd: 1.4, shy: 0.7 },
      { id: 'banDitBul', s: 0.8, fly: 1.2, spd: 1.0, shy: 0.5 },
      { id: 'ttakJeongBeolle', s: 0.9, fly: 0, spd: 1.4, shy: 0.8 },
      { id: 'jangSuMalBeol', s: 1.5, fly: 1.4, spd: 2.0, shy: 0.7, big: true },
    ],
  },

  // 💧 연못 — 잠자리·물방개·소금쟁이·물장군. 물빛 무드. 낮.
  pond: {
    id: 'pond', label: '연못 습지', icon: '💧', mood: 'day',
    blurb: '잠자리가 순찰하는 물가. 빠른 잠자리는 마취 다트로! 물장군도 산다.',
    sky: '#9FD8F0', fog: [16, 44], hemi: ['#eaffff', '#3a6a70', 1.05], sun: ['#fff6e0', 1.1],
    ground: ['#4E9A6A', '#458C60'],
    grassColors: ['#3E8A5A', '#489A64', '#5AAE74'], grassN: 26,
    flowers: { petals: ['#F5F0F0', '#F2C14E'], n: 3 }, mushroomN: 0, extra: 'lily',
    mega: ['soda', 'duck', 'marble'], // 🥤 탄산캔·고무오리·구슬
    pool: [
      { id: 'gochuJamJari', s: 1.1, fly: 1.8, spd: 2.2, shy: 0.9 },
      { id: 'milJamJari', s: 1.1, fly: 1.8, spd: 2.0, shy: 0.9 },
      { id: 'siljamJari', s: 0.8, fly: 1.2, spd: 1.4, shy: 0.8 },
      { id: 'wangJamJari', s: 1.4, fly: 2.0, spd: 2.4, shy: 0.9, big: true },
      { id: 'jangSuJamJari', s: 1.6, fly: 2.1, spd: 2.6, shy: 0.9, big: true },
      { id: 'nabiJamJari', s: 1.0, fly: 1.6, spd: 1.4, shy: 0.8 },
      { id: 'mulBangGae', s: 1.0, fly: 0, spd: 1.2, shy: 0.7 },
      { id: 'sogeumJaengI', s: 0.7, fly: 0, spd: 1.6, shy: 0.8 },
      { id: 'mulJangGun', s: 1.5, fly: 0, spd: 1.0, shy: 0.8, big: true },
    ],
  },
}

export const HABITAT_ORDER = ['meadow', 'flower', 'forest', 'pond']
export const DEFAULT_HABITAT = 'meadow'
