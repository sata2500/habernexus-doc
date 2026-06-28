import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthorSidebar } from "./components/AuthorSidebar";

export default async function AuthorLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session?.user) {
    redirect("/login");
  }

  // RBAC: Eğer kullanıcının rolü AUTHOR veya ADMIN değilse reddet.
  const isAuthorized = session.user.role === "AUTHOR" || session.user.role === "ADMIN";
  if (!isAuthorized) {
    redirect("/dashboard/profile");
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 flex flex-col md:flex-row gap-6 md:gap-8 min-h-[calc(100vh-4rem)] relative transition-colors duration-300">
      <AuthorSidebar session={session} />

      {/* ── İçerik Alanı ────────────────────────── */}
      <main className="flex-1 w-full min-w-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
