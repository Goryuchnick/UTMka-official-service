// Ролик целиком: кадры → звук → MP4. Веб должен уже работать на :3000 (README).
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const DIR = __dirname
const OUT = process.env.OUT || path.join(DIR, 'out')
const FPS = process.env.FPS || '30'
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, OUT, FPS } })

run(process.execPath, [path.join(DIR, 'record.js')])

const frames = path.join(OUT, 'frames')
const count = fs.readdirSync(frames).filter((f) => f.endsWith('.jpg')).length
const wav = path.join(OUT, 'audio.wav')
run(PY, [path.join(DIR, 'audio.py'), path.join(OUT, 'events.json'), String(count), wav])

const mp4 = path.join(OUT, 'utmka-promo.mp4')
run('ffmpeg', [
  '-loglevel', 'error', '-y',
  '-framerate', FPS, '-i', path.join(frames, '%05d.jpg'),
  '-i', wav,
  '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-shortest',
  mp4,
])
console.log('готово:', mp4)
