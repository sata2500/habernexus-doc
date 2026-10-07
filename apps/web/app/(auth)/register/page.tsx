import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Kayıt ol" };

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (session?.user) redirect("/");
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  return <RegisterForm googleEnabled={googleEnabled} />;
}
