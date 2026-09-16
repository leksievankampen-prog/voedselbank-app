-- ============================================================================
--  Voedselbank Haarlemmermeer — basisschema
--  Uitgangspunt (AVG): iedere tabel staat op slot met Row Level Security.
--  Een klant ziet uitsluitend zijn eigen rij; een vrijwilliger ziet van
--  klanten alleen wat nodig is om een pakket klaar te zetten en uit te geven.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ types --

create type public.app_role as enum ('client', 'volunteer', 'warehouse', 'admin');
create type public.client_status as enum ('pending', 'active', 'paused', 'expired', 'rejected');
create type public.package_type as enum ('A', 'B', 'C', 'D', 'E');

-- Huishoudgrootte naar pakkettype. Staat ook in src/lib/packages.ts —
-- pas beide tegelijk aan als de indeling wijzigt.
create or replace function public.package_type_for(household_size int)
returns public.package_type
language sql
immutable
as $$
  select case
    when household_size <= 1 then 'A'
    when household_size = 2 then 'B'
    when household_size <= 4 then 'C'
    when household_size <= 6 then 'D'
    else 'E'
  end::public.package_type;
$$;

-- -------------------------------------------------------------- locaties --

create table public.locations (
  id          text primary key,
  slug        text not null unique,
  name        text not null,
  venue       text not null,
  street      text not null,
  postcode    text not null,
  city        text not null,
  weekday     smallint not null check (weekday between 0 and 6), -- 0 = zondag
  opens_at    time not null,
  closes_at   time not null,
  phone       text not null,
  latitude    double precision,
  longitude   double precision,
  active      boolean not null default true,
  sort_order  integer not null default 0
);

-- -------------------------------------------------------------- profielen --

-- Pasnummer in Crockford-base32 zonder I, L, O en U: aan de balie voor te
-- lezen zonder verwarring tussen 0/O en 1/I.
create or replace function public.gen_pass_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  attempt int := 0;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := substr(candidate, 1, 4) || '-' || substr(candidate, 5, 4);

    exit when not exists (select 1 from public.profiles where pass_code = candidate);

    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'Kon geen vrij pasnummer genereren';
    end if;
  end loop;
  return candidate;
end;
$$;

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.app_role not null default 'client',
  status          public.client_status not null default 'pending',
  pass_code       text not null unique,
  client_number   text,                       -- nummer uit de bestaande administratie
  first_name      text not null default '',
  last_name       text not null default '',
  street          text,
  house_number    text,
  postcode        text,
  city            text,
  phone           text,
  adults          integer not null default 1 check (adults >= 0 and adults <= 20),
  children        integer not null default 0 check (children >= 0 and children <= 20),
  household_size  integer generated always as (adults + children) stored,
  package_type    public.package_type generated always as
                    (public.package_type_for(adults + children)) stored,
  location_id     text references public.locations (id) on delete set null,
  diet_flags      text[] not null default '{}',
  allergies_text  text,
  notes           text,
  language        text not null default 'nl' check (language in ('nl', 'en', 'ar')),
  valid_until     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint household_not_empty check (adults + children >= 1)
);

create index profiles_location_idx on public.profiles (location_id) where status = 'active';
create index profiles_status_idx on public.profiles (status);

-- Rol en status zijn niet van de klant zelf. Wie geen beheerder is, mag ze
-- niet zetten — ook niet door ze mee te sturen in een upsert.
create or replace function public.guard_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.app_role;
begin
  select role into actor_role from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    new.pass_code := coalesce(nullif(new.pass_code, ''), public.gen_pass_code());
    if actor_role is distinct from 'admin' then
      new.role := 'client';
      new.status := 'pending';
    end if;
  else
    new.updated_at := now();
    if actor_role is distinct from 'admin' then
      new.role := old.role;
      new.pass_code := old.pass_code;
      new.client_number := old.client_number;
      -- Verandert de huishoudgrootte, dan kijkt de voedselbank er opnieuw naar.
      if (new.adults <> old.adults or new.children <> old.children)
         and old.status = 'active' then
        new.status := 'pending';
      else
        new.status := old.status;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profile();

