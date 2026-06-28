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
  const sidebarBgL = settings.sidebarBgLight;
  const sidebarFgL = settings.sidebarFgLight;

  // Koyu Tema Renkleri
  const primaryD = settings.primaryColorDark;
  const bgD = settings.bgDark;
  const fgD = settings.fgDark;
  const cardD = settings.cardDark;
  const cardFgD = settings.cardFgDark;
  const accentD = settings.accentDark;
  const sidebarBgD = settings.sidebarBgDark;
  const sidebarFgD = settings.sidebarFgDark;

  // CSS oluşturma
  const cssString = `
    :root {
      /* --- Primary Brand Shades (Light Mode) --- */
      ${primaryL ? `
      --color-primary-50: color-mix(in srgb, ${primaryL} 5%, #ffffff) !important;
      --color-primary-100: color-mix(in srgb, ${primaryL} 10%, #ffffff) !important;
      --color-primary-200: color-mix(in srgb, ${primaryL} 25%, #ffffff) !important;
      --color-primary-300: color-mix(in srgb, ${primaryL} 45%, #ffffff) !important;
      --color-primary-400: color-mix(in srgb, ${primaryL} 70%, #ffffff) !important;
      --color-primary-500: ${primaryL} !important;
      --color-primary-600: color-mix(in srgb, ${primaryL} 85%, #000000) !important;
      --color-primary-700: color-mix(in srgb, ${primaryL} 70%, #000000) !important;
      --color-primary-800: color-mix(in srgb, ${primaryL} 55%, #000000) !important;
      --color-primary-900: color-mix(in srgb, ${primaryL} 40%, #000000) !important;
      --ring: ${primaryL} !important;
      --shadow-glow: 0 0 20px color-mix(in srgb, ${primaryL} 15%, transparent) !important;
      ` : ""}

      /* --- Accent Shades (Light Mode) --- */
      ${accentL ? `
      --color-accent-400: color-mix(in srgb, ${accentL} 70%, #ffffff) !important;
      --color-accent-500: ${accentL} !important;
      --color-accent-600: color-mix(in srgb, ${accentL} 75%, #000000) !important;
      ` : ""}

      /* --- Hero & Text Gradients (Light Mode) --- */
      ${primaryL ? `
      --gradient-hero: linear-gradient(135deg, color-mix(in srgb, ${primaryL} 12%, transparent), color-mix(in srgb, ${accentL || primaryL} 6%, transparent)) !important;
      --gradient-primary: linear-gradient(135deg, ${primaryL}, color-mix(in srgb, ${primaryL} 85%, #000000)) !important;
      --gradient-accent: linear-gradient(135deg, ${accentL || primaryL}, color-mix(in srgb, ${accentL || primaryL} 80%, #000000)) !important;
      --text-gradient: linear-gradient(135deg, ${primaryL}, ${accentL || primaryL}) !important;
      ` : ""}

      /* --- Base layout colors (Light Mode) --- */
      ${bgL ? `--bg: ${bgL} !important;` : ""}
      ${fgL ? `--fg: ${fgL} !important;` : ""}
      ${bgL ? `--muted: color-mix(in srgb, ${bgL} 95%, ${fgL || "#000000"}) !important;` : ""}
      ${fgL ? `--muted-fg: color-mix(in srgb, ${fgL} 60%, ${bgL || "#fafbfc"}) !important;` : ""}
      ${cardL ? `--card: ${cardL} !important; --surface: ${cardL} !important;` : ""}
      ${cardFgL ? `--card-fg: ${cardFgL} !important;` : ""}
      ${sidebarBgL ? `--sidebar-bg: ${sidebarBgL} !important;` : ""}
      ${sidebarFgL ? `--sidebar-fg: ${sidebarFgL} !important;` : ""}

      /* --- Dynamic Borders & Glass (Light Mode) --- */
      ${bgL ? `--border-color: color-mix(in srgb, ${bgL} 92%, ${fgL || "#000000"}) !important;` : ""}
      ${bgL ? `--glass-bg: color-mix(in srgb, ${cardL || bgL || "#ffffff"} 72%, transparent) !important;` : ""}
      ${fgL ? `--glass-border: color-mix(in srgb, ${fgL} 8%, transparent) !important;` : ""}
    }
    
    [data-theme="dark"] {
      /* --- Primary Brand Shades (Dark Mode) --- */
      ${primaryD ? `
      --color-primary-50: color-mix(in srgb, ${primaryD} 10%, #ffffff) !important;
      --color-primary-100: color-mix(in srgb, ${primaryD} 20%, #ffffff) !important;
      --color-primary-200: color-mix(in srgb, ${primaryD} 40%, #ffffff) !important;
      --color-primary-300: color-mix(in srgb, ${primaryD} 60%, #ffffff) !important;
      --color-primary-400: color-mix(in srgb, ${primaryD} 80%, #ffffff) !important;
      --color-primary-500: ${primaryD} !important;
      --color-primary-600: color-mix(in srgb, ${primaryD} 85%, #000000) !important;
      --color-primary-700: color-mix(in srgb, ${primaryD} 70%, #000000) !important;
      --color-primary-800: color-mix(in srgb, ${primaryD} 55%, #000000) !important;
      --color-primary-900: color-mix(in srgb, ${primaryD} 40%, #000000) !important;
      --ring: ${primaryD} !important;
      --shadow-glow: 0 0 20px color-mix(in srgb, ${primaryD} 15%, transparent) !important;
      ` : ""}

      /* --- Accent Shades (Dark Mode) --- */
      ${accentD ? `
      --color-accent-400: color-mix(in srgb, ${accentD} 70%, #ffffff) !important;
      --color-accent-500: ${accentD} !important;
      --color-accent-600: color-mix(in srgb, ${accentD} 75%, #000000) !important;
      ` : ""}

      /* --- Hero & Text Gradients (Dark Mode) --- */
      ${primaryD ? `
      --gradient-hero: linear-gradient(135deg, color-mix(in srgb, ${primaryD} 12%, transparent), color-mix(in srgb, ${accentD || primaryD} 6%, transparent)) !important;
      --gradient-primary: linear-gradient(135deg, ${primaryD}, color-mix(in srgb, ${primaryD} 80%, #000000)) !important;
      --gradient-accent: linear-gradient(135deg, ${accentD || primaryD}, color-mix(in srgb, ${accentD || primaryD} 75%, #000000)) !important;
      --text-gradient: linear-gradient(135deg, ${primaryD}, ${accentD || primaryD}) !important;
      ` : ""}

      /* --- Base layout colors (Dark Mode) --- */
      ${bgD ? `--bg: ${bgD} !important;` : ""}
      ${fgD ? `--fg: ${fgD} !important;` : ""}
      ${bgD ? `--muted: color-mix(in srgb, ${bgD} 90%, ${fgD || "#ffffff"}) !important;` : ""}
      ${fgD ? `--muted-fg: color-mix(in srgb, ${fgD} 60%, ${bgD || "#0b0f1a"}) !important;` : ""}
      ${cardD ? `--card: ${cardD} !important; --surface: ${cardD} !important;` : ""}
      ${cardFgD ? `--card-fg: ${cardFgD} !important;` : ""}
      ${sidebarBgD ? `--sidebar-bg: ${sidebarBgD} !important;` : ""}
      ${sidebarFgD ? `--sidebar-fg: ${sidebarFgD} !important;` : ""}

      /* --- Dynamic Borders & Glass (Dark Mode) --- */
      ${bgD ? `--border-color: color-mix(in srgb, ${bgD} 92%, ${fgD || "#ffffff"}) !important;` : ""}
      ${bgD ? `--glass-bg: color-mix(in srgb, ${cardD || bgD || "#111827"} 78%, transparent) !important;` : ""}
      ${fgD ? `--glass-border: color-mix(in srgb, ${fgD} 6%, transparent) !important;` : ""}
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        /* --- Primary Brand Shades (Media Dark) --- */
        ${primaryD ? `
        --color-primary-50: color-mix(in srgb, ${primaryD} 10%, #ffffff) !important;
        --color-primary-100: color-mix(in srgb, ${primaryD} 20%, #ffffff) !important;
        --color-primary-200: color-mix(in srgb, ${primaryD} 40%, #ffffff) !important;
        --color-primary-300: color-mix(in srgb, ${primaryD} 60%, #ffffff) !important;
        --color-primary-400: color-mix(in srgb, ${primaryD} 80%, #ffffff) !important;
        --color-primary-500: ${primaryD} !important;
        --color-primary-600: color-mix(in srgb, ${primaryD} 85%, #000000) !important;
        --color-primary-700: color-mix(in srgb, ${primaryD} 70%, #000000) !important;
        --color-primary-800: color-mix(in srgb, ${primaryD} 55%, #000000) !important;
        --color-primary-900: color-mix(in srgb, ${primaryD} 40%, #000000) !important;
        --ring: ${primaryD} !important;
        --shadow-glow: 0 0 20px color-mix(in srgb, ${primaryD} 15%, transparent) !important;
        ` : ""}

        /* --- Accent Shades (Media Dark) --- */
        ${accentD ? `
        --color-accent-400: color-mix(in srgb, ${accentD} 70%, #ffffff) !important;
        --color-accent-500: ${accentD} !important;
        --color-accent-600: color-mix(in srgb, ${accentD} 75%, #000000) !important;
        ` : ""}

        /* --- Hero & Text Gradients (Media Dark) --- */
        ${primaryD ? `
        --gradient-hero: linear-gradient(135deg, color-mix(in srgb, ${primaryD} 12%, transparent), color-mix(in srgb, ${accentD || primaryD} 6%, transparent)) !important;
        --gradient-primary: linear-gradient(135deg, ${primaryD}, color-mix(in srgb, ${primaryD} 80%, #000000)) !important;
        --gradient-accent: linear-gradient(135deg, ${accentD || primaryD}, color-mix(in srgb, ${accentD || primaryD} 75%, #000000)) !important;
        --text-gradient: linear-gradient(135deg, ${primaryD}, ${accentD || primaryD}) !important;
        ` : ""}

        /* --- Base layout colors (Media Dark) --- */
        ${bgD ? `--bg: ${bgD} !important;` : ""}
        ${fgD ? `--fg: ${fgD} !important;` : ""}
        ${bgD ? `--muted: color-mix(in srgb, ${bgD} 90%, ${fgD || "#ffffff"}) !important;` : ""}
        ${fgD ? `--muted-fg: color-mix(in srgb, ${fgD} 60%, ${bgD || "#0b0f1a"}) !important;` : ""}
        ${cardD ? `--card: ${cardD} !important; --surface: ${cardD} !important;` : ""}
        ${cardFgD ? `--card-fg: ${cardFgD} !important;` : ""}
        ${sidebarBgD ? `--sidebar-bg: ${sidebarBgD} !important;` : ""}
        ${sidebarFgD ? `--sidebar-fg: ${sidebarFgD} !important;` : ""}

        /* --- Dynamic Borders & Glass (Media Dark) --- */
        ${bgD ? `--border-color: color-mix(in srgb, ${bgD} 92%, ${fgD || "#ffffff"}) !important;` : ""}
        ${bgD ? `--glass-bg: color-mix(in srgb, ${cardD || bgD || "#111827"} 78%, transparent) !important;` : ""}
        ${fgD ? `--glass-border: color-mix(in srgb, ${fgD} 6%, transparent) !important;` : ""}
      }
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: cssString }} suppressHydrationWarning />;
}
