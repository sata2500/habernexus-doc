import { getSlider } from "@/app/actions/slider";
import { SliderClient } from "./SliderClient";

export async function HomepageSlider() {
  const slider = await getSlider("homepage");

  if (!slider || !slider.isActive || !slider.slides.length) {
    return null;
  }

  // Sadece aktif slidları filtrele (Opsiyonel: Zamanlanmış slidları da burada filtreleyebilirsiniz)
  const activeSlides = slider.slides.filter(s => s.isActive);

  if (!activeSlides.length) return null;

  return (
    <section id="homepage-slider" aria-label="Duyuru ve Haberler" className="mb-12">
      <SliderClient 
        slides={activeSlides} 
        interval={slider.interval}
        autoPlay={slider.autoPlay}
        height={slider.height || "500px"}
        mobileHeight={(slider as any).mobileHeight || "300px"}
        titleSize={(slider as any).titleSize || "2.5rem"}
        descriptionSize={(slider as any).descriptionSize || "1rem"}
      />
    </section>
  );
}
