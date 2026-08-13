"use client";

import { useState, useTransition } from "react";
import { sendSupportReply, updateTicketStatus, deleteSupportTicket } from "./actions";
import { Loader2, Send, CheckCircle2, User, ShieldCheck, Mail, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface Message {
  id: string;
  sender: string;
  direction: string;
  content: string;
  createdAt: string;
  attachments?: {
    name: string;
    url: string;
    contentType: string;
    size: number;
  }[];
}

interface Props {
  ticket: {
    id: string;
    subject: string;
    userEmail: string;
    status: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
  };
}

export function SupportChat({ ticket }: Props) {
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const router = useRouter();

  const handleSend = async () => {
    if (!reply.trim() || isPending) return;

    startTransition(async () => {
      const result = await sendSupportReply(ticket.id, reply);
      if (result.success) {
        setReply("");
      }
    });
  };

  const handleStatusUpdate = (status: "OPEN" | "PENDING" | "CLOSED") => {
    startStatusTransition(async () => {
      await updateTicketStatus(ticket.id, status);
    });
  };
  
  const handleDelete = () => {
    if (!confirm("Bu bileti ve tüm mesajları/ekleri kalıcı olarak silmek istediğinize emin misiniz?")) return;
    
    startDeleteTransition(async () => {
      const result = await deleteSupportTicket(ticket.id);
      if (result.success) {
        router.push("/admin/support");
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[600px] glass-strong rounded-3xl border border-border overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="p-4 md:p-6 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
          <div className="h-12 w-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 shrink-0">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base md:text-lg leading-tight break-words whitespace-normal">{ticket.subject}</h2>
            <p className="text-xs md:text-sm text-muted-foreground break-all">{ticket.userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {ticket.status !== "CLOSED" ? (
            <button
              onClick={() => handleStatusUpdate("CLOSED")}
              disabled={statusPending}
              className="px-4 py-2 rounded-xl bg-success/10 text-success text-sm font-bold border border-success/20 hover:bg-success/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {statusPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Çözüldü
            </button>
          ) : (
            <button
              onClick={() => handleStatusUpdate("OPEN")}
              disabled={statusPending}
              className="px-4 py-2 rounded-xl bg-warning/10 text-warning text-sm font-bold border border-warning/20 hover:bg-warning/20 transition-all cursor-pointer disabled:opacity-50"
            >
              Tekrar Aç
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deletePending}
            className="p-2 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all border border-error/20 disabled:opacity-50 cursor-pointer"
            title="Bileti Sil"
          >
            {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
        {ticket.messages.map((msg) => {
          const isAdmin = msg.direction === "OUTBOUND";
          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[70%]",
                isAdmin ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5 px-1">
                {!isAdmin && <User className="h-3 w-3 text-muted-foreground" />}
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isAdmin ? "Haber Nexus Destek" : ticket.userEmail}
                </span>
                {isAdmin && <ShieldCheck className="h-3 w-3 text-primary-" />}
              </div>
              
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap",
                  isAdmin
                    ? "bg-primary-500 text-white rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none border border-border"
                )}
              >
                {msg.content}
                
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    {msg.attachments.map((att, idx) => {
                      const isImage = att.contentType.startsWith("image/") || 
                                    /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name);
                      return (
                        <div key={idx} className="flex flex-col gap-2">
                          {isImage ? (
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-white/20 hover:border-white/40 transition-all">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={att.url} alt={att.name} className="max-w-full h-auto max-h-[300px] object-cover" />
                            </a>
                          ) : (
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-medium min-w-0 w-full"
                            >
                              <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center">
                                <Mail className="h-3 w-3" />
                              </div>
                              <span className="truncate flex-1">{att.name}</span>
                              <span className="opacity-50">{(att.size / 1024).toFixed(0)} KB</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <span className="text-[10px] text-muted-foreground mt-1.5 px-1">
                {format(new Date(msg.createdAt), "HH:mm · d MMMM", { locale: tr })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reply Area */}
      <div className="p-4 md:p-6 border-t border-border bg-muted/20 shrink-0">
        <div className="relative group">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Yanıtınızı buraya yazın..."
            rows={3}
            disabled={ticket.status === "CLOSED" || isPending}
            className="w-full p-4 rounded-2xl bg-background/50 border border-border outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-none text-sm pr-16 disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!reply.trim() || isPending || ticket.status === "CLOSED"}
            size="icon"
            isLoading={isPending}
            className="absolute bottom-4 right-4 shadow-lg shadow-primary-500/20"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {ticket.status === "CLOSED" && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Bu bilet kapatılmış. Yanıt yazmak için bileti tekrar açmalısınız.
          </p>
        )}
      </div>
    </div>
  );
}
