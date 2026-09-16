/**
 * Bouwt de webversie en maakt de uitvoer klaar voor een statische host.
 *
 * Vier dingen die `expo export` zelf niet regelt:
 *
 * 1. Windows houdt de map `dist` regelmatig vast (indexering, virusscanner),
 *    en dan breekt `expo export` af op EBUSY omdat het de map wil verwijderen.
 *    Daarom bouwen we naar een tijdelijke map en kopiëren we het resultaat.
 *
 * 2. Het lettertype met de iconen komt terecht op een pad met `node_modules`
 *    erin. Vercel uploadt zo'n map principieel niet, waardoor alle iconen als
 *    leeg blokje verschijnen. We zetten er een kopie naast op een schoon pad
 *    en laten de host het oude pad daarheen omleiden.
 *
 * 3. Expo schrijft `welkom.html`, maar de app navigeert naar `/welkom`.
 *    Zonder `cleanUrls` geeft een directe link of een verversing een 404.
 *
 * 4. De koppeling met het Vercel-project staat in dist/.vercel en moet een
 *    herbouw overleven.
 *
 * Draaien met:  npm run build:web
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const tijdelijk = path.join(root, '.web-build-tmp');
const vercelLink = path.join(dist, '.vercel');
const linkBackup = path.join(root, '.vercel-link-backup');

function log(bericht) {
  console.log(`\n▸ ${bericht}`);
}

function pauze(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Gooit de inhoud van een map weg, maar laat de map zelf staan. */
function leegMap(map) {
  if (!fs.existsSync(map)) return;
  for (const naam of fs.readdirSync(map)) {
    const pad = path.join(map, naam);
    for (let poging = 1; poging <= 3; poging++) {
      try {
        fs.rmSync(pad, { recursive: true, force: true });
        break;
      } catch (fout) {
        if (poging === 3) console.warn(`  (kon ${naam} niet verwijderen: ${fout.code})`);
        else pauze(300);
      }
    }
  }
}

/* ------------------------------------------------------- koppeling bewaren */

if (fs.existsSync(vercelLink)) {
  fs.rmSync(linkBackup, { recursive: true, force: true });
  fs.cpSync(vercelLink, linkBackup, { recursive: true });
  log('Vercel-koppeling bewaard');
}

/* -------------------------------------------------------------- exporteren */

log('Exporteren naar een tijdelijke map (met lege cache)');
fs.rmSync(tijdelijk, { recursive: true, force: true });

execSync(`npx expo export --platform web --output-dir "${path.basename(tijdelijk)}" --clear`, {
  cwd: root,
  stdio: 'inherit',
});

/* ------------------------------------------------------------ overzetten -- */

log('Resultaat overzetten naar dist/');
fs.mkdirSync(dist, { recursive: true });
leegMap(dist);

for (const naam of fs.readdirSync(tijdelijk)) {
  fs.cpSync(path.join(tijdelijk, naam), path.join(dist, naam), { recursive: true });
}
fs.rmSync(tijdelijk, { recursive: true, force: true });

if (fs.existsSync(linkBackup)) {
  fs.cpSync(linkBackup, vercelLink, { recursive: true });
  log('Vercel-koppeling teruggezet');
}

/* ------------------------------------------------- lettertypen verplaatsen */

const vendorBron = path.join(dist, 'assets', 'node_modules');
const vendorDoel = path.join(dist, 'assets', 'vendor');

if (fs.existsSync(vendorBron)) {
  fs.cpSync(vendorBron, vendorDoel, { recursive: true });
  const aantal = fs
    .readdirSync(vendorDoel, { recursive: true })
    .filter((naam) => typeof naam === 'string' && naam.endsWith('.ttf')).length;
  log(`Lettertypen gekopieerd naar assets/vendor (${aantal} bestanden)`);
} else {
  log('Geen assets/node_modules gevonden — niets te kopiëren');
}

/* --------------------------------------------------- hostconfiguratie ----- */

const vercelConfig = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: true,
  trailingSlash: false,
  rewrites: [
    { source: '/assets/node_modules/:pad*', destination: '/assets/vendor/:pad*' },
    { source: '/nieuws/:id', destination: '/nieuws/[id].html' },
  ],
  headers: [
    {
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      // De servicewerker mag nooit uit de cache komen, anders blijven
      // meldingen op een oude versie hangen.
      source: '/sw.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
  ],
};

fs.writeFileSync(path.join(dist, 'vercel.json'), JSON.stringify(vercelConfig, null, 2) + '\n');
log('vercel.json geschreven (cleanUrls, omleidingen, cachekoppen)');

console.log('\nKlaar. Uitrollen met:  cd dist  &&  npx vercel --prod\n');
