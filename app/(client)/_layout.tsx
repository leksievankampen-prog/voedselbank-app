import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthProvider';
import { colors, type } from '@/theme';

export default function ClientLayout() {
  const { t } = useTranslation();
  const { session, initializing } = useAuth();

  if (initializing) return null;
  if (!session) return <Redirect href="/(auth)/welkom" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandDark,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 72, paddingBottom: 8 },
        tabBarLabelStyle: { ...type.label, marginBottom: 2 },
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="pas"
        options={{
          title: t('tabs.pass'),
          tabBarIcon: ({ color, size }) => <Ionicons name="qr-code" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nieuws"
        options={{
          title: t('tabs.news'),
          tabBarIcon: ({ color, size }) => <Ionicons name="megaphone" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="locaties"
        options={{
          title: t('tabs.locations'),
          tabBarIcon: ({ color, size }) => <Ionicons name="location" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gegevens"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
