// Verstuurt een gepubliceerd nieuwsbericht als melding naar alle klanten die
// meldingen hebben aangezet — web push voor de PWA, Expo push voor de
// app-store-versie. Iedere klant krijgt de tekst in zijn eigen taal.
//
// Deployen:  supabase functions deploy send-news-push
// Secrets:   supabase secrets set VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
//            (EXPO_PUBLIC_VAPID_PUBLIC_KEY hoort ook als secret VAPID_PUBLIC_KEY)

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@voedselbankhaarlemmermeer.nl';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Language = 'nl' | 'en' | 'ar';

interface NewsRow {
  id: string;
  title_nl: string;
  title_en: string;
  title_ar: string;
  body_nl: string;
  body_en: string;
  body_ar: string;
  urgent: boolean;
  location_id: string | null;
}

function pick(news: NewsRow, language: Language) {
  const title = news[`title_${language}`] || news.title_nl;
  const body = news[`body_${language}`] || news.body_nl;
  return { title, body: body.slice(0, 180) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';

    // 1. Alleen een beheerder mag meldingen versturen. Dat controleren we met
    //    de token van de aanroeper, niet met de service-role-sleutel.
    const asCaller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: caller } = await asCaller.auth.getUser();
    if (!caller.user) {
      return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', caller.user.id)
      .maybeSingle();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Geen beheerdersrechten' }), {
        status: 403,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Bericht ophalen.
    const { news_id } = await req.json();
    const { data: news, error: newsError } = await admin
      .from('news')
      .select('*')
      .eq('id', news_id)
      .single();

    if (newsError || !news) throw new Error('Nieuwsbericht niet gevonden');
    const item = news as NewsRow;

    // 3. Ontvangers: actieve klanten, eventueel beperkt tot één locatie.
    let profileQuery = admin
      .from('profiles')
      .select('id, language')
      .eq('role', 'client')
      .eq('status', 'active');

    if (item.location_id) profileQuery = profileQuery.eq('location_id', item.location_id);

    const { data: recipients } = await profileQuery;
    const languageByProfile = new Map<string, Language>(
      (recipients ?? []).map((row) => [row.id as string, (row.language ?? 'nl') as Language]),
    );
    if (languageByProfile.size === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('*')
      .in('profile_id', [...languageByProfile.keys()]);

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    const expoMessages: Record<string, unknown>[] = [];

    for (const sub of subscriptions ?? []) {
      const language = languageByProfile.get(sub.profile_id) ?? 'nl';
      const { title, body } = pick(item, language);

      if (sub.platform === 'web' && sub.endpoint) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, url: `/nieuws/${item.id}`, urgent: item.urgent }),
          );
          sent++;
        } catch (error) {
          failed++;
          // 404/410 = de browser kent dit abonnement niet meer; opruimen.
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) stale.push(sub.id);
        }
      } else if (sub.expo_token) {
        expoMessages.push({
          to: sub.expo_token,
          title,
          body,
          sound: item.urgent ? 'default' : null,
          channelId: 'nieuws',
          data: { newsId: item.id },
        });
      }
    }

    // Expo accepteert maximaal 100 meldingen per aanroep.
    for (let i = 0; i < expoMessages.length; i += 100) {
      const chunk = expoMessages.slice(i, i + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (response.ok) sent += chunk.length;
      else failed += chunk.length;
    }

    if (stale.length) {
      await admin.from('push_subscriptions').delete().in('id', stale);
    }

    return new Response(JSON.stringify({ sent, failed, cleaned: stale.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
