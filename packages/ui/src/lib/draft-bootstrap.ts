import { UTM_KEYS } from '@utmka/core'

/**
 * Заготовка генератора из адресной строки — и почему её оттуда надо убрать
 * до первой отрисовки.
 *
 * Кнопки «в генератор» (история, шаблоны, детали ссылки) и приём «кинуть
 * коллеге готовую ссылку» кладут в адрес РЕАЛЬНЫЙ адрес кампании
 * пользователя: `/?url=site.ru/promo&source=vk`. Счётчик Метрики читает
 * `location.href` сам, помимо наших вызовов, и отправляет его как `page-url` —
 * то есть чужой адрес уезжает на сторону при обычной работе с инструментом.
 * Это ровно те данные, ради которых у нас выключен вебвизор.
 *
 * Поэтому параметры снимаются синхронным скриптом в `<head>`: он выполняется
 * до гидрации и заведомо раньше, чем внешний `tag.js` успеет что-либо
 * отправить. Делать это эффектом компонента нельзя — генератор живёт за
 * границей Suspense, его эффект может отработать позже загрузки счётчика
 * (особенно когда `tag.js` уже в кеше браузера), и получилась бы гонка
 * вместо гарантии.
 *
 * Снятые значения кладутся в `window.__utmkaDraft` — оттуда их и читает
 * генератор при монтировании.
 */

const PRIVATE_KEYS: readonly string[] = ['url', ...UTM_KEYS]

/** Значения заготовки, снятые бутстрапом. */
export type BootstrapDraft = Partial<Record<string, string>>

declare global {
  interface Window {
    __utmkaDraft?: BootstrapDraft
  }
}

export const DRAFT_BOOTSTRAP = `(function(){try{
var k=${JSON.stringify(PRIVATE_KEYS)},u=new URL(location.href),d={},dirty=false;
for(var i=0;i<k.length;i++){var v=u.searchParams.get(k[i]);if(v!==null){d[k[i]]=v;u.searchParams.delete(k[i]);dirty=true}}
if(dirty){window.__utmkaDraft=d;history.replaceState(null,'',u.pathname+u.search+u.hash)}
}catch(e){}})()`

/** Прочитать снятую заготовку. Пусто — значит в адресе ничего не было. */
export function readBootstrapDraft(): BootstrapDraft | null {
  if (typeof window === 'undefined') return null
  const draft = window.__utmkaDraft
  return draft && Object.keys(draft).length > 0 ? draft : null
}