-- Rol opzoeken zónder RLS, anders verwijst het beleid op profiles naar
-- zichzelf en loopt Postgres vast in een oneindige lus.
create or replace function public.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.app_role() in ('volunteer', 'warehouse', 'admin');
$$;

-- ------------------------------------------------------------ uitgiftes ---

create table public.pickups (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  location_id   text not null references public.locations (id),
  package_type  public.package_type not null,
  pickup_date   date not null default current_date,
  scanned_at    timestamptz not null default now(),
  scanned_by    uuid references public.profiles (id) on delete set null,
  handed_out_at timestamptz,
  unique (profile_id, pickup_date)
);

create index pickups_day_idx on public.pickups (pickup_date, location_id);

-- --------------------------------------------------------------- nieuws ---

create table public.news (
  id            uuid primary key default gen_random_uuid(),
  title_nl      text not null,
  title_en      text not null default '',
  title_ar      text not null default '',
  body_nl       text not null,
  body_en       text not null default '',
  body_ar       text not null default '',
  urgent        boolean not null default false,
  location_id   text references public.locations (id) on delete cascade,
  published_at  timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index news_published_idx on public.news (published_at desc nulls last);

-- ----------------------------------------------------------------- push ---

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  platform    text not null check (platform in ('web', 'ios', 'android')),
  endpoint    text unique,
  p256dh      text,
  auth        text,
  expo_token  text unique,
  created_at  timestamptz not null default now(),
  constraint has_a_target check (endpoint is not null or expo_token is not null)
);

create index push_profile_idx on public.push_subscriptions (profile_id);

-- ============================================================================
--  Row Level Security
-- ============================================================================

alter table public.locations          enable row level security;
alter table public.profiles           enable row level security;
alter table public.pickups            enable row level security;
alter table public.news               enable row level security;
alter table public.push_subscriptions enable row level security;

-- Locaties zijn openbare informatie; ook zichtbaar vóór het inloggen.
create policy locations_read on public.locations
  for select using (true);

create policy locations_admin on public.locations
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy profiles_read_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_read_staff on public.profiles
  for select using (public.is_staff());

create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin on public.profiles
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy pickups_read_own on public.pickups
  for select using (profile_id = auth.uid());

create policy pickups_staff on public.pickups
  for all using (public.is_staff()) with check (public.is_staff());

create policy news_read on public.news
  for select using (published_at is not null and auth.uid() is not null);

create policy news_admin on public.news
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy push_own on public.push_subscriptions
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================================
--  Views voor de vrijwilliger
--  security_invoker = true: het beleid van de onderliggende tabellen blijft
--  gelden, dus een klant kan hier nooit andermans gegevens uit halen.
-- ============================================================================

create view public.intake_view
with (security_invoker = true) as
select
  p.id                as profile_id,
  p.pass_code,
  p.first_name,
  p.last_name,
  p.status,
  p.package_type,
  p.adults,
  p.children,
  p.household_size,
  p.diet_flags,
  p.allergies_text,
  p.notes,
  p.phone,
  p.location_id,
  l.name              as location_name,
  p.valid_until,
  t.handed_out_at     as picked_up_at,
  t.id                as pickup_id,
  tl.name             as picked_up_location
from public.profiles p
left join public.locations l on l.id = p.location_id
left join public.pickups t on t.profile_id = p.id and t.pickup_date = current_date
left join public.locations tl on tl.id = t.location_id
where p.role = 'client';

create view public.warehouse_view
with (security_invoker = true) as
select
  v.*,
  v.picked_up_at is not null as handed_out
from public.intake_view v
where v.status = 'active';

-- ============================================================================
--  Klant verwijdert zijn eigen account (AVG, recht op vergetelheid)
-- ============================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;
  -- profiles, pickups en push_subscriptions verdwijnen mee via cascade.
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
