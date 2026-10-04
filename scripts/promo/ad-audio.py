# Звук ролика по фичам (ad.html): тихая музыка в духе Mini Metro, которая
# собирается из событий кадра. Каждое действие в ролике — нота из текущего
# аккорда: касание — щипок, набор — тихие капли, появление строк — колокольчики
# вверх по ступеням, готово — двойной звон. Подложка нарастает слоями от сцены
# к сцене: аккорды → бас → остинато восьмыми → искры, на финале остаётся звон.
#
# Ритм общий со сценой: 100 ударов в минуту, такт 2,4 с, сцена пишет
# события в events.json ({"f": кадр, "type": "sfx", "name": ..., "i": ступень}).
# Запуск: python ad-audio.py out/events.json <число кадров> out/audio.wav
import json, os, sys, wave
import numpy as np

SR = 48000
FPS = int(os.environ.get('FPS', 30))
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4

events = json.load(open(sys.argv[1], encoding='utf-8'))
frames = int(sys.argv[2])
dur = frames / FPS + 0.6
n = int(SR * dur)
L = np.zeros(n)
R = np.zeros(n)
DRY_ONLY_L = np.zeros(n)   # бас без реверберации — иначе гудит
DRY_ONLY_R = np.zeros(n)
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# Am — F — G — Em: та же последовательность, что в первом ролике
PROG = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 59, 64]]
PENTA = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]   # ля минорная пентатоника


def chord_at(t):
    return PROG[int(t // BAR) % len(PROG)]


def add(sig, t0, pan=0.0, dry=False):
    i0 = int(t0 * SR)
    if i0 >= n:
        return
    sig = sig[: n - i0]
    gl, gr = np.sqrt(0.5 - pan / 2), np.sqrt(0.5 + pan / 2)
    if dry:
        DRY_ONLY_L[i0:i0 + len(sig)] += sig * gl
        DRY_ONLY_R[i0:i0 + len(sig)] += sig * gr
    else:
        L[i0:i0 + len(sig)] += sig * gl
        R[i0:i0 + len(sig)] += sig * gr


def tt_(d):
    return np.arange(int(d * SR)) / SR


def pluck(f, d=0.9, amp=0.1, bright=1.0, decay=5.5):
    t = tt_(d)
    env = (1 - np.exp(-t / 0.004)) * np.exp(-t * decay)
    y = np.sin(2 * np.pi * f * t) + 0.32 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t * 9) \
        + 0.08 * bright * np.sin(6 * np.pi * f * t) * np.exp(-t * 15)
    return amp * env * y


def bell(f, d=1.8, amp=0.08):
    t = tt_(d)
    env = 1 - np.exp(-t / 0.002)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.6) \
        + 0.42 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5.5) \
        + 0.18 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 10)
    return amp * env * y


def tick(f, amp=0.03):
    t = tt_(0.07)
    return amp * np.exp(-t * 85) * np.sin(2 * np.pi * f * t)


def click(amp=0.035):
    t = tt_(0.012)
    return amp * np.exp(-t * 600) * rng.standard_normal(len(t))


def swish(d=0.55, amp=0.03, up=True):
    t = tt_(d)
    noise = rng.standard_normal(len(t))
    # грубый фильтр: сглаживание окном, ширина которого плывёт — шум «поднимается» или «опускается»
    k = np.linspace(0.0, 1.0, len(t))
    soft = np.convolve(noise, np.ones(24) / 24, mode='same')
    y = (soft * (1 - k) + noise * 0.25 * k) if up else (noise * 0.25 * (1 - k) + soft * k)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return amp * env * y


def bass(f, d=1.1, amp=0.1):
    t = tt_(d)
    env = (1 - np.exp(-t / 0.012)) * np.exp(-t * 3.2)
    return amp * env * (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t))


# ── сцены: с какого момента какой слой играет ──
scene_t = {}
for e in events:
    if e.get('name') == 'scene':
        scene_t.setdefault(e['scene'], e['f'] / FPS)
ORDER = ['hook', 'gen', 'check', 'result', 'tpl', 'batch', 'ask', 'fan', 'logo']
LEVEL = {'hook': 0, 'gen': 1, 'check': 2, 'result': 3, 'tpl': 3, 'batch': 3, 'ask': 3, 'fan': 3, 'logo': 0}


def level(t):
    lv = 0
    for name in ORDER:
        if name in scene_t and t >= scene_t[name]:
            lv = LEVEL[name]
    return lv


t_logo = scene_t.get('logo', dur - 4)

