import { getAiModels } from "./actions";
import { ModelManagerClient } from "./components/ModelManagerClient";

export default async function AiModelsPage() {
  const models = await getAiModels();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <ModelManagerClient initialModels={models as any} />
    </div>
  );
}
