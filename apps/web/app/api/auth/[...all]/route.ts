import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { repairDuplicateOAuthAccounts } from "@/lib/server/auth-repair";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  // Sosyal giriş dönüşünden önce eski sürümlerden kalan yinelenen hesap kayıtlarını temizle
  if (new URL(request.url).pathname.includes("/callback/")) await repairDuplicateOAuthAccounts();
  return handler.GET(request);
}

export const POST = handler.POST;
