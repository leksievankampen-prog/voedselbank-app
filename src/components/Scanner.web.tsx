import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { colors, radius, type } from '@/theme';
import type { ScannerProps } from './Scanner';

const DEBOUNCE_MS = 2500;

/**
 * Webversie van de scanner. expo-camera kan in de browser geen barcodes lezen,
 * dus draaien we ZXing over een gewoon <video>-element. Werkt in Chrome op
 * Android en in Safari op iOS, mits de pagina via https wordt geserveerd.
 */
export function Scanner({ onScan, paused = false }: ScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScan = useRef<{ value: string; at: number } | null>(null);
  const pausedRef = useRef(paused);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  pausedRef.current = paused;

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 });

    async function start() {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current ?? undefined,
          (result) => {
            if (!result || pausedRef.current) return;
            const value = result.getText();
            const now = Date.now();
            if (
              lastScan.current &&
              lastScan.current.value === value &&
              now - lastScan.current.at < DEBOUNCE_MS
            ) {
              return;
            }
            lastScan.current = { value, at: now };
            onScan(value);
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onScan, attempt]);

  if (error) {
    return (
      <Card tone="brand">
        <Text style={styles.permissionTitle}>{t('scan.permissionTitle')}</Text>
        <Text style={styles.permissionBody}>{t('scan.permissionBody')}</Text>
        <Button
          label={t('scan.permissionButton')}
          icon="camera"
          onPress={() => setAttempt((value) => value + 1)}
        />
      </Card>
    );
  }

  return (
    <View style={styles.frame}>
      {/* react-native-web geeft onbekende tags door aan de DOM. */}
      {React.createElement('video', {
        ref: videoRef,
        muted: true,
        playsInline: true,
        autoPlay: true,
        style: { width: '100%', height: '100%', objectFit: 'cover' },
      })}
      <View style={styles.reticle} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  reticle: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '15%',
    borderWidth: 3,
    borderColor: colors.brand,
    borderRadius: radius.lg,
  },
  permissionTitle: { ...type.heading, color: colors.ink },
  permissionBody: { ...type.body, color: colors.ink },
});
