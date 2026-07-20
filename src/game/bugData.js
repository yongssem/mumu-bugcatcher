// 🐛 곤충 데이터 — 도감 로스터(약 100종) + 진짜 곤충 지식 (코드와 데이터 분리)
// 게임의 심장: 채집하면 도감 카드가 채워지고, 카드엔 학명·과·서식지·재미사실이 담긴다.
import { makeBug } from './BugGen.js'

// 과(科) 분류 — 도감 갤러리 탭
export const FAMILIES = {
  butterfly: { label: '나비', icon: '🦋' },
  moth: { label: '나방', icon: '🌙' },
  beetle: { label: '딱정벌레·풍뎅이', icon: '🪲' },
  dragonfly: { label: '잠자리', icon: '🪰' },
  bee: { label: '벌·개미', icon: '🐝' },
  mantis: { label: '사마귀', icon: '🦗' },
  grasshopper: { label: '메뚜기·여치', icon: '🦗' },
  cicada: { label: '매미', icon: '🎵' },
  stinkbug: { label: '노린재·물벌레', icon: '🛡️' },
  spider: { label: '거미', icon: '🕷️' },
  other: { label: '기타', icon: '🐌' },
}

// 희귀도 — 채집 난이도·가치·인기
export const RARITY = {
  common: { label: '흔함', color: '#8FB98F', coin: 20 },
  uncommon: { label: '보통', color: '#6FA8DC', coin: 45 },
  rare: { label: '희귀', color: '#C27BE0', coin: 110 },
  epic: { label: '전설', color: '#E8A33D', coin: 260 },
}

// 활동 시간 — 주행(낮)/야행(밤)/박명(새벽·저녁)
const DAY = '낮', NIGHT = '밤', DUSK = '해질녘'

// 빌더: 장황함을 줄이려고 튜플식으로 정의
// b(id, name, latin, fam, gen, cfg, size, habitat, active, rarity, [f1,f2,f3])
function b(id, name, latin, fam, gen, cfg, size, habitat, active, rarity, facts) {
  return { id, name, latin, fam, size, habitat, active, rarity, facts, make: () => makeBug({ gen, ...cfg }) }
}

// 팔레트 프리셋
const P = {
  swallowtail: { base: '#F2D24A', dark: '#1B1B1B', wing: '#F7DF6A', wingEdge: '#141414', wingSpot: '#3A6EC0', spots: true },
  cabbageWhite: { base: '#F4F4EE', dark: '#3B3B3B', wing: '#FBFBF5', wingEdge: '#6E6E6E', wingSpot: '#2B2B2B', spots: true },
}

export const BUGS = {}
function reg(entry) { BUGS[entry.id] = entry; return entry }
const list = []
const add = (...args) => list.push(b(...args))

