-- De acht uitdeellocaties van Voedselbank Haarlemmermeer.
-- weekday: 4 = donderdag, 5 = vrijdag.
-- Deze lijst staat ook in src/lib/locations.ts als terugval zonder internet.

insert into public.locations
  (id, slug, name, venue, street, postcode, city, weekday, opens_at, closes_at, phone, latitude, longitude, sort_order)
values
  ('hoofddorp', 'hoofddorp', 'Hoofddorp', 'Voedseldepot',
   'Dirk Storklaan 63A', '2132 PX', 'Hoofddorp', 5, '10:00', '13:00', '06 33 41 28 07', 52.3067, 4.6774, 1),

  ('badhoevedorp', 'badhoevedorp', 'Badhoevedorp', 'Het Dorpshuis',
   'Snelliuslaan 35', '1171 CZ', 'Badhoevedorp', 5, '09:00', '09:30', '06 21 54 23 83', 52.3405, 4.7796, 2),

  ('zwanenburg', 'zwanenburg', 'Zwanenburg', 'Protestantse Kerk',
   'Wilhelminastraat 15', '1165 HA', 'Halfweg', 5, '09:00', '09:45', '06 29 96 46 44', 52.3866, 4.7414, 3),

  ('spaarndam', 'spaarndam', 'Spaarndam', 'Dorpscentrum Spaarndam',
   'Ringweg 36', '2064 KK', 'Spaarndam', 4, '15:30', '16:30', '06 28 83 74 51', 52.4131, 4.6803, 4),

  ('vijfhuizen', 'vijfhuizen', 'Vijfhuizen', 'Dorpshuis d''Oude Waterwolf',
   'Kromme Spieringweg 436', '2141 AN', 'Vijfhuizen', 5, '10:30', '11:30', '06 54 60 19 20', 52.3646, 4.6606, 5),

  ('nieuw-vennep', 'nieuw-vennep', 'Nieuw Vennep', 'Gebouw De Rank',
   'Eugenie Previnaireweg 14', '2151 BE', 'Nieuw Vennep', 5, '08:00', '10:00', '06 44 72 42 95', 52.2662, 4.6318, 6),

  ('lisserbroek', 'lisserbroek', 'Lisserbroek', 'Dorpshuis De Meerkoet',
   'Krabbescheerstraat 1', '2165 XG', 'Lisserbroek', 4, '15:30', '16:30', '06 83 55 67 28', 52.2494, 4.5636, 7),

  ('rijsenhout', 'rijsenhout', 'Rijsenhout', 'Ontmoetingskerk',
   'Werf 2', '1435 KP', 'Rijsenhout', 5, '08:30', '09:30', '06 14 18 19 00', 52.2489, 4.7286, 8)

on conflict (id) do update set
  venue      = excluded.venue,
  street     = excluded.street,
  postcode   = excluded.postcode,
  city       = excluded.city,
  weekday    = excluded.weekday,
  opens_at   = excluded.opens_at,
  closes_at  = excluded.closes_at,
  phone      = excluded.phone,
  sort_order = excluded.sort_order;
