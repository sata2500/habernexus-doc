const { PrismaClient } = require('./lib/generated/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'salihtanriseven25@gmail.com' }
  });
  console.log("USER IMAGE:", user ? user.image : "User not found");
}
main().finally(() => prisma.$disconnect());