// ───────────── 🦋 나비류 ─────────────
add('hoRangNabi', '호랑나비', 'Papilio xuthus', 'butterfly', 'butterfly', { base: '#F2D24A', dark: '#181818', wing: '#F6DA5E', wingEdge: '#151515', wingSpot: '#3A6EC0', spots: true }, '날개폭 8~9cm', '꽃밭·마을 정원', DAY, 'common', ['노랑 바탕에 검은 호랑이 줄무늬가 있어요.', '뒷날개에 파란·빨간 점이 콕콕 박혀 있어요.', '귤나무·산초나무 잎에 알을 낳아요.'])
add('jebiNabi', '제비나비', 'Papilio bianor', 'butterfly', 'butterfly', { base: '#2B2F55', dark: '#0E0E1A', wing: '#33406E', wingEdge: '#0C0C16', wingSpot: '#4FA6E0' }, '날개폭 9~12cm', '숲 가장자리', DAY, 'uncommon', ['날개가 제비처럼 파랗게 반짝여요.', '햇빛 각도에 따라 색이 달라 보여요.', '축축한 땅에서 물을 마셔요.'])
add('baechuHuinNabi', '배추흰나비', 'Pieris rapae', 'butterfly', 'butterfly', P.cabbageWhite, '날개폭 4~5cm', '배추밭·들판', DAY, 'common', ['우리 주변에서 가장 흔한 흰나비예요.', '애벌레는 배추·무 잎을 갉아 먹어요.', '날개 끝에 검은 점이 있어요.'])
add('norangNabi', '노랑나비', 'Colias erate', 'butterfly', 'butterfly', { base: '#F5D63A', dark: '#5A4A10', wing: '#F8DE55', wingEdge: '#7A6412' }, '날개폭 4~5cm', '풀밭·논둑', DAY, 'common', ['노란 날개에 테두리가 진해요.', '토끼풀·콩과 식물을 좋아해요.', '봄부터 가을까지 오래 볼 수 있어요.'])
add('bujeonNabi', '부전나비', 'Lycaena phlaeas', 'butterfly', 'butterfly', { base: '#C86A3A', dark: '#2A1810', wing: '#D2793F', wingEdge: '#241109', spots: true }, '날개폭 2~3cm', '양지바른 풀밭', DAY, 'common', ['아주 작고 앙증맞은 나비예요.', '날개 뒷면에 작은 점무늬가 많아요.', '개미와 서로 도우며 사는 종류도 있어요.'])
add('nebalNabi', '네발나비', 'Polygonia c-aureum', 'butterfly', 'butterfly', { base: '#D98A2B', dark: '#3A2410', wing: '#E0952F', wingEdge: '#2A1808', spots: true }, '날개폭 4~5cm', '숲길·마을', DAY, 'common', ['앞다리가 짧아 네 발로 서는 것처럼 보여요.', '날개 접으면 낙엽처럼 위장돼요.', '어른벌레로 겨울을 나기도 해요.'])
add('pyoBeomNabi', '표범나비', 'Argynnis paphia', 'butterfly', 'butterfly', { base: '#E08A2A', dark: '#241004', wing: '#E7952E', wingEdge: '#1E0D03', spots: true, wingSpot: '#1E0D03' }, '날개폭 6~7cm', '숲속 빈터', DAY, 'uncommon', ['표범처럼 검은 점이 촘촘해요.', '제비꽃 잎에 알을 낳아요.', '빠르고 힘차게 날아다녀요.'])
add('wangNabi', '왕나비', 'Parantica sita', 'butterfly', 'butterfly', { base: '#C9B79A', dark: '#3A2A18', wing: '#D6C6AA', wingEdge: '#2E2012', wingSpot: '#2E2012', spots: true }, '날개폭 10~13cm', '숲·산지', DAY, 'rare', ['아주 멀리 이동하는 큰 나비예요.', '독이 있어 새가 잘 안 먹어요.', '천천히 미끄러지듯 날아요.'])
add('gongjakNabi', '공작나비', 'Aglais io', 'butterfly', 'butterfly', { base: '#A83226', dark: '#1A0A06', wing: '#B83A2C', wingEdge: '#160806', wingSpot: '#2A4A8A', eyespot: true }, '날개폭 5~6cm', '산지 풀밭', DAY, 'rare', ['날개에 공작 깃 같은 눈알 무늬가 있어요.', '눈알 무늬로 새를 깜짝 놀래켜요.', '어른벌레로 겨울잠을 자요.'])
add('cheongttiJebi', '청띠제비나비', 'Graphium sarpedon', 'butterfly', 'butterfly', { base: '#182838', dark: '#0A0F16', wing: '#20364C', wingEdge: '#080C12', wingSpot: '#3FC0A8' }, '날개폭 5~6cm', '남부 숲', DAY, 'rare', ['검은 날개에 청록색 띠가 가로질러요.', '남쪽 따뜻한 곳에 살아요.', '아주 빠르게 날아 잡기 어려워요.'])
add('ppulNabi', '뿔나비', 'Libythea celtis', 'butterfly', 'butterfly', { base: '#8A5A2E', dark: '#241408', wing: '#96632F', wingEdge: '#1E1006' }, '날개폭 4cm', '팽나무 숲', DAY, 'uncommon', ['입 부분이 뿔처럼 뾰족 튀어나왔어요.', '팽나무 잎을 먹고 자라요.', '어른벌레로 겨울을 나요.'])
add('palrangNabi', '팔랑나비', 'Parnara guttata', 'butterfly', 'butterfly', { base: '#7A5A34', dark: '#241606', wing: '#86663A', wingEdge: '#1E1204', spots: true }, '날개폭 3~4cm', '논밭·풀밭', DAY, 'common', ['통통한 몸으로 팔랑팔랑 날아요.', '벼 잎을 먹는 애벌레도 있어요.', '나방과 나비의 중간처럼 생겼어요.'])
add('gakshiNabi', '각시멧노랑나비', 'Gonepteryx aspasia', 'butterfly', 'butterfly', { base: '#EAE04A', dark: '#6A6412', wing: '#EFE85E', wingEdge: '#7A7414' }, '날개폭 5~6cm', '산지 숲', DAY, 'uncommon', ['날개 모양이 나뭇잎을 꼭 닮았어요.', '접으면 잎맥까지 흉내 내 숨어요.', '이른 봄에 가장 먼저 나와요.'])

// ───────────── 🌙 나방류 ─────────────
add('bakGakSi', '박각시나방', 'Agrius convolvuli', 'moth', 'moth', { base: '#6A5E48', dark: '#241E12', wing: '#766A52', wingEdge: '#1A150B' }, '날개폭 8~10cm', '꽃밭(밤)', NIGHT, 'uncommon', ['벌새처럼 공중에 멈춰 꿀을 빨아요.', '아주 빠르게 날개를 파닥여요.', '긴 대롱 주둥이로 깊은 꽃을 먹어요.'])
add('nueNaBang', '누에나방', 'Bombyx mori', 'moth', 'moth', { base: '#EFEAD8', dark: '#8A8266', wing: '#F4EFDE', wingEdge: '#9A9276' }, '날개폭 4~5cm', '뽕나무(사육)', NIGHT, 'uncommon', ['고치에서 비단실을 뽑아내요.', '사람이 오래 길러 스스로 날지 못해요.', '애벌레가 바로 누에예요.'])
add('sanNueNaBang', '산누에나방', 'Antheraea yamamai', 'moth', 'moth', { base: '#B98A3A', dark: '#3A2810', wing: '#C6963F', wingEdge: '#2E2010', eyespot: true, wingSpot: '#2E2010' }, '날개폭 12~15cm', '참나무 숲(밤)', NIGHT, 'rare', ['우리나라에서 가장 큰 나방 중 하나예요.', '날개에 큰 눈알 무늬가 있어요.', '옥색 실을 뽑는 종류도 있어요.'])
add('bulNaBang', '불나방', 'Arctia caja', 'moth', 'moth', { base: '#B83A2C', dark: '#1A0A06', wing: '#C6432F', wingEdge: '#160806', spots: true, wingSpot: '#EFE0C0' }, '날개폭 5~6cm', '풀밭(밤)', NIGHT, 'uncommon', ['화려한 색으로 "나 독 있어!"라고 알려요.', '애벌레는 털이 복슬복슬해요.', '불빛에 잘 모여들어요.'])
add('maemiNaBang', '매미나방', 'Lymantria dispar', 'moth', 'moth', { base: '#8A8272', dark: '#2E2A1E', wing: '#96907E', wingEdge: '#221E14', spots: true }, '날개폭 4~7cm', '숲·나무', NIGHT, 'common', ['암컷은 하얗고 크고, 수컷은 갈색이에요.', '한꺼번에 많이 생겨 나무 잎을 갉아요.', '알 덩어리를 나무껍질에 붙여요.'])
add('jaNaBang', '자나방', 'Geometridae sp.', 'moth', 'moth', { base: '#9AA06A', dark: '#3A3E1E', wing: '#A6AC74', wingEdge: '#2A2E14' }, '날개폭 3~4cm', '숲(밤)', NIGHT, 'common', ['애벌레가 자로 재듯 몸을 구부려 기어요.', '그래서 "자벌레"라고 불려요.', '나뭇가지처럼 위장을 아주 잘해요.'])

