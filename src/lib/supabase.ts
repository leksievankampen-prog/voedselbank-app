import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL en EXPO_PUBLIC_SUPABASE_ANON_KEY ontbreken. ' +
      'Kopieer .env.example naar .env en vul de waarden uit het Supabase-dashboard in.',
  );
}

/**
 * Bij het bouwen van de webversie wordt elk scherm één keer in Node gerenderd
 * om er HTML van te maken. Daar bestaat geen `window`, en dus ook geen opslag.
 * Zonder deze controle probeert Supabase daar al een sessie te lezen en breekt
 * de build af. In de browser en op de telefoon verandert er niets.
 */
const isClient = typeof window !== 'undefined';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: isClient ? AsyncStorage : undefined,
    autoRefreshToken: isClient,
    persistSession: isClient,
    // Op native is er geen URL-balk waar een sessie uit gelezen kan worden.
    detectSessionInUrl: isClient && Platform.OS === 'web',
  },
});
