import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '@/context/LanguageProvider';
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n';
import { colors, radius, spacing, type } from '@/theme';

const NATIVE_NAMES: Record<Language, string> = {
  nl: 'Nederlands',
  en: 'English',
  ar: 'العربية',
};

/**
 * Talen staan altijd in hun eigen schrift. Iemand die de app in het Arabisch
 * wil, moet niet eerst Nederlands hoeven lezen om die knop te vinden.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <View style={{ gap: spacing.sm }}>
      {!compact ? <Text style={styles.caption}>{t('common.language')}</Text> : null}
      <View style={styles.group} accessibilityRole="radiogroup">
        {SUPPORTED_LANGUAGES.map((code) => {
          const active = code === language;
          return (
            <Pressable
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={NATIVE_NAMES[code]}
              onPress={() => changeLanguage(code)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {compact ? code.toUpperCase() : NATIVE_NAMES[code]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { ...type.label, color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  group: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  optionActive: { backgroundColor: colors.brand },
  optionLabel: { ...type.bodyStrong, color: colors.inkMuted },
  optionLabelActive: { color: colors.onBrand },
});