// ───────────── 🪲 딱정벌레·풍뎅이류 ─────────────
add('jangSuPungDeng', '장수풍뎅이', 'Allomyrina dichotoma', 'beetle', 'beetle', { base: '#5A3A1E', dark: '#2A1808', accent: '#6A462A', head: '#3A2410', horn: '#3A2410', long: true }, '수컷 5~8cm', '참나무 숲(밤)', NIGHT, 'epic', ['머리에 큰 Y자 뿔이 솟아 있어요.', '나무 진액을 먹으러 밤에 모여요.', '어린이들에게 최고 인기 곤충이에요.'])
add('saseumBeolle', '사슴벌레', 'Lucanus maculifemoratus', 'beetle', 'beetle', { base: '#3A2410', dark: '#1A0E04', accent: '#4A3018', head: '#241408', horn: '#241408', mandibles: true, long: true }, '수컷 4~7cm', '참나무 숲(밤)', NIGHT, 'epic', ['사슴뿔 같은 큰턱으로 힘겨루기를 해요.', '큰턱으로 상대를 들어 던지기도 해요.', '나무 진액과 잘 익은 과일을 좋아해요.'])
add('neopjeokSaseum', '넓적사슴벌레', 'Dorcus titanus', 'beetle', 'beetle', { base: '#1E1408', dark: '#0E0804', accent: '#2A1C0E', horn: '#160C04', mandibles: true, long: true }, '수컷 3~8cm', '참나무 숲(밤)', NIGHT, 'rare', ['몸이 납작해서 나무 틈에 잘 숨어요.', '큰턱이 두껍고 힘이 세요.', '오래 사는 사슴벌레예요.'])
add('wangSaseum', '왕사슴벌레', 'Dorcus hopei', 'beetle', 'beetle', { base: '#241609', dark: '#100A04', accent: '#30200E', horn: '#160C04', mandibles: true, long: true }, '수컷 4~7cm', '참나무 노거수', NIGHT, 'epic', ['깊은 산 오래된 나무에만 살아요.', '기르는 사람이 많은 귀한 곤충이에요.', '큰턱 안쪽에 큰 이빨이 있어요.'])
add('topSaseum', '톱사슴벌레', 'Prosopocoilus inclinatus', 'beetle', 'beetle', { base: '#4A2E12', dark: '#241408', accent: '#5A3A18', horn: '#241408', mandibles: true, long: true }, '수컷 3~7cm', '참나무 숲', NIGHT, 'rare', ['큰턱이 톱니처럼 안으로 휘어요.', '크기에 따라 턱 모양이 달라요.', '불빛에 잘 날아와요.'])
add('muDangBeolle', '무당벌레', 'Harmonia axyridis', 'beetle', 'beetle', { base: '#C8302A', dark: '#141414', accent: '#141414', head: '#141414', spots: true }, '5~8mm', '풀·나무·밭', DAY, 'common', ['빨간 등에 검은 점이 콕콕 있어요.', '진딧물을 잡아먹는 농부의 친구예요.', '위험하면 노란 물을 내뿜어요.'])
add('chilSeongMudang', '칠성무당벌레', 'Coccinella septempunctata', 'beetle', 'beetle', { base: '#D0342C', dark: '#141414', accent: '#141414', head: '#141414', spots: true }, '5~8mm', '풀밭·밭', DAY, 'common', ['등에 점이 딱 일곱 개 있어요.', '하루에 진딧물 수십 마리를 먹어요.', '봄에 무리 지어 겨울잠에서 깨요.'])
add('ban28Mudang', '이십팔점무당벌레', 'Henosepilachna vigintioctopunctata', 'beetle', 'beetle', { base: '#C9702A', dark: '#2A1808', accent: '#2A1808', spots: true }, '6~8mm', '감자·가지밭', DAY, 'uncommon', ['점이 스물여덟 개나 있어요.', '다른 무당벌레와 달리 잎을 갉아 먹어요.', '몸에 잔털이 있어 조금 흐릿해 보여요.'])
add('banDitBul', '반딧불이', 'Luciola lateralis', 'beetle', 'beetle', { base: '#2A2A1E', dark: '#14140E', accent: '#C83A2C', head: '#141410', firefly: true, glow: '#E8FF6B', long: true }, '1~1.5cm', '깨끗한 냇가(밤)', NIGHT, 'rare', ['배 끝에서 노란 불빛을 반짝여요.', '불빛으로 짝을 찾아 신호해요.', '물이 깨끗한 곳에서만 살아요.'])
add('aeBanDitBul', '애반딧불이', 'Luciola unmunsana', 'beetle', 'beetle', { base: '#26261C', dark: '#12120C', accent: '#B83A2C', firefly: true, glow: '#DFFF66', long: true }, '0.8~1cm', '논·습지(밤)', NIGHT, 'rare', ['애벌레는 물속에서 다슬기를 먹어요.', '반딧불이 중에서도 작은 편이에요.', '여름밤 논에서 반짝여요.'])
add('pungDeng', '풍뎅이', 'Mimela splendens', 'beetle', 'beetle', { base: '#2E8A4A', dark: '#123A1E', accent: '#1E5A30', head: '#0E2A16' }, '1.5~2cm', '나뭇잎·풀', DAY, 'common', ['등딱지가 초록빛으로 금속처럼 반짝여요.', '나뭇잎을 갉아 먹어요.', '불빛에 잘 날아들어요.'])
add('kongPungDeng', '콩풍뎅이', 'Popillia flavosellata', 'beetle', 'beetle', { base: '#3A2E5A', dark: '#181228', accent: '#5A2E4A' }, '1cm', '콩밭·풀', DAY, 'common', ['보랏빛으로 반짝이는 작은 풍뎅이예요.', '여러 마리가 잎에 모여 갉아 먹어요.', '움직임이 느려 잡기 쉬워요.'])
add('haneulSo', '하늘소', 'Massicus raddei', 'beetle', 'beetle', { base: '#3A2A1A', dark: '#1A120A', accent: '#4A3624', antenna: '#1A120A', long: true }, '3~5cm', '참나무 숲', NIGHT, 'rare', ['더듬이가 몸보다 훨씬 길어요.', '"끼익끼익" 소리를 낼 수 있어요.', '애벌레는 나무 속을 파먹어요.'])
add('topHaneulSo', '톱하늘소', 'Prionus insularis', 'beetle', 'beetle', { base: '#2A1C10', dark: '#140C06', accent: '#3A2818', antenna: '#140C06', long: true }, '2.5~4.8cm', '숲(밤)', NIGHT, 'uncommon', ['더듬이가 톱니처럼 생겼어요.', '밤에 불빛으로 날아와요.', '몸이 두껍고 튼튼해요.'])
add('bidanBeolle', '비단벌레', 'Chrysochroa fulgidissima', 'beetle', 'beetle', { base: '#1E7A4A', dark: '#0E3A22', accent: '#B8462C', head: '#0E3A22', long: true }, '3~4cm', '팽나무·느티나무 숲', DAY, 'epic', ['보석처럼 초록·빨강으로 빛나요.', '옛날에 장식품으로도 썼어요.', '아주 더운 여름에만 잠깐 보여요.'])
add('gilAppJabi', '길앞잡이', 'Cicindela chinensis', 'beetle', 'beetle', { base: '#2E6A4A', dark: '#123020', accent: '#C83A2C', head: '#0E2818', long: true }, '2cm', '산길·모랫길', DAY, 'uncommon', ['사람 앞에서 조금씩 날아 길잡이처럼 보여요.', '아주 빠르게 달려 먹이를 사냥해요.', '큰턱과 큰 눈을 가진 사냥꾼이에요.'])
add('ttakJeongBeolle', '딱정벌레', 'Carabus sp.', 'beetle', 'beetle', { base: '#26243A', dark: '#101020', accent: '#3A2E4A', long: true }, '2~4cm', '숲 바닥', NIGHT, 'common', ['날개가 붙어 날지 못하고 빨리 달려요.', '땅 위 작은 벌레를 잡아먹어요.', '금속처럼 반짝이는 종류가 많아요.'])
add('sodongGuri', '소똥구리', 'Gymnopleurus mopsus', 'beetle', 'beetle', { base: '#26262A', dark: '#101014', accent: '#3A3A40' }, '1~1.6cm', '초원·목장', DAY, 'rare', ['똥을 동그랗게 굴려 밀고 가요.', '굴린 똥 속에 알을 낳아요.', '옛날 이집트에서 신성하게 여겼어요.'])
add('mulBangGae', '물방개', 'Cybister japonicus', 'beetle', 'beetle', { base: '#28402A', dark: '#122010', accent: '#B8A83A', head: '#0E1A0E' }, '3.5~4.5cm', '연못·논', DAY, 'rare', ['뒷다리로 노 젓듯 헤엄쳐요.', '날개 밑에 공기를 담아 숨을 쉬어요.', '물속 작은 동물을 사냥해요.'])
add('mulMaeMi', '물맴이', 'Gyrinus japonicus', 'beetle', 'beetle', { base: '#1A1A1E', dark: '#0A0A0C', accent: '#3A3A40' }, '6~8mm', '연못 수면', DAY, 'uncommon', ['수면을 빙글빙글 돌며 헤엄쳐요.', '눈이 위아래로 나뉘어 물 위아래를 동시에 봐요.', '여러 마리가 모여 뱅뱅 돌아요.'])
add('baguMi', '바구미', 'Curculionidae sp.', 'beetle', 'beetle', { base: '#4A3A26', dark: '#241C10', accent: '#5A4A34' }, '3~10mm', '쌀·나무·열매', DAY, 'common', ['주둥이가 코끼리 코처럼 길어요.', '쌀통에 생기는 작은 벌레가 바로 이거예요.', '위험하면 죽은 척 뚝 떨어져요.'])
add('bangAaBeolle', '방아벌레', 'Elateridae sp.', 'beetle', 'beetle', { base: '#3A2E1E', dark: '#1A140C', accent: '#4A3A26', long: true }, '1~4cm', '풀밭·나무', DAY, 'common', ['뒤집히면 "딱!" 튕겨 몸을 뒤집어요.', '튈 때 나는 소리가 방아 찧는 소리 같아요.', '가슴 관절로 스프링처럼 튀어요.'])
add('geoJeoRi', '거저리', 'Tenebrio molitor', 'beetle', 'beetle', { base: '#241810', dark: '#100A06', accent: '#3A281A' }, '1.2~1.8cm', '곡물·마른 잎', NIGHT, 'common', ['애벌레가 밀웜(고소애)이에요.', '동물 먹이로 많이 길러요.', '어두운 곳을 좋아해요.'])

