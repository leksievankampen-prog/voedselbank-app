import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { colors } from '@/theme';

/**
 * Eén plek die bepaalt waar iemand terechtkomt:
 * niet ingelogd -> welkom, vrijwilliger -> scanscherm, klant -> zijn pas,
 * en een klant zonder ingevuld profiel eerst naar het aanmeldformulier.
 */
export default function Index() {
  const { session, profile, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <Loading />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welkom" />;

  if (profile && profile.role !== 'client') return <Redirect href="/(volunteer)/scannen" />;

  if (!profile || !profile.first_name || !profile.location_id) {
    return <Redirect href="/(auth)/aanmelden" />;
  }

  return <Redirect href="/(client)/pas" />;
}
