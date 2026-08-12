/**
 * Фоновые задачи процесса. Вызывается один раз при старте сервера.
 *
 * Сейчас здесь только прогрев модели помощника: routerai выгружает её при
 * простое, и первый запрос после тишины занимает 30–50 с против 4–6 с у тёплой.
 * Помощником пользуются редко и по одному разу — то есть почти каждый запрос
 * был бы «холодным», и человек ждал бы почти минуту, глядя на «думаю».
 *
 * Цена прогрева — единицы рублей в год (несколько токенов раз в 3 минуты
 * по ценам routerai). Приём и интервал взяты из Гермеса, где замер и делался
 * (`hermes/app/main.py::_keepalive` в pronin-alex).
 */

const KEEPALIVE_INTERVAL_MS = 3 * 60 * 1000

/** Флаг на процессе: в dev `register` переживает перезапуски и зовётся снова. */
const STARTED = Symbol.for('utmka.keepalive.started')

export async function register(): Promise<void> {
  // Только основной серверный процесс: в edge-рантайме нет ни таймеров
  // на всё время жизни, ни ключа от routerai.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Без этого каждый перезапуск в dev вешал бы ещё один таймер поверх старого —
  // и модель пинговалась бы пачками вместо одного раза в три минуты.
  const scope = globalThis as unknown as Record<symbol, boolean>
  if (scope[STARTED]) return
  scope[STARTED] = true

  const { llmConfigured, pingModel } = await import('./lib/routerai')
  if (!llmConfigured()) return

  /* `register` обязан завершиться до того, как сервер начнёт принимать
     запросы, поэтому первый пинг не ждём — уходим в таймер сразу.

     Логируем скупо: первый успех и каждую неудачу. Молчаливый прогрев нечем
     проверить — а проверять придётся: если помощник снова начнёт «думать»
     полминуты, первый вопрос будет именно «жив ли keep-alive». */
  let announced = false
  const tick = () => {
    void pingModel().then((ok) => {
      if (ok && !announced) {
        announced = true
        console.log('keep-alive: модель прогревается раз в 3 минуты')
      } else if (!ok) {
        announced = false
        console.warn('keep-alive: пинг модели не прошёл (не критично)')
      }
    })
  }

  tick()
  const timer = setInterval(tick, KEEPALIVE_INTERVAL_MS)
  // Прогрев не должен удерживать процесс живым при остановке контейнера.
  timer.unref?.()
}