// ───────────── 🪰 잠자리류 ─────────────
add('gochuJamJari', '고추잠자리', 'Crocothemis servilia', 'dragonfly', 'dragonfly', { base: '#D23A24', dark: '#3A0E06', accent: '#7A1810', head: '#5A1008' }, '4~5cm', '연못·논', DAY, 'common', ['수컷이 고추처럼 새빨개요.', '여름 논밭에서 아주 흔해요.', '작은 날벌레를 공중에서 사냥해요.'])
add('doenJangJamJari', '된장잠자리', 'Pantala flavescens', 'dragonfly', 'dragonfly', { base: '#C99A3A', dark: '#3A2A0E', accent: '#7A5A1E' }, '4~5cm', '어디서나', DAY, 'common', ['된장 색이라 이런 이름이 붙었어요.', '바다를 건너 아주 멀리 이동해요.', '떼 지어 하늘을 날아요.'])
add('wangJamJari', '왕잠자리', 'Anax parthenope', 'dragonfly', 'dragonfly', { base: '#2E7A4A', dark: '#123020', accent: '#2E5A9A', head: '#1E5A30' }, '7~8cm', '큰 연못', DAY, 'uncommon', ['가슴은 초록, 배는 파란 큰 잠자리예요.', '연못 위를 빠르게 순찰하듯 날아요.', '다른 잠자리도 잡아먹어요.'])
add('milJamJari', '밀잠자리', 'Orthetrum albistylum', 'dragonfly', 'dragonfly', { base: '#9AA6B2', dark: '#3A4048', accent: '#2A2E34', head: '#3A4048' }, '4.5~5.5cm', '연못·습지', DAY, 'common', ['수컷은 자라면서 흰 가루를 뒤집어써요.', '넓은 배가 납작해요.', '물가 돌이나 막대에 잘 앉아요.'])
add('nabiJamJari', '나비잠자리', 'Rhyothemis fuliginosa', 'dragonfly', 'dragonfly', { base: '#2A2440', dark: '#12101F', accent: '#5A2E7A', wing: '#3A2E5A', wingEdge: '#12101F' }, '3~4cm', '연못·습지', DAY, 'rare', ['날개가 넓어 나비처럼 팔랑여요.', '날개가 보랏빛으로 반짝여요.', '천천히 나풀나풀 날아요.'])
add('siljamJari', '실잠자리', 'Ischnura asiatica', 'dragonfly', 'damselfly', { base: '#2E9A6A', dark: '#123A26', accent: '#C9A83A', head: '#0E2818' }, '2.5~3.5cm', '연못·논', DAY, 'common', ['몸이 실처럼 아주 가늘어요.', '앉을 때 날개를 등 위로 모아요.', '천천히 팔랑팔랑 날아요.'])
add('mulJamJari', '물잠자리', 'Calopteryx japonica', 'dragonfly', 'damselfly', { base: '#183A2A', dark: '#0A1A12', accent: '#2E7A9A', wing: '#1E2A24', wingEdge: '#0A1A12' }, '5~6cm', '맑은 냇가', DAY, 'uncommon', ['날개 전체가 까맣고 반짝여요.', '몸은 금속 초록빛이에요.', '맑은 물 위를 나풀나풀 날아요.'])
add('jangSuJamJari', '장수잠자리', 'Anotogaster sieboldii', 'dragonfly', 'dragonfly', { base: '#1A1A1A', dark: '#0A0A0A', accent: '#E8C83A', head: '#2A6A3A' }, '9~11cm', '깊은 산 계곡', DAY, 'epic', ['우리나라에서 가장 큰 잠자리예요.', '검은 몸에 노란 줄무늬가 있어요.', '초록 눈이 아주 커요.'])

