import { getTicketDetails } from "../actions";
import { notFound } from "next/navigation";
import { SupportChat } from "../SupportChat";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const ticket = await getTicketDetails(params.id);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/support" 
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary-500 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Destek Merkezine Dön
        </Link>
      </div>

      <SupportChat ticket={ticket as any} />
    </div>
  );
}
