"use client";

import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { useConsent } from "./CookieConsent";

/**
 * Yönetim panelinden açılan üçüncü taraf betikleri. Kapalı özelliklerin hiçbiri yüklenmez.
 * - Google Analytics: yalnızca okur analitiğe onay verdiyse (onay gelince hemen yüklenir)
 * - AdSense: yayıncı kimliği varsa; onay yoksa kişiselleştirilmemiş reklam (Consent Mode)
 * - Vercel Analytics: çerezsiz, onay gerektirmez
 * Onay varsayılanları kök yerleşimdeki satır içi betikle bu betiklerden önce kurulur.
 */
export function ThirdPartyScripts({
  gaMeasurementId,
  adsensePublisherId,
  vercelAnalytics,
}: {
  gaMeasurementId: string | null;
  adsensePublisherId: string | null;
  vercelAnalytics: boolean;
}) {
  const consent = useConsent();
  const analyticsAllowed = !!gaMeasurementId && consent?.analytics === true;

  return (
    <>
      {analyticsAllowed && (
        <>
          <Script id="ga-loader" src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script id="ga-config" strategy="afterInteractive">
            {`window.gtag('js', new Date());window.gtag('config', ${JSON.stringify(gaMeasurementId)});`}
          </Script>
        </>
      )}
      {adsensePublisherId && (
        <Script
          id="adsense-loader"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}
      {vercelAnalytics && <Analytics />}
    </>
  );
}
