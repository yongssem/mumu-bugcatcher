"""무무곤충잡이 오리지널 악보와 신시사이저. 외부 음원/샘플을 사용하지 않는다.

재생성: python scripts/compose-bgm.py --scratch ../audio-work
필요 도구: numpy, ffmpeg. 완성곡은 public/bgm/에 저장한다.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import wave
import numpy as np

SR = 44100
TAU = math.tau

# 8마디 주제. (음높이, 박수), None은 쉼표다. 각 마디는 4박.
GARDEN = [
    [(74,.5),(78,.5),(81,1),(78,.5),(76,.5),(74,1)],
    [(73,.5),(76,.5),(81,1.5),(78,.5),(76,1)],
    [(74,1),(78,.5),(81,.5),(83,1),(81,1)],
    [(79,.75),(78,.25),(76,1),(74,1),(None,1)],
    [(76,.5),(79,.5),(83,1),(81,.5),(79,.5),(76,1)],
    [(73,1),(76,.5),(78,.5),(81,1),(76,1)],
    [(78,.5),(81,.5),(86,1),(83,.5),(81,.5),(78,1)],
    [(76,1),(73,1),(74,1.5),(None,.5)],
]
TRAIL = [
    [(76,.5),(79,.5),(83,.5),(81,.5),(79,1),(76,1)],
    [(79,.75),(76,.25),(74,.5),(72,.5),(76,1),(79,1)],
    [(79,.5),(83,.5),(86,1),(83,.5),(81,.5),(79,1)],
    [(81,1),(78,.5),(76,.5),(74,1),(None,1)],
    [(81,.5),(84,.5),(83,1),(81,.5),(79,.5),(76,1)],
    [(78,.5),(81,.5),(83,.5),(86,.5),(83,1),(81,1)],
    [(79,1),(76,.5),(74,.5),(72,1),(76,1)],
    [(78,.5),(81,.5),(86,1),(81,.5),(78,.5),(79,1)],
]
HOME = [
    [(72,1),(69,.5),(72,.5),(76,1),(77,1)],
    [(74,1.5),(72,.5),(69,1),(None,1)],
    [(70,.5),(74,.5),(77,1.5),(74,.5),(72,1)],
    [(76,1),(72,1),(67,1),(None,1)],
    [(69,.75),(72,.25),(74,1),(76,.5),(74,.5),(72,1)],
    [(67,1),(70,.5),(72,.5),(74,1),(72,1)],
    [(69,.5),(72,.5),(77,1),(76,.5),(74,.5),(72,1)],
    [(67,1),(69,1),(65,1.5),(None,.5)],
]
SCORES = [
    dict(file='garden-wakeup', title='이슬 정원의 아침', bpm=100, seed=1701, lead='kalimba', melody=GARDEN,
         chords=[[50,54,57,61],[49,52,57,59],[47,50,54,57],[43,47,50,54],[40,43,47,50],[45,50,52,57],[50,54,57,64],[45,49,54,57]]),
    dict(file='leaf-trails', title='풀잎 사이 탐험', bpm=112, seed=2503, lead='marimba', melody=TRAIL,
         chords=[[40,43,47,50],[48,52,55,59],[43,47,50,57],[38,43,45,50],[45,48,52,55],[47,50,54,57],[48,52,55,59],[50,54,57,59]]),
    dict(file='terrarium-home', title='작은 곤충의 집', bpm=88, seed=3809, lead='bell', melody=HOME,
         chords=[[41,45,48,52],[50,53,57,60],[46,50,53,57],[48,52,55,58],[45,48,52,55],[43,46,50,53],[41,45,48,52],[48,52,55,57]]),
]

def envelope(t, duration, attack=.012, release=.18):
    return np.minimum(1, t/attack) * np.minimum(1, np.maximum(0, duration-t)/release)

def tone(note, beats, beat, kind, rng):
    f = 440 * 2 ** ((note-69)/12)
    duration = beats*beat
    tail = {'pad': .8, 'kalimba': .7, 'marimba': .35, 'bell': 1.2, 'flute': .16, 'bass': .1}[kind]
    t = np.arange(int((duration+tail)*SR), dtype=np.float64)/SR
    phase = TAU*f*t
    if kind == 'kalimba':
        v = np.sin(phase)*np.exp(-t/1.0) + .28*np.sin(phase*2.01)*np.exp(-t/.28) + .10*np.sin(phase*4.03)*np.exp(-t/.09)
        v *= np.minimum(1,t/.004)*np.minimum(1,np.maximum(0,duration+tail-t)/.18)
    elif kind == 'marimba':
        v = np.sin(phase)*np.exp(-t/.55)+.31*np.sin(phase*3.99)*np.exp(-t/.09)+.07*np.sin(phase*9.97)*np.exp(-t/.03)
        v *= np.minimum(1,t/.003)*envelope(t,duration+tail,release=.12)
    elif kind == 'bell':
        v = np.sin(phase)*np.exp(-t/1.1)+.15*np.sin(phase*2)*np.exp(-t/.5)+.045*np.sin(phase*3)*np.exp(-t/.12)
        v *= envelope(t,duration+tail,.008,.3)
    elif kind == 'flute':
        phase += .014*np.sin(TAU*4.8*t)*np.minimum(1,t/.3)
        v = (np.sin(phase)+.13*np.sin(phase*2)+.035*np.sin(phase*3))*envelope(t,duration+tail,.055,.18)
    elif kind == 'bass':
        v = (np.sin(phase)+.21*np.sin(phase*2))*np.exp(-t/1.2)*envelope(t,duration+tail,.009,.10)
    else:
        v = (np.sin(phase)+np.sin(phase*1.0015))*.4+.055*np.sin(phase*3)
        v *= envelope(t,duration+tail,.30,.75)
    return v.astype(np.float32)

def drum(kind, rng):
    t = np.arange(int(.3*SR))/SR
    noise = rng.normal(0,1,len(t))
    if kind == 'kick':
        v = np.sin(TAU*(48*t+2.8*(1-np.exp(-t*28))))*np.exp(-t*17)
    elif kind == 'brush':
        v = (noise-np.roll(noise,1))*.18*np.exp(-t*23)+.05*np.sin(TAU*180*t)*np.exp(-t*35)
    else:
        v = (noise-np.roll(noise,1))*.12*np.exp(-t*75)
    return (v*np.minimum(1,t/.001)).astype(np.float32)

def compose(score, output, scratch):
    rng = np.random.default_rng(score['seed'])
    beat = 60/score['bpm']
    length = int(round(32*4*beat*SR))
    mix = np.zeros((length,2), dtype=np.float32)
    def add(voice, at, gain, pan=0):
        # 마지막 음과 잔향을 시작점으로 돌려 전체 루프를 이어 준다.
        start = int(round(at*beat*SR)) % length
        channels = np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)],dtype=np.float32)*gain
        n = min(len(voice),length-start)
        mix[start:start+n] += voice[:n,None]*channels
        if n < len(voice): mix[:len(voice)-n] += voice[n:,None]*channels
    def note(n, at, dur, gain, kind, pan=0, jitter=True):
        at += rng.uniform(-.012,.012) if jitter else 0
        add(tone(n,dur,beat,kind,rng),at,gain*rng.uniform(.94,1.04),pan)
    for bar in range(32):
        section = bar//8
        chord = score['chords'][bar%8]
        for j,n in enumerate(chord[1:]):
            note(n+12,bar*4,3.25,.037 if score['lead']!='bell' else .044,'pad',-.38+j*.38)
        # 가볍게 튕기는 분산 화음과 부드러운 저음.
        for step in range(8):
            if score['lead']=='bell' and step%2: continue
            n = chord[[1,2,3,2,1,3,2,3][step]]+12
            note(n,bar*4+step*.5,.35,.045 if score['lead']!='bell' else .031,'kalimba',-.48 if step%2==0 else .48)
        for at,n in [(0,chord[0]),(2,chord[0]+7),(3.5,chord[0]+12)]:
            note(n,bar*4+at,.68,.11,'bass',-.05)
        phrase = score['melody'][bar%8]
        cursor = 0
        for index,(n,dur) in enumerate(phrase):
            if n is not None:
                # B 구간은 플루트로 교대하고 재현부는 끝 음을 한 옥타브 위에서 받는다.
                kind = 'flute' if section==1 else score['lead']
                shift = 12 if section==2 and bar%8 in [2,6] and index==len(phrase)-1 else 0
                note(n+shift,bar*4+cursor,dur*.82,.12 if kind!='flute' else .075,kind,.12)
            cursor += dur
        for at in [0,2]: add(drum('kick',rng),bar*4+at,.065 if score['lead']!='bell' else .035)
        for at in [1,3]: add(drum('brush',rng),bar*4+at,.060 if score['lead']!='bell' else .022,-.22)
        for step in range(8): add(drum('shaker',rng),bar*4+step*.5,.040 if step%2 else .025,.36)
        if bar%4==3:
            for step,n in enumerate([chord[-1]+24,chord[2]+24]): note(n,bar*4+3+step*.25,.2,.035,'bell',-.35)
    # 순환 딜레이로 작은 공간감을 만든다. 잔향이 루프 끝에서 잘리지 않는다.
    dry = mix.copy()
    for delay,gain in [(.173,.12),(.287,.075),(.431,.045)]:
        mix += np.roll(dry[:,::-1],int(SR*delay),axis=0)*gain
    mix -= mix.mean(axis=0)
    mix = np.tanh(mix*1.4)
    peak = float(np.abs(mix).max())
    mix *= .79/max(peak,1e-9)
    rms = float(np.sqrt(np.mean(mix.astype(np.float64)**2)))
    wav = scratch/(score['file']+'.wav')
    with wave.open(str(wav),'wb') as file:
        file.setnchannels(2); file.setsampwidth(2); file.setframerate(SR)
        file.writeframes((mix*32767).astype('<i2').tobytes())
    mp3 = output/(score['file']+'.mp3')
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),'-c:a','libmp3lame','-q:a','4','-metadata','title='+score['title'],'-metadata','artist=MUMU Bug Catcher Original','-metadata','comment=Original score and synthesized instruments; no external samples',str(mp3)],check=True)
    return dict(file=mp3.name,title=score['title'],bpm=score['bpm'],bars=32,seconds=round(length/SR,3),bytes=mp3.stat().st_size,peak=round(float(np.abs(mix).max()),5),rms_db=round(20*math.log10(rms),2),loop_step=round(float(np.abs(mix[0]-mix[-1]).max()),6))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--scratch',default='../audio-work')
    parser.add_argument('--output',default='public/bgm')
    args = parser.parse_args()
    output = Path(args.output); output.mkdir(parents=True,exist_ok=True)
    scratch = Path(args.scratch); scratch.mkdir(parents=True,exist_ok=True)
    reports=[]
    for score in SCORES:
        result=compose(score,output,scratch); reports.append(result); print(json.dumps(result,ensure_ascii=False),flush=True)
    (scratch/'music-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__': main()
