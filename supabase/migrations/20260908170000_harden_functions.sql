-- Naar aanleiding van `supabase db advisors --type security`.
--
-- Twee soorten problemen:
--   1. Functies zonder vastgezet `search_path`. Wie een schema vóór `public`
--      weet te schuiven, kan dan bepalen welke tabel de functie raakt.
--   2. Hulpfuncties stonden in `public` en waren daardoor als REST-endpoint
--      aanroepbaar (/rest/v1/rpc/app_role). Ze horen alleen door de
--      beveiligingsregels gebruikt te worden, door niemand anders.
--
-- Oplossing voor het tweede: verhuizen naar het schema `private`, dat PostgREST
-- niet publiceert. De regels mogen ze wel blijven aanroepen, dus daar houden
-- anon en authenticated uitvoerrecht.
--
-- `package_type_for` blijft in `public`: die zit in een berekende kolom van
-- profiles en is niet te verplaatsen zonder die kolom opnieuw op te bouwen.
-- Hij is ook ongevaarlijk — hij rekent een getal om naar een letter.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.package_type_for(int) set search_path = public;

-- ------------------------------------------------------------- helpers ----

create function private.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.app_role() in ('volunteer', 'warehouse', 'admin'), false);
$$;

create function private.gen_pass_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
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

grant execute on function private.app_role(), private.is_staff() to anon, authenticated;

-- ------------------------------------------------------------- policies ---

drop policy if exists locations_admin      on public.locations;
drop policy if exists profiles_read_staff  on public.profiles;
drop policy if exists profiles_admin       on public.profiles;
drop policy if exists pickups_staff        on public.pickups;
drop policy if exists news_admin           on public.news;

create policy locations_admin on public.locations
  for all using (private.app_role() = 'admin') with check (private.app_role() = 'admin');

create policy profiles_read_staff on public.profiles
  for select using (private.is_staff());

create policy profiles_admin on public.profiles
  for all using (private.app_role() = 'admin') with check (private.app_role() = 'admin');

create policy pickups_staff on public.pickups
  for all using (private.is_staff()) with check (private.is_staff());

create policy news_admin on public.news
  for all using (private.app_role() = 'admin') with check (private.app_role() = 'admin');

-- ------------------------------------------------------------- trigger ----

create or replace function public.guard_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.app_role;
  request_role text;
  privileged boolean;
begin
  select role into actor_role from public.profiles where id = auth.uid();

  -- Leeg als het verzoek niet via de app binnenkomt (SQL-editor, migratie).
  request_role := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );

  privileged := actor_role = 'admin' or request_role not in ('authenticated', 'anon');

  if tg_op = 'INSERT' then
    new.pass_code := coalesce(nullif(new.pass_code, ''), private.gen_pass_code());
    if not privileged then
      new.role := 'client';
      new.status := 'pending';
    end if;
  else
    new.updated_at := now();
    if not privileged then
      new.role := old.role;
      new.pass_code := old.pass_code;
      new.client_number := old.client_number;
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

-- ------------------------------------------------------------- opruimen ---

drop function if exists public.app_role();
drop function if exists public.is_staff();
drop function if exists public.gen_pass_code();

-- Een triggerfunctie hoeft door niemand rechtstreeks aangeroepen te worden;
-- de trigger zelf draait met de rechten van de tabeleigenaar.
revoke all on function public.guard_profile() from public, anon, authenticated;

-- Alleen wie is ingelogd kan zijn eigen account verwijderen.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
