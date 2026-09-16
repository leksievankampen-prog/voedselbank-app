import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DietBadges } from '@/components/DietBadges';
import {
  Banner,
  Body,
  Button,
  Card,
  Chip,
  Heading,
  Label,
  PackageBadge,
  Row,
  Screen,
  Stepper,
  TextField,
  Title,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { fetchLocations, saveProfile } from '@/lib/api';
import { dayKey, formatClock, formatPostcode, isValidPhone, isValidPostcode } from '@/lib/format';
import { packageTypeFor } from '@/lib/packages';
import { colors, radius, spacing, type } from '@/theme';
import { DIET_FLAGS, type DietFlag, type Location } from '@/types/db';

const STEPS = ['stepPersonal', 'stepHousehold', 'stepLocation', 'stepDiet'] as const;

export default function Aanmelden() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, profile, refreshProfile, initializing, signOut } = useAuth();
  const { language } = useLanguage();

  const [step, setStep] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    street: '',
    house_number: '',
    postcode: '',
    city: '',
    phone: '',
    adults: 1,
    children: 0,
    location_id: '',
    diet_flags: [] as DietFlag[],
    allergies_text: '',
    notes: '',
  });

  useEffect(() => {
    fetchLocations().then(setLocations);
  }, []);

  // Wie al eerder gegevens invulde, hoeft niet opnieuw te typen.
  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      first_name: profile.first_name || current.first_name,
      last_name: profile.last_name || current.last_name,
      street: profile.street ?? current.street,
      house_number: profile.house_number ?? current.house_number,
      postcode: profile.postcode ?? current.postcode,
      city: profile.city ?? current.city,
      phone: profile.phone ?? current.phone,
      adults: profile.adults ?? current.adults,
      children: profile.children ?? current.children,
      location_id: profile.location_id ?? current.location_id,
      diet_flags: (profile.diet_flags as DietFlag[]) ?? current.diet_flags,
      allergies_text: profile.allergies_text ?? current.allergies_text,
      notes: profile.notes ?? current.notes,
    }));
  }, [profile]);

  const householdSize = form.adults + form.children;
  const packageType = useMemo(() => packageTypeFor(householdSize), [householdSize]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function validate(index: number): boolean {
    const found: Record<string, string> = {};

    if (index === 0) {
      if (!form.first_name.trim()) found.first_name = t('register.errors.firstName');
      if (!form.last_name.trim()) found.last_name = t('register.errors.lastName');
      if (!form.street.trim()) found.street = t('register.errors.street');
      if (!form.house_number.trim()) found.house_number = t('register.errors.houseNumber');
      if (!isValidPostcode(form.postcode)) found.postcode = t('register.errors.postcode');
      if (!form.city.trim()) found.city = t('register.errors.city');
      if (!isValidPhone(form.phone)) found.phone = t('register.errors.phone');
    }
    if (index === 1 && householdSize < 1) {
      found.household = t('register.errors.household');
    }
    if (index === 2 && !form.location_id) {
      found.location_id = t('register.errors.location');
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  }

  async function submit() {
    // Kan in theorie niet meer voorkomen door de redirect hieronder, maar als
    // de sessie tijdens het invullen verloopt moet de knop uitleggen wat er is
    // — niet zwijgend niets doen.
    if (!session?.user.id) {
      setErrors({ submit: t('auth.sessionExpired') });
      return;
    }
    setBusy(true);
    try {
      await saveProfile(session.user.id, {
        ...form,
        postcode: formatPostcode(form.postcode),
        allergies_text: form.allergies_text.trim() || null,
        notes: form.notes.trim() || null,
        language,
      });
      await refreshProfile();
      setSubmitted(true);
    } catch (error) {
      // De technische melding erbij tonen. Lelijk, maar zonder die tekst is
      // een probleem op afstand niet te vinden — en een vrijwilliger aan de
      // balie kan hem voorlezen.
      const melding = (error as { message?: string })?.message ?? String(error);
      const sessieFout = /jwt|token|expired|unauthorized|401|403/i.test(melding);

      setErrors(
        sessieFout
          ? { submit: t('auth.sessionExpired') }
          : { submit: t('common.errorGeneric'), detail: melding },
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleDiet(flag: DietFlag) {
    update(
      'diet_flags',
      form.diet_flags.includes(flag)
        ? form.diet_flags.filter((item) => item !== flag)
        : [...form.diet_flags, flag],
    );
  }

  // Zonder sessie kan er niets opgeslagen worden. Meteen terugsturen naar het
  // inloggen, in plaats van iemand vier stappen laten invullen die daarna
  // nergens heen kunnen.
  if (!initializing && !session) {
    return <Redirect href="/(auth)/inloggen" />;
  }

  if (submitted) {
    return (
      <Screen>
        <Card tone="success">
          <Ionicons name="checkmark-circle" size={44} color={colors.success} />
          <Title>{t('register.doneTitle')}</Title>
          <Body>{t('register.doneBody')}</Body>
        </Card>
        <Button label={t('pass.title')} icon="qr-code" onPress={() => router.replace('/(client)/pas')} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          {errors.submit ? <Body>{errors.submit}</Body> : null}
          {errors.detail ? <Body muted>{errors.detail}</Body> : null}
          <Button
            label={step === STEPS.length - 1 ? t('register.submit') : t('common.next')}
            icon={step === STEPS.length - 1 ? 'send' : 'arrow-forward'}
            onPress={next}
            loading={busy}
          />
          {step > 0 ? (
            <Button label={t('common.back')} variant="ghost" onPress={() => setStep(step - 1)} />
          ) : null}
          {/* Zonder deze knop zit iemand die hier vastloopt klem: het
              inlogscherm is vanaf hier verder nergens te bereiken. */}
          <Button label={t('auth.logout')} variant="ghost" onPress={signOut} />
        </>
      }
    >
      <View style={{ gap: spacing.xs }}>
        <Label>
          {step + 1} / {STEPS.length}
        </Label>
        <Title>{t(`register.${STEPS[step]}`)}</Title>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      {step === 0 ? (
        <Card>
          <Body muted>{t('register.intro')}</Body>
          <TextField
            label={t('register.firstName')}
            value={form.first_name}
            onChangeText={(value) => update('first_name', value)}
            autoComplete="given-name"
            error={errors.first_name}
          />
          <TextField
            label={t('register.lastName')}
            value={form.last_name}
            onChangeText={(value) => update('last_name', value)}
            autoComplete="family-name"
            error={errors.last_name}
          />
          <Row gap={spacing.md}>
            <View style={{ flex: 3 }}>
              <TextField
                label={t('register.street')}
                value={form.street}
                onChangeText={(value) => update('street', value)}
                autoComplete="street-address"
                error={errors.street}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('register.houseNumber')}
                value={form.house_number}
                onChangeText={(value) => update('house_number', value)}
                error={errors.house_number}
              />
            </View>
          </Row>
          <Row gap={spacing.md}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('register.postcode')}
                value={form.postcode}
                onChangeText={(value) => update('postcode', value.toUpperCase())}
                onBlur={() => update('postcode', formatPostcode(form.postcode))}
                autoCapitalize="characters"
                maxLength={7}
                error={errors.postcode}
              />
            </View>
            <View style={{ flex: 2 }}>
              <TextField
                label={t('register.city')}
                value={form.city}
                onChangeText={(value) => update('city', value)}
                error={errors.city}
              />
            </View>
          </Row>
          <TextField
            label={t('register.phone')}
            value={form.phone}
            onChangeText={(value) => update('phone', value)}
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel"
            error={errors.phone}
          />
        </Card>
      ) : null}

      {step === 1 ? (
        <>
          <Card>
            <Stepper
              label={t('register.adults')}
              value={form.adults}
              onChange={(value) => update('adults', value)}
              min={0}
            />
            <Stepper
              label={t('register.children')}
              value={form.children}
              onChange={(value) => update('children', value)}
            />
            {errors.household ? <Body>{errors.household}</Body> : null}
          </Card>
          <Card tone="brand">
            <Row gap={spacing.lg}>
              <PackageBadge type={packageType} size="xl" />
              <View style={{ flex: 1, gap: 2 }}>
                <Heading>{t('register.packagePreview', { type: packageType })}</Heading>
                <Body muted>{t('register.householdSummary', { count: householdSize })}</Body>
                <Body muted>{t(`packages.${packageType}`)}</Body>
              </View>
            </Row>
          </Card>
        </>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: spacing.md }}>
          <Body muted>{t('register.chooseLocation')}</Body>
          {errors.location_id ? <Banner tone="danger" title={errors.location_id} /> : null}
          {locations.map((location) => {
            const selected = form.location_id === location.id;
            return (
              <Pressable
                key={location.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => update('location_id', location.id)}
                style={[styles.location, selected && styles.locationSelected]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationMeta}>
                    {location.venue} · {location.street}
                  </Text>
                  <Text style={styles.locationTime}>
                    {t('locations.openOn', {
                      day: t(dayKey(location.weekday, true)),
                      from: formatClock(location.opens_at),
                      to: formatClock(location.closes_at),
                    })}
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={selected ? colors.brand : colors.borderStrong}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {step === 3 ? (
        <>
          <Card>
            <Body muted>{t('register.dietIntro')}</Body>
            <View style={{ gap: spacing.sm }}>
              {DIET_FLAGS.map((flag) => (
                <Chip
                  key={flag}
                  label={t(`diet.${flag}`)}
                  selected={form.diet_flags.includes(flag)}
                  onPress={() => toggleDiet(flag)}
                />
              ))}
            </View>
          </Card>
          <Card>
            <TextField
              label={t('register.allergiesLabel')}
              placeholder={t('register.allergiesPlaceholder')}
              value={form.allergies_text}
              onChangeText={(value) => update('allergies_text', value)}
              multiline
              style={{ minHeight: 88, paddingTop: spacing.md }}
            />
            <TextField
              label={t('register.notesLabel')}
              placeholder={t('register.notesPlaceholder')}
              value={form.notes}
              onChangeText={(value) => update('notes', value)}
              multiline
              style={{ minHeight: 88, paddingTop: spacing.md }}
            />
          </Card>
          <Card tone="brand">
            <Label>{t('result.specialWishes')}</Label>
            <DietBadges flags={form.diet_flags} allergiesText={form.allergies_text || null} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: { height: 6, backgroundColor: colors.brand },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  locationSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  locationName: { ...type.bodyStrong, color: colors.ink },
  locationMeta: { ...type.small, color: colors.inkMuted },
  locationTime: { ...type.small, color: colors.brandDark, fontWeight: '600' },
});
