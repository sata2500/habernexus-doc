import "dotenv/config";
import { auth } from "./lib/auth";
import { prisma } from "./lib/prisma";

async function main() {
  try {
    await prisma.user.deleteMany({
      where: { email: "admin@habernexus.com" },
    });

    console.log("Creating admin@habernexus.com via better-auth signUpEmail...");
    const res = await auth.api.signUpEmail({
      body: {
        email: "admin@habernexus.com",
        password: "password123",
        name: "Admin Nexus",
      },
    });

    console.log("SignUp result token/user:", res?.user?.email);

    await prisma.user.update({
      where: { email: "admin@habernexus.com" },
      data: { role: "ADMIN" },
    });

    console.log("Updated admin@habernexus.com role to ADMIN!");

    const signinRes = await auth.api.signInEmail({
      body: {
        email: "admin@habernexus.com",
        password: "password123",
      },
      asResponse: true,
    });

    console.log("SignIn headers set-cookie:", signinRes.headers.get("set-cookie"));
  } catch (e) {
    console.error("Error during setup_admin_auth:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