// ───────────── 🐝 벌·개미류 ─────────────
add('kkulBeol', '꿀벌', 'Apis mellifera', 'bee', 'bee', { base: '#E0A82E', dark: '#241608', accent: '#6A4A24', head: '#241608', sting: true }, '1.2~1.5cm', '꽃밭·벌집', DAY, 'common', ['꽃가루를 옮겨 열매를 맺게 도와요.', '춤을 춰서 꽃 위치를 알려줘요.', '벌집에서 꿀을 모아요.'])
add('hobakBeol', '호박벌', 'Bombus ignitus', 'bee', 'bee', { base: '#2A2018', dark: '#120C08', accent: '#E8B83A', head: '#120C08', sting: true }, '2~2.5cm', '꽃밭', DAY, 'uncommon', ['몸이 둥글고 털이 복슬복슬해요.', '"붕붕" 큰 소리를 내며 날아요.', '추운 날씨에도 잘 움직여요.'])
add('malBeol', '말벌', 'Vespa crabro', 'bee', 'bee', { base: '#E0B02E', dark: '#2A1808', accent: '#7A2010', head: '#7A2010', sting: true }, '2.5~3.5cm', '숲·처마', DAY, 'rare', ['침이 강해 조심해야 해요.', '나무 진액과 벌레를 먹어요.', '종이처럼 생긴 큰 집을 지어요.'])
add('jangSuMalBeol', '장수말벌', 'Vespa mandarinia', 'bee', 'bee', { base: '#E8A82A', dark: '#241206', accent: '#8A2410', head: '#8A2410', sting: true }, '3.5~5cm', '산·땅속', DAY, 'epic', ['세계에서 가장 큰 말벌이에요.', '꿀벌 집을 습격하기도 해요.', '아주 위험하니 절대 건드리면 안 돼요.'])
add('ssangSalBeol', '쌍살벌', 'Polistes sp.', 'bee', 'bee', { base: '#D2A02E', dark: '#241808', accent: '#5A3A18', sting: true }, '1.5~2.2cm', '처마·나뭇가지', DAY, 'uncommon', ['다리를 늘어뜨리고 날아요.', '작은 우산 모양 집을 지어요.', '애벌레를 잡아 새끼에게 먹여요.'])
add('kkotDeungE', '꽃등에', 'Episyrphus balteatus', 'bee', 'bee', { base: '#E0B23A', dark: '#241808', accent: '#3A2A18', head: '#241808' }, '1~1.2cm', '꽃밭', DAY, 'common', ['벌처럼 생겼지만 침이 없는 파리예요.', '벌 흉내로 새를 속여요.', '공중에 멈춰 정지비행을 해요.'])
add('nananiBeol', '나나니벌', 'Ammophila sabulosa', 'bee', 'bee', { base: '#2A2018', dark: '#120C08', accent: '#C8302A', sting: true }, '2~2.5cm', '모랫땅', DAY, 'uncommon', ['허리가 실처럼 아주 잘록해요.', '땅굴을 파고 애벌레 먹이를 저장해요.', '자벌레를 사냥해 굴에 넣어요.'])
add('ilbonWangGaeMi', '일본왕개미', 'Camponotus japonicus', 'bee', 'ant', { base: '#1A1A1E', dark: '#0A0A0C', accent: '#2A2A30', head: '#0E0E10' }, '일개미 0.7~1.2cm', '땅속·나무', DAY, 'common', ['우리나라에서 가장 큰 개미예요.', '큰 나무 밑에 큰 집을 지어요.', '여왕개미는 훨씬 커요.'])
add('gomGaeMi', '곰개미', 'Formica japonica', 'bee', 'ant', { base: '#2A2622', dark: '#121010', accent: '#3A342E' }, '일개미 0.4~0.6cm', '풀밭·길가', DAY, 'common', ['가장 흔하게 보이는 검은 개미예요.', '진딧물의 단물을 받아먹어요.', '길게 줄지어 다녀요.'])
add('bulGaeMi', '불개미', 'Formica sp.', 'bee', 'ant', { base: '#8A3A1E', dark: '#2A1006', accent: '#B85A2E', head: '#5A200E', mandibles: true }, '일개미 0.5~0.8cm', '숲·풀밭', DAY, 'uncommon', ['몸 앞쪽이 붉은색이에요.', '건드리면 개미산을 쏘아요.', '큰 흙더미 집을 만들어요.'])
add('yeoWangGaeMi', '여왕개미', 'Camponotus (queen)', 'bee', 'ant', { base: '#241C16', dark: '#100C08', accent: '#3A2E22', head: '#0E0A06' }, '1.5~2cm', '땅속 방', DAY, 'rare', ['알을 낳는 개미나라의 어머니예요.', '결혼비행 뒤 날개를 떼어내요.', '몇 년을 살며 집을 이끌어요.'])

