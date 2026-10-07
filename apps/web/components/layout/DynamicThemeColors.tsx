import type { SiteSettings } from "@/lib/site-settings";
import { buildThemeCss } from "@/lib/theme";

/** Yönetim panelinde seçilen tema renklerini siteye uygular */
export function DynamicThemeColors({ settings }: { settings: Partial<SiteSettings> | null }) {
  if (!settings) return null;
  const css = buildThemeCss(settings);
  if (!css) return null;
  return <style id="dynamic-theme-colors" dangerouslySetInnerHTML={{ __html: css }} suppressHydrationWarning />;
}
