import { getTicketDetails } from "../actions";
import { notFound } from "next/navigation";
import { SupportChat } from "../SupportChat";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicketDetails(id);

  if (!ticket) {
    notFound();
  }

  // Veriyi Client Component'e göndermeden önce serileştiriyoruz (Date → String vb.)
  // Prisma'nın Json alanından gelen attachments'ı kesin tipe dönüştürüyoruz.
  const serializedTicket = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map((msg) => ({
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      attachments: Array.isArray(msg.attachments)
        ? (msg.attachments as Array<{ name: string; url: string; contentType: string; size: number }>)
        : [],
    })),
  };

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

      <SupportChat ticket={serializedTicket} />
    </div>
  );
}