// ───────────── 🦗 사마귀류 ─────────────
add('samaGwi', '사마귀', 'Tenodera angustipennis', 'mantis', 'mantis', { base: '#7EA84A', dark: '#2E4018', accent: '#5A7A34', head: '#4A6A2A' }, '6~8cm', '풀숲·나무', DAY, 'uncommon', ['앞다리를 낫처럼 접고 먹이를 기다려요.', '고개를 사람처럼 돌릴 수 있어요.', '자기보다 큰 벌레도 잡아요.'])
add('wangSamaGwi', '왕사마귀', 'Tenodera sinensis', 'mantis', 'mantis', { base: '#6A9A3A', dark: '#243812', accent: '#4A6A28', head: '#3A5A20' }, '7~9.5cm', '풀숲·덤불', DAY, 'rare', ['우리나라에서 가장 큰 사마귀예요.', '알집(오테카)을 거품으로 만들어요.', '겨울에 알집으로 추위를 이겨요.'])
add('jomSamaGwi', '좀사마귀', 'Statilia maculata', 'mantis', 'mantis', { base: '#8A7A5A', dark: '#3A3220', accent: '#6A5A3A', head: '#4A4028' }, '4~5cm', '풀밭·돌담', DAY, 'common', ['갈색이라 나뭇가지처럼 위장해요.', '작지만 사냥 실력은 뛰어나요.', '앞다리 안쪽에 무늬가 있어요.'])

// ───────────── 🦗 메뚜기·여치류 ─────────────
add('bangAkkaeBi', '방아깨비', 'Acrida cinerea', 'grasshopper', 'grasshopper', { base: '#8AA84A', dark: '#3A4A18', accent: '#6A8A34', head: '#4A6A24' }, '4~8cm', '풀밭·논둑', DAY, 'common', ['뒷다리를 잡으면 방아 찧듯 끄덕여요.', '머리가 뾰족한 삼각형이에요.', '풀잎처럼 초록이라 잘 숨어요.'])
add('byeoMettugi', '벼메뚜기', 'Oxya chinensis', 'grasshopper', 'grasshopper', { base: '#7A9A3A', dark: '#2E3E14', accent: '#5A7A28', head: '#3A5A1E' }, '2~4cm', '논·풀밭', DAY, 'common', ['벼 잎을 먹고 자라요.', '옛날엔 볶아서 간식으로 먹었어요.', '톡톡 잘 뛰어올라요.'])
add('patJungI', '팥중이', 'Oedaleus infernalis', 'grasshopper', 'grasshopper', { base: '#9A8A5A', dark: '#3A3220', accent: '#6A5A34' }, '3~4.5cm', '마른 풀밭', DAY, 'common', ['날 때 뒷날개가 얼핏 보여요.', '흙·마른풀 색으로 위장해요.', '메마른 땅을 좋아해요.'])
add('seomSeoGu', '섬서구메뚜기', 'Atractomorpha lata', 'grasshopper', 'grasshopper', { base: '#7EA84A', dark: '#2E4018', accent: '#5A7A34', head: '#4A6A2A' }, '2~4cm', '풀밭·밭', DAY, 'common', ['머리가 원뿔처럼 길쭉해요.', '암컷 등에 수컷이 업혀 다녀요.', '움직임이 느려 잡기 쉬워요.'])
add('yeoChi', '여치', 'Gampsocleis sedakovii', 'grasshopper', 'grasshopper', { base: '#8AA83A', dark: '#3A4A14', accent: '#6A8A28', head: '#4A6A20', antenna: '#2E3E14' }, '3~4.5cm', '풀숲', DAY, 'uncommon', ['더듬이가 몸보다 길어요.', '"찌르르" 큰 소리로 울어요.', '다른 벌레도 잡아먹어요.'])
add('bejjangI', '베짱이', 'Hexacentrus japonicus', 'grasshopper', 'grasshopper', { base: '#9AB84A', dark: '#3A4A18', accent: '#7A9A34', antenna: '#2E3E14' }, '2.5~3.5cm', '풀숲·덤불', NIGHT, 'uncommon', ['밤에 "쓰윽쓰윽" 노래해요.', '개미와 베짱이 이야기의 그 곤충이에요.', '앞날개를 비벼 소리를 내요.'])
add('gwiddulaMi', '귀뚜라미', 'Velarifictorus aspersus', 'grasshopper', 'grasshopper', { base: '#3A2E22', dark: '#161009', accent: '#5A4A34', antenna: '#161009' }, '1.5~2.5cm', '돌 밑·풀밭', NIGHT, 'common', ['가을밤 "귀뚤귀뚤" 노래해요.', '수컷만 날개를 비벼 울어요.', '어두운 돌 틈을 좋아해요.'])
add('ttangGangAji', '땅강아지', 'Gryllotalpa orientalis', 'grasshopper', 'grasshopper', { base: '#7A5A34', dark: '#2E2010', accent: '#9A7A4A', head: '#4A3620' }, '3~3.5cm', '축축한 땅속', NIGHT, 'uncommon', ['두더지 같은 앞발로 땅을 파요.', '땅속에서 굴을 파고 살아요.', '헤엄도 치고 날기도 하는 만능이에요.'])

