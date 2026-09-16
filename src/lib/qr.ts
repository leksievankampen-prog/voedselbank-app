/**
 * De QR-code bevat bewust géén persoonsgegevens — alleen het pasnummer.
 * De app van de vrijwilliger zoekt daarmee de klant op (online, of in de
 * lijst die 's ochtends is opgehaald). Zo staat er geen naam of adres in een
 * plaatje dat iemand met een schermafbeelding kan doorsturen.
 *
 * Formaat: VBH1:XXXX-XXXX
 *          ^     ^
 *          |     pasnummer (Crockford-base32, zonder I, L, O en U)
 *          versie, zodat we het formaat later kunnen wijzigen
 */

export const QR_PREFIX = 'VBH1';

/** Tekens zonder visuele dubbelgangers — voorleesbaar aan de balie. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const SUBSTITUTIONS: Record<string, string> = {
  I: '1',
  L: '1',
  O: '0',
  U: 'V',
};

export function encodePass(passCode: string): string {
  return `${QR_PREFIX}:${normalizePassCode(passCode)}`;
}

/** Maakt van gescande of getypte invoer een pasnummer, of null als het geen pas is. */
export function parseScan(raw: string): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  const withoutPrefix = value.toUpperCase().startsWith(`${QR_PREFIX}:`)
    ? value.slice(QR_PREFIX.length + 1)
    : value;

  const code = normalizePassCode(withoutPrefix);
  return isValidPassCode(code) ? code : null;
}

/** Hoofdletters, verwarrende tekens vervangen, en één streepje in het midden. */
export function normalizePassCode(input: string): string {
  const cleaned = (input ?? '')
    .toUpperCase()
    .split('')
    .map((char) => SUBSTITUTIONS[char] ?? char)
    .filter((char) => ALPHABET.includes(char))
    .join('');

  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

export function isValidPassCode(code: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(code);
}

/** Alleen voor demo- en testgegevens; echte codes komen uit de database. */
export function generatePassCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
