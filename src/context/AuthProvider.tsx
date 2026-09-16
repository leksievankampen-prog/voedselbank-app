import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/db';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** true zolang we nog niet weten of iemand is ingelogd — voorkomt flikkerende redirects. */
  initializing: boolean;
  isVolunteer: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  verifyCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      if (mounted.current) setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) console.warn('[auth] profiel laden mislukt', error.message);
    if (mounted.current) setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (mounted.current) setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted.current) return;
      setSession(nextSession);
      await loadProfile(nextSession?.user.id);
    });

    return () => {
      mounted.current = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id);
  }, [loadProfile, session?.user.id]);

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      isVolunteer:
        profile?.role === 'volunteer' || profile?.role === 'warehouse' || profile?.role === 'admin',
      isAdmin: profile?.role === 'admin',
      refreshProfile,
      signInWithEmail,
      verifyCode,
      signOut,
    }),
    [session, profile, initializing, refreshProfile, signInWithEmail, verifyCode, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth moet binnen AuthProvider gebruikt worden');
  return context;
}
