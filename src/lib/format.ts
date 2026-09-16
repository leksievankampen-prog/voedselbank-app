import type { Weekday } from '@/types/db';

const INTL_LOCALE: Record<string, string> = {
  nl: 'nl-NL',
  en: 'en-GB',
  ar: 'ar-EG',
};

export function intlLocale(language: string): string {
  return INTL_LOCALE[language] ?? 'nl-NL';
}

export function formatDate(value: string | Date | null, language: string): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(value: string | Date | null, language: string): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(language), {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatTime(value: string | Date | null, language: string): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** '10:00:00' uit Postgres wordt '10.00' — zoals de voedselbank het zelf schrijft. */
export function formatClock(value: string | null): string {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  return `${hours}.${minutes ?? '00'}`;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function dayKey(weekday: Weekday, long = false): string {
  return `days.${DAY_KEYS[weekday]}${long ? 'Long' : ''}`;
}

/** Eerstvolgende datum waarop deze locatie uitdeelt (vandaag telt mee). */
export function nextOccurrence(weekday: Weekday, from = new Date()): Date {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date;
}

/** Datum als YYYY-MM-DD in lokale tijd — niet toISOString(), die schuift een dag terug. */
export function isoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

/** 06 – 33 41 28 07  ->  +31633412807 */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return `tel:${digits}`;
  if (digits.startsWith('06') || digits.startsWith('0')) return `tel:+31${digits.slice(1)}`;
  return `tel:${digits}`;
}

export function mapsHref(street: string, postcode: string, city: string): string {
  const query = encodeURIComponent(`${street}, ${postcode} ${city}, Nederland`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function isValidPostcode(value: string): boolean {
  return /^[1-9]\d{3}\s?[A-Za-z]{2}$/.test(value.trim());
}

export function formatPostcode(value: string): string {
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length < 5) return cleaned;
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}`;
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 13;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
