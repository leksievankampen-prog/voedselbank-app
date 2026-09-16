import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DietBadges } from '@/components/DietBadges';
import { Scanner } from '@/components/Scanner';
import {
  Banner,
  Body,
  Button,
  Card,
  Divider,
  Label,
  PackageBadge,
  Row,
  Screen,
  TextField,
  Title,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { useShift } from '@/context/ShiftProvider';
import { lookupPass, recordPickup, undoPickup } from '@/lib/api';
import { formatTime, fullName } from '@/lib/format';
import { normalizePassCode, parseScan } from '@/lib/qr';
import { colors, radius, spacing, type } from '@/theme';
import type { DietFlag, IntakeView } from '@/types/db';

type Result =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'unknown'; code: string }
  | { kind: 'found'; intake: IntakeView; offline: boolean }
  | { kind: 'handed'; intake: IntakeView; pickupId: string; at: string };

export default function Scannen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { profile, signOut } = useAuth();
  const { locations, location, setLocation } = useShift();

  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (raw: string) => {
    const code = parseScan(raw);
    if (!code) {
      setResult({ kind: 'unknown', code: raw });
      return;
    }
    setResult({ kind: 'searching' });
    const { intake, offline } = await lookupPass(code);
    setResult(intake ? { kind: 'found', intake, offline } : { kind: 'unknown', code });
  }, []);

  async function handOut(intake: IntakeView) {
    if (!location) return;
    setBusy(true);
    try {
      const pickup = await recordPickup(intake.profile_id, location.id, intake.package_type);
      setResult({ kind: 'handed', intake, pickupId: pickup.id, at: pickup.scanned_at });
    } catch {
      // Laat het resultaat staan zodat de vrijwilliger het opnieuw kan proberen.
    } finally {
      setBusy(false);
    }
  }

  async function undo(pickupId: string, intake: IntakeView) {
    setBusy(true);
    try {
      await undoPickup(pickupId);
      setResult({ kind: 'found', intake, offline: false });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult({ kind: 'idle' });
    setManual('');
  }

  const scanning = result.kind === 'idle' || result.kind === 'searching';

  return (
    <Screen>
      <Row>
        <View style={{ flex: 1 }}>
          <Title>{t('scan.title')}</Title>
        </View>
        {/* De vrijwilligerskant had geen enkele uitlogknop; wie hier eenmaal
            binnen was, kwam er niet meer uit. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.logout')}
          onPress={signOut}
          style={styles.uitloggen}
        >
          {profile ? <Text style={styles.who}>{profile.first_name}</Text> : null}
          <Ionicons name="log-out-outline" size={20} color={colors.inkMuted} />
        </Pressable>
      </Row>

      {/* Waar sta je vandaag? Bepaalt de loodslijst en waar de uitgifte op geboekt wordt. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
        {locations.map((item) => {
          const active = item.id === location?.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setLocation(item.id)}
              style={[styles.pickerItem, active && styles.pickerItemActive]}
            >
              <Text style={[styles.pickerLabel, active && { color: colors.onBrand }]}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {scanning ? (
        <>
          <Scanner onScan={search} paused={false} />
          <Body muted center>
            {t('scan.aim')}
          </Body>

          {showManual ? (
            <Card>
              <TextField
                label={t('scan.manualLabel')}
                value={manual}
                onChangeText={(value) => setManual(normalizePassCode(value))}
                autoCapitalize="characters"
                maxLength={9}
                style={{ fontSize: 24, letterSpacing: 3, textAlign: 'center' }}
              />
              <Button label={t('scan.manualButton')} icon="search" onPress={() => search(manual)} />
            </Card>
          ) : (
            <Button
              label={t('scan.manualEntry')}
              icon="keypad"
              variant="secondary"
              onPress={() => setShowManual(true)}
            />
          )}
        </>
      ) : null}

      {result.kind === 'unknown' ? (
        <>
          <Banner tone="danger" icon="close-circle" title={t('scan.notFound')} body={t('scan.notFoundBody')} />
          <Button label={t('scan.scanNext')} icon="scan" onPress={reset} />
        </>
      ) : null}

      {result.kind === 'found' || result.kind === 'handed' ? (
        <IntakeCard
          intake={result.intake}
          handedAt={result.kind === 'handed' ? result.at : null}
          offline={result.kind === 'found' ? result.offline : false}
          expectedLocationId={location?.id ?? null}
          busy={busy}
          language={language}
          onHandOut={() => handOut(result.intake)}
          onUndo={result.kind === 'handed' ? () => undo(result.pickupId, result.intake) : undefined}
          onNext={reset}
        />
      ) : null}
    </Screen>
  );
}

function IntakeCard({
  intake,
  handedAt,
  offline,
  expectedLocationId,
  busy,
  language,
  onHandOut,
  onUndo,
  onNext,
}: {
  intake: IntakeView;
  handedAt: string | null;
  offline: boolean;
  expectedLocationId: string | null;
  busy: boolean;
  language: string;
  onHandOut: () => void;
  onUndo?: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  const blocked = intake.status !== 'active';
  const wrongLocation =
    !!expectedLocationId && !!intake.location_id && intake.location_id !== expectedLocationId;
  const alreadyPicked = !!intake.picked_up_at && !handedAt;

  return (
    <View style={{ gap: spacing.md }}>
      {offline ? <Banner tone="info" icon="cloud-offline" title={t('common.offline')} /> : null}

      {intake.status === 'pending' ? (
        <Banner tone="warning" icon="time" title={t('result.pendingTitle')} body={t('result.pendingBody')} />
      ) : null}
      {intake.status === 'paused' ? (
        <Banner tone="warning" icon="pause-circle" title={t('result.pausedTitle')} body={t('result.pendingBody')} />
      ) : null}
      {intake.status === 'expired' || intake.status === 'rejected' ? (
        <Banner tone="danger" icon="alert-circle" title={t('result.expiredTitle')} body={t('result.pendingBody')} />
      ) : null}
      {wrongLocation ? (
        <Banner
          tone="warning"
          icon="location"
          title={t('result.wrongLocationTitle')}
          body={t('result.wrongLocationBody', { location: intake.location_name ?? '' })}
        />
      ) : null}
      {alreadyPicked ? (
        <Banner
          tone="danger"
          icon="repeat"
          title={t('result.alreadyPickedTitle')}
          body={t('result.alreadyPickedBody', {
            time: formatTime(intake.picked_up_at, language),
            location: intake.picked_up_location ?? '',
          })}
        />
      ) : null}

      <Card>
        <Row gap={spacing.lg}>
          <PackageBadge type={intake.package_type} size="xl" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{fullName(intake.first_name, intake.last_name)}</Text>
            <Text style={styles.meta}>
              {t('result.adultsChildren', { adults: intake.adults, children: intake.children })}
            </Text>
            <Text style={styles.passCode}>{intake.pass_code}</Text>
          </View>
        </Row>

        <Divider />

        <Label>{t('result.specialWishes')}</Label>
        <DietBadges
          flags={intake.diet_flags as DietFlag[]}
          allergiesText={intake.allergies_text}
        />

        {intake.notes ? (
          <>
            <Divider />
            <Label>{t('result.note')}</Label>
            <Text style={styles.notes}>{intake.notes}</Text>
          </>
        ) : null}

        <Divider />
        <Row gap={spacing.lg}>
          <View style={{ flex: 1 }}>
            <Label>{t('result.location')}</Label>
            <Text style={styles.meta}>{intake.location_name ?? '—'}</Text>
          </View>
          {intake.phone ? (
            <View style={{ flex: 1 }}>
              <Label>{t('result.phone')}</Label>
              <Text style={styles.meta}>{intake.phone}</Text>
            </View>
          ) : null}
        </Row>
      </Card>

      {handedAt ? (
        <>
          <View style={styles.confirmed}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={styles.confirmedLabel}>
              {t('result.handedOut', { time: formatTime(handedAt, language) })}
            </Text>
          </View>
          <Button label={t('scan.scanNext')} icon="scan" onPress={onNext} />
          {onUndo ? (
            <Button label={t('result.undo')} variant="ghost" onPress={onUndo} loading={busy} />
          ) : null}
        </>
      ) : (
        <>
          <Button
            label={t('result.handOut')}
            icon="checkmark-done"
            onPress={onHandOut}
            loading={busy}
            disabled={blocked}
          />
          <Button label={t('scan.scanNext')} variant="secondary" icon="scan" onPress={onNext} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  who: { ...type.small, color: colors.inkMuted },
  uitloggen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  picker: { gap: spacing.sm, paddingVertical: 2 },
  pickerItem: {
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerItemActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pickerLabel: { ...type.small, fontWeight: '700', color: colors.inkMuted },
  name: { ...type.display, fontSize: 26, lineHeight: 32, color: colors.ink },
  meta: { ...type.body, color: colors.inkMuted },
  passCode: { ...type.small, color: colors.inkFaint, letterSpacing: 1.5 },
  notes: { ...type.body, color: colors.ink },
  confirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  confirmedLabel: { ...type.bodyStrong, color: colors.success },
});
