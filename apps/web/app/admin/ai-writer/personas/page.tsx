import { getPersonas } from "./actions";
import { PersonaManager } from "./components/PersonaManager";
import { prisma } from "@/lib/prisma";

interface Category {
  id: string;
  name: string;
}

interface Persona {
  id: string;
  name: string;
  role: string | null;
  image: string | null;
  description: string | null;
  prompt: string;
  imagePrompt: string;
  categories: { category: Category }[];
}

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
        initialPersonas={personas as unknown as Persona[]}
        allCategories={allCategories} 
      />
    </div>
  );
}
