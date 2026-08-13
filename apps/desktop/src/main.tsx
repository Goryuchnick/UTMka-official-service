import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { catchExternalLinks } from './lib/external-links'

/* Стили — тот же файл, что у веба: 2460 строк «ПРОНИН-ОС» переехали в общий
   пакет нулём правок, и это главный признак, что дизайн-система не разъехалась. */
import '@utmka/ui/styles.css'

/* Ссылки наружу открывает система, а не вебвью: иначе нажатие по «Поблагодарить»
   или ссылке в помощи не делает вообще ничего. */
catchExternalLinks()

const root = document.getElementById('root')
if (!root) throw new Error('Не найден корневой узел — index.html поехал')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
