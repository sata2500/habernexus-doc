import type { SiteSettings } from "@/lib/site-settings";

export function DynamicThemeColors({ settings }: { settings: Partial<SiteSettings> | null }) {
  if (!settings) return null;

  const lightColor = settings.primaryColorLight;
  const darkColor = settings.primaryColorDark;

  if (!lightColor && !darkColor) return null;

  // SSR tarafında doğrudan CSS üreterek sayfa yüklenmeden renkleri uyguluyoruz
  // !important kullanıyoruz çünkü varsayılan Tailwind tanımlarını ezmemiz gerekiyor.
  const cssString = `
    ${lightColor ? `
    :root {
      --color-primary-500: ${lightColor} !important;
      --color-primary-600: ${lightColor}dd !important;
      --color-primary-400: ${lightColor}ee !important;
      --ring: ${lightColor} !important;
      --gradient-primary: linear-gradient(135deg, ${lightColor}, ${lightColor}dd) !important;
      --text-gradient: linear-gradient(135deg, ${lightColor}, var(--color-accent-500)) !important;
    }
    ` : ""}
    
    ${darkColor ? `
    [data-theme="dark"] {
      --color-primary-500: ${darkColor} !important;
      --color-primary-600: ${darkColor}dd !important;
      --color-primary-400: ${darkColor}ee !important;
      --ring: ${darkColor} !important;
      --gradient-primary: linear-gradient(135deg, ${darkColor}, ${darkColor}dd) !important;
      --text-gradient: linear-gradient(135deg, ${darkColor}, var(--color-accent-500)) !important;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --color-primary-500: ${darkColor} !important;
        --color-primary-600: ${darkColor}dd !important;
        --color-primary-400: ${darkColor}ee !important;
        --ring: ${darkColor} !important;
        --gradient-primary: linear-gradient(135deg, ${darkColor}, ${darkColor}dd) !important;
        --text-gradient: linear-gradient(135deg, ${darkColor}, var(--color-accent-500)) !important;
      }
    }
    ` : ""}
  `;

  return <style dangerouslySetInnerHTML={{ __html: cssString }} suppressHydrationWarning />;
}
