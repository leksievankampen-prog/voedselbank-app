import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { fetchLocations } from '@/lib/api';
import { dayKey, formatClock, mapsHref, telHref } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';
import type { Location } from '@/types/db';

export default function Locaties() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [locations, setLocations] = useState<Location[] | null>(null);

  useEffect(() => {
    fetchLocations().then(setLocations);
  }, []);

  return (
    <Screen>
      <Title>{t('locations.title')}</Title>

      {locations === null ? <Loading /> : null}

      {locations?.map((location) => {
        const mine = location.id === profile?.location_id;
        return (
          <Card key={location.id} tone={mine ? 'brand' : 'plain'}>
            <Row>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{location.name}</Text>
                <Text style={styles.venue}>{location.venue}</Text>
              </View>
              {mine ? (
                <View style={styles.mineTag}>
                  <Ionicons name="star" size={13} color={colors.brandDarker} />
                  <Text style={styles.mineLabel}>{t('locations.yourLocation')}</Text>
                </View>
              ) : null}
            </Row>

            <View style={{ gap: 2 }}>
              <Text style={styles.address}>{location.street}</Text>
              <Text style={styles.address}>
                {location.postcode} {location.city}
              </Text>
            </View>

            <View style={styles.timeBox}>
              <Ionicons name="time-outline" size={18} color={colors.brandDark} />
              <Text style={styles.time}>
                {t('locations.openOn', {
                  day: t(dayKey(location.weekday, true)),
                  from: formatClock(location.opens_at),
                  to: formatClock(location.closes_at),
                })}
              </Text>
            </View>

            <Label>
              {t('locations.questionsOn', { day: t(dayKey(location.weekday, true)) })} ·{' '}
              {location.phone}
            </Label>

            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('locations.call')}
                  icon="call"
                  variant="secondary"
                  onPress={() => Linking.openURL(telHref(location.phone))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('locations.route')}
                  icon="navigate"
                  variant="secondary"
                  onPress={() =>
                    Linking.openURL(mapsHref(location.street, location.postcode, location.city))
                  }
                />
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...type.heading, color: colors.ink },
  venue: { ...type.small, color: colors.inkMuted },
  address: { ...type.body, color: colors.ink },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  time: { ...type.bodyStrong, color: colors.brandDarker },
  mineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  mineLabel: { ...type.label, color: colors.brandDarker },
});
