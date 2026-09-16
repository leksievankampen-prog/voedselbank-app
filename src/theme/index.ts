/**
 * Huisstijl Voedselbank Haarlemmermeer.
 * Kleuren zijn afgeleid uit het officiele logo (LOGO-VB-Haarlemmermeer3):
 * oranje #FF7212, zwart wordmark, wit vlak.
 */

export const colors = {
  /** Logo-oranje. Het enige echte merkaccent — spaarzaam en doelgericht gebruiken. */
  brand: '#FF7212',
  brandDark: '#D65500', // voldoet aan 4.5:1 op wit, voor tekst en links
  brandDarker: '#A33F00',
  brandSoft: '#FFF1E6', // achtergrondvlak
  brandSofter: '#FFF8F3',
  brandBorder: '#FFD3B0',

  ink: '#111111', // wordmark-zwart
  inkMuted: '#5A5A5A',
  inkFaint: '#8A8A8A',

  surface: '#FFFFFF',
  canvas: '#F7F6F4',
  border: '#E4E1DD',
  borderStrong: '#CFCAC4',

  success: '#1B7F4B',
  successSoft: '#E7F4ED',
  warning: '#B26A00',
  warningSoft: '#FFF4E0',
  danger: '#B3261E',
  dangerSoft: '#FDECEA',
  info: '#1B5E8F',
  infoSoft: '#E8F1F8',

  onBrand: '#FFFFFF',
  overlay: 'rgba(17,17,17,0.55)',
} as const;

/** Kleur per pakkettype, zodat de loods het van een afstand herkent. */
export const packageColors = {
  A: { bg: '#E8F1F8', fg: '#12496F', border: '#B9D4E8' },
  B: { bg: '#E7F4ED', fg: '#0F5F36', border: '#B4DCC6' },
  C: { bg: '#FFF4E0', fg: '#8A5100', border: '#F0D3A0' },
  D: { bg: '#FFF1E6', fg: '#A33F00', border: '#FFD3B0' },
  E: { bg: '#F2ECF9', fg: '#4B2C7A', border: '#D6C7EC' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  mono: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: 2 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Minimale aanraakoppervlakte — de doelgroep bedient de app vaak buiten, in de rij. */
export const HIT_SIZE = 48;
