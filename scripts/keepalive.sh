#!/bin/sh
# UTMka keep-alive: не даём Supabase усыпить базу и сообщаем, если она всё же легла.
#
# Зачем. На Free-тарифе Supabase паузит проект, у которого «недостаточно
# пользовательских запросов к базе за последнюю неделю» — по их же документации
# хватает нескольких запросов в день. У UTMka база простаивает легко: генератор,
# пакет, разбор и QR целиком работают в браузере, в базу ходят только вход,
# шаблоны, история и справочник. Трафик на сайте есть, запросов к базе нет —
# и 2026-08-28 проект оказался на паузе: у людей молча не работали вход и
# сохранение, а `/api/session` при этом рапортовал `storage: true`, потому что
# проверяет наличие переменных окружения, а не живость базы.
#
# ⚠️ Почему ЧИТАЕМ, а не пишем тестовую запись. Активностью считается любой
# запрос к базе, а не изменение данных. Запись пришлось бы заводить в боевые
# таблицы, где лежат данные живых людей, а потом убирать за собой — и первый же
# сбой посреди уборки оставил бы мусор в проде (плюс `links` ссылается на
# `users` внешним ключом, то есть фиктивной строкой не обошлось бы). Чтение
# даёт ровно тот же эффект и ничего не меняет.
#
# ⚠️ Разбудить уснувшую базу этот скрипт НЕ может: паузу снимает только
# восстановление проекта (дашборд Supabase или Management API). Поэтому вторая
# его задача — вовремя сказать, что она легла.
#
# Ставится на бокс sites-mine как `/usr/local/sbin/utmka-keepalive.sh`, крон —
# три раза в сутки (см. docs/ANALYTICS.md).

set -eu

ENV_FILE="${UTMKA_ENV_FILE:-/opt/stack/env/utmka.env}"
LOG="${UTMKA_KEEPALIVE_LOG:-/var/log/utmka-keepalive.log}"
# Канал алерта — бот владельца, который и так живёт на этом боксе. Файла нет
# (бот переехал, переименовали) — молчим в лог, но работать не перестаём:
# сторож не должен падать из-за отсутствия способа пожаловаться.
TRACKER_ENV="${UTMKA_TRACKER_ENV:-/opt/tracker/.env}"
ATTEMPTS=3
LOG_KEEP=500

say() {
  echo "$(date -u '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

# Значение из .env без запуска самого файла: там лежат секреты, и `. env` в этом
# скрипте затащил бы в окружение всё подряд, включая ключи чужих сервисов.
value_of() {
  sed -n "s/^$1=//p" "$2" 2>/dev/null | head -n 1 | tr -d '"'"'"'\r'
}

alert() {
  message="$1"
  [ -f "$TRACKER_ENV" ] || { say "алерт некуда слать: нет $TRACKER_ENV"; return 0; }

  token=$(value_of BOT_TOKEN "$TRACKER_ENV")
  chat=$(value_of ALLOWED_CHAT_IDS "$TRACKER_ENV" | cut -d, -f1)
  proxy=$(value_of TELEGRAM_PROXY_URL "$TRACKER_ENV")
  [ -n "$token" ] && [ -n "$chat" ] || { say "алерт некуда слать: нет BOT_TOKEN/ALLOWED_CHAT_IDS"; return 0; }

  # ⚠️ Прямой api.telegram.org с этого бокса режет ТСПУ — отсюда прокси.
  # Без него алерт про упавшую базу сам молча не доехал бы (см. INFRA.md).
  if [ -n "$proxy" ]; then
    set -- --proxy "$proxy"
  else
    set --
  fi

  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@" \
    -X POST "https://api.telegram.org/bot$token/sendMessage" \
    --data-urlencode "chat_id=$chat" \
    --data-urlencode "text=$message" ) || code="000"
  say "алерт отправлен, ответ Telegram: $code"
}

# Проверка канала связи. Нужна отдельным режимом, потому что убедиться «алерт
# дойдёт» иначе можно только уронив базу: сменили токен бота или чат — сторож
# останется немым, и узнается это в самый неподходящий момент.
if [ "${1:-}" = "--test-alert" ]; then
  alert "UTMka: проверка сторожа базы. Это тест, ничего не сломалось."
  exit 0
fi

[ -f "$ENV_FILE" ] || { say "НЕТ $ENV_FILE — проверить нечем"; exit 1; }

URL=$(value_of SUPABASE_URL "$ENV_FILE")
KEY=$(value_of SUPABASE_SERVICE_ROLE_KEY "$ENV_FILE")
[ -n "$URL" ] && [ -n "$KEY" ] || { say "в $ENV_FILE нет SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY"; exit 1; }

attempt=1
code=000
while [ "$attempt" -le "$ATTEMPTS" ]; do
  # `|| code=…` снаружи подстановки, а не `|| echo` внутри: curl при обрыве
  # связи и сам печатает `000`, и возвращает ненулевой статус — приписанное
  # эхо давало в логе «HTTP 000000».
  # Самый дешёвый осмысленный запрос: одна строка одной колонки. Данные не
  # выгружаем и в лог не пишем — нам нужен факт ответа, а не содержимое.
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Accept-Profile: utmka" \
    "$URL/rest/v1/users?select=hash&limit=1" ) || code="000"
  [ "$code" = "200" ] && break
  attempt=$((attempt + 1))
  [ "$attempt" -le "$ATTEMPTS" ] && sleep 20
done

# Лог не растёт бесконечно: строка на запуск, но за годы набежит.
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt $((LOG_KEEP * 2)) ]; then
  tail -n "$LOG_KEEP" "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

if [ "$code" = "200" ]; then
  say "ok"
  exit 0
fi

say "БАЗА НЕ ОТВЕЧАЕТ: HTTP $code (попыток: $ATTEMPTS)"

# 540 — фирменный код Supabase «project paused». Отдельный текст, потому что
# лечение у него своё: не «подождать», а восстановить проект руками.
case "$code" in
  540) reason="проект на паузе — восстановить в дашборде Supabase (Resume project)" ;;
  000) reason="сеть не ответила: бокс, DNS или блокировка" ;;
  401|403) reason="ключ не принят — проверить SUPABASE_SERVICE_ROLE_KEY в utmka.env" ;;
  *) reason="ответ HTTP $code" ;;
esac

alert "UTMka: база не отвечает ($reason).
У людей сейчас не работают вход по фразе, шаблоны, история и справочник.
Генератор, пакет, разбор и QR живы — они целиком в браузере."
exit 1
