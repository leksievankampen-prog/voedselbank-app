import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthProvider';
import { LanguageProvider, useLanguage } from '@/context/LanguageProvider';
import '@/i18n';
import { configureForegroundHandler } from '@/lib/notifications';
import { colors } from '@/theme';

function Navigation() {
  const { ready } = useLanguage();

  // Wachten tot de opgeslagen taal geladen is, anders flitst het Nederlands
  // even in beeld bij iemand die de app in het Arabisch gebruikt.
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(volunteer)" />
      <Stack.Screen name="nieuws/[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    configureForegroundHandler();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Navigation />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
