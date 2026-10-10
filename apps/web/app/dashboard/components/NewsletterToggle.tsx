"use client";

import { toast } from "@/components/ui/feedback";

import { useState } from "react";
import { updateNewsletterSubscription, updateNewsletterTime, testNewsletterEmail } from "../actions";
import { Loader2, Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface NewsletterToggleProps {
  initialSubscribed: boolean;
  initialTime: string;
}

const TIME_OPTIONS = [
  { value: "08:00", label: "Sabah 08:00" },
  { value: "12:00", label: "Öğle 12:00" },
  { value: "18:00", label: "Akşam 18:00" },
  { value: "20:00", label: "Gece 20:00" },
];

export function NewsletterToggle({ initialSubscribed, initialTime }: NewsletterToggleProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [time, setTime] = useState(initialTime);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleToggle = async () => {
    const newState = !isSubscribed;
    setIsLoading(true);
    setIsSubscribed(newState);

    const result = await updateNewsletterSubscription(newState).catch(() => ({ success: false as const, error: "Bağlantı kurulamadı." }));
    if (!result.success) {
      toast.error(result.error);
      setIsSubscribed(!newState);
    }
    setIsLoading(false);
  };

  const handleTimeChange = async (newTime: string) => {
    const previous = time;
    setIsLoading(true);
    setTime(newTime);

    const result = await updateNewsletterTime(newTime).catch(() => ({ success: false as const, error: "Bağlantı kurulamadı." }));
    if (!result.success) {
      toast.error(result.error);
      setTime(previous);
    }
    setIsLoading(false);
  };

  const handleTestEmail = async () => {
    setTestStatus("loading");
    setTestMessage("");

    const result = await testNewsletterEmail().catch(() => ({ success: false as const, error: "Bağlantı kurulamadı." }));

    if (result.success) {
      setTestStatus("success");
      setTestMessage(result.message || "Test e-postası gönderildi.");
    } else {
      setTestStatus("error");
      setTestMessage(result.error);
    }

    setTimeout(() => {
      setTestStatus("idle");
    }, 5000);
  };

  return (
    <div className="flex items-start justify-between gap-4 sm:gap-6 pb-6 border-b border-border">
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h2 id="newsletter-title" className="font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" /> Günlük haber bülteni
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Günün öne çıkan haberleri seçtiğiniz saatte e-postanıza gelir. İstediğiniz zaman kapatabilirsiniz.
          </p>
        </div>

        {isSubscribed && (
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border w-full sm:w-auto">
            <label htmlFor="newsletter-time" className="text-sm font-medium">Bülten saati</label>
            <select
              id="newsletter-time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={isLoading}
              className="bg-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-500" aria-label="Kaydediliyor" />}
          </div>
        )}

        {testStatus !== "idle" && (
          <div role="status" className={`text-xs font-medium flex items-center gap-1.5 ${testStatus === "success" ? "text-success" : "text-error"}`}>
            {testStatus === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {testMessage}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-4 shrink-0">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            role="switch"
            aria-labelledby="newsletter-title"
            aria-checked={isSubscribed}
            className="sr-only peer"
            checked={isSubscribed}
            onChange={handleToggle}
            disabled={isLoading}
          />
          <div className="w-11 h-6 bg-muted peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>

        {isSubscribed && (
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testStatus === "loading"}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {testStatus === "loading" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Örnek bülten gönder
          </button>
        )}
      </div>
    </div>
  );
}