// ───────────── 🎵 매미류 ─────────────
add('chamMaeMi', '참매미', 'Hyalessa maculaticollis', 'cicada', 'cicada', { base: '#2E3A2A', dark: '#101610', accent: '#3A6A3A', head: '#1A2A1A' }, '3.3~3.6cm', '도시·숲', DAY, 'common', ['"맴맴맴~" 하고 울어요.', '수컷만 배를 울려 소리를 내요.', '여름 도시에서 가장 흔해요.'])
add('malMaeMi', '말매미', 'Cryptotympana atrata', 'cicada', 'cicada', { base: '#1A1A1E', dark: '#0A0A0C', accent: '#2E7A4A', head: '#0E0E12' }, '4.4~4.8cm', '큰 나무', DAY, 'uncommon', ['우리나라에서 가장 큰 매미예요.', '"차르르~" 아주 크게 울어요.', '땅속에서 여러 해를 애벌레로 살아요.'])
add('yujiMaeMi', '유지매미', 'Graptopsaltria nigrofuscata', 'cicada', 'cicada', { base: '#4A3624', dark: '#1E140A', accent: '#6A4A2E', wing: '#5A4632', head: '#2A1C10' }, '3.6~3.8cm', '숲·과수원', DAY, 'uncommon', ['날개가 기름종이처럼 갈색이에요.', '"지글지글" 기름 튀는 소리로 울어요.', '다른 매미와 날개색이 달라요.'])
add('sseururaMi', '쓰르라미', 'Tanna japonensis', 'cicada', 'cicada', { base: '#3A4A2E', dark: '#161E10', accent: '#5A7A3A', head: '#243018' }, '3.2~3.8cm', '산지 숲', DUSK, 'uncommon', ['"쓰름쓰름~" 하고 울어요.', '해질 무렵에 많이 울어요.', '시원한 산 숲을 좋아해요.'])
add('teolMaeMi', '털매미', 'Platypleura kaempferi', 'cicada', 'cicada', { base: '#5A4A34', dark: '#241C10', accent: '#7A6A4A', wing: '#6A5A40', head: '#3A2E1E' }, '2~2.4cm', '나무·정원', DAY, 'common', ['몸에 잔털이 있어 흐릿해 보여요.', '작지만 초여름 일찍 울어요.', '날개에 구름 같은 무늬가 있어요.'])
add('aeMaeMi', '애매미', 'Meimuna opalifera', 'cicada', 'cicada', { base: '#2E3A28', dark: '#10160E', accent: '#4A6A3A', head: '#1A2414' }, '2.8~3.5cm', '숲·공원', DAY, 'common', ['"시-오 시-오" 하고 울어요.', '가을까지 늦게 우는 매미예요.', '몸이 초록빛 도는 갈색이에요.'])

// ───────────── 🛡️ 노린재·물벌레류 ─────────────
add('gwangDaeNorinJae', '광대노린재', 'Poecilocoris lewisi', 'stinkbug', 'stinkbug', { base: '#2E7A4A', dark: '#0E2A18', accent: '#C8402A', head: '#0E2A18' }, '1.6~2cm', '나무·덤불', DAY, 'rare', ['초록·주황이 어우러진 화려한 등이에요.', '보석처럼 금속빛으로 반짝여요.', '광대 옷처럼 알록달록해요.'])
add('norinJae', '노린재', 'Halyomorpha halys', 'stinkbug', 'stinkbug', { base: '#6A5A3A', dark: '#2A2010', accent: '#4A3E24', head: '#2A2010' }, '1.2~1.7cm', '밭·과수원', DAY, 'common', ['건드리면 고약한 냄새를 뿜어요.', '방패 모양 납작한 등을 가졌어요.', '식물 즙을 빨아 먹어요.'])
add('sodeomNorin', '썩덩나무노린재', 'Halyomorpha sp.', 'stinkbug', 'stinkbug', { base: '#7A6A4A', dark: '#2E2616', accent: '#5A4A30' }, '1.4~1.7cm', '나무·집 주변', DAY, 'common', ['가을에 집 안으로 들어오기도 해요.', '얼룩덜룩한 갈색이에요.', '냄새로 자신을 지켜요.'])
add('sogeumJaengI', '소금쟁이', 'Aquarius paludum', 'stinkbug', 'stinkbug', { base: '#2A2A2E', dark: '#101014', accent: '#3A3A40' }, '1.1~1.6cm', '연못·냇물 수면', DAY, 'common', ['물 위를 미끄러지듯 걸어다녀요.', '다리 끝 잔털이 물에 안 젖어요.', '물에 빠진 벌레를 잡아먹어요.'])
add('mulJangGun', '물장군', 'Lethocerus deyrolli', 'stinkbug', 'stinkbug', { base: '#4A3A26', dark: '#1E140A', accent: '#6A5A3A', head: '#2A1C10' }, '4.8~6.5cm', '깨끗한 논·연못', NIGHT, 'epic', ['우리나라에서 가장 큰 물벌레예요.', '앞다리로 물고기·개구리도 잡아요.', '아빠가 알을 지키는 착한 곤충이에요.'])
add('jangGuAeBi', '장구애비', 'Laccotrephes japonensis', 'stinkbug', 'stinkbug', { base: '#3A2E22', dark: '#161009', accent: '#5A4A34' }, '3~4.5cm', '연못·논 바닥', NIGHT, 'rare', ['꼬리 끝 긴 대롱으로 숨을 쉬어요.', '앞다리로 먹이를 낚아채요.', '물속에서 죽은 척 잘해요.'])
add('gaeAJaeBi', '게아재비', 'Ranatra chinensis', 'stinkbug', 'stinkbug', { base: '#5A4A34', dark: '#241C10', accent: '#7A6A4A' }, '4~4.5cm', '연못·수초', NIGHT, 'rare', ['막대기처럼 가늘고 길어요.', '수초 사이에 숨어 먹이를 기다려요.', '긴 숨관을 물 밖으로 내밀어요.'])

