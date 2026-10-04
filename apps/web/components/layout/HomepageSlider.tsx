import { getSlider } from "@/app/actions/slider";
import { SliderClient } from "./SliderClient";

/** Planlanmış slaytlar yalnızca başlangıç ve bitiş zamanları arasında gösterilir */
function visibleSlides<T extends { isActive: boolean; startTime: Date | null; endTime: Date | null }>(slides: T[]) {
  const now = Date.now();
  return slides.filter((s) => s.isActive && (!s.startTime || s.startTime.getTime() <= now) && (!s.endTime || s.endTime.getTime() > now));
}

export async function HomepageSlider() {
  const slider = await getSlider("homepage");

  if (!slider || !slider.isActive || !slider.slides.length) return null;

  const activeSlides = visibleSlides(slider.slides);
  if (!activeSlides.length) return null;

  return (
    <section id="homepage-slider" aria-label="Duyuru ve Haberler" className="mb-12">
      <SliderClient
        slides={activeSlides}
        interval={slider.interval}
        autoPlay={slider.autoPlay}
      />
    </section>
  );
}
