// Ролик целиком: кадры → звук → MP4. Веб должен уже работать на :3000 (README).
//
// Переменные: STAGE (сцена, stage.html), AUDIO (звук, audio.py), FMT (h | v),
// DPR (плотность записи), NAME (имя файла). Готовый файл не перезаписывается:
// если такой уже есть, рядом ляжет -v2, -v3…
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const DIR = __dirname
const OUT = process.env.OUT || path.join(DIR, 'out')
const FPS = process.env.FPS || '30'
const FMT = process.env.FMT === 'v' ? 'v' : 'h'
const AUDIO = process.env.AUDIO || 'audio.py'
const NAME = process.env.NAME || 'utmka-promo'
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
const [W, H] = FMT === 'v' ? [1080, 1920] : [1920, 1080]
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, OUT, FPS, FMT } })

/** Свободное имя: name.mp4, потом name-v2.mp4, name-v3.mp4… */
function fresh(name) {
  let file = path.join(OUT, `${name}.mp4`)
  for (let v = 2; fs.existsSync(file); v++) file = path.join(OUT, `${name}-v${v}.mp4`)
  return file
}

run(process.execPath, [path.join(DIR, 'record.js')])

const frames = path.join(OUT, 'frames')
const count = fs.readdirSync(frames).filter((f) => f.endsWith('.jpg')).length
const wav = path.join(OUT, 'audio.wav')
// -X utf8: на Windows вывод с кириллицей иначе роняет скрипт уже после записи звука.
run(PY, ['-X', 'utf8', path.join(DIR, AUDIO), path.join(OUT, 'events.json'), String(count), wav])

const mp4 = fresh(NAME)
run('ffmpeg', [
  '-loglevel', 'error', '-y',
  '-framerate', FPS, '-i', path.join(frames, '%05d.jpg'),
  '-i', wav,
  // Запись с DPR 2 сжимается обратно: текст на увеличенных фрагментах остаётся чётким.
  '-vf', `scale=${W}:${H}:flags=lanczos`,
  '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-shortest',
  mp4,
])
console.log('готово:', mp4)
