"use client";

/**
 * Kök yerleşimde oluşan hatalar için son çare ekranı. Kendi <html>/<body> etiketlerini
 * tanımlar ve site stillerine güvenmez; bu yüzden satır içi stil kullanır.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", background: "#f9fafb", color: "#111827" }}>
        <title>Bir hata oluştu | Haber Nexus</title>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>
              <span style={{ color: "#dc2626" }}>Haber</span> Nexus
            </p>
            <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Site şu anda yüklenemedi</h1>
            <p style={{ color: "#4b5563", fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" }}>
              Beklenmedik bir hata oluştu. Lütfen biraz sonra tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 12, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Tekrar dene
            </button>
            {error.digest && <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 16 }}>Hata kodu: {error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
