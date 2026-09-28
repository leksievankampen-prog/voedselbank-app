# Lampen uit: Garmin Fenix 7X + SmartThings

Eén druk op **START** en al je SmartThings-lampen gaan uit, vanaf je pols.

- **START** (of tik op het scherm): alles uit. Het horloge trilt als het klaar is.
- **UP ingedrukt houden**: menu
  - *Alle lampen*: zet elk apparaat met categorie "Light" uit.
  - *Scene kiezen*: START voert voortaan een SmartThings-scene uit (een handmatige routine in de SmartThings-app, bijv. "Welterusten").
  - *Opnieuw inloggen*.

Werkt op Fenix 7X, 7X Pro en 7X Pro (zonder wifi). De app praat via Bluetooth met de Garmin Connect-app op je telefoon, die op zijn beurt de SmartThings API aanroept. Je telefoon moet dus in de buurt zijn.

## Tip: gebruik een scene

"Alle lampen" stuurt per lamp een apart commando. Via Bluetooth kost dat ongeveer een halve seconde per lamp. Met 15 lampen wacht je dus even. Maak in de SmartThings-app een handmatige routine "Alles uit" en kies die in het menu: dan is het één verzoek en ben je in een seconde klaar. Bonus: je bepaalt dan zelf wat er precies uitgaat (ook de tv of stekkers).

## Installatie

### 1. SmartThings OAuth-app maken (eenmalig, 5 minuten)

Een gewoon Personal Access Token verloopt tegenwoordig na 24 uur. Daarom logt deze app in via OAuth: het token ververst zichzelf, zolang je de app minstens eens per 30 dagen gebruikt.

```bash
npm install -g @smartthings/cli
smartthings apps:create
```

Kies:
- **Type**: `OAuth-In App`
- **Display name**: `Garmin lampen` (wat je wilt)
- **Scopes**: `r:devices:*`, `x:devices:*`, `r:scenes:*`, `x:scenes:*`
- **Redirect URI**: `https://localhost` (precies zo, zonder slash erachter)

Je krijgt een **Client ID** en **Client Secret**. Bewaar ze, de secret zie je maar één keer.

### 2. Bouwen

1. Installeer de [Connect IQ SDK](https://developer.garmin.com/connect-iq/sdk/) en de VS Code-extensie *Monkey C*.
2. In VS Code: `Monkey C: Generate a Developer Key`.
3. Open deze map en kies `Monkey C: Build for Device` → `fenix7x` (of `fenix7xpro`).

Of vanaf de command line:

```bash
monkeyc -d fenix7x -f monkey.jungle -o bin/LampenUit.prg -y /pad/naar/developer_key.der
```

Testen kan in de simulator (`connectiq` en dan `monkeydo bin/LampenUit.prg fenix7x`).

### 3. Op je horloge zetten

**Optie A: beta-app in de Connect IQ Store (aanbevolen).** Exporteer met `Monkey C: Export Project` naar een `.iq`-bestand en upload het op [apps.garmin.com](https://apps.garmin.com/developer/) als **Beta App**. Die is alleen voor jou zichtbaar. Installeer hem via Garmin Connect en vul daar bij de app-instellingen je Client ID en Secret in.

**Optie B: via USB (sideload).** Sluit je horloge aan en kopieer `LampenUit.prg` naar `GARMIN/APPS/`. Instellingen kun je dan niet in Garmin Connect invullen. Zet je Client ID en Secret daarom in `source/Config.mc` voordat je bouwt, en commit dat bestand daarna niet:

```bash
git update-index --skip-worktree source/Config.mc
```

### 4. Eerste keer

Open de app en druk op **START**. Je telefoon laat een SmartThings-inlogscherm zien. Log in, kies je locatie en geef toegang. Daarna gaan de lampen direct uit. Vanaf dan is het gewoon START.

**Sneller openen:** zet de app onder een sneltoets (Instellingen → Systeem → Sneltoetsen) of in je controlemenu. Dan is het twee drukken van pols naar donker.

## Problemen

| Melding | Oplossing |
|---|---|
| Geen verbinding met telefoon | Bluetooth aan, Garmin Connect-app draaiend. |
| Te veel apparaten. Kies een scene | De apparatenlijst past niet in het geheugen van het horloge. Gebruik een scene. |
| Geen lampen gevonden | Je lampen hebben geen categorie "Light". Zet in Garmin Connect "Alleen lampen" uit, of gebruik een scene. |
| Login verlopen | Meer dan 30 dagen niet gebruikt. Druk START en log opnieuw in. |
| Inloggen mislukt | Controleer of de redirect URI in SmartThings exact `https://localhost` is. |

## Bestanden

- `source/SmartThingsClient.mc`: OAuth, token verversen, API-aanroepen.
- `source/LampenView.mc`: het scherm.
- `source/LampenDelegate.mc`: knoppen en menu's.
- `resources/settings/`: instellingen die je in Garmin Connect ziet.
