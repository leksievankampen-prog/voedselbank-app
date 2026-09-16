import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DietBadges } from '@/components/DietBadges';
import {
  Banner,
  Body,
  Button,
  Card,
  Divider,
  EmptyState,
  Label,
  Loading,
  PackageBadge,
  Row,
  Screen,
  TextField,
  Title,
} from '@/components/ui';
import { useShift } from '@/context/ShiftProvider';
import {
  fetchPendingProfiles,
  publishNews,
  setProfileStatus,
  type NewsInput,
} from '@/lib/api';
import { fullName } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';
import type { DietFlag, Profile } from '@/types/db';

const EMPTY_NEWS: NewsInput = {
  title_nl: '',
  title_en: '',
  title_ar: '',
  body_nl: '',
  body_en: '',
  body_ar: '',
  urgent: false,
  location_id: null,
};

export default function Beheer() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'news' | 'clients'>('news');

  return (
    <Screen>
      <Title>{t('manage.title')}</Title>

      <View style={styles.tabs}>
        {(['news', 'clients'] as const).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
              {t(key === 'news' ? 'manage.newsTab' : 'manage.clientsTab')}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'news' ? <NewsComposer /> : <PendingClients />}
    </Screen>
  );
}

/* ------------------------------------------------------------- nieuws ----- */

function NewsComposer() {
  const { t } = useTranslation();
  const { locations } = useShift();

  const [draft, setDraft] = useState<NewsInput>(EMPTY_NEWS);
  const [sendPush, setSendPush] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NewsInput>(key: K, value: NewsInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const canPublish = draft.title_nl.trim().length > 0 && draft.body_nl.trim().length > 0;

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      await publishNews(draft, sendPush);
      setDraft(EMPTY_NEWS);
      setDone(true);
    } catch {
      setError(t('common.errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {done ? (
        <Banner tone="success" icon="checkmark-circle" title={t('manage.published')} />
      ) : null}
      {error ? <Banner tone="danger" icon="alert-circle" title={t('common.errorTitle')} body={error} /> : null}

      <Card>
        <Label>{t('manage.newMessage')}</Label>
        <Body muted>{t('manage.translationsHint')}</Body>

        {(['nl', 'en', 'ar'] as const).map((code) => (
          <View key={code} style={{ gap: spacing.sm }}>
            <View style={styles.langTag}>
              <Text style={styles.langTagLabel}>{code.toUpperCase()}</Text>
            </View>
            <TextField
              label={t('manage.messageTitle')}
              value={draft[`title_${code}`]}
              onChangeText={(value) => update(`title_${code}`, value)}
              style={code === 'ar' ? { textAlign: 'right' } : undefined}
            />
            <TextField
              label={t('manage.messageBody')}
              value={draft[`body_${code}`]}
              onChangeText={(value) => update(`body_${code}`, value)}
              multiline
              style={[
                { minHeight: 110, paddingTop: spacing.md },
                code === 'ar' ? { textAlign: 'right' } : null,
              ]}
            />
          </View>
        ))}
      </Card>

      <Card>
        <Label>{t('manage.target')}</Label>
        <View style={styles.targets}>
          <Pressable
            onPress={() => update('location_id', null)}
            accessibilityRole="radio"
            accessibilityState={{ selected: draft.location_id === null }}
            style={[styles.target, draft.location_id === null && styles.targetActive]}
          >
            <Text style={[styles.targetLabel, draft.location_id === null && styles.targetLabelActive]}>
              {t('manage.targetAll')}
            </Text>
          </Pressable>
          {locations.map((location) => {
            const active = draft.location_id === location.id;
            return (
              <Pressable
                key={location.id}
                onPress={() => update('location_id', location.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.target, active && styles.targetActive]}
              >
                <Text style={[styles.targetLabel, active && styles.targetLabelActive]}>
                  {location.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Divider />

        <Row gap={spacing.md}>
          <Text style={[styles.switchLabel, { flex: 1 }]}>{t('manage.urgentLabel')}</Text>
          <Switch
            value={draft.urgent}
            onValueChange={(value) => update('urgent', value)}
            trackColor={{ true: colors.brand, false: colors.borderStrong }}
            thumbColor={colors.surface}
          />
        </Row>
        <Row gap={spacing.md}>
          <Text style={[styles.switchLabel, { flex: 1 }]}>{t('manage.sendPush')}</Text>
          <Switch
            value={sendPush}
            onValueChange={setSendPush}
            trackColor={{ true: colors.brand, false: colors.borderStrong }}
            thumbColor={colors.surface}
          />
        </Row>
      </Card>

      <Button
        label={t('manage.publish')}
        icon="send"
        onPress={publish}
        loading={busy}
        disabled={!canPublish}
      />
    </>
  );
}

/* -------------------------------------------------------- aanmeldingen ---- */

function PendingClients() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfiles(await fetchPendingProfiles());
    } catch {
      setProfiles([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, status: 'active' | 'rejected') {
    setBusyId(id);
    try {
      await setProfileStatus(id, status);
      setProfiles((current) => (current ?? []).filter((item) => item.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  if (profiles === null) return <Loading />;
  if (profiles.length === 0) {
    return <EmptyState icon="checkmark-done-outline" message={t('manage.noPending')} />;
  }

  return (
    <>
      {profiles.map((profile) => (
        <Card key={profile.id}>
          <Row gap={spacing.lg}>
            <PackageBadge type={profile.package_type} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{fullName(profile.first_name, profile.last_name)}</Text>
              <Text style={styles.meta}>
                {profile.street} {profile.house_number}, {profile.postcode} {profile.city}
              </Text>
              <Text style={styles.meta}>
                {t('result.adultsChildren', {
                  adults: profile.adults,
                  children: profile.children,
                })}
              </Text>
            </View>
          </Row>

          {profile.diet_flags.length > 0 || profile.allergies_text ? (
            <DietBadges
              flags={profile.diet_flags as DietFlag[]}
              allergiesText={profile.allergies_text}
              size="sm"
            />
          ) : null}

          {profile.notes ? <Text style={styles.meta}>{profile.notes}</Text> : null}

          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('manage.approve')}
                icon="checkmark"
                onPress={() => decide(profile.id, 'active')}
                loading={busyId === profile.id}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={t('manage.reject')}
                icon="close"
                variant="danger"
                onPress={() => decide(profile.id, 'rejected')}
              />
            </View>
          </Row>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.brand },
  tabLabel: { ...type.bodyStrong, color: colors.inkMuted },
  tabLabelActive: { color: colors.onBrand },
  langTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  langTagLabel: { ...type.label, color: colors.brandDarker, letterSpacing: 1 },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  target: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  targetActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  targetLabel: { ...type.small, fontWeight: '700', color: colors.inkMuted },
  targetLabelActive: { color: colors.onBrand },
  switchLabel: { ...type.body, color: colors.ink },
  name: { ...type.heading, color: colors.ink },
  meta: { ...type.small, color: colors.inkMuted },
});
