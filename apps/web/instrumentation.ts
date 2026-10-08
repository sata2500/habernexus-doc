import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "./sentry.shared";

/** Sunucu ve edge çalışma ortamlarında Sentry (DSN yoksa kapalı) */
export async function register() {
  if (!sentryBaseOptions.enabled) return;
  Sentry.init(sentryBaseOptions);
}

/** Sunucu bileşenleri, rota işleyicileri ve sunucu işlemlerindeki yakalanmamış hatalar */
export const onRequestError = Sentry.captureRequestError;
