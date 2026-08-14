import type { Metadata } from 'next'
import Link from 'next/link'

import { ConsentSwitch } from '@/components/ConsentSwitch'

/**
 * Что мы собираем — страницей, а не тремя экранами юридического текста.
 *
 * Смысл документа в том, чтобы человек за минуту понял: инструмент работает
 * без регистрации, ссылки остаются у него, а наружу уходит только счётчик
 * визитов — и тот по согласию. Всё, что здесь написано, проверяемо кодом:
 * репозиторий открыт, а ключевые места помечены в нём комментариями.
 */

export const metadata: Metadata = {
  title: 'Что мы собираем — UTMka',
  description:
    'Инструмент работает без регистрации: ссылки и метки остаются у вас. Наружу уходит только счётчик визитов, и только с вашего согласия.',
  alternates: { canonical: '/privacy' },
}

const UPDATED = '14 августа 2026'

export default function PrivacyPage() {
  return (
    <div className="screen-scroll">
      <div className="glass">
        <div className="qhead">
          <span className="qchip qchip--teal">?</span>
          <span className="qtitle qtitle--teal">Что мы собираем</span>
        </div>
        <p className="hint">
          Коротко: <b>ничего, что позволяет вас опознать</b>. Ни почты, ни телефона, ни имени —
          их негде даже ввести. Обновлено {UPDATED}.
        </p>
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">1</span>
          <span className="qtitle qtitle--amber">Ссылки, которые вы собираете</span>
        </div>
        <p className="explain">
          Адреса, метки и результат сборки обрабатываются <b>в вашем браузере</b>. На сервер они
          уходят в двух случаях, и оба — по вашему нажатию: когда вы просите сократить ссылку
          (адрес уходит в сервис clck.ru Яндекса) и когда просите проверить переадресации
          (сервер обходит цепочку вместо вас, потому что браузер этого не умеет). Ни то, ни
          другое мы не храним.
        </p>
        <p className="explain">
          Если вы завели кодовую фразу, шаблоны и история сохраняются в базе, чтобы вернуться к
          ним с другого устройства. Там лежат только ваши ссылки и метки — ничего о вас.
        </p>
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">2</span>
          <span className="qtitle qtitle--amber">Кодовая фраза</span>
        </div>
        <p className="explain">
          Фраза — это не логин и не пароль от вас лично: она нужна, чтобы найти ваши же
          сохранённые данные. В базе хранится не сама фраза, а её <b>необратимый отпечаток</b>.
          Обратная сторона честная: восстановить фразу нельзя — ни вам, ни нам. Потеряли —
          заводите новую.
        </p>
        <p className="explain">
          Помощник, который разбирает бриф, отправляет введённый вами текст языковой модели
          (через сервис routerai). Отправляется только то, что вы сами написали в окне
          помощника, и только когда вы нажали кнопку.
        </p>
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">3</span>
          <span className="qtitle qtitle--amber">Счётчик посещаемости</span>
        </div>
        <p className="explain">
          Мы считаем визиты <b>Яндекс.Метрикой</b> (счётчик 111529339): сколько людей пришло,
          с каких сайтов и какими экранами пользуются. Метрика ставит свои cookie и получает
          обезличенные данные о посещении — адрес страницы, источник перехода, тип устройства,
          примерный регион.
        </p>
        <p className="explain">
          <b>Чего в счётчике нет.</b> Запись экрана (вебвизор) выключена — и в настройках
          счётчика, и в коде. Поля ввода помечены так, что их содержимое счётчику недоступно.
          Из адреса страницы вырезаются параметры вашей заготовки: в них лежит настоящий адрес
          вашей кампании, и он в статистику не попадает.
        </p>
        <p className="explain">
          <b>Счётчик не загружается, пока вы не согласились.</b> Отказ ничего не отключает в
          инструменте — всё работает одинаково. Решение можно поменять в любой момент:
        </p>
        <ConsentSwitch />
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">4</span>
          <span className="qtitle qtitle--amber">Приложение для компьютера</span>
        </div>
        <p className="explain">
          В приложении счётчика нет вовсе. Данные лежат файлом на вашем диске, вход не нужен.
          Наружу оно выходит только по вашему нажатию — сократить ссылку, проверить
          переадресации, синхронизировать данные с веб-аккаунтом — плюс проверяет обновления
          при запуске.
        </p>
      </div>

      <div className="glass">
        <div className="qhead">
          <span className="qchip">5</span>
          <span className="qtitle qtitle--amber">Проверить на слово не нужно</span>
        </div>
        <p className="explain">
          Инструмент с открытым кодом: всё написанное выше можно посмотреть в репозитории —{' '}
          <a
            href="https://github.com/Goryuchnick/UTMka-official-service"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/Goryuchnick/UTMka-official-service
          </a>
          . Вопросы и замечания — туда же, в issues, или автору:{' '}
          <a href="https://t.me/pronin_marketing" target="_blank" rel="noopener noreferrer">
            @pronin_marketing
          </a>
          .
        </p>
        <p className="hint">
          <Link href="/">← Вернуться к конструктору</Link>
        </p>
      </div>
    </div>
  )
}
