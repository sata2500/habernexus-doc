import { getPersonas } from "./actions";
import { PersonaManager } from "./components/PersonaManager";
import { prisma } from "@/lib/prisma";

export default async function PersonasPage() {
  const personas = await getPersonas();
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PersonaManager 
        initialPersonas={personas as any} 
        allCategories={allCategories} 
      />
    </div>
  );
}
