# Base imaj olarak Node.js 22-alpine kullanıyoruz (Hafif ve güncel)
FROM node:22-alpine AS base

# --- Bağımlılıklar Aşaması ---
FROM base AS deps
# Tipik bağımlılıklar için gerekli araçlar
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Monorepo bağımlılık dosyalarını kopyala
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

# Bağımlılıkları kur
RUN npm ci

# --- Build Aşaması ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Build işlemi (Next.js build)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production Aşaması ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Gerekli kullanıcıyı oluştur
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Sadece gerekli dosyaları kopyala
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

# Next.js standalone output kullanıyorsak (opsiyonel ama önerilir)
# Bu proje şu an standart build yapıyor, o yüzden tüm apps/web'i kopyalıyoruz
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/prisma ./apps/web/prisma

# Medya klasörünü oluştur ve yetkilendir
RUN mkdir -p apps/web/public/uploads && chown -y nextjs:nodejs apps/web/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Uygulama dizinine geç ve başlat
WORKDIR /app/apps/web
CMD ["npm", "start"]