// ───────────── 🕷️ 거미류 ─────────────
add('muDangGeoMi', '무당거미', 'Trichonephila clavata', 'spider', 'spider', { base: '#3A3A1E', dark: '#161610', accent: '#C8B03A', head: '#242414', spots: true }, '암컷 2~3cm', '숲·처마', DAY, 'common', ['노랑·검정 알록달록한 큰 거미예요.', '아주 크고 튼튼한 그물을 쳐요.', '암컷이 수컷보다 훨씬 커요.'])
add('wangGeoMi', '왕거미', 'Araneus ventricosus', 'spider', 'spider', { base: '#2E2620', dark: '#121010', accent: '#4A3E30', spots: true }, '1.5~3cm', '나무·건물 사이', NIGHT, 'common', ['밤마다 둥근 그물을 새로 쳐요.', '낮엔 구석에 숨어 있어요.', '그물 진동으로 먹이를 알아채요.'])
add('kkangChungGeoMi', '깡충거미', 'Plexippus paykulli', 'spider', 'spider', { base: '#2A2A2E', dark: '#101014', accent: '#B8B8C0', head: '#161618', spots: true }, '0.6~1.2cm', '벽·나뭇잎', DAY, 'common', ['그물 없이 폴짝 뛰어 사냥해요.', '큰 눈으로 먹이를 정확히 봐요.', '점프 전에 안전줄을 매요.'])
add('geoGeoMi', '게거미', 'Thomisidae sp.', 'spider', 'spider', { base: '#EAE0C0', dark: '#8A8060', accent: '#C8B83A', spots: true }, '0.5~1cm', '꽃 속', DAY, 'uncommon', ['꽃 색에 맞춰 몸 색을 바꿔요.', '옆으로 게처럼 걸어요.', '꽃에 앉는 벌레를 매복 사냥해요.'])
add('nukdaeGeoMi', '늑대거미', 'Lycosidae sp.', 'spider', 'spider', { base: '#4A3E2E', dark: '#1E1810', accent: '#6A5A44' }, '1~2cm', '풀밭·땅 위', NIGHT, 'common', ['그물 없이 땅을 달리며 사냥해요.', '엄마가 새끼를 등에 업고 다녀요.', '밤에 눈이 불빛에 반짝여요.'])

// ───────────── 🐌 기타 ─────────────
add('dalPaengI', '달팽이', 'Acusta despecta', 'other', 'snail', { base: '#C8A878', dark: '#5A4A30', accent: '#8A6A3A', head: '#B89868', shell: '#A9814E' }, '2~3cm', '축축한 풀·담벼락', NIGHT, 'common', ['등에 소용돌이 껍데기를 지고 다녀요.', '눈이 더듬이 끝에 달려 있어요.', '미끄러운 점액을 내며 기어요.'])
add('myeongJuDalPaeng', '명주달팽이', 'Karaftohelix adamsi', 'other', 'snail', { base: '#D8C8A0', dark: '#6A5A3A', accent: '#B89A5A', shell: '#C9A86A' }, '1.5~2.5cm', '숲·정원(비 온 뒤)', NIGHT, 'common', ['껍데기가 얇고 반투명해요.', '비 온 뒤에 많이 기어 나와요.', '이빨이 아주 많은 혀로 잎을 갉아요.'])
add('gongBeolle', '공벌레', 'Armadillidium vulgare', 'other', 'stinkbug', { base: '#3A3A44', dark: '#16161C', accent: '#5A5A64' }, '0.8~1.2cm', '돌·화분 밑', NIGHT, 'common', ['건드리면 공처럼 동그랗게 말려요.', '사실 곤충이 아니라 갑각류예요.', '축축하고 어두운 곳을 좋아해요.'])
add('jiNe', '지네', 'Scolopendra sp.', 'other', 'spider', { base: '#7A2E1E', dark: '#2A0E06', accent: '#C8A83A', long: true }, '7~14cm', '돌·낙엽 밑', NIGHT, 'rare', ['다리가 아주 많은 사냥꾼이에요.', '독턱으로 벌레를 잡아요.', '축축한 곳을 좋아하니 조심해요.'])

// 등록
for (const e of list) reg(e)

// 도감 갤러리 순서 (과별 정렬)
export const BUG_ORDER = Object.keys(BUGS)

// 과별 그룹 (탭 UI용)
export function bugsByFamily() {
  const groups = {}
  for (const id of BUG_ORDER) {
    const bug = BUGS[id]
    ;(groups[bug.fam] ||= []).push(bug)
  }
  return groups
}

export const BUG_COUNT = BUG_ORDER.length
