"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Rss } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Feed {
  title: string;
  description: string;
  url: string;
  type: "global" | "category" | "language";
}

export function RSSFeedList({ feeds }: { feeds: Feed[] }) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {feeds.map((feed, index) => (
        <motion.div
          key={feed.url}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="p-6 h-full flex flex-col justify-between group hover:border-primary-500/50 transition-all duration-300 glass-soft overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 bg-primary-500/5 rounded-full blur-3xl group-hover:bg-primary-500/10 transition-colors" />
            
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  feed.type === 'global' ? 'bg-primary-500/10 text-primary-600' : 
                  feed.type === 'language' ? 'bg-accent-500/10 text-accent-600' : 
                  'bg-orange-500/10 text-orange-600'
                }`}>
                  <Rss className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground leading-tight">{feed.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed">
                {feed.description}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl h-10 border-border group-hover:border-primary-500/30 transition-all font-medium"
                onClick={() => copyToClipboard(feed.url)}
              >
                <AnimatePresence mode="wait">
                  {copiedUrl === feed.url ? (
                    <motion.span
                      key="checked"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="flex items-center gap-2 text-green-600"
                    >
                      <Check className="h-4 w-4" /> Kopyalandı
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" /> URL Kopyala
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              <a
                href={feed.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Önizle"
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl transition-all duration-200 bg-transparent text-foreground hover:bg-muted active:scale-[0.98] hover:text-primary-600"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
