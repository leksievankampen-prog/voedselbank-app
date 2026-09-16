import type { NewsItem } from '@/types/db';

/**
 * Kiest de tekst in de taal van de lezer. Is een vertaling niet ingevuld, dan
 * valt hij terug op het Nederlands — beter een bericht dat je kunt laten
 * vertalen dan een leeg scherm.
 */
export function newsText(item: NewsItem, language: string): { title: string; body: string } {
  const key = (language === 'en' || language === 'ar' ? language : 'nl') as 'nl' | 'en' | 'ar';
  return {
    title: item[`title_${key}`]?.trim() || item.title_nl,
    body: item[`body_${key}`]?.trim() || item.body_nl,
  };
}
