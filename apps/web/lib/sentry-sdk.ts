/**
 * Tarayıcıda kullanılan Sentry işlevleri. lib/sentry-client.ts bu dosyayı ertelenmiş olarak yükler;
 * yalnızca adı geçen işlevler alındığı için kullanılmayan oturum kaydı (replay), geri bildirim
 * penceresi gibi modüller pakete girmez (tüm paketi dinamik içe aktarmak hepsini ekliyordu).
 */
export { captureException, flush, getClient, init } from "@sentry/nextjs";
