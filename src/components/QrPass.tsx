import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PackageBadge } from '@/components/ui';
import { encodePass } from '@/lib/qr';
import { colors, radius, shadow, spacing, type } from '@/theme';
import type { PackageType } from '@/types/db';

export function QrPass({
  passCode,
  name,
  packageType,
  locationName,
}: {
  passCode: string;
  name: string;
  packageType: PackageType;
  locationName?: string | null;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  // Groot genoeg om vanaf een tafel te scannen, klein genoeg voor een iPhone SE.
  const size = Math.min(280, Math.max(180, width - 112));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {locationName ? (
            <Text style={styles.location}>
              {t('pass.locationLabel')}: {locationName}
            </Text>
          ) : null}
        </View>
        <PackageBadge type={packageType} />
      </View>

      <View style={styles.qrWrap}>
        <QRCode
          value={encodePass(passCode)}
          size={size}
          color={colors.ink}
          backgroundColor={colors.surface}
          ecl="M"
          quietZone={8}
        />
      </View>

      <View style={styles.codeBlock}>
        <Text style={styles.codeLabel}>{t('pass.passCode')}</Text>
        <Text style={styles.code} accessibilityLabel={passCode.split('').join(' ')}>
          {passCode}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
    alignItems: 'stretch',
    ...shadow.raised,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  name: { ...type.title, color: colors.ink },
  location: { ...type.small, color: colors.inkMuted },
  qrWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  codeBlock: {
    alignItems: 'center',
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  codeLabel: {
    ...type.label,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  code: { ...type.mono, color: colors.ink },
});
