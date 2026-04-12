export const metadata = {
  title: "Çerez Politikası",
};

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="font-(family-name:--font-outfit)">Çerez (Cookie) Politikası</h1>
        
        <p>
          Haber Nexus olarak sitelerimizden daha verimli faydalanabilmeniz ve kullanıcı deneyiminizi geliştirebilmemiz için çeşitli çerezler (cookie) kullanmaktayız. Çerez kullanılmasını tercih etmezseniz tarayıcınızın ayarlarından siltebilir veya devre dışı bırakabilirsiniz ancak bunun sitenin tam fonksiyonlu çalışmasını engelleyebileceğini hatırlatırız.
        </p>

        <h2>Çerez (Cookie) Nedir?</h2>
        <p>
          Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcılar aracılığıyla cihazınıza veya ağ sunucusuna depolanan küçük metin (veri) dosyalarıdır.
        </p>

        <h2>Hangi Çerezleri Neden Kullanıyoruz?</h2>
        <ul>
          <li><strong>Zorunlu Çerezler:</strong> Siteye giriş yapabilmeniz, formları doldurabilmeniz ve karanlık/açık mod tercihlerinizi hafızada tutmamız için elzemdir.</li>
          <li><strong>Performans Çerezleri:</strong> Sitemizin nasıl kullanıldığını analiz ederek, sayfaları ne kadar hızla yüklediğimizi test edebilmek için isimsiz tıklama haritaları çıkartır.</li>
          <li><strong>Fonksiyonel Çerezler:</strong> Size en uygun haber dökümünü listelemek ve sık arattığınız kategorileri ön plana çıkarmak için kullanılır.</li>
        </ul>

        <h2>Çerezleri Nasıl Kontrol Edebilirsiniz?</h2>
        <p>
          Çoğu internet tarayıcısı çerezleri otomatik olarak kabul eder. Farklı bir tercih isterseniz Chrome, Firefox, Safari gibi tüm popüler tarayıcıların &quot;Ayarlar/Gizlilik&quot; bölümünden çerez kullanımını kısıtlayabilirsiniz. Detaylı bilgi için tarayıcınızın yardım dosyalarını inceleyebilirsiniz.
        </p>
      </div>
    </div>
  );
}
