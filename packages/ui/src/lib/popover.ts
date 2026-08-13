/**
 * Раскладка выпадающих панелей поля — список типовых значений и календарь.
 *
 * Обе панели шире своего поля (288 и 272 против ~175 в двухколоночной сетке)
 * и прижаты к правому краю кнопки. Поэтому место под них считается не по окну,
 * а по прокручиваемой области экрана: содержимое инструмента живёт внутри
 * `.screen-scroll`, у которого `overflow: hidden` на родителе, и панель,
 * «поместившаяся» по окну, всё равно обрезалась кромкой экрана — сверху,
 * когда откидывалась вверх, и слева, когда поле стояло в правой колонке.
 */

/** Ближайший предок, который прокручивается: экран инструмента, а не окно. */
export function scrollBox(from: HTMLElement | null): HTMLElement | null {
  for (let node = from?.parentElement ?? null; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return node
  }
  return null
}

export interface Placement {
  /** Откинуть вверх — снизу не помещается. */
  up: boolean
  /** Сколько места есть по высоте в выбранную сторону. */
  room: number
  /** На сколько подвинуть панель вправо, чтобы она не ушла за левую кромку. */
  shiftX: number
}

/** Отступ панели от кромки области — чтобы она не липла к самому краю. */
const EDGE = 8

/**
 * Куда откинуть панель от кнопки.
 *
 * @param anchor кнопка, к которой панель привязана
 * @param width  ширина панели (дублирует CSS: панель шире поля и уезжает влево)
 * @param height желаемая высота — по ней решается сторона
 * @param gap    зазор между кнопкой и панелью (дублирует `top`/`bottom` в CSS)
 */
export function place(anchor: HTMLElement, width: number, height: number, gap: number): Placement {
  const rect = anchor.getBoundingClientRect()
  const edge = scrollBox(anchor)?.getBoundingClientRect()

  const top = edge ? edge.top : 0
  const bottom = edge ? edge.bottom : window.innerHeight
  const left = edge ? edge.left : 0

  const below = bottom - rect.bottom - gap - EDGE
  const above = rect.top - top - gap - EDGE
  const up = below < height && above > below

  /* Панель прижата правым краем к кнопке и вылезает на 12px наружу — так же,
     как задано в CSS правилом `right: -12px`. */
  const panelLeft = rect.right + 12 - width
  const outLeft = left + EDGE - panelLeft

  return { up, room: Math.max(up ? above : below, 0), shiftX: outLeft > 0 ? Math.round(outLeft) : 0 }
}
