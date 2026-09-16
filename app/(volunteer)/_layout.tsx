import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthProvider';
import { ShiftProvider } from '@/context/ShiftProvider';
import { colors, type } from '@/theme';

export default function VolunteerLayout() {
  const { t } = useTranslation();
  const { session, isVolunteer, isAdmin, initializing } = useAuth();

  if (initializing) return null;
  if (!session) return <Redirect href="/(auth)/welkom" />;
  // Een klant die dit adres intypt hoort hier niet; terug naar zijn eigen pas.
  if (!isVolunteer) return <Redirect href="/(client)/pas" />;

  return (
    <ShiftProvider>
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
          name="scannen"
          options={{
            title: t('tabs.scan'),
            tabBarIcon: ({ color, size }) => <Ionicons name="scan" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="loods"
          options={{
            title: t('tabs.warehouse'),
            tabBarIcon: ({ color, size }) => <Ionicons name="cube" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="beheer"
          options={{
            title: t('tabs.manage'),
            href: isAdmin ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
          }}
        />
      </Tabs>
    </ShiftProvider>
  );
}
