# Звук ролика: мягкая подложка (аккорды на синусах), щелчки на клики, тихие тики на набор.
# events.json: [{"f": кадр, "type": "click"|"key"}], частота кадров — из FPS (по умолчанию 30).
# Запуск: python audio.py out/events.json <число кадров> out/audio.wav
import json, os, sys, wave
import numpy as np

SR = 48000
FPS = int(os.environ.get('FPS', 30))
events = json.load(open(sys.argv[1]))
frames = int(sys.argv[2])
dur = frames / FPS + 0.5
n = int(SR * dur)
t = np.arange(n) / SR
out = np.zeros(n)

def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)

# подложка: четыре аккорда, медленная огибающая, лёгкий хорус
chords = [[57, 64, 69, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]]
seg = dur / 4
for i, ch in enumerate(chords * 1):
    s0 = i * seg
    s1 = s0 + seg + 1.5
    m = (t >= s0) & (t < s1)
    tt = t[m] - s0
    env = np.minimum(1, tt / 1.2) * np.minimum(1, np.maximum(0, (s1 - s0 - tt) / 1.5))
    for k, mn in enumerate(ch):
        f = note(mn)
        out[m] += 0.05 * env * (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.003 * tt + k))
# лёгкий пульс восьмыми в середине
bpm = 96
beat = 60 / bpm / 2
for k in range(int(dur / beat)):
    s = k * beat
    if s < 3.0 or s > dur - 3.5:
        continue
    i0 = int(s * SR)
    L = int(0.18 * SR)
    tt = np.arange(L) / SR
    f = note([69, 76, 72, 79][k % 4]) * 2
    out[i0:i0 + L] += 0.018 * np.exp(-tt * 22) * np.sin(2 * np.pi * f * tt)

rng = np.random.default_rng(3)
for e in events:
    s = e['f'] / FPS
    i0 = int(s * SR)
    if e['type'] == 'click':
        L = int(0.07 * SR)
        tt = np.arange(L) / SR
        click = 0.22 * np.exp(-tt * 70) * np.sin(2 * np.pi * 1800 * tt) + 0.12 * np.exp(-tt * 120) * rng.standard_normal(L)
    else:
        L = int(0.03 * SR)
        tt = np.arange(L) / SR
        click = 0.05 * np.exp(-tt * 200) * rng.standard_normal(L) + 0.04 * np.exp(-tt * 150) * np.sin(2 * np.pi * 3200 * tt)
    out[i0:i0 + L] += click[: max(0, min(L, n - i0))]

# финальный «дзынь» на логотипе
end = dur - 3.2
for mn, a in ((81, .12), (88, .08), (93, .05)):
    m = t >= end
    tt = t[m] - end
    out[m] += a * np.exp(-tt * 2.2) * np.sin(2 * np.pi * note(mn) * tt)

fade = np.minimum(1, np.minimum(t / 0.4, np.maximum(0, (dur - t) / 0.8)))
out *= fade
out = np.tanh(out * 1.4) * 0.8
st = np.stack([out, out], axis=1)
pcm = (st * 32767).astype(np.int16)
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', dur)
