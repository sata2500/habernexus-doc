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
    const users = await prisma.user.findMany({
      include: { accounts: true, sessions: true }
    });
    console.log('Total Users:', users.length);
    users.forEach(u => {
      console.log(`User: ${u.email}, Role: ${u.role}, Accounts: ${u.accounts.length}, PasswordHash: ${u.accounts[0]?.password || 'none'}`);
    });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
