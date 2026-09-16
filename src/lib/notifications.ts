import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

export type PermissionState = 'granted' | 'denied' | 'unsupported' | 'default';

/** De VAPID-sleutel is base64url; PushManager wil er ruwe bytes van. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/* ------------------------------------------------------------------ web ---- */

async function registerWeb(profileId: string): Promise<PermissionState> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !VAPID_PUBLIC_KEY
  ) {
    return 'unsupported';
  }

  // iOS levert push alleen als de PWA op het beginscherm staat.
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && !standalone) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  await supabase.from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      platform: 'web',
      endpoint: json.endpoint ?? null,
      p256dh: json.keys?.p256dh ?? null,
      auth: json.keys?.auth ?? null,
    },
    { onConflict: 'endpoint' },
  );

  return 'granted';
}

/* --------------------------------------------------------------- native ---- */

async function registerNative(profileId: string): Promise<PermissionState> {
  if (!Device.isDevice) return 'unsupported';

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nieuws', {
      name: 'Nieuws van de Voedselbank',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#FF7212',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  await supabase.from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      expo_token: token.data,
    },
    { onConflict: 'expo_token' },
  );

  return 'granted';
}

/* ---------------------------------------------------------------- public --- */

/** Vraagt toestemming en slaat het abonnement op. Idempotent. */
export async function registerForPush(profileId: string): Promise<PermissionState> {
  try {
    return Platform.OS === 'web' ? await registerWeb(profileId) : await registerNative(profileId);
  } catch (error) {
    console.warn('[push] registratie mislukt', error);
    return 'unsupported';
  }
}

export async function unregisterPush(profileId: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
        return;
      }
    }
    await supabase.from('push_subscriptions').delete().eq('profile_id', profileId);
  } catch (error) {
    console.warn('[push] afmelden mislukt', error);
  }
}

export async function currentPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as PermissionState;
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'default';
}

/** Meldingen ook tonen als de app op de voorgrond staat. */
export function configureForegroundHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}
