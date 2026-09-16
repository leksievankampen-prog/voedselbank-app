import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Body, Button, Card, Logo, Screen, Title } from '@/components/ui';
import { spacing } from '@/theme';

export default function Welkom() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo height={44} />
      </View>

      <LanguageSwitcher />

      <Card tone="brand">
        <Title>{t('auth.welcomeTitle')}</Title>
        <Body>{t('auth.welcomeBody')}</Body>
      </Card>

      <View style={{ gap: spacing.md }}>
        {/* Eén knop. Er stonden er twee — "ik ben klant" en "ik ben
            vrijwilliger" — maar die gingen naar hetzelfde scherm, want de rol
            komt uit de database. Een keuze die niets doet, hoort er niet. */}
        <Button label={t('auth.verify')} icon="log-in" onPress={() => router.push('/(auth)/inloggen')} />
        <Body muted>{t('auth.sameLogin')}</Body>
      </View>

      <Body muted>{t('auth.privacyNotice')}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
