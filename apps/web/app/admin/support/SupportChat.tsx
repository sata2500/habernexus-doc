"use client";

import { useState, useTransition } from "react";
import { sendSupportReply, updateTicketStatus } from "./actions";
import { Loader2, Send, CheckCircle2, User, ShieldCheck, Mail } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  sender: string;
  direction: string;
  content: string;
  createdAt: Date;
}

interface Props {
  ticket: {
    id: string;
    subject: string;
    userEmail: string;
    status: string;
    messages: Message[];
  };
}

export function SupportChat({ ticket }: Props) {
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();

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

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[600px] glass-strong rounded-3xl border border-border overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="p-4 md:p-6 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{ticket.subject}</h2>
            <p className="text-sm text-muted-foreground">{ticket.userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.status !== "CLOSED" ? (
            <button
              onClick={() => handleStatusUpdate("CLOSED")}
              disabled={statusPending}
              className="px-4 py-2 rounded-xl bg-green-500/10 text-green-600 text-sm font-bold border border-green-500/20 hover:bg-green-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {statusPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Çözüldü
            </button>
          ) : (
            <button
              onClick={() => handleStatusUpdate("OPEN")}
              disabled={statusPending}
              className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-600 text-sm font-bold border border-orange-500/20 hover:bg-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              Tekrar Aç
            </button>
          )}
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
                {isAdmin && <ShieldCheck className="h-3 w-3 text-blue-500" />}
              </div>
              
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  isAdmin
                    ? "bg-primary-600 text-white rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none border border-border"
                )}
              >
                {msg.content}
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
            className="w-full p-4 rounded-2xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-none text-sm pr-16 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!reply.trim() || isPending || ticket.status === "CLOSED"}
            className="absolute bottom-4 right-4 h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
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
