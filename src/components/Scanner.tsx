import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { colors, radius, spacing, type } from '@/theme';

export interface ScannerProps {
  onScan: (value: string) => void;
  /** Zet de camera stil zolang het resultaat van de vorige scan in beeld staat. */
  paused?: boolean;
}

/** Zelfde code twee keer binnen deze tijd negeren — de camera vuurt tientallen frames per seconde. */
const DEBOUNCE_MS = 2500;

export function Scanner({ onScan, paused = false }: ScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const lastScan = useRef<{ value: string; at: number } | null>(null);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (paused || !data) return;
      const now = Date.now();
      if (lastScan.current && lastScan.current.value === data && now - lastScan.current.at < DEBOUNCE_MS) {
        return;
      }
      lastScan.current = { value: data, at: now };
      onScan(data);
    },
    [onScan, paused],
  );

  if (!permission) {
    return <View style={styles.frame} />;
  }

  if (!permission.granted) {
    return (
      <Card tone="brand">
        <Text style={styles.permissionTitle}>{t('scan.permissionTitle')}</Text>
        <Text style={styles.permissionBody}>{t('scan.permissionBody')}</Text>
        <Button label={t('scan.permissionButton')} icon="camera" onPress={requestPermission} />
      </Card>
    );
  }

  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={paused ? undefined : handleBarcode}
      />
      <View style={styles.reticle} pointerEvents="none" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('scan.torch')}
        accessibilityState={{ selected: torch }}
        onPress={() => setTorch((value) => !value)}
        style={styles.torch}
      >
        <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color="#FFFFFF" />
      </Pressable>
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
  torch: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  permissionTitle: { ...type.heading, color: colors.ink },
  permissionBody: { ...type.body, color: colors.ink },
});