# ── подложка: аккорд на такт, медленные огибающие, лёгкая расстройка ──
bars = int(dur // BAR) + 1
for b in range(bars):
    s0 = b * BAR
    s1 = min(dur, s0 + BAR + 1.2)
    ch = PROG[b % len(PROG)]
    t = tt_(s1 - s0)
    env = np.minimum(1, t / 0.9) * np.minimum(1, np.maximum(0, (s1 - s0 - t) / 1.2))
    bright = 1.0 if level(s0) >= 2 else 0.6
    for k, m in enumerate(ch):
        f = hz(m)
        y = np.sin(2 * np.pi * f * t + k) + 0.5 * np.sin(2 * np.pi * f * 1.004 * t) \
            + 0.12 * bright * np.sin(4 * np.pi * f * t)
        add(0.03 * env * y, s0, pan=(-0.35 if k % 2 else 0.35))

# ── бас, остинато, искры — по сетке ──
eighth = BEAT / 2
steps = int(dur / eighth)
OST = [0, 2, 1, 3, 2, 1, 3, 2]
for s in range(steps):
    t0 = s * eighth
    if t0 > t_logo + 0.2:
        break
    lv = level(t0)
    ch = chord_at(t0)
    in_bar = s % 8
    if lv >= 1 and in_bar in (0, 4):
        add(bass(hz(ch[0] - 12), amp=0.11 if in_bar == 0 else 0.075), t0, dry=True)
    if lv >= 2:
        m = ch[OST[in_bar]] + 12
        add(pluck(hz(m), d=0.5, amp=0.032 if lv == 2 else 0.04, bright=0.7, decay=8), t0, pan=0.25 * np.sin(s * 0.9))
    if lv >= 3 and in_bar == 5:
        add(bell(hz(ch[2] + 24), d=1.2, amp=0.022), t0, pan=-0.4)

# ── события ролика ──
tap_i = 0
for e in events:
    if e.get('type') != 'sfx':
        continue
    t0 = e['f'] / FPS
    name = e['name']
    ch = chord_at(t0)
    pan = float(rng.uniform(-0.3, 0.3))
    if name == 'tap':
        m = ch[tap_i % 4] + 12 + (12 if tap_i % 8 >= 4 else 0)
        tap_i += 1
        add(pluck(hz(m), d=0.9, amp=0.15), t0, pan)
        add(click(), t0, pan)
    elif name == 'key':
        m = int(rng.choice(ch)) + 24 + int(rng.choice([0, 12]))
        add(tick(hz(m), amp=0.022), t0, pan * 1.5)
    elif name == 'pop':
        m = PENTA[int(e.get('i', 0)) % len(PENTA)] + 12
        add(bell(hz(m), d=1.4, amp=0.07), t0, pan)
    elif name == 'done':
        add(bell(hz(ch[0] + 24), amp=0.07), t0, -0.2)
        add(bell(hz(ch[2] + 24), amp=0.06), t0 + 0.09, 0.2)
    elif name == 'enter':
        add(pluck(hz(ch[0]), d=1.4, amp=0.1, decay=3.2), t0)
        add(swish(0.6, 0.028, up=True), t0 - 0.15)
    elif name == 'exit':
        add(swish(0.55, 0.022, up=False), t0)
    elif name == 'head':
        add(bell(hz(ch[3] + 12), d=1.2, amp=0.03), t0, 0.3)
    elif name == 'logo':
        for k, m in enumerate(ch):
            add(bell(hz(m + 12), d=2.6, amp=0.05), t0 + k * 0.08, -0.3 + 0.2 * k)
        if e.get('end'):
            add(bass(hz(57 - 12), d=3.0, amp=0.12), t0, dry=True)
            add(bell(hz(81 + 12), d=3.2, amp=0.05), t0 + 0.4)

# ── реверберация: хвост из затухающего шума, пред-задержка 22 мс; у каналов
#    разный шум — так хвост звучит шире ──
def make_ir():
    ir_t = tt_(2.4)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.62)
    ir = np.convolve(ir, np.ones(18) / 18, mode='same')
    ir[: int(0.022 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2))


ir_l, ir_r = make_ir(), make_ir()


def conv(x, h):
    m = len(x) + len(h) - 1
    size = 1 << (m - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[:len(x)]
    return y


WET = 0.3
outL = L + WET * conv(L, ir_l) + DRY_ONLY_L
outR = R + WET * conv(R, ir_r) + DRY_ONLY_R

t = np.arange(n) / SR
fade = np.minimum(1, np.minimum(t / 0.3, np.maximum(0, (dur - t) / 1.4)))
st = np.stack([outL * fade, outR * fade], axis=1)
peak = np.max(np.abs(st)) or 1
st = np.tanh(st / peak * 1.25)
# Громкость — по среднему, а не по пику: −18,5 dBFS RMS даёт около −16 LUFS. Первый ролик,
# который владелец взял за образец, звучал тихо и ровно (−19 LUFS); громче не делаем.
rms = np.sqrt(np.mean(st ** 2)) or 1
st *= 10 ** (-18.5 / 20) / rms
st *= min(1.0, 10 ** (-1.5 / 20) / (np.max(np.abs(st)) or 1))
pcm = (st * 32767).astype(np.int16)
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok', round(dur, 2), 'с, событий', len(events), 'сцены', {k: round(v, 2) for k, v in scene_t.items()})
