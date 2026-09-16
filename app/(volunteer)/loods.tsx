import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DietBadges } from '@/components/DietBadges';
import { Card, EmptyState, Label, Loading, PackageBadge, Row, Title } from '@/components/ui';
import { useLanguage } from '@/context/LanguageProvider';
import { useShift } from '@/context/ShiftProvider';
import { fetchCachedRoster, fetchWarehouseList, type WarehouseRow } from '@/lib/api';
import { formatTime, fullName } from '@/lib/format';
import { PACKAGE_TYPES } from '@/lib/packages';
import { colors, packageColors, radius, spacing, type } from '@/theme';
import type { DietFlag } from '@/types/db';

export default function Loods() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { locations, location, setLocation } = useShift();

  const [rows, setRows] = useState<WarehouseRow[] | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!location) return;
    try {
      setRows(await fetchWarehouseList(location.id));
      setSyncedAt(new Date());
      setOffline(false);
    } catch {
      // Geen verbinding in het dorpshuis: werk verder met de ochtendlijst.
      setRows(await fetchCachedRoster());
      setOffline(true);
    }
  }, [location]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const counts = useMemo(() => {
    const byType = Object.fromEntries(PACKAGE_TYPES.map((letter) => [letter, 0])) as Record<
      string,
      number
    >;
    let handed = 0;
    for (const row of rows ?? []) {
      byType[row.package_type] = (byType[row.package_type] ?? 0) + 1;
      if (row.picked_up_at) handed++;
    }
    return { byType, handed, total: rows?.length ?? 0 };
  }, [rows]);

  const specials = useMemo(
    () => (rows ?? []).filter((row) => row.diet_flags.length > 0 || row.allergies_text),
    [rows],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        <View style={{ gap: spacing.xs }}>
          <Title>{t('warehouse.title')}</Title>
          <Text style={styles.subtitle}>
            {t('warehouse.subtitle', { location: location?.name ?? '' })}
          </Text>
        </View>

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

        {rows === null ? <Loading /> : null}

        {rows !== null ? (
          <>
            <Row gap={spacing.md}>
              <Stat label={t('warehouse.expected')} value={counts.total} />
              <Stat label={t('warehouse.handedOut')} value={counts.handed} tone="success" />
              <Stat label={t('warehouse.remaining')} value={counts.total - counts.handed} tone="brand" />
            </Row>

            <Card>
              <Label>{t('warehouse.byType')}</Label>
              <View style={styles.typeGrid}>
                {PACKAGE_TYPES.map((letter) => (
                  <View
                    key={letter}
                    style={[
                      styles.typeTile,
                      {
                        backgroundColor: packageColors[letter].bg,
                        borderColor: packageColors[letter].border,
                      },
                    ]}
                  >
                    <Text style={[styles.typeLetter, { color: packageColors[letter].fg }]}>
                      {letter}
                    </Text>
                    <Text style={[styles.typeCount, { color: packageColors[letter].fg }]}>
                      {counts.byType[letter] ?? 0}
                    </Text>
                    <Text style={styles.typeHint}>{t(`packages.${letter}`)}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <Row>
                <View style={{ flex: 1 }}>
                  <Label>{t('warehouse.specialsTitle')}</Label>
                </View>
                {offline ? (
                  <Ionicons name="cloud-offline" size={18} color={colors.warning} />
                ) : syncedAt ? (
                  <Text style={styles.sync}>
                    {t('warehouse.lastSync', { time: formatTime(syncedAt, language) })}
                  </Text>
                ) : null}
              </Row>

              {specials.length === 0 ? (
                <Text style={styles.subtitle}>{t('warehouse.specialsEmpty')}</Text>
              ) : (
                specials.map((row) => (
                  <View key={row.profile_id} style={styles.specialRow}>
                    <PackageBadge type={row.package_type} />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text style={styles.specialName}>
                        {fullName(row.first_name, row.last_name)}
                      </Text>
                      <DietBadges
                        flags={row.diet_flags as DietFlag[]}
                        allergiesText={row.allergies_text}
                        size="sm"
                      />
                    </View>
                    {row.picked_up_at ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    ) : null}
                  </View>
                ))
              )}
            </Card>

            {counts.total === 0 ? (
              <EmptyState icon="cube-outline" message={t('warehouse.listEmpty')} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: number;
  tone?: 'plain' | 'success' | 'brand';
}) {
  const tones = {
    plain: { bg: colors.surface, fg: colors.ink, border: colors.border },
    success: { bg: colors.successSoft, fg: colors.success, border: '#B4DCC6' },
    brand: { bg: colors.brandSoft, fg: colors.brandDarker, border: colors.brandBorder },
  }[tone];

  return (
    <View style={[styles.stat, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      <Text style={[styles.statValue, { color: tones.fg }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...type.body, color: colors.inkMuted },
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
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { ...type.small, color: colors.inkMuted, textAlign: 'center' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeTile: {
    flexGrow: 1,
    flexBasis: 96,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  typeLetter: { fontSize: 18, fontWeight: '800' },
  typeCount: { fontSize: 30, fontWeight: '800' },
  typeHint: { ...type.small, fontSize: 12, color: colors.inkMuted, textAlign: 'center' },
  specialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  specialName: { ...type.bodyStrong, color: colors.ink },
  sync: { ...type.small, color: colors.inkFaint },
});
