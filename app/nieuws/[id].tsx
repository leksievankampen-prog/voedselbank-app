import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Loading, Screen } from '@/components/ui';
import { useLanguage } from '@/context/LanguageProvider';
import { formatDate } from '@/lib/format';
import { newsText } from '@/lib/news';
import { supabase } from '@/lib/supabase';
import { colors, spacing, type } from '@/theme';
import type { NewsItem } from '@/types/db';

export default function NieuwsDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<NewsItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setItem(data as NewsItem);
        else setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <Screen>
        <Card>
          <Text style={styles.title}>{t('common.errorTitle')}</Text>
          <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <Loading label={t('common.loading')} />
      </Screen>
    );
  }

  const { title, body } = newsText(item, language);

  return (
    <Screen>
      <Button
        label={t('common.back')}
        icon="arrow-back"
        variant="ghost"
        fullWidth={false}
        onPress={() => router.back()}
      />

      <View style={{ gap: spacing.sm }}>
        {item.urgent ? (
          <View style={styles.urgentTag}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.urgentLabel}>{t('news.urgent')}</Text>
          </View>
        ) : null}
        <Text style={styles.date}>{formatDate(item.published_at, language)}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Card>
        <Text style={styles.body}>{body}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  urgentTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  urgentLabel: { ...type.label, color: colors.danger, textTransform: 'uppercase' },
  date: { ...type.small, color: colors.inkMuted },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, fontSize: 17, lineHeight: 27, color: colors.ink },
});
