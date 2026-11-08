# 무무곤충잡이 오리지널 BGM

이 게임을 위해 새 악보를 쓰고 악기를 합성한 3곡입니다.
기존 무무다이노 음원·샘플·멜로디를 사용하지 않았습니다.

- garden-wakeup.mp3 — 이슬 정원의 아침 / 100 BPM / 76.8초
  칼림바 주제와 가벼운 분산 화음. 랜딩·메뉴·서식지 선택.
- leaf-trails.mp3 — 풀잎 사이 탐험 / 112 BPM / 68.57초
  마림바·플루트 교대, 부드러운 베이스와 작은 셰이커. 채집·월드 미리보기.
- terrarium-home.mp3 — 작은 곤충의 집 / 88 BPM / 87.27초
  부드러운 벨과 느긋한 화음. 집·곤충 도감.

모두 32마디 스테레오 44.1kHz 루프입니다. 잔향을 다음 반복의 첫머리로
순환시켰고, MP3에는 gapless 재생 정보를 기록했습니다. 전체 약 4.09MB.
현재 음소거·볼륨 저장 설정과 첫 입력 후 재생을 그대로 따릅니다.

악보와 합성 원본: scripts/compose-bgm.py
재생성 도구: Python + numpy, ffmpeg(libmp3lame).
명령: python scripts/compose-bgm.py --scratch ../audio-work
기존 파일은 Git 이전 버전에서 복구할 수 있습니다.
