import { getAiModels } from "./actions";
import { ModelManagerClient } from "./components/ModelManagerClient";

interface AiModel {
  id: string;
  name: string;
  description: string | null;
  type: "TEXT" | "IMAGE" | "MULTIMODAL";
  isFree: boolean;
  isActive: boolean;
  supportsSearch: boolean;
  supportsVision: boolean;
  supportsT2I: boolean;
  supportsI2I: boolean;
}

export default async function AiModelsPage() {
  const models = await getAiModels();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <ModelManagerClient initialModels={models as unknown as AiModel[]} />
    </div>
  );
}
