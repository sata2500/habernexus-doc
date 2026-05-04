import type { SiteSettings } from "@/lib/site-settings";

export function DynamicThemeColors({ settings }: { settings: Partial<SiteSettings> | null }) {
  if (!settings) return null;

  // Açık Tema Renkleri
  const primaryL = settings.primaryColorLight;
  const bgL = settings.bgLight;
  const fgL = settings.fgLight;
  const cardL = settings.cardLight;
  const cardFgL = settings.cardFgLight;
  const accentL = settings.accentLight;

  // Koyu Tema Renkleri
  const primaryD = settings.primaryColorDark;
  const bgD = settings.bgDark;
  const fgD = settings.fgDark;
  const cardD = settings.cardDark;
  const cardFgD = settings.cardFgDark;
  const accentD = settings.accentDark;

  const cssString = `
    :root {
      ${primaryL ? `--color-primary-500: ${primaryL} !important;
      --color-primary-600: ${primaryL}dd !important;
      --color-primary-400: ${primaryL}ee !important;
      --ring: ${primaryL} !important;
      --gradient-primary: linear-gradient(135deg, ${primaryL}, ${primaryL}dd) !important;` : ""}
      
      ${accentL ? `--color-accent-500: ${accentL} !important;
      --gradient-accent: linear-gradient(135deg, ${accentL}, ${accentL}dd) !important;` : ""}
      
      ${(primaryL && accentL) ? `--text-gradient: linear-gradient(135deg, ${primaryL}, ${accentL}) !important;` : ""}
      
      ${bgL ? `--bg: ${bgL} !important;` : ""}
      ${fgL ? `--fg: ${fgL} !important;` : ""}
      ${cardL ? `--card: ${cardL} !important;
      --surface: ${cardL} !important;` : ""}
      ${cardFgL ? `--card-fg: ${cardFgL} !important;` : ""}
    }
    
    [data-theme="dark"] {
      ${primaryD ? `--color-primary-500: ${primaryD} !important;
      --color-primary-600: ${primaryD}dd !important;
      --color-primary-400: ${primaryD}ee !important;
      --ring: ${primaryD} !important;
      --gradient-primary: linear-gradient(135deg, ${primaryD}, ${primaryD}dd) !important;` : ""}
      
      ${accentD ? `--color-accent-500: ${accentD} !important;
      --gradient-accent: linear-gradient(135deg, ${accentD}, ${accentD}dd) !important;` : ""}
      
      ${(primaryD && accentD) ? `--text-gradient: linear-gradient(135deg, ${primaryD}, ${accentD}) !important;` : ""}
      
      ${bgD ? `--bg: ${bgD} !important;` : ""}
      ${fgD ? `--fg: ${fgD} !important;` : ""}
      ${cardD ? `--card: ${cardD} !important;
      --surface: ${cardD} !important;` : ""}
      ${cardFgD ? `--card-fg: ${cardFgD} !important;` : ""}
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        ${primaryD ? `--color-primary-500: ${primaryD} !important;
        --color-primary-600: ${primaryD}dd !important;
        --color-primary-400: ${primaryD}ee !important;
        --ring: ${primaryD} !important;
        --gradient-primary: linear-gradient(135deg, ${primaryD}, ${primaryD}dd) !important;` : ""}
        
        ${accentD ? `--color-accent-500: ${accentD} !important;
        --gradient-accent: linear-gradient(135deg, ${accentD}, ${accentD}dd) !important;` : ""}
        
        ${(primaryD && accentD) ? `--text-gradient: linear-gradient(135deg, ${primaryD}, ${accentD}) !important;` : ""}
        
        ${bgD ? `--bg: ${bgD} !important;` : ""}
        ${fgD ? `--fg: ${fgD} !important;` : ""}
        ${cardD ? `--card: ${cardD} !important;
        --surface: ${cardD} !important;` : ""}
        ${cardFgD ? `--card-fg: ${cardFgD} !important;` : ""}
      }
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: cssString }} suppressHydrationWarning />;
}
