import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

/**
 * De HTML-schil van de webversie. Alleen op web gebruikt; expo-router rendert
 * hem tijdens de export. Hier staan de dingen die een PWA installeerbaar
 * maken — het manifest, de themakleur en de iOS-specifieke tags zonder welke
 * Safari geen icoon op het beginscherm zet.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        <title>Voedselbank Haarlemmermeer</title>
        <meta
          name="description"
          content="Meld je aan voor een voedselpakket, toon je QR-code bij de intake en blijf op de hoogte van de uitdeeldagen."
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF7212" />

        {/* Zonder deze twee zet Safari de app niet als volwaardige app op het
            beginscherm, en dan werken pushmeldingen op iOS niet. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Voedselbank" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon-192.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: BASE_STYLE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BASE_STYLE = `
  body { background-color: #F7F6F4; }
  /* Voorkomt dat iOS het formulier inzoomt bij een invoerveld. */
  input, textarea, select { font-size: 16px; }
`;
