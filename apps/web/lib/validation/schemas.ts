import { z } from "zod";

export const NewsletterEmailSchema = z.string().trim().toLowerCase().email().max(320);
export const NewsletterTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Geçerli bir saat seçin.");

export const CommentInputSchema = z.object({
  articleId: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1, "Yorum boş olamaz.").max(5000, "Yorum 5000 karakterden uzun olamaz."),
  parentId: z.string().trim().min(1).max(100).optional(),
});

export const CommentIdSchema = z.string().trim().min(1).max(100);

export const RssSourceIdSchema = z.string().trim().min(1).max(100);

export const RssSourceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.url().refine((value) => new URL(value).protocol === "https:", {
    message: "RSS adresi HTTPS olmalıdır.",
  }),
  categoryHint: z.string().trim().max(120).optional(),
  language: z.string().trim().min(2).max(10).default("tr"),
});

export const RssSourceUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  categoryHint: z.string().trim().max(120).optional(),
}).strict();

export const RssSuggestionFiltersSchema = z.object({
  status: z.enum(["PENDING", "ANALYZED", "APPROVED", "COVERED", "DISMISSED", "LOW_SCORE"]).optional(),
  minScore: z.number().min(0).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(120).optional(),
}).optional();

export const AiBatchCountSchema = z.number().int().min(1).max(10);
export const RssRetentionDaysSchema = z.number().int().min(1).max(365);

export const CronExpressionSchema = z.string()
  .trim()
  .min(9)
  .max(100)
  .regex(/^(\S+\s+){4}\S+$/, "Geçerli bir 5 alanlı cron ifadesi girin.");

const OptionalHttpUrlSchema = z.string().trim().max(2048).refine(
  (value) => value === "" || /^https?:\/\//i.test(value),
  "Yalnızca HTTP(S) URL kullanılabilir.",
);
const OptionalHexColorSchema = z.string().trim().refine(
  (value) => value === "" || /^#[0-9a-fA-F]{3,8}$/.test(value),
  "Geçerli bir hex renk girin.",
);

export const SiteSettingsInputSchema = z.object({
  siteName: z.string().trim().min(1).max(60).optional(),
  siteTagline: z.string().trim().max(120).optional(),
  siteDescription: z.string().trim().max(500).optional(),
  siteUrl: OptionalHttpUrlSchema.optional(),
  logoText: z.string().trim().max(1).optional(),
  logoUrl: OptionalHttpUrlSchema.optional(),
  faviconUrl: OptionalHttpUrlSchema.optional(),
  primaryColorLight: OptionalHexColorSchema.optional(),
  primaryColorDark: OptionalHexColorSchema.optional(),
  bgLight: OptionalHexColorSchema.optional(),
  bgDark: OptionalHexColorSchema.optional(),
  fgLight: OptionalHexColorSchema.optional(),
  fgDark: OptionalHexColorSchema.optional(),
  cardLight: OptionalHexColorSchema.optional(),
  cardDark: OptionalHexColorSchema.optional(),
  cardFgLight: OptionalHexColorSchema.optional(),
  cardFgDark: OptionalHexColorSchema.optional(),
  accentLight: OptionalHexColorSchema.optional(),
  accentDark: OptionalHexColorSchema.optional(),
  sidebarBgLight: OptionalHexColorSchema.optional(),
  sidebarBgDark: OptionalHexColorSchema.optional(),
  sidebarFgLight: OptionalHexColorSchema.optional(),
  sidebarFgDark: OptionalHexColorSchema.optional(),
  keywords: z.string().trim().max(500).optional(),
  socialTwitter: OptionalHttpUrlSchema.optional(),
  socialInstagram: OptionalHttpUrlSchema.optional(),
  socialYoutube: OptionalHttpUrlSchema.optional(),
  socialGithub: OptionalHttpUrlSchema.optional(),
  footerCopyright: z.string().trim().max(500).optional(),
}).strict();

export const SystemSettingsInputSchema = z.object({
  maxNewsAgeHours: z.number().int().min(0).max(720).optional(),
  googleTrendsEnabled: z.boolean().optional(),
  googleTrendsGeo: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Geçerli bir ülke kodu girin.").optional(),
  trendAutoPublishThreshold: z.number().int().min(0).max(100).optional(),
  trendSearchGenerateEnabled: z.boolean().optional(),
}).strict();

export const AiWriterSettingsSchema = z.object({
  aiProvider: z.string().trim().min(1).max(50).optional().default("OPENROUTER"),
  prompt: z.string().trim().min(1).max(20000),
  imagePrompt: z.string().trim().min(1).max(10000),
  model: z.string().trim().min(1).max(200),
  imageModel: z.string().trim().min(1).max(200),
  useRssImage: z.boolean(),
  searchEnabled: z.boolean(),
  analyzerModel: z.string().trim().min(1).max(200),
});

export const AiWriterAutomationSchema = z.object({
  enabled: z.boolean(),
  count: AiBatchCountSchema,
  cron: CronExpressionSchema,
});

export const AiModelIdSchema = z.string().trim().min(1).max(200);

export const ManualAiModelSchema = z.object({
  id: AiModelIdSchema,
  name: z.string().trim().min(1).max(200),
  type: z.enum(["TEXT", "IMAGE", "MULTIMODAL"]),
  isFree: z.boolean(),
  isActive: z.boolean(),
});
