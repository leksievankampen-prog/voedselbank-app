# Voedselbank Haarlemmermeer — app

Eén app voor twee soorten gebruikers:

- **Klanten** vullen hun gegevens één keer in en krijgen een QR-code (hun "pas"). Die laten ze zien bij de intake.
- **Vrijwilligers** scannen die code en zien meteen wie er staat, welk pakket (A t/m E) erbij hoort en of er bijzondere wensen zijn — halal, allergieën, babyvoeding.

Daarnaast: nieuwsberichten met pushmelding (bijvoorbeeld "gesloten tijdens de kerstvakantie"), acht uitdeellocaties, en drie talen — Nederlands, Engels en Arabisch, inclusief rechts-naar-links.

Gebouwd met **Expo (React Native)**: dezelfde codebase draait nu als installeerbare web-app (PWA) en kan later als native app naar de App Store en Play Store.

---

## Snelstart

Je hebt **Node.js 20 of nieuwer** nodig. Draait op Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6), getest met Node 24.20 en npm 11.19.

```bash
npm install && npx expo install --fix
```

Daarna heb je een Supabase-project nodig (stap 1 hieronder). Zonder de twee sleutels in `.env` start de app bewust niet, met een duidelijke foutmelding.

### Op Windows: scripts eerst toestaan

PowerShell weigert standaard álle scripts, en `npm` is op Windows een script. Krijg je `npm.ps1 cannot be loaded because running scripts is disabled on this system`, draai dan eenmalig:

