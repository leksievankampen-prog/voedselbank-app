import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/context/LanguageProvider';
import { colors, HIT_SIZE, packageColors, radius, shadow, spacing, type } from '@/theme';
import type { PackageType } from '@/types/db';

/* --------------------------------------------------------------- Screen --- */

export function Screen({
  children,
  scroll = true,
  padded = true,
  background = colors.canvas,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  footer?: React.ReactNode;
}) {
  // De leesrichting wordt centraal gezet (dir op web, I18nManager op native),
  // dus die hoeft hier niet per scherm herhaald te worden.
  const content = (
    <View style={padded ? { padding: spacing.lg, gap: spacing.lg } : undefined}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: background }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------- typography -- */

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Body({
  children,
  muted,
  center,
}: {
  children: React.ReactNode;
  muted?: boolean;
  center?: boolean;
}) {
  return (
    <Text style={[styles.body, muted && { color: colors.inkMuted }, center && { textAlign: 'center' }]}>
      {children}
    </Text>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/* ------------------------------------------------------------------ Card --- */

export function Card({
  children,
  tone = 'plain',
  style,
}: {
  children: React.ReactNode;
  tone?: 'plain' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  style?: ViewStyle;
}) {
  const tones: Record<string, ViewStyle> = {
    plain: { backgroundColor: colors.surface, borderColor: colors.border },
    brand: { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
    success: { backgroundColor: colors.successSoft, borderColor: '#B4DCC6' },
    warning: { backgroundColor: colors.warningSoft, borderColor: '#F0D3A0' },
    danger: { backgroundColor: colors.dangerSoft, borderColor: '#F3C4C0' },
    info: { backgroundColor: colors.infoSoft, borderColor: '#B9D4E8' },
  };
  return <View style={[styles.card, tones[tone], style]}>{children}</View>;
}

/* ---------------------------------------------------------------- Button --- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const palettes: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.brand, fg: colors.onBrand, border: colors.brand },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.brandDark, border: 'transparent' },
    danger: { bg: colors.surface, fg: colors.danger, border: '#F3C4C0' },
  };
  const palette = palettes[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityLabel={label}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={palette.fg} /> : null}
          <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------- TextField --- */

export function TextField({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const { rtl } = useLanguage();
  return (
    <View style={{ gap: spacing.xs }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.inkFaint}
        {...props}
        style={[
          styles.input,
          { textAlign: rtl ? 'right' : 'left' },
          error ? { borderColor: colors.danger, backgroundColor: colors.dangerSoft } : null,
          props.style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/* --------------------------------------------------------------- Stepper --- */

/** Plusknop/minknop in plaats van een toetsenbord — sneller en minder foutgevoelig. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.body, styles.flex]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} −1`}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.stepperButton}
        >
          <Ionicons name="remove" size={22} color={value <= min ? colors.inkFaint : colors.ink} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} +1`}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={styles.stepperButton}
        >
          <Ionicons name="add" size={22} color={value >= max ? colors.inkFaint : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Chip --- */

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={{ checked: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, !onPress && { opacity: 1 }]}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={selected ? colors.brandDarker : colors.inkMuted} />
      ) : null}
      <Text style={[styles.chipLabel, selected && { color: colors.brandDarker }]}>{label}</Text>
      {onPress ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={selected ? colors.brand : colors.borderStrong}
        />
      ) : null}
    </Pressable>
  );
}

/* --------------------------------------------------------- PackageBadge ---- */

export function PackageBadge({ type, size = 'md' }: { type: PackageType; size?: 'md' | 'xl' }) {
  const palette = packageColors[type];
  const big = size === 'xl';
  return (
    <View
      accessibilityLabel={`Pakket ${type}`}
      style={[
        styles.packageBadge,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          width: big ? 84 : 44,
          height: big ? 84 : 44,
          borderRadius: big ? radius.xl : radius.md,
        },
      ]}
    >
      <Text style={{ color: palette.fg, fontWeight: '800', fontSize: big ? 44 : 22 }}>{type}</Text>
    </View>
  );
}

/* ----------------------------------------------------------------- misc ---- */

export function Divider() {
  return <View style={styles.divider} />;
}

export function Row({ children, gap = spacing.sm }: { children: React.ReactNode; gap?: number }) {
  return <View style={[styles.row, { gap }]}>{children}</View>;
}

export function Banner({
  tone = 'info',
  title,
  body,
  icon,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'brand';
  title: string;
  body?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const iconColors: Record<string, string> = {
    info: colors.info,
    warning: colors.warning,
    danger: colors.danger,
    success: colors.success,
    brand: colors.brandDark,
  };
  return (
    <Card tone={tone}>
      <View style={[styles.row, { gap: spacing.md, alignItems: 'flex-start' }]}>
        <Ionicons
          name={icon ?? 'information-circle'}
          size={22}
          color={iconColors[tone]}
          style={{ marginTop: 1 }}
        />
        <View style={[styles.flex, { gap: spacing.xs }]}>
          <Text style={styles.bannerTitle}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
        </View>
      </View>
    </Card>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.brand} size="large" />
      {label ? <Text style={[styles.body, { color: colors.inkMuted }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.borderStrong} />
      <Text style={[styles.body, { color: colors.inkMuted, textAlign: 'center' }]}>{message}</Text>
    </View>
  );
}

export function Logo({ height = 34 }: { height?: number }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      accessibilityLabel="Voedselbank Haarlemmermeer"
      resizeMode="contain"
      style={{ height, width: height * (220 / 59) }}
    />
  );
}

/* --------------------------------------------------------------- styles ---- */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { ...type.title, color: colors.ink },
  heading: { ...type.heading, color: colors.ink },
  body: { ...type.body, color: colors.ink },
  label: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  bannerTitle: { ...type.bodyStrong, color: colors.ink },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  button: {
    minHeight: HIT_SIZE + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLabel: { ...type.bodyStrong, fontSize: 17 },
  input: {
    minHeight: HIT_SIZE,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.ink,
  },
  error: { ...type.small, color: colors.danger },
  hint: { ...type.small, color: colors.inkMuted },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  stepperButton: { width: HIT_SIZE, height: HIT_SIZE, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { ...type.heading, minWidth: 32, textAlign: 'center', color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: HIT_SIZE,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipLabel: { ...type.body, flex: 1, color: colors.ink },
  packageBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  loading: { padding: spacing.xxxl, alignItems: 'center', gap: spacing.md },
  empty: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
