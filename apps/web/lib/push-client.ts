/**
 * Tarayıcı bildirimleri: izin, abonelik ve abonelikten çıkma (tarayıcı tarafı).
 * Ortak anahtar derlemede gömülür (NEXT_PUBLIC_VAPID_PUBLIC_KEY); yoksa bildirimler kapalıdır.
 */
export const PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const DISMISS_KEY = "hn:push-prompt-dismissed";
const DISMISS_DAYS = 30;

export function pushSupported() {
  return typeof window !== "undefined" && !!PUSH_PUBLIC_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

/** İzin ister ve aboneliği sunucuya kaydeder. Dönen değer: "granted" | "denied" | "error" */
export async function enablePush(): Promise<"granted" | "denied" | "error"> {
  if (!pushSupported()) return "error";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUSH_PUBLIC_KEY) }));
    const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    return res.ok ? "granted" : "error";
  } catch {
    return "error";
  }
}

export async function disablePush() {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe().catch(() => false);
}

export function promptDismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissPrompt() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* depolama kapalı */ }
}
