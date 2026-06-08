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
      case "OPEN": return <AlertCircle className="h-4 w-4 text-warning" />;
      case "PENDING": return <Clock className="h-4 w-4 text-primary-500" />;
      case "CLOSED": return <CheckCircle2 className="h-4 w-4 text-success" />;
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
          <h1 className="text-2xl font-bold font-display">Destek Merkezi</h1>
          <p className="text-muted-foreground text-sm">Gelen mailleri yönetin, cevaplayın ve biletleri takip edin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-strong p-6 rounded-3xl border border-border/50 flex items-center justify-between hover-lift hover:shadow-glow hover:border-primary-500/20 transition-all duration-300 shadow-soft">
              <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Toplam Bilet</p>
                  <p className="text-2xl font-bold mt-1">{tickets.length}</p>
              </div>
              <Mail className="h-8 w-8 text-primary-500/20" />
          </div>
          <div className="glass-strong p-6 rounded-3xl border border-border/50 flex items-center justify-between hover-lift hover:shadow-glow hover:border-primary-500/20 transition-all duration-300 shadow-soft">
              <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Bekleyen Yanıt</p>
                  <p className="text-2xl font-bold text-orange-500 mt-1">{tickets.filter(t => t.status === "OPEN").length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500/20" />
          </div>
          <div className="glass-strong p-6 rounded-3xl border border-border/50 flex items-center justify-between hover-lift hover:shadow-glow hover:border-primary-500/20 transition-all duration-300 shadow-soft">
              <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Çözülenler</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{tickets.filter(t => t.status === "CLOSED").length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/20" />
          </div>
      </div>

      <div className="glass-strong rounded-[2rem] border border-border/50 overflow-hidden divide-y divide-border/50 shadow-soft">
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
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-primary-500/5 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:flex-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:bg-primary-500/10 group-hover:text-primary-500 transition-colors">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm truncate group-hover:text-[var(--color-primary-500)] transition-colors">{ticket.subject}</h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.userEmail}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto shrink-0 border-t border-border/30 pt-2 sm:border-t-0 sm:pt-0">
                <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Son Etkinlik</span>
                    <span className="text-xs font-semibold mt-0.5">
                        {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: tr })}
                    </span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                    ticket.status === "OPEN" ? "bg-warning/10 text-warning border-warning/20" :
                    ticket.status === "PENDING" ? "bg-primary-500/10 text-primary-500 border-primary-500/20" :
                    "bg-success/10 text-success border-success/20"
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
