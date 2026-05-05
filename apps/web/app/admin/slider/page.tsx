import { getSlider } from "@/app/actions/slider";
import { SliderClient } from "./SliderClient";
import { SliderWithSlides } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSliderPage() {
  const slider = await getSlider("homepage") as SliderWithSlides;

  if (!slider) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Slider Bulunamadı</h1>
        <p className="text-muted-foreground">Lütfen veritabanını seed ettiğinizden emin olun.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Slayt Yönetimi</h1>
          <p className="text-muted-foreground text-sm">Ana sayfadaki duyuru ve haber slaytlarını buradan yönetebilirsiniz.</p>
        </div>
      </div>

      <SliderClient initialSlider={slider} />
    </div>
  );
}
