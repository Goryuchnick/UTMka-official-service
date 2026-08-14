-- UTMka 3.0 — начальная схема.
--
-- Проект Supabase общий с курсом (решение ARCHITECTURE §5.2), поэтому всё
-- живёт в отдельной схеме `utmka`, а не в `public`. Схема добавляется в
-- PostgREST → Exposed schemas, клиент создаётся с { db: { schema: 'utmka' } }.
--
-- Нумерация своя (`utmka_0001`), чтобы не пересекаться с миграциями курса.
-- Все запросы идут только с сервера под service-role: RLS включён,
-- политик для anon и authenticated нет вовсе.

create schema if not exists utmka;

-- Владелец кодовой фразы. Никаких ПД: только HMAC фразы под своим секретом.
create table if not exists utmka.users (
  hash         text primary key,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  settings     jsonb       not null default '{}'::jsonb,
  is_blocked   boolean     not null default false
);

-- Шаблоны: имя, тег с цветом из палитры — паритет с 2.2.
create table if not exists utmka.templates (
  id         uuid primary key default gen_random_uuid(),
  user_hash  text not null references utmka.users(hash) on delete cascade,
  name       text not null,
  base_url   text not null default '',
  params     jsonb not null default '{}'::jsonb,
  tag_name   text,
  tag_color  text,
  preset_id  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Имя уникально в пределах пользователя без учёта регистра.
create unique index if not exists templates_user_name_uniq
  on utmka.templates (user_hash, lower(name));

create index if not exists templates_user_idx
  on utmka.templates (user_hash, updated_at desc);

-- Справочник значений: ядро продукта, отсюда автодополнение и сведение
-- расщеплений (`yandex` / `Yandex` / `яндекс` — одно и то же).
create table if not exists utmka.dict_values (
  id            uuid primary key default gen_random_uuid(),
  user_hash     text not null references utmka.users(hash) on delete cascade,
  kind          text not null check (kind in ('source','medium','campaign','content','term')),
  value         text not null,
  uses          int  not null default 1,
  canonical     text,
  first_seen_at timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  unique (user_hash, kind, value)
);

create index if not exists dict_user_kind_idx
  on utmka.dict_values (user_hash, kind, uses desc);

-- История собранных ссылок. Потолок 500 на пользователя — чисткой при вставке.
create table if not exists utmka.links (
  id         uuid primary key default gen_random_uuid(),
  user_hash  text not null references utmka.users(hash) on delete cascade,
  url        text not null,
  base_url   text not null default '',
  params     jsonb not null default '{}'::jsonb,
  short_url  text,
  tag_name   text,
  tag_color  text,
  origin     text not null check (origin in ('single','batch','brief','parse')),
  batch_id   uuid,
  created_at timestamptz not null default now()
);

create index if not exists links_user_created_idx
  on utmka.links (user_hash, created_at desc);

-- Видимая квота LLM-помощника: считаем по дням, показываем остаток в баре.
create table if not exists utmka.llm_usage (
  user_hash text not null references utmka.users(hash) on delete cascade,
  day       date not null,
  used      int  not null default 0,
  primary key (user_hash, day)
);

-- Rate-limit для роутов без сессии (сокращатель, проверка редиректов).
-- Ключ — `scope:усечённый sha256(IP)`, сырых IP не храним.
create table if not exists utmka.rate_limits (
  key               text primary key,
  count             int  not null,
  window_started_at timestamptz not null
);

-- RLS: включаем везде, политик не создаём. Доступ только под service-role,
-- который RLS обходит; любой ключ уровня anon не увидит ничего.
alter table utmka.users       enable row level security;
alter table utmka.templates   enable row level security;
alter table utmka.dict_values enable row level security;
alter table utmka.links       enable row level security;
alter table utmka.llm_usage   enable row level security;
alter table utmka.rate_limits enable row level security;

-- PostgREST ходит ролями anon/authenticated. Схему им видно (usage), но без
-- гранта на таблицы и без RLS-политик они не прочитают ни строки.
grant usage on schema utmka to anon, authenticated, service_role;
grant all on all tables in schema utmka to service_role;
grant all on all sequences in schema utmka to service_role;

alter default privileges in schema utmka
  grant all on tables to service_role;
alter default privileges in schema utmka
  grant all on sequences to service_role;
