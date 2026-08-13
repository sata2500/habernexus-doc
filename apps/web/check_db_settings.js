require('dotenv').config();
const { PrismaClient } = require('./lib/generated/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  let connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/habernexus';
  if (connectionString.includes('aws.neon.tech') && !connectionString.includes('sslmode=')) {
    const joiner = connectionString.includes('?') ? '&' : '?';
    connectionString += joiner + 'sslmode=verify-full';
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const p = new PrismaClient({ adapter });

  try {
    const settings = await p.siteSettings.findFirst();
    if (settings) {
      console.log('=== MEVCUT TEMA AYARLARI ===');
      console.log('primaryColorLight:', settings.primaryColorLight);
      console.log('primaryColorDark:', settings.primaryColorDark);
      console.log('accentLight:', settings.accentLight);
      console.log('bgLight:', settings.bgLight);
      console.log('siteName:', settings.siteName);
      console.log('');
      const CRIMSON = '#dc2626';
      const isCrimson = settings.primaryColorLight === CRIMSON;
      console.log('Crimson Fire mi?', isCrimson ? 'EVET (#dc2626 - KIRMIZI)' : 'HAYIR, mevcut renk: ' + settings.primaryColorLight);
    } else {
      console.log('Veritabaninda SiteSettings kaydi yok!');
      console.log('Varsayilan renkler: Indigo/mavi (globals.css oklch 250 deg)');
    }
  } catch(e) {
    console.error('Hata:', e.message);
  } finally {
    await p.$disconnect();
    await pool.end();
  }
}

main();
