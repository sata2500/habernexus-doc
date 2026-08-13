require('dotenv').config();
const { auth } = require('./lib/auth');
const { PrismaClient } = require('./lib/generated/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  let connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Delete old admin@habernexus.com if exists without account
    await prisma.user.deleteMany({
      where: { email: 'admin@habernexus.com' }
    });

    console.log('Creating admin@habernexus.com via better-auth signUpEmail...');
    const res = await auth.api.signUpEmail({
      body: {
        email: 'admin@habernexus.com',
        password: 'password123',
        name: 'Admin Nexus'
      }
    });

    console.log('SignUp result:', res);

    // 2. Set role to ADMIN
    await prisma.user.update({
      where: { email: 'admin@habernexus.com' },
      data: { role: 'ADMIN' }
    });

    console.log('Updated admin@habernexus.com role to ADMIN!');

    // 3. Perform signInEmail to get valid session token & cookies
    const signinRes = await auth.api.signInEmail({
      body: {
        email: 'admin@habernexus.com',
        password: 'password123'
      },
      asResponse: true
    });

    console.log('SignIn headers set-cookie:', signinRes.headers.get('set-cookie'));
  } catch (e) {
    console.error('Error during setup_admin_auth:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
