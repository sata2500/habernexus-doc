-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('RAW', 'PROCESSING', 'OPTIMIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "RssItemStatus" AS ENUM ('PENDING', 'ANALYZED', 'APPROVED', 'LOW_SCORE', 'COVERED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AiModelType" AS ENUM ('TEXT', 'IMAGE', 'MULTIMODAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "bio" TEXT,
    "newsletterSubscribed" BOOLEAN NOT NULL DEFAULT true,
    "newsletterTime" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "aiPersonaId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lang" TEXT NOT NULL DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "lang" TEXT NOT NULL DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'tr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnArticle" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TagOnArticle_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "newsletterTime" TEXT NOT NULL DEFAULT '08:00',
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'RAW',
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "extraData" JSONB,
    "lang" TEXT NOT NULL DEFAULT 'tr',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssFeedSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "categoryHint" TEXT,
    "language" TEXT NOT NULL DEFAULT 'tr',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "fetchError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssFeedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssFeedItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "excerpt" TEXT,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" "RssItemStatus" NOT NULL DEFAULT 'PENDING',
    "aiScore" INTEGER,
    "aiAnalysis" JSONB,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "usedForArticle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssFeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "rssScanCron" TEXT NOT NULL DEFAULT '0 */2 * * *',
    "rssAnalyzeCron" TEXT NOT NULL DEFAULT '0 */4 * * *',
    "rssRetentionDays" INTEGER NOT NULL DEFAULT 14,
    "qStashScanId" TEXT,
    "qStashAnalyzeId" TEXT,
    "qStashNewsletterId" TEXT,
    "aiAnalyzerModel" TEXT NOT NULL DEFAULT 'google/gemini-2.0-flash-001',
    "aiWriterModel" TEXT NOT NULL DEFAULT 'google/gemini-2.0-flash-001',
    "aiWriterImageModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash-image',
    "aiWriterPrompt" TEXT NOT NULL DEFAULT 'Sen profesyonel bir haber editörüsün. Verilen konuyu Google Arama kullanarak araştır ve en güncel, doğru bilgilerle son derece kaliteli, özgün ve tarafsız bir haber makalesi yaz. HTML formatında (h2, p, strong etiketlerini kullanarak) döndür. Başlık dahil etme.',
    "aiWriterImagePrompt" TEXT NOT NULL DEFAULT 'Profesyonel, gerçekçi bir haber fotoğrafı. Fotoğrafçılık kalitesinde, 16:9 oranında, haberin konusuyla ilgili.',
    "aiWriterUseRssImage" BOOLEAN NOT NULL DEFAULT true,
    "aiWriterAutoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiWriterAutoCount" INTEGER NOT NULL DEFAULT 3,
    "aiWriterAutoCron" TEXT NOT NULL DEFAULT '0 */6 * * *',
    "qStashAiWriterId" TEXT,
    "aiWriterSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT DEFAULT 'Haber Editörü',
    "image" TEXT,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPersonaOnCategory" (
    "personaId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPersonaOnCategory_pkey" PRIMARY KEY ("personaId","categoryId")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "siteName" TEXT NOT NULL DEFAULT 'Haber Nexus',
    "siteTagline" TEXT DEFAULT 'Yeni Nesil Haber Platformu',
    "siteDescription" TEXT DEFAULT 'Gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin. Modern, hızlı ve kişiselleştirilmiş haber deneyimi.',
    "siteUrl" TEXT,
    "logoText" TEXT DEFAULT 'N',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColorLight" TEXT,
    "primaryColorDark" TEXT,
    "bgLight" TEXT,
    "bgDark" TEXT,
    "fgLight" TEXT,
    "fgDark" TEXT,
    "cardLight" TEXT,
    "cardDark" TEXT,
    "cardFgLight" TEXT,
    "cardFgDark" TEXT,
    "accentLight" TEXT,
    "accentDark" TEXT,
    "sidebarBgLight" TEXT,
    "sidebarBgDark" TEXT,
    "sidebarFgLight" TEXT,
    "sidebarFgDark" TEXT,
    "keywords" TEXT DEFAULT 'haber,gündem,son dakika,analiz,Türkiye,dünya,teknoloji,spor',
    "socialTwitter" TEXT,
    "socialInstagram" TEXT,
    "socialYoutube" TEXT,
    "socialGithub" TEXT,
    "footerCopyright" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AiModelType" NOT NULL DEFAULT 'TEXT',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inputModalities" JSONB,
    "outputModalities" JSONB,
    "supportsSearch" BOOLEAN NOT NULL DEFAULT false,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsT2I" BOOLEAN NOT NULL DEFAULT false,
    "supportsI2I" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slider" (
    "id" TEXT NOT NULL DEFAULT 'homepage',
    "name" TEXT NOT NULL,
    "autoPlay" BOOLEAN NOT NULL DEFAULT true,
    "interval" INTEGER NOT NULL DEFAULT 5000,
    "height" TEXT DEFAULT '500px',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "link" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "sliderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_slug_idx" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_lang_idx" ON "Article"("lang");

-- CreateIndex
CREATE INDEX "Article_aiPersonaId_idx" ON "Article"("aiPersonaId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "TagOnArticle_tagId_idx" ON "TagOnArticle"("tagId");

-- CreateIndex
CREATE INDEX "Comment_articleId_idx" ON "Comment"("articleId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_articleId_key" ON "Bookmark"("userId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeToken_key" ON "Subscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "Media_url_key" ON "Media"("url");

-- CreateIndex
CREATE INDEX "Media_userId_idx" ON "Media"("userId");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_slug_key" ON "StaticPage"("slug");

-- CreateIndex
CREATE INDEX "StaticPage_slug_idx" ON "StaticPage"("slug");

-- CreateIndex
CREATE INDEX "SupportTicket_userEmail_idx" ON "SupportTicket"("userEmail");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RssFeedSource_url_key" ON "RssFeedSource"("url");

-- CreateIndex
CREATE INDEX "RssFeedSource_isActive_idx" ON "RssFeedSource"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RssFeedItem_url_key" ON "RssFeedItem"("url");

-- CreateIndex
CREATE UNIQUE INDEX "RssFeedItem_urlHash_key" ON "RssFeedItem"("urlHash");

-- CreateIndex
CREATE INDEX "RssFeedItem_sourceId_idx" ON "RssFeedItem"("sourceId");

-- CreateIndex
CREATE INDEX "RssFeedItem_status_idx" ON "RssFeedItem"("status");

-- CreateIndex
CREATE INDEX "RssFeedItem_aiScore_idx" ON "RssFeedItem"("aiScore");

-- CreateIndex
CREATE INDEX "RssFeedItem_publishedAt_idx" ON "RssFeedItem"("publishedAt");

-- CreateIndex
CREATE INDEX "RssFeedItem_dismissed_idx" ON "RssFeedItem"("dismissed");

-- CreateIndex
CREATE INDEX "RssFeedItem_usedForArticle_idx" ON "RssFeedItem"("usedForArticle");

-- CreateIndex
CREATE UNIQUE INDEX "AiPersona_name_key" ON "AiPersona"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Slider_name_key" ON "Slider"("name");

-- CreateIndex
CREATE INDEX "Slide_sliderId_idx" ON "Slide"("sliderId");

-- CreateIndex
CREATE INDEX "Slide_order_idx" ON "Slide"("order");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_aiPersonaId_fkey" FOREIGN KEY ("aiPersonaId") REFERENCES "AiPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnArticle" ADD CONSTRAINT "TagOnArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnArticle" ADD CONSTRAINT "TagOnArticle_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssFeedItem" ADD CONSTRAINT "RssFeedItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RssFeedSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPersonaOnCategory" ADD CONSTRAINT "AiPersonaOnCategory_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "AiPersona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPersonaOnCategory" ADD CONSTRAINT "AiPersonaOnCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_sliderId_fkey" FOREIGN KEY ("sliderId") REFERENCES "Slider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
