import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/authz";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Profilim" };

export default async function ProfilePage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login?callbackUrl=/dashboard/profile");
  // Güncel bilgiler veritabanından (oturum çerezindeki ad/fotoğraf eski olabilir)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, bio: true, role: true },
  });
  if (!user) redirect("/login");

  return <ProfileForm initial={{ name: user.name, email: user.email, image: user.image ?? "", bio: user.bio ?? "", role: user.role }} />;
}
