import { ensureSlider } from "@/app/actions/slider";
import { SliderClient } from "./SliderClient";

export const dynamic = "force-dynamic";

export default async function AdminSliderPage() {
  const slider = await ensureSlider();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display">Ana sayfa slider</h1>
        <p className="text-sm text-muted-foreground">Ana sayfanın üstündeki öne çıkan duyuru ve haberler. Slaytları belli tarihler arasında gösterecek şekilde planlayabilirsiniz.</p>
      </div>
      <SliderClient slider={slider} />
    </div>
  );
}
