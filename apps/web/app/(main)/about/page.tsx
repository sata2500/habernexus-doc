export const metadata = {
  title: "Hakkımızda",
  description: "Haber Nexus hakkında detaylı bilgi, vizyonumuz ve misyonumuz.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-8">
          Haber Nexus Hakkında
        </h1>
        
        <p className="lead text-xl text-muted-foreground mb-8 border-l-4 border-primary-500 pl-6">
          Haber Nexus, dijital çağın hızına ayak uyduran, bağımsız, tarafsız ve dürüst habercilik anlayışını benimsemiş yeni nesil bir dijital medya platformudur.
        </p>

        <h2>Vizyonumuz</h2>
        <p>
          Bilgi kirliliğinin en üst düzeye ulaştığı günümüz dijital dünyasında, temiz, teyitli ve nitelikli bilgiye ulaşmak her bireyin en doğal hakkıdır. Vizyonumuz, Türkiye&apos;de ve dünyada olan biteni, hiçbir filtreden geçirmeden, salt gerçeklerle okuyucuya en hızlı şekilde ulaştıran birincil haber kaynağı olmaktır.
        </p>

        <h2>Misyonumuz</h2>
        <p>
          Dünyayı sarmalayan karmaşık olay örgüsünü sadeleştirerek anlaşılır bir dille sunmak, modern web teknolojilerini kullanarak hızlı ve kesintisiz okuma deneyimi sağlamak ve kişiselleştirilmiş bir algoritma ile herkesin kendi ilgi alanındaki gelişmelere en kısa yoldan ulaşmasını sağlamaktır.
        </p>

        <h3>Teknoloji Altyapımız</h3>
        <p>
          Okuyucularımızın değerli zamanını tasarruf etmek adına saniyelerin altındaki yükleme hızlarına odaklandık. Haber Nexus, yapay zeka destekli içerik tasnifleme araçları, karanlık mod desteği ve Edge ağı entegrasyonu ile sektördeki en modern dijital haber deneyimini sunmaktadır.
        </p>
      </div>
    </div>
  );
}
