import AsyncStorage from '@react-native-async-storage/async-storage';

import { isoDate } from './format';
import { FALLBACK_LOCATIONS } from './locations';
import { supabase } from './supabase';
import type { IntakeView, Location, NewsItem, PackageType, Profile } from '@/types/db';

const CACHE_LOCATIONS = 'vbh.cache.locations';
const CACHE_ROSTER = 'vbh.cache.roster';

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Vol geheugen of privémodus — de app werkt dan gewoon zonder cache.
  }
}

/* ------------------------------------------------------------- locaties --- */

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  if (error || !data?.length) {
    const cached = await readCache<Location[]>(CACHE_LOCATIONS);
    return cached ?? FALLBACK_LOCATIONS;
  }

  await writeCache(CACHE_LOCATIONS, data);
  return data as Location[];
}

/* -------------------------------------------------------------- profiel --- */

export interface ProfileInput {
  first_name: string;
  last_name: string;
  street: string;
  house_number: string;
  postcode: string;
  city: string;
  phone: string;
  adults: number;
  children: number;
  location_id: string;
  diet_flags: string[];
  allergies_text: string | null;
  notes: string | null;
  language: string;
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...input }, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

/* ---------------------------------------------------------------- nieuws -- */

export async function fetchNews(locationId?: string | null): Promise<NewsItem[]> {
  let query = supabase
    .from('news')
    .select('*')
    .not('published_at', 'is', null)
    .order('urgent', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(50);

  if (locationId) {
    query = query.or(`location_id.is.null,location_id.eq.${locationId}`);
  } else {
    query = query.is('location_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NewsItem[];
}

export interface NewsInput {
  title_nl: string;
  title_en: string;
  title_ar: string;
  body_nl: string;
  body_en: string;
  body_ar: string;
  urgent: boolean;
  location_id: string | null;
}

export async function publishNews(input: NewsInput, sendPush: boolean): Promise<NewsItem> {
  const { data, error } = await supabase
    .from('news')
    .insert({ ...input, published_at: new Date().toISOString() })
    .select('*')
    .single();

  if (error) throw error;

  if (sendPush) {
    // Mislukt de push, dan staat het bericht er nog steeds — dat mag niet stuklopen.
    const { error: pushError } = await supabase.functions.invoke('send-news-push', {
      body: { news_id: (data as NewsItem).id },
    });
    if (pushError) console.warn('[news] push versturen mislukt', pushError.message);
  }

  return data as NewsItem;
}

/* --------------------------------------------------------------- intake --- */

/**
 * Zoekt de klant bij een gescand pasnummer. Lukt dat niet (geen internet in de
 * loods of het dorpshuis), dan valt hij terug op de lijst die vanochtend is
 * opgehaald, zodat de rij door kan lopen.
 */
export async function lookupPass(
  passCode: string,
): Promise<{ intake: IntakeView | null; offline: boolean }> {
  const { data, error } = await supabase
    .from('intake_view')
    .select('*')
    .eq('pass_code', passCode)
    .maybeSingle();

  if (!error) {
    return { intake: (data as IntakeView) ?? null, offline: false };
  }

  const cached = await readCache<IntakeView[]>(CACHE_ROSTER);
  const match = cached?.find((row) => row.pass_code === passCode) ?? null;
  return { intake: match, offline: true };
}

export async function recordPickup(
  profileId: string,
  locationId: string,
  packageType: PackageType,
): Promise<{ id: string; scanned_at: string }> {
  const { data, error } = await supabase
    .from('pickups')
    .upsert(
      {
        profile_id: profileId,
        location_id: locationId,
        package_type: packageType,
        pickup_date: isoDate(),
        handed_out_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,pickup_date' },
    )
    .select('id, scanned_at')
    .single();

  if (error) throw error;
  return data as { id: string; scanned_at: string };
}

export async function undoPickup(pickupId: string): Promise<void> {
  const { error } = await supabase.from('pickups').delete().eq('id', pickupId);
  if (error) throw error;
}

/* ----------------------------------------------------------------- loods -- */

export interface WarehouseRow extends IntakeView {
  /** Kolom uit warehouse_view: is het pakket vandaag al meegegeven? */
  handed_out: boolean;
}

export async function fetchWarehouseList(locationId: string): Promise<WarehouseRow[]> {
  const { data, error } = await supabase
    .from('warehouse_view')
    .select('*')
    .eq('location_id', locationId)
    .order('package_type')
    .order('last_name');

  if (error) throw error;

  const rows = (data ?? []) as WarehouseRow[];
  await writeCache(CACHE_ROSTER, rows);
  return rows;
}

export async function fetchCachedRoster(): Promise<WarehouseRow[]> {
  return (await readCache<WarehouseRow[]>(CACHE_ROSTER)) ?? [];
}

/* ------------------------------------------------------------- aanmeldingen */

export async function fetchPendingProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at');

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function setProfileStatus(
  profileId: string,
  status: 'active' | 'rejected' | 'paused',
): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', profileId);
  if (error) throw error;
}
