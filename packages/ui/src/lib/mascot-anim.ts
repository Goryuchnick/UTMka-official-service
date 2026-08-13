/**
 * Реестр анимаций маскота. Спрайты те же, что на сайте, — пиксельный Александр
 * (`public/sprites/mascot/*.png`), горизонтальные ленты 128×128 на кадр.
 *
 * Взяты только шесть состояний из десяти: инструменту не нужны «спит», «зевает»
 * и «устал» — это состояния долгого простоя на главной сайта, здесь человек
 * пришёл собрать ссылку и уйти.
 */

export type MascotState = 'idle' | 'blink' | 'talk' | 'nod' | 'think' | 'surprised'

export interface AnimDef {
  file: string
  frames: number
  fps: number
  loop: boolean
}

export const MASCOT_ANIM: Record<MascotState, AnimDef> = {
  idle: { file: '/sprites/mascot/idle.png', frames: 2, fps: 4, loop: true },
  blink: { file: '/sprites/mascot/blink.png', frames: 4, fps: 8, loop: false },
  talk: { file: '/sprites/mascot/talk.png', frames: 6, fps: 8, loop: true },
  nod: { file: '/sprites/mascot/nod.png', frames: 7, fps: 8, loop: false },
  think: { file: '/sprites/mascot/think.png', frames: 6, fps: 5, loop: false },
  surprised: { file: '/sprites/mascot/surprised.png', frames: 6, fps: 10, loop: false },
}

/** Длительность одного прохода, мс. */
export function animDurationMs(state: MascotState): number {
  const def = MASCOT_ANIM[state]
  return (def.frames / def.fps) * 1000
}
