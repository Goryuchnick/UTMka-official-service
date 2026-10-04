'use client'

/**
 * TranslitToggle — галочка «Транслитерация» у полей меток. Сам перевод делает
 * тот, кто принимает значения (`setParam` генератора, `buildBatch` пакета):
 * галочка только помнит выбор.
 *
 * `onEnable` — для уже набранного: включили галочку на «осенний набор» —
 * значение переводится сразу, а не со следующей буквы.
 */

import { useTranslit } from '../../lib/translit'

interface TranslitToggleProps {
  onEnable?: () => void
}

export function TranslitToggle({ onEnable }: TranslitToggleProps) {
  const { translit, setTranslit } = useTranslit()

  return (
    <label className="checkline">
      <input
        type="checkbox"
        checked={translit}
        onChange={(event) => {
          setTranslit(event.target.checked)
          if (event.target.checked) onEnable?.()
        }}
      />
      <span>Транслитерация — кириллицу сразу в латиницу</span>
    </label>
  )
}
