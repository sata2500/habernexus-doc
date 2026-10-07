import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/auth-errors";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Giriş yap" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  // Zaten giriş yapmış kullanıcı formu görmez, gideceği sayfaya geçer
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (session?.user) redirect(safeCallbackPath((await searchParams).callbackUrl));
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  return (
    <Suspense>
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
