"use client";

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

    const result = await updateNewsletterSubscription(newState);
    if (!result.success) {
      alert(result.error || "Hata oluştu.");
      setIsSubscribed(!newState);
    }
    setIsLoading(false);
  };

  const handleTimeChange = async (newTime: string) => {
    setIsLoading(true);
    setTime(newTime);
    
    const result = await updateNewsletterTime(newTime);
    if (!result.success) {
      alert(result.error || "Saat güncellenemedi.");
    }
    setIsLoading(false);
  };

  const handleTestEmail = async () => {
    setTestStatus("loading");
    setTestMessage("");
    
    const result = await testNewsletterEmail();
    
    if (result.success) {
      setTestStatus("success");
      setTestMessage(result.message || "Başarılı");
    } else {
      setTestStatus("error");
      setTestMessage(result.error || "Hata oluştu");
    }
    
    setTimeout(() => {
      setTestStatus("idle");
    }, 5000);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6 border-b border-border">
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> Günlük Haber Bülteni
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            En önemli gelişmeleri e-posta ile alın.
          </p>
        </div>

        {isSubscribed && (
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border w-full sm:w-auto">
            <span className="text-sm font-medium">Bülten Saati:</span>
            <select
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={isLoading}
              className="bg-background border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
          </div>
        )}
        
        {testStatus !== "idle" && (
          <div className={`text-xs font-medium flex items-center gap-1.5 ${testStatus === "success" ? "text-green-600" : "text-red-500"}`}>
            {testStatus === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {testMessage}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-4 w-full sm:w-auto">
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isSubscribed}
            onChange={handleToggle}
            disabled={isLoading}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/30 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
        </label>

        {isSubscribed && (
          <button
            onClick={handleTestEmail}
            disabled={testStatus === "loading"}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {testStatus === "loading" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Test Maili Gönder
          </button>
        )}
      </div>
    </div>
  );
}

