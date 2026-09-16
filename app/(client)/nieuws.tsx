import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Loading, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { fetchNews } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { newsText } from '@/lib/news';
import { colors, radius, shadow, spacing, type } from '@/theme';
import type { NewsItem } from '@/types/db';

export default function Nieuws() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useLanguage();
  const { profile } = useAuth();

  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await fetchNews(profile?.location_id));
    } catch {
      setItems([]);
    }
  }, [profile?.location_id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Title>{t('news.title')}</Title>

        {items === null ? <Loading /> : null}
        {items?.length === 0 ? <EmptyState icon="megaphone-outline" message={t('news.empty')} /> : null}

        {items?.map((item) => {
          const { title, body } = newsText(item, language);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(`/nieuws/${item.id}`)}
              style={({ pressed }) => [
                styles.item,
                item.urgent && styles.itemUrgent,
                pressed && { opacity: 0.85 },
              ]}
            >
              {item.urgent ? (
                <View style={styles.urgentTag}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.urgentLabel}>{t('news.urgent')}</Text>
                </View>
              ) : null}
              <Text style={styles.date}>{formatDate(item.published_at, language)}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.excerpt} numberOfLines={3}>
                {body}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  itemUrgent: { borderColor: '#F3C4C0', backgroundColor: colors.dangerSoft },
  urgentTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  urgentLabel: { ...type.label, color: colors.danger, textTransform: 'uppercase' },
  date: { ...type.small, color: colors.inkMuted },
  title: { ...type.heading, color: colors.ink },
  excerpt: { ...type.body, color: colors.inkMuted },
});