```bash
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Geen beheerdersrechten nodig; het geldt alleen voor jouw account. Wil je niets aan je systeem veranderen, gebruik dan overal `npm.cmd` in plaats van `npm`.

---

## Stap 1 — Supabase inrichten

1. Maak een gratis project op [supabase.com](https://supabase.com). **Kies bij de regio Frankfurt of Ierland** — persoonsgegevens van Nederlandse klanten horen binnen de EU te blijven (AVG).
2. Installeer de CLI en koppel het project:

```bash
npm install -g supabase && supabase login && supabase link --project-ref JOUW_PROJECT_REF
```

3. Zet het databaseschema en de acht locaties klaar:

```bash
supabase db push
```

4. Kopieer `.env.example` naar `.env` en vul `EXPO_PUBLIC_SUPABASE_URL` en `EXPO_PUBLIC_SUPABASE_ANON_KEY` in (dashboard → Project Settings → API).

5. Zet in het dashboard onder **Authentication → Providers → Email** de optie *Confirm email* aan en kies **OTP** (een code van 6 cijfers) in plaats van een magic link. Een code van zes cijfers werkt betrouwbaarder op een telefoon dan een link die in de verkeerde browser opent.

### Een eigen mailserver is verplicht, niet optioneel

Zonder eigen SMTP kan **niemand inloggen**. Twee redenen, en de tweede is de harde:

1. Supabase's gedeelde mailserver verstuurt maar een paar berichten per uur. Onbruikbaar voor een uitdeling met tientallen mensen.
2. Op de gratis laag met de standaard mailserver **weigert Supabase het aanpassen van e-mailsjablonen**. De standaard inlogmail bevat een klikbare link, terwijl de app om een code van zes cijfers vraagt. Die code komt dus nooit aan.

De API is daar expliciet over: *"Email template modification is not available for free tier projects using the default email provider."*

**Dit is inmiddels ingericht** met [Brevo](https://brevo.com) (300 mails per dag, gratis). De instellingen staan in `supabase/config.toml` onder `[auth.email.smtp]`; alleen het wachtwoord niet, dat komt uit een omgevingsvariabele. Wijzigen of de sleutel vervangen gaat zo:

```bash
$env:SUPABASE_AUTH_SMTP_PASSWORD = Get-Content .smtp-password ; npx supabase config push
```

### Domeinverificatie is geen nette-afwerking maar een vereiste

Zolang er vanaf `onboarding@resend.dev` wordt verstuurd, **belanden de inlogcodes in de spammap**. Dat is geen vermoeden: in de test kwamen negen van de negen mails als *Delivered* binnen bij Resend, en alle negen filterde Gmail weg.

De reden is logisch. De mail zegt van de Voedselbank te zijn, maar komt van een gedeeld testdomein zonder ondertekening. Dat is het profiel van phishing, dus grijpen de filters in. Voor deze doelgroep is dat fataal: wie zijn code niet vindt, komt de app niet in, en die zoekt geen spammap af.

Voeg dus in Resend onder **Domains** het domein `voedselbankhaarlemmermeer.nl` toe. Je krijgt drie soorten DNS-records die bij de domeinbeheerder gezet moeten worden:

| Record | Waarvoor |
| --- | --- |
| SPF (TXT) | Verklaart dat Resend namens het domein mag versturen |
| DKIM (TXT/CNAME) | Ondertekent elke mail digitaal |
| DMARC (TXT) | Vertelt ontvangers wat te doen bij een mislukte controle |

Zet daarna het afzenderadres om in `supabase/config.toml`:

```toml
admin_email = "voedselbank@voedselbankhaarlemmermeer.nl"
```

en push met `npx supabase config push`. Vanaf dat moment kan iedereen inloggen, niet alleen de eigenaar van het Resend-account.

> **Waarom niet Brevo?** Dat was de eerste keuze, maar Brevo laat SMTP alleen toe vanaf vooraf goedgekeurde IP-adressen (`525 5.7.1 Unauthorized IP address`) en accepteert geen wildcard. Supabase verstuurt vanaf wisselende servers, dus dat gaat niet samen.

Zodra SMTP werkt, staat het sjabloon klaar in `supabase/templates/magic_link.html` (drietalig, met de code groot in beeld). Eén commando zet het erop:

```bash
npx supabase config push
```

### Jezelf beheerder maken

Rollen worden nooit door de app zelf toegekend — dat is met opzet. Log één keer in met je eigen e-mailadres, en draai daarna in de SQL-editor van Supabase:

```sql
update public.profiles
set role = 'admin', status = 'active'
where id = (select id from auth.users where email = 'jouw@email.nl');
```

Vrijwilligers krijgen op dezelfde manier `role = 'volunteer'`. Wie in de loods werkt, kan `'warehouse'` krijgen; die rol ziet hetzelfde als een vrijwilliger, maar is apart zodat je later kunt differentiëren.

---

## Stap 2 — Pushmeldingen

```bash
npx web-push generate-vapid-keys
```

De **public key** gaat in `.env` als `EXPO_PUBLIC_VAPID_PUBLIC_KEY`. De **private key** gaat als secret naar Supabase en komt nooit in de app-bundel:

```bash
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:info@voedselbankhaarlemmermeer.nl
```

Daarna de functie uitrollen die de meldingen verstuurt:

```bash
supabase functions deploy send-news-push
```

**Werking per platform:**

| Platform | Werkt het? | Voorwaarde |
| --- | --- | --- |
| Android (Chrome, PWA) | Ja | — |
| iPhone (Safari, PWA) | Ja, vanaf iOS 16.4 | De app moet via *Deel → Zet op beginscherm* geïnstalleerd zijn |
| Native app (later) | Ja | Via Expo push, al voorbereid in `src/lib/notifications.ts` |

Die iOS-voorwaarde is de belangrijkste praktische beperking van de PWA-route. Het scherm *Mijn gegevens* legt dit aan de klant uit op het moment dat het relevant is.

---

## Stap 3 — Draaien

```bash
npm run web
```

Voor de telefoon: `npm start` en scan de QR-code met de Expo Go-app. Let op: de camera-scanner werkt in de browser alleen via **https** of op `localhost` — een browser geeft geen cameratoegang op een onbeveiligde verbinding.

### Publiceren als PWA

```bash
npm run build:web
```

Dit levert een map `dist/`. Het script (`scripts/build-web.mjs`) doet meer dan `expo export` alleen, en elk van die stappen lost een fout op die we in de praktijk zijn tegengekomen:

- **Altijd met lege cache.** Metro bakt de waarden van `EXPO_PUBLIC_*` in de bundel en hergebruikt anders het omgezette bestand. Zonder dit krijg je een build die er goed uitziet maar met de óude sleutels praat.
- **Lettertypen weg uit het `node_modules`-pad.** Expo zet het icoonlettertype op `assets/node_modules/...`. Vercel uploadt zo'n map principieel niet, waardoor élk icoon in de app een leeg blokje wordt. Het script legt er een kopie naast op `assets/vendor/` en laat `vercel.json` het oude pad daarheen omleiden.
- **`vercel.json` met `cleanUrls`.** Expo schrijft `welkom.html`, de app navigeert naar `/welkom`. Zonder deze instelling geeft een directe link, een verversing of een tik op een melding een 404.
- **De Vercel-projectkoppeling blijft staan**, zodat een herbouw je niet dwingt het project opnieuw te koppelen.

Draai je in plaats daarvan `npx expo export` met de hand, dan mis je die vier dingen. Die kun je op elke statische host neerzetten — Netlify, Vercel of Cloudflare Pages, allemaal gratis voor dit volume. Zet er een eigen adres op, bijvoorbeeld `app.voedselbankhaarlemmermeer.nl`. Klanten openen die link één keer en kiezen *Zet op beginscherm*; daarna staat de app als icoon tussen hun andere apps.

### Later naar de App Store en Play Store

De codebase is er klaar voor; `eas.json` staat al goed.

```bash
npm install -g eas-cli && eas login && eas init && eas build --platform all
```

Wat je dan nog nodig hebt: een Apple Developer-account (€99 per jaar) en een Google Play-ontwikkelaarsaccount (€25 eenmalig).

---

## Hoe het werkt

### De QR-code

In de QR-code staat **geen enkel persoonsgegeven** — alleen `VBH1:XXXX-XXXX`, het pasnummer. Naam, adres en allergieën haalt de app van de vrijwilliger uit de database. Een screenshot van een pas die iemand doorstuurt, levert dus geen gegevens op.

Het pasnummer is opgebouwd uit tekens zonder visuele dubbelgangers (geen I, L, O of U), zodat het aan de balie voorgelezen kan worden als de camera het laat afweten. Het scanscherm heeft daarvoor de knop **Pasnummer intypen**.

De code is vast en verandert niet. Dat is bewust: klanten kunnen er een schermafbeelding van maken en zijn dan niet afhankelijk van bereik in het dorpshuis. De vrijwilliger ziet de naam op het scherm en controleert die zoals nu ook bij de papieren pas gebeurt.

### Pakkettypes

| Type | Huishouden |
| --- | --- |
| A | 1 persoon |
| B | 2 personen |
| C | 3 – 4 personen |
| D | 5 – 6 personen |
| E | 7 personen of meer |

Deze indeling staat op twee plekken en die moeten gelijk blijven: `src/lib/packages.ts` en de databasefunctie `package_type_for` in `supabase/migrations/20260908150000_init.sql`. Het pakkettype wordt door de database zelf berekend uit het aantal volwassenen en kinderen, dus het kan nooit uit de pas lopen met het huishouden.

Wijzigt een klant zijn huishouden, dan gaat zijn status automatisch terug naar *in behandeling*. Een pakket groter maken is iets waar de voedselbank naar wil kijken, niet iets wat je zelf aanvinkt.

### Werken zonder internet

Niet elk dorpshuis heeft goed bereik. Daarom haalt het loodsscherm de lijst van vandaag op en bewaart die op de telefoon. Valt de verbinding weg, dan blijft scannen werken op die lijst en ziet de vrijwilliger een melding dat hij offline gegevens bekijkt. Uitgiftes die je offline vastlegt, gaan nog niet automatisch alsnog naar de server — zie *Wat er nog niet in zit*.

### Privacy (AVG)

- Elke tabel staat op slot met Row Level Security. Een klant kan uitsluitend zijn eigen rij lezen; een vrijwilliger ziet klantgegevens alleen via `intake_view`, waarin geen e-mailadres of inloggegevens zitten.
- Rollen kunnen niet door de gebruiker zelf gezet worden. De databasetrigger `guard_profile` overschrijft rol en status bij iedere insert en update van een niet-beheerder.
- `Mijn gegevens → Mijn account verwijderen` verwijdert het account echt, inclusief alle uitgiftes en pushabonnementen (recht op vergetelheid).
- Er wordt geen enkel gegeven naar een derde partij gestuurd. De app praat alleen met Supabase.

Wat je zelf nog moet regelen voordat dit live gaat: een **verwerkersovereenkomst met Supabase**, een aanvulling op jullie privacyverklaring, en een besluit over hoe lang uitgiftegegevens bewaard blijven.

---

## Structuur

```
app/                      schermen (expo-router: mapstructuur = navigatie)
  (auth)/                 welkom, inloggen, aanmeldformulier
  (client)/               pas, nieuws, locaties, gegevens
  (volunteer)/            scannen, loods, beheer
  nieuws/[id].tsx         nieuwsbericht in het groot
