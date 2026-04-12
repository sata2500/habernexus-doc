export const metadata = {
  title: "Kullanım Şartları",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="font-(family-name:--font-outfit)">Kullanım Şartları</h1>
        <p className="text-sm text-muted-foreground">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <h2>1. Kabul Beyanı</h2>
        <p>
          Haber Nexus (&quot;Site&quot;) hizmetlerine erişim sağlayarak veya kayıt olarak, aşağıda belirtilen Kullanım Şartları&apos;nı tamamıyla okuduğunuzu, anladığınızı ve yasal olarak bağlayıcılığını kabul etmiş olursunuz.
        </p>

        <h2>2. İçerik ve Fikri Mülkiyet Hakları</h2>
        <p>
          Sitemizde ve uygulamalarımızda yer alan her türlü metin, tasarım, kod, grafik, logo ve görsellerin fikri mülkiyet hakları Haber Nexus&apos;a ve içerik üreticilerine aittir. Kar amacı güdülmese dahi, sitemizdeki haber ve makaleler kaynak gösterilmeden veya izinsiz olarak başka platformlarda toplu şekilde yayınlanamaz.
        </p>

        <h2>3. Kullanıcı Davranışları ve Sorumluluklar</h2>
        <ul>
          <li>Kullanıcılar yorum ve etkileşimlerinde Türkiye Cumhuriyeti yasalarına, kamu düzenine ve ahlak kurallarına uymak zorundadır.</li>
          <li>Hakaret, küfür, tehdit unsuru barındıran veya nefret söylemi içeren içerikler derhal engellenecek ve gereği halinde yetkili mercilere bildirilecektir.</li>
          <li>Site hesabı bilgilerinin gizliliğinden bizzat kullanıcı sorumludur, hesabın başkaları tarafından izinsiz kullanımına bağlı zararlardan Haber Nexus sorumlu tutulamaz.</li>
        </ul>

        <h2>4. Hizmet Kesintileri</h2>
        <p>
          Haber Nexus; bakım, güncelleme veya mücbir sebeplerden ötürü sistemdeki geçici erişim problemlerinden veya veri kayıplarından yasal olarak mesul tutulamaz.
        </p>

        <h2>5. Yargı Yeri</h2>
        <p>
          İşbu Kullanım Şartları&apos;ndan doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri münhasıran yetkilidir.
        </p>
      </div>
    </div>
  );
}
