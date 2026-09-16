import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Body, Button, Card, Screen, Title } from '@/components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Title>{t('common.errorTitle')}</Title>
        <Body muted>{t('common.errorGeneric')}</Body>
        <Button label={t('common.ok')} icon="home" onPress={() => router.replace('/')} />
      </Card>
    </Screen>
  );
}
