#!/usr/bin/env bash
# Выкатка веба UTMka на sites-mine по правилу сборки из INFRA.md: образ
# собирается на ПК, на бокс приезжает готовым, там — только запуск.
#
#   bash scripts/deploy-web.sh build      # образ stack-utmka:<коммит> из чистого git archive
#   bash scripts/deploy-web.sh ship       # пометить прежний :prev, привезти, перезапустить utmka, проверить
#   bash scripts/deploy-web.sh rollback   # вернуть :prev
#
# Коммит по умолчанию — HEAD, другой задаётся так: REV=42f805d bash scripts/deploy-web.sh ship.
# Образ и контекст сборки на боксе всегда из одного коммита.
#
# Собирается только закоммиченное: рабочая копия с чужими заготовками в образ не едет.
# Прежний образ помечается :prev ДО загрузки нового — Docker 29 (containerd)
# удаляет образ без метки вместе с последним контейнером, и откатиться было бы не к чему.
set -euo pipefail

BOX=sites-mine
IMAGE=stack-utmka
REPO="$(cd "$(dirname "$0")/.." && pwd)"
REV="$(git -C "$REPO" rev-parse --short "${REV:-HEAD}")"
TMP="${TMPDIR:-/tmp}/utmka-deploy-$REV"

remote() { ssh -o ConnectTimeout=15 "$BOX" "$@"; }

health() {
  # Ждём healthy до 90 с, потом смотрим на живой ответ снаружи контейнера.
  for _ in $(seq 1 30); do
    state="$(remote "docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' utmka" 2>/dev/null || true)"
    [ "$state" = healthy ] && break
    sleep 3
  done
  echo "состояние контейнера: $state"
  code="$(remote "curl -s -o /dev/null -w '%{http_code}' --resolve utmka.alex-pronin.ru:443:127.0.0.1 https://utmka.alex-pronin.ru/")"
  echo "https://utmka.alex-pronin.ru/ → $code"
  [ "$state" = healthy ] && [ "$code" = 200 ]
}

case "${1:-}" in
  build)
    rm -rf "$TMP" && mkdir -p "$TMP"
    git -C "$REPO" -c core.autocrlf=false archive "$REV" | tar -x -C "$TMP"
    # --load: на ПК сборщик по умолчанию — docker-container, без флага образ
    # остаётся только в кэше сборки и до `docker save` не доходит.
    docker build --load -t "$IMAGE:$REV" \
      --build-arg NEXT_PUBLIC_SITE_URL=https://utmka.alex-pronin.ru \
      --build-arg NEXT_PUBLIC_YM_ID=111529339 \
      "$TMP"
    echo "собран $IMAGE:$REV"
    ;;

  ship)
    docker image inspect "$IMAGE:$REV" >/dev/null 2>&1 || { echo "нет образа $IMAGE:$REV — сначала build"; exit 1; }

    echo "1/5 метка прежнего образа: $IMAGE:prev"
    remote "docker tag $IMAGE:latest $IMAGE:prev"

    echo "2/5 образ $IMAGE:$REV на бокс"
    docker save "$IMAGE:$REV" | gzip | remote "gunzip | docker load"
    remote "docker tag $IMAGE:$REV $IMAGE:latest"

    echo "3/5 контекст сборки на боксе — тот же коммит (иначе сборка на боксе откатила бы выкатку)"
    git -C "$REPO" -c core.autocrlf=false archive "$REV" | gzip | remote \
      "rm -rf /opt/stack/sites/utmka.new && mkdir -p /opt/stack/sites/utmka.new \
       && gunzip | tar -x -C /opt/stack/sites/utmka.new \
       && rm -rf /opt/stack/sites/utmka.prev \
       && mv /opt/stack/sites/utmka /opt/stack/sites/utmka.prev \
       && mv /opt/stack/sites/utmka.new /opt/stack/sites/utmka"

    echo "4/5 перезапуск только utmka, без сборки"
    remote "cd /opt/stack && docker compose up -d --no-deps --no-build utmka"

    echo "5/5 проверка"
    if health; then
      echo "выкачено: $REV"
    else
      echo "проверка не прошла — откатываю на :prev"
      remote "docker tag $IMAGE:prev $IMAGE:latest && cd /opt/stack && docker compose up -d --no-deps --no-build utmka"
      health || true
      exit 1
    fi
    ;;

  rollback)
    remote "docker tag $IMAGE:prev $IMAGE:latest && cd /opt/stack && docker compose up -d --no-deps --no-build utmka"
    remote "rm -rf /opt/stack/sites/utmka.failed && mv /opt/stack/sites/utmka /opt/stack/sites/utmka.failed && mv /opt/stack/sites/utmka.prev /opt/stack/sites/utmka" || true
    health
    ;;

  *)
    sed -n '2,8p' "$0"
    exit 1
    ;;
esac
