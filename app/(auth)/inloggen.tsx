import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Body, Button, Card, Logo, Screen, TextField, Title } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { isValidEmail } from '@/lib/format';
import { spacing } from '@/theme';

export default function Inloggen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithEmail, verifyCode } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  async function requestCode() {
    if (!isValidEmail(email)) {
      setError(t('register.errors.email'));
      return;
    }
    setBusy(true);
    setError(null);
    setDetail(null);
    try {
      await signInWithEmail(email);
      setStep('code');
    } catch (fout) {
      const melding = (fout as { message?: string })?.message ?? String(fout);
      // Supabase laat maar één code per minuut per adres toe. Dat is een
      // normale situatie, geen storing — dus zeg gewoon hoe lang het duurt.
      const wachten = melding.match(/after (\d+) seconds?/i)?.[1];

      if (wachten) {
        setError(t('auth.tooSoon', { seconds: wachten }));
      } else {
        setError(t('common.errorGeneric'));
        setDetail(melding);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, code);
      // De rootroute stuurt door naar het juiste scherm zodra het profiel er is.
      router.replace('/');
    } catch {
      setError(t('auth.wrongCode'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <Logo height={36} />
      </View>

      {step === 'email' ? (
        <Card>
          <Title>{t('auth.welcomeTitle')}</Title>
          <TextField
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            error={error}
          />
          <Button label={t('auth.sendCode')} icon="mail" onPress={requestCode} loading={busy} />
          {detail ? <Body muted>{detail}</Body> : null}
        </Card>
      ) : (
        <Card>
          <Title>{t('auth.codeLabel')}</Title>
          <Body muted>{t('auth.codeSent', { email })}</Body>
          {/* Zes cijfers, gelijk aan auth.email.otp_length in supabase/config.toml.
              Wijzig je die, wijzig dan ook de drie plekken hieronder — anders
              accepteert dit veld een code die de server niet verstuurt. */}
          <TextField
            label={t('auth.codeLabel')}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            error={error}
            style={{ fontSize: 26, letterSpacing: 8, textAlign: 'center' }}
          />
          <Button
            label={t('auth.verify')}
            onPress={submitCode}
            loading={busy}
            disabled={code.length < 6}
          />
          <Button label={t('auth.resend')} variant="ghost" onPress={requestCode} />
        </Card>
      )}

      <Body muted>{t('auth.noAccountHelp')}</Body>
    </Screen>
  );
}