src/
  components/             knoppen, kaarten, scanner, QR-pas, dieetlabels
  context/                inlogstatus, taal, gekozen locatie van de vrijwilliger
  i18n/locales/           nl.json, en.json, ar.json
  lib/                    supabase, api-aanroepen, QR-formaat, datums, push
  theme/                  huisstijlkleuren, afstanden, typografie
supabase/
  migrations/             databaseschema en de acht locaties
  functions/              edge function die de pushmeldingen verstuurt
scripts/make-icons.ps1    genereert de app-iconen in de huisstijl
```

### Huisstijl

De kleuren komen uit het officiële logo: oranje **#FF7212**, zwart wordmark, wit vlak. Alles staat in `src/theme/index.ts`; kleuren zijn nergens anders hardcoded. Voor tekst en links wordt `brandDark` (#D65500) gebruikt, omdat het logo-oranje op wit te weinig contrast heeft voor leesbaarheid (WCAG AA).

`assets/logo.png` is het echte logo van de website. De app-iconen zijn een hartsymbool in dezelfde kleur, gegenereerd door `scripts/make-icons.ps1`. Heb je officiële artwork van de huisstijlbeheerder, overschrijf de bestanden in `assets/` dan gerust — de bestandsnamen moeten hetzelfde blijven.

### Talen

`nl` is de basis; `en` en `ar` zijn volledig vertaald. Arabisch schakelt de layout naar rechts-naar-links: op web direct via het `dir`-attribuut, op native pas na een herstart van de app (dat is een beperking van React Native zelf, niet van deze code).

Nieuwsberichten worden per taal apart ingevoerd door de beheerder. Is een vertaling leeg gelaten, dan krijgt de lezer het Nederlands te zien — beter iets wat je kunt laten vertalen dan een leeg scherm.

---

## Voor de vrijwilliger op vrijdag

1. Open de app, kies bovenin je **locatie** van vandaag.
2. Tab **Scannen** → richt op de QR-code van de klant.
3. Je ziet naam, pakkettype (grote letter) en bijzonderheden. Allergieën staan in het rood, wensen zoals halal in het oranje.
4. Tik **Pakket uitgegeven**. Verkeerd getikt? **Ongedaan maken** staat er direct onder.
5. Tab **Loods** toont hoeveel pakketten van elk type klaargezet moeten worden, en welke daarvan bijzondere wensen hebben.

De app waarschuwt zelf bij: een klant die vandaag al een pakket heeft gehad, een pas die nog niet is goedgekeurd of verlopen is, en iemand die bij een andere locatie staat ingeschreven.

---

## Wat er nog niet in zit

Eerlijk overzicht van wat je hierna waarschijnlijk wilt, zodat je niet voor verrassingen komt te staan:

- **Offline uitgiftes worden nog niet nagestuurd.** Scannen werkt offline, maar een uitgifte die je zonder verbinding vastlegt, wordt niet automatisch alsnog verstuurd zodra het netwerk terug is. Voor Hoofddorp (vast depot, vaste wifi) speelt dit niet; voor de dorpshuizen is dit de eerste uitbreiding die ik zou bouwen.
- **Koppeling met jullie bestaande klantenadministratie.** Het veld `client_number` staat er al voor klaar, maar er is geen import of synchronisatie. Nu voeren klanten hun gegevens zelf in en keurt een beheerder ze goed.
- **Geldigheidsduur.** Het veld `valid_until` bestaat en wordt in de app getoond, maar niets zet de status automatisch op *verlopen*. Dat vraagt een geplande taak in Supabase.
- **Geen geautomatiseerde tests.** `npm run typecheck` is schoon en `npm run build:web` levert een complete export op (24 routes, 741 KB gzipped). Het schema en de RLS-regels zijn met de hand tegen de echte database getest (zie hieronder), maar er zijn geen unit- of end-to-end-tests die dat bij elke wijziging herhalen.
- **Er is nog nooit een echte pushmelding verstuurd.** `send-news-push` is uitgerold en start op — een aanroep zonder ingelogde gebruiker geeft netjes 401 — maar het pad dat daadwerkelijk verstuurt is niet beproefd. Daarvoor moet iemand de app op zijn beginscherm zetten, meldingen aanzetten, en moet een beheerder een bericht publiceren. Doe dat één keer met je eigen telefoon voordat je het aan klanten aankondigt.
- **De VAPID-afzender is een plaatshouder.** `VAPID_SUBJECT` staat op `https://voedselbankhaarlemmermeer.nl`. Pushdiensten gebruiken dat om contact op te nemen bij problemen; zet er het echte mailadres van de voedselbank in met `supabase secrets set VAPID_SUBJECT=mailto:...`.
- **Aanmeldingen goedkeuren kan alleen een beheerder**, niet een gewone vrijwilliger. Als de intakebalie dat zelf moet kunnen, is dat één regel in het RLS-beleid.
