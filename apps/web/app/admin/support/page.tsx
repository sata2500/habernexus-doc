import { getSupportTickets } from "./actions";
import { Mail, Clock, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const tickets = await getSupportTickets();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "PENDING": return <Clock className="h-4 w-4 text-blue-500" />;
      case "CLOSED": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "OPEN": return "Açık";
      case "PENDING": return "Bekliyor";
      case "CLOSED": return "Çözüldü";
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-blue-500/10 text-blue-500 p-2.5 rounded-xl border border-blue-500/20">
            <Mail className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Destek Merkezi</h1>
          <p className="text-muted-foreground text-sm">Gelen mailleri yönetin, cevaplayın ve biletleri takip edin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-strong p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Toplam Bilet</p>
                  <p className="text-2xl font-bold">{tickets.length}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <div className="glass-strong p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Bekleyen Yanıt</p>
                  <p className="text-2xl font-bold text-orange-500">{tickets.filter(t => t.status === "OPEN").length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500/20" />
          </div>
          <div className="glass-strong p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Çözülenler</p>
                  <p className="text-2xl font-bold text-green-500">{tickets.filter(t => t.status === "CLOSED").length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/20" />
          </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-background divide-y divide-border">
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Mail className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Henüz hiç destek talebi yok.</p>
            <p className="text-sm">Gelen mailler burada otomatik olarak listelenecektir.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <Link 
              key={ticket.id} 
              href={`/admin/support/${ticket.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-primary-500/10 group-hover:text-primary-500 transition-colors">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground truncate">{ticket.userEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs text-muted-foreground">Son Etkinlik</span>
                    <span className="text-sm font-medium">
                        {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: tr })}
                    </span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    ticket.status === "OPEN" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                    ticket.status === "PENDING" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                    "bg-green-500/10 text-green-600 border-green-500/20"
                }`}>
                    {getStatusIcon(ticket.status)}
                    {getStatusText(ticket.status)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
