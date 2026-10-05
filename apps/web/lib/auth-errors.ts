/** better-auth sosyal giriş hata kodlarının okunur karşılıkları */
const MESSAGES: Record<string, string> = {
  account_not_linked: "Bu e-posta adresiyle daha önce e-posta ve şifreyle kayıt olunmuş. Lütfen e-posta ve şifrenle giriş yap.",
  state_not_found: "Giriş oturumunun süresi doldu. Lütfen tekrar dene.",
  state_mismatch: "Giriş oturumunun süresi doldu. Lütfen tekrar dene.",
  please_restart_the_process: "Giriş oturumunun süresi doldu. Lütfen tekrar dene.",
  invalid_code: "Google girişi doğrulanamadı. Lütfen tekrar dene.",
  access_denied: "Google girişi iptal edildi.",
  email_not_found: "Google hesabından e-posta adresi alınamadı.",
  unable_to_get_user_info: "Google hesap bilgileri alınamadı. Lütfen tekrar dene.",
  internal_server_error: "Giriş sırasında bir sunucu hatası oluştu. Lütfen biraz sonra tekrar dene.",
};

export function authErrorMessage(code: string | null | undefined) {
  if (!code) return null;
  return MESSAGES[code] ?? `Giriş yapılamadı (${code}). Lütfen tekrar dene.`;
}

/** Yalnızca site içi yollara yönlendir (açık yönlendirme açığını önler) */
export function safeCallbackPath(raw: string | null | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}
