import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DietBadges } from '@/components/DietBadges';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Banner, Body, Button, Card, Divider, Label, Row, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { deleteOwnAccount, fetchLocations } from '@/lib/api';
import { fullName } from '@/lib/format';
import {
  currentPermission,
  registerForPush,
  unregisterPush,
  type PermissionState,
} from '@/lib/notifications';
import { colors, spacing, type } from '@/theme';
import type { DietFlag, Location } from '@/types/db';

export default function Gegevens() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [permission, setPermission] = useState<PermissionState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchLocations().then(setLocations);
    currentPermission().then(setPermission);
  }, []);

  if (!profile) return null;

  const location = locations.find((item) => item.id === profile.location_id);

  async function togglePush(enabled: boolean) {
    if (!profile) return;
    setBusy(true);
    if (enabled) {
      setPermission(await registerForPush(profile.id));
    } else {
      await unregisterPush(profile.id);
      setPermission('default');
    }
    setBusy(false);
  }

  function confirmDelete() {
    const remove = async () => {
      try {
        await deleteOwnAccount();
        router.replace('/(auth)/welkom');
      } catch {
        // Blijft ingelogd; de gebruiker kan het opnieuw proberen.
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(t('profile.deleteConfirm'))) remove();
      return;
    }
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.deleteAccount'), style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <Screen>
      <Title>{t('profile.title')}</Title>

      <Card>
        <Label>{t('profile.personal')}</Label>
        <Text style={styles.value}>{fullName(profile.first_name, profile.last_name)}</Text>
        <Text style={styles.muted}>
          {profile.street} {profile.house_number}
        </Text>
        <Text style={styles.muted}>
          {profile.postcode} {profile.city}
        </Text>
        <Text style={styles.muted}>{profile.phone}</Text>
        <Divider />
        <Label>{t('profile.household')}</Label>
        <Text style={styles.value}>
          {t('result.adultsChildren', { adults: profile.adults, children: profile.children })} ·{' '}
          {t('packages.label', { type: profile.package_type })}
        </Text>
        <Divider />
        <Label>{t('profile.location')}</Label>
        <Text style={styles.value}>{location ? `${location.name} — ${location.venue}` : '—'}</Text>
        <Divider />
        <Label>{t('profile.diet')}</Label>
        <DietBadges
          flags={profile.diet_flags as DietFlag[]}
          allergiesText={profile.allergies_text}
          size="sm"
        />
        <Button
          label={t('profile.edit')}
          icon="create"
          variant="secondary"
          onPress={() => router.push('/(auth)/aanmelden')}
        />
      </Card>

      <Card>
        <Label>{t('profile.notifications')}</Label>
        <Row gap={spacing.md}>
          <Text style={[styles.value, { flex: 1 }]}>{t('profile.notificationsOn')}</Text>
          <Switch
            value={permission === 'granted'}
            onValueChange={togglePush}
            disabled={busy || permission === 'unsupported'}
            trackColor={{ true: colors.brand, false: colors.borderStrong }}
            thumbColor={colors.surface}
          />
        </Row>
        {permission === 'denied' ? (
          <Body muted>{t('profile.notificationsBlocked')}</Body>
        ) : null}
        {permission === 'unsupported' && Platform.OS === 'web' ? (
          <Banner
            tone="info"
            icon="phone-portrait-outline"
            title={t('profile.notifications')}
            body="iPhone: open het deelmenu in Safari en kies 'Zet op beginscherm'. Daarna kun je meldingen aanzetten."
          />
        ) : null}
      </Card>

      <Card>
        <LanguageSwitcher />
      </Card>

      <Button label={t('auth.logout')} icon="log-out" variant="secondary" onPress={signOut} />

      <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteRow}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteLabel}>{t('profile.deleteAccount')}</Text>
      </Pressable>

      <Body muted>{t('auth.privacyNotice')}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { ...type.body, color: colors.ink },
  muted: { ...type.body, color: colors.inkMuted },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
  },
  deleteLabel: { ...type.body, color: colors.danger },
});
