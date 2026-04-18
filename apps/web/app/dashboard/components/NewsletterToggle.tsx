"use client";

import { useState } from "react";
import { updateNewsletterSubscription } from "../actions";
import { Loader2 } from "lucide-react";

interface NewsletterToggleProps {
  initialSubscribed: boolean;
}

export function NewsletterToggle({ initialSubscribed }: NewsletterToggleProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const newState = !isSubscribed;
    setIsLoading(true);
    
    // Optimistic update
    setIsSubscribed(newState);

    const result = await updateNewsletterSubscription(newState);
    
    if (!result.success) {
      alert(result.error || "Hata oluştu.");
      setIsSubscribed(!newState); // Rollback
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">Günlük Haber Bülteni</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Her sabah saat 08:30&apos;da en önemli gelişmeleri e-posta ile alın.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
      </div>
    </div>
  );
}
