import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { DietBadges } from '@/components/DietBadges';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { QrPass } from '@/components/QrPass';
import { Banner, Body, Card, Label, Logo, Row, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { fetchLocations } from '@/lib/api';
import { dayKey, formatClock, formatDate, fullName, nextOccurrence } from '@/lib/format';
import { colors, spacing, type } from '@/theme';
import type { DietFlag, Location } from '@/types/db';

export default function Pas() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetchLocations().then(setLocations);
  }, []);

  const location = useMemo(
    () => locations.find((item) => item.id === profile?.location_id) ?? null,
    [locations, profile?.location_id],
  );

  if (!profile) return <Redirect href="/(auth)/aanmelden" />;

  const notActive = profile.status !== 'active';

  return (
    <Screen>
      <Row>
        <View style={{ flex: 1 }}>
          <Logo height={30} />
        </View>
        <LanguageSwitcher compact />
      </Row>

      {profile.status === 'pending' ? (
        <Banner tone="warning" icon="time" title={t('pass.statusPending')} body={t('pass.statusPendingBody')} />
      ) : null}
      {profile.status === 'paused' ? (
        <Banner tone="warning" icon="pause-circle" title={t('pass.statusPaused')} body={t('pass.statusPausedBody')} />
      ) : null}
      {profile.status === 'expired' ? (
        <Banner
          tone="danger"
          icon="alert-circle"
          title={t('pass.statusExpired')}
          body={t('pass.statusExpiredBody', { date: formatDate(profile.valid_until, language) })}
        />
      ) : null}

      {!notActive ? (
        <>
          <Body muted center>
            {t('pass.showThis')}
          </Body>

          <QrPass
            passCode={profile.pass_code}
            name={fullName(profile.first_name, profile.last_name)}
            packageType={profile.package_type}
            locationName={location?.name}
          />

          <Row gap={spacing.sm}>
            <Ionicons name="information-circle-outline" size={18} color={colors.inkMuted} />
            <Text style={[styles.hint, { flex: 1 }]}>{t('pass.screenshotHint')}</Text>
          </Row>
        </>
      ) : null}

      {location ? (
        <Card>
          <Label>{t('pass.nextPickup')}</Label>
          <Text style={styles.pickupDay}>
            {formatDate(nextOccurrence(location.weekday), language)}
          </Text>
          <Text style={styles.pickupTime}>
            {t('locations.openOn', {
              day: t(dayKey(location.weekday, true)),
              from: formatClock(location.opens_at),
              to: formatClock(location.closes_at),
            })}
          </Text>
          <View style={{ gap: 2 }}>
            <Text style={styles.venue}>{location.venue}</Text>
            <Text style={styles.address}>
              {location.street}, {location.postcode} {location.city}
            </Text>
          </View>
        </Card>
      ) : null}

      {profile.diet_flags.length > 0 || profile.allergies_text ? (
        <Card>
          <Label>{t('result.specialWishes')}</Label>
          <DietBadges
            flags={profile.diet_flags as DietFlag[]}
            allergiesText={profile.allergies_text}
          />
        </Card>
      ) : null}

      {profile.valid_until && profile.status === 'active' ? (
        <Body muted center>
          {t('pass.validUntil', { date: formatDate(profile.valid_until, language) })}
        </Body>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { ...type.small, color: colors.inkMuted },
  pickupDay: { ...type.title, color: colors.brandDark },
  pickupTime: { ...type.bodyStrong, color: colors.ink },
  venue: { ...type.body, color: colors.ink },
  address: { ...type.small, color: colors.inkMuted },
});
