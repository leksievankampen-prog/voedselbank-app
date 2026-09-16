export type PackageType = 'A' | 'B' | 'C' | 'D' | 'E';

export type ClientStatus = 'pending' | 'active' | 'paused' | 'expired' | 'rejected';

export type AppRole = 'client' | 'volunteer' | 'warehouse' | 'admin';

/** Vaste dieetvlaggen. Alles wat hier niet in past gaat naar `allergies_text`. */
export type DietFlag =
  | 'halal'
  | 'vegetarian'
  | 'noPork'
  | 'noAlcohol'
  | 'glutenFree'
  | 'lactoseFree'
  | 'nutAllergy'
  | 'diabetes'
  | 'babyFood';

export const DIET_FLAGS: DietFlag[] = [
  'halal',
  'vegetarian',
  'noPork',
  'noAlcohol',
  'glutenFree',
  'lactoseFree',
  'nutAllergy',
  'diabetes',
  'babyFood',
];

/** Weekdag zoals Postgres die telt: 0 = zondag … 6 = zaterdag. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Location {
  id: string;
  slug: string;
  name: string;
  venue: string;
  street: string;
  postcode: string;
  city: string;
  weekday: Weekday;
  opens_at: string; // '10:00'
  closes_at: string; // '13:00'
  phone: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  role: AppRole;
  status: ClientStatus;
  pass_code: string;
  client_number: string | null;
  first_name: string;
  last_name: string;
  street: string | null;
  house_number: string | null;
  postcode: string | null;
  city: string | null;
  phone: string | null;
  adults: number;
  children: number;
  household_size: number;
  package_type: PackageType;
  location_id: string | null;
  diet_flags: DietFlag[];
  allergies_text: string | null;
  notes: string | null;
  language: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

/** Wat de vrijwilliger na een scan te zien krijgt. Bewust zonder e-mail/BSN. */
export interface IntakeView {
  profile_id: string;
  pass_code: string;
  first_name: string;
  last_name: string;
  status: ClientStatus;
  package_type: PackageType;
  adults: number;
  children: number;
  household_size: number;
  diet_flags: DietFlag[];
  allergies_text: string | null;
  notes: string | null;
  phone: string | null;
  location_id: string | null;
  location_name: string | null;
  valid_until: string | null;
  picked_up_at: string | null;
  pickup_id: string | null;
  picked_up_location: string | null;
}

export interface Pickup {
  id: string;
  profile_id: string;
  location_id: string;
  package_type: PackageType;
  pickup_date: string;
  scanned_at: string;
  scanned_by: string | null;
  handed_out_at: string | null;
}

export interface NewsItem {
  id: string;
  title_nl: string;
  title_en: string;
  title_ar: string;
  body_nl: string;
  body_en: string;
  body_ar: string;
  urgent: boolean;
  location_id: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  profile_id: string;
  platform: 'web' | 'ios' | 'android';
  endpoint: string | null;
  p256dh: string | null;
  auth: string | null;
  expo_token: string | null;
  created_at: string;
}
