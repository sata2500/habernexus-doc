require('dotenv').config();
const { PrismaClient } = require('./lib/generated/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  let connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@habernexus.com',
          role: 'ADMIN',
          emailVerified: true
        }
      });
    }

    const token = 'test_admin_session_token_' + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: admin.id,
        token: token,
        expiresAt: expiresAt
      }
    });

    console.log('SESSION_CREATED:', token);
    console.log('USER_ID:', admin.id);
  } catch (e) {
    console.error('Error creating session:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
