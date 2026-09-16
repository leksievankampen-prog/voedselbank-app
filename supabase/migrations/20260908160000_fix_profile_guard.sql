-- De eerste versie van deze trigger draaide élke wijziging van rol en status
-- terug zodra de aanroeper geen beheerder was. Bij een query uit de SQL-editor
-- of via de service-rol is er helemaal geen ingelogde gebruiker, dus die vielen
-- daar ook onder. Gevolg: de allereerste beheerder viel niet aan te maken en
-- `update profiles set role = 'admin'` deed stilzwijgend niets.
--
-- Nu kijken we naar de rol in het JWT van het verzoek:
--   'authenticated' / 'anon'  -> een gewone app-gebruiker, regels gelden
--   geen JWT                  -> SQL-editor of migratie, vertrouwd
--   'service_role'            -> server-side sleutel, vertrouwd
-- Een beheerder blijft vanzelfsprekend ook toegestaan.

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

  -- Leeg als het verzoek niet via de app binnenkomt.
  request_role := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );

  privileged := actor_role = 'admin' or request_role not in ('authenticated', 'anon');

  if tg_op = 'INSERT' then
    new.pass_code := coalesce(nullif(new.pass_code, ''), public.gen_pass_code());
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
