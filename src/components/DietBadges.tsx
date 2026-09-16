import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';
import type { DietFlag } from '@/types/db';

const ICONS: Record<DietFlag, keyof typeof Ionicons.glyphMap> = {
  halal: 'moon',
  vegetarian: 'leaf',
  noPork: 'close-circle',
  noAlcohol: 'wine',
  glutenFree: 'nutrition',
  lactoseFree: 'water',
  nutAllergy: 'warning',
  diabetes: 'medkit',
  babyFood: 'happy',
};

/** Allergieën zijn een veiligheidskwestie; die krijgen rood, wensen krijgen oranje. */
const ALERT_FLAGS: DietFlag[] = ['nutAllergy', 'glutenFree', 'lactoseFree', 'diabetes'];

export function DietBadges({
  flags,
  allergiesText,
  size = 'md',
}: {
  flags: DietFlag[];
  allergiesText?: string | null;
  size?: 'sm' | 'md';
}) {
  const { t } = useTranslation();

  if (flags.length === 0 && !allergiesText) {
    return <Text style={styles.none}>{t('diet.noneSelected')}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {flags.map((flag) => {
        const alert = ALERT_FLAGS.includes(flag);
        return (
          <View
            key={flag}
            style={[
              styles.badge,
              size === 'sm' && styles.badgeSm,
              alert ? styles.badgeAlert : styles.badgeWish,
            ]}
          >
            <Ionicons
              name={ICONS[flag]}
              size={size === 'sm' ? 13 : 15}
              color={alert ? colors.danger : colors.brandDarker}
            />
            <Text
              style={[
                styles.badgeLabel,
                size === 'sm' && { fontSize: 13 },
                { color: alert ? colors.danger : colors.brandDarker },
              ]}
            >
              {t(`diet.${flag}`)}
            </Text>
          </View>
        );
      })}
      {allergiesText ? (
        <View style={[styles.badge, size === 'sm' && styles.badgeSm, styles.badgeAlert]}>
          <Ionicons name="alert-circle" size={size === 'sm' ? 13 : 15} color={colors.danger} />
          <Text style={[styles.badgeLabel, { color: colors.danger }]}>{allergiesText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeSm: { paddingVertical: 5, paddingHorizontal: spacing.sm },
  badgeWish: { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
  badgeAlert: { backgroundColor: colors.dangerSoft, borderColor: '#F3C4C0' },
  badgeLabel: { ...type.small, fontWeight: '700' },
  none: { ...type.body, color: colors.inkMuted },
});
