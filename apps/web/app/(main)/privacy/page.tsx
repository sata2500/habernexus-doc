export const metadata = {
  title: "Gizlilik Politikası",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="font-(family-name:--font-outfit)">Gizlilik Politikası</h1>
        <p className="text-sm text-muted-foreground">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <p>
          Haber Nexus olarak (&quot;Platform&quot;, &quot;Site&quot;, &quot;Biz&quot;), kişisel verilerinizin güvenliğine ve gizliliğine son derece önem veriyoruz. Bu Gizlilik Politikası, web sitemizi ziyaret ettiğinizde topladığımız, kullandığımız ve nasıl koruduğumuz bilgileri açıklamaktadır.
        </p>

        <h2>1. Toplanan Veriler</h2>
        <p>Web sitemize kayıt olurken, e-bültenimize abone olurken veya sayfalarımızı gezerken sizden aşağıdaki veriler toplanabilir:</p>
        <ul>
          <li>Kimlik ve iletişim bilgileri (İsim, E-posta adresi, Profil resmi)</li>
          <li>Cihaz ve bağlantı bilgileri (IP adresi, tarayıcı türü, işletim sistemi)</li>
          <li>Platform üzerindeki kullanım alışkanlıkları (Okuma süreleri, tıklanan bağlantılar, kaydedilen makaleler)</li>
        </ul>

        <h2>2. Verilerin Kullanım Amacı</h2>
        <p>Topladığımız kişisel verileri şu amaçlarla kullanırız:</p>
        <ul>
          <li>Size kişiselleştirilmiş haber akışları sunmak,</li>
          <li>Kullanıcı hesabı oluşturma ve onay süreçlerini yönetmek,</li>
          <li>Uygulama içi deneyiminizi iyileştirmek,</li>
          <li>Güvenlik ihlallerini ve dolandırıcılığı önlemek.</li>
        </ul>

        <h2>3. Verilerin Paylaşımı</h2>
        <p>
          Hiçbir koşulda kişisel verilerinizi reklam şirketlerine veya üçüncü şahıslara para karşılığı <strong>SATMIYORUZ</strong>. Verileriniz yalnızca adli veya hukuki zorunluluklarda yetkili kamu kurumlarıyla veya temel sunucu sağlayıcılarımızla (sadece depolama amacı ile) mevzuat çerçevesinde paylaşılabilir.
        </p>

        <h2>4. Güvenlik</h2>
        <p>
          Kullanıcı bilgilerini korumak için endüstri standartlarında SSL şifreleme ve gelişmiş güvenlik araçları kullanıyoruz. Ancak internet üzerinden %100 güvenlik sağlamanın mümkün olmadığını lütfen unutmayın.
        </p>
      </div>
    </div>
  );
}
