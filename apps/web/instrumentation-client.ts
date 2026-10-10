import { scheduleSentry } from "./lib/sentry-client";

// Tarayıcıdaki hatalar (DSN yoksa kapalı). Sentry SDK'sı sayfa açılışını yavaşlatmasın diye
// tarayıcı boşa çıkınca yüklenir; ayrıntılar lib/sentry-client.ts'de.
scheduleSentry();
