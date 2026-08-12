-- UTMka 0002 — атомарные счётчики вместо «прочитал, подумал, записал».
--
-- Зачем: и ограничение частоты, и дневная квота помощника считались в два
-- запроса — SELECT, потом UPDATE. Между ними успевает вклиниться десяток
-- параллельных запросов: все читают одно и то же значение, все проходят
-- проверку, все пишут одинаковый результат. Потолок в 5 регистраций в час
-- обходился пачкой одновременных запросов, а дневная квота платной модели
-- расходовалась в разы больше, чем показывал счётчик.
--
-- `INSERT ... ON CONFLICT DO UPDATE` берёт блокировку строки, поэтому
-- параллельные вызовы выстраиваются в очередь и считают честно.

-- ── Ограничение частоты ──────────────────────────────────────────────────────
-- Возвращает true, если запрос разрешён. Окно скользит грубо: одна строка
-- на ключ, счётчик и время начала окна — точность не нужна, нужен потолок.
create or replace function utmka.bump_rate_limit(
  p_key       text,
  p_window_ms integer,
  p_max       integer
)
returns boolean
language plpgsql
as $$
declare
  v_now   timestamptz := clock_timestamp();
  v_cut   timestamptz := clock_timestamp() - make_interval(secs => p_window_ms / 1000.0);
  v_count integer;
begin
  insert into utmka.rate_limits as r (key, count, window_started_at)
  values (p_key, 1, v_now)
  on conflict (key) do update
     set count             = case when r.window_started_at > v_cut then r.count + 1 else 1 end,
         window_started_at = case when r.window_started_at > v_cut then r.window_started_at else v_now end
  returning r.count into v_count;

  return v_count <= p_max;
end;
$$;

-- ── Дневная квота помощника ──────────────────────────────────────────────────
-- Списывает единицу ДО вызова модели и возвращает новое значение счётчика.
-- Возвращает -1, если квота уже выбрана: тогда роут не идёт в модель вовсе.
--
-- Резерв именно до вызова — принципиально: раньше списание шло после ответа
-- модели, а это секунды, за которые проходила целая пачка параллельных
-- запросов с одним и тем же «остатком».
create or replace function utmka.spend_llm_quota(
  p_hash  text,
  p_day   date,
  p_limit integer
)
returns integer
language plpgsql
as $$
declare
  v_used integer;
begin
  insert into utmka.llm_usage as u (user_hash, day, used)
  values (p_hash, p_day, 1)
  on conflict (user_hash, day) do update
     set used = u.used + 1
   where u.used < p_limit
  returning u.used into v_used;

  -- Строка есть, но условие потолка не пропустило обновление.
  if v_used is null then
    return -1;
  end if;

  return v_used;
end;
$$;

-- Возврат резерва: модель не ответила — платить не за что.
create or replace function utmka.refund_llm_quota(p_hash text, p_day date)
returns void
language plpgsql
as $$
begin
  update utmka.llm_usage
     set used = greatest(0, used - 1)
   where user_hash = p_hash and day = p_day;
end;
$$;

-- Права: ходим только под service-role, публичным ролям функции не нужны.
revoke execute on function utmka.bump_rate_limit(text, integer, integer) from public;
revoke execute on function utmka.spend_llm_quota(text, date, integer)    from public;
revoke execute on function utmka.refund_llm_quota(text, date)            from public;

grant execute on function utmka.bump_rate_limit(text, integer, integer) to service_role;
grant execute on function utmka.spend_llm_quota(text, date, integer)    to service_role;
grant execute on function utmka.refund_llm_quota(text, date)            to service_role;
