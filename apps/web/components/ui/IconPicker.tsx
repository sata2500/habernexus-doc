"use client";

import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X, Check } from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Haber siteleri için özenle seçilmiş ikon havuzu
const NEWS_ICONS = [
  "Newspaper", "Globe", "TrendingUp", "Zap", "Cpu", "Tv", "Music", "Heart", "Trophy", 
  "Scale", "Briefcase", "Plane", "Scale", "Anchor", "Sun", "Cloud", "Book", "Video", 
  "Phone", "Shield", "HardDrive", "Terminal", "Settings", "User", "Users", "Mail", 
  "Calendar", "MapPin", "Activity", "Package", "Box", "Archive", "Tag", "Flame", 
  "Star", "Lightbulb", "Camera", "Smartphone", "Headphones", "Gamepad", "ShoppingBag",
  "Bitcoin", "DollarSign", "EuroIcon", "LineChart", "PieChart", "BarChart", "Target",
  "Rocket", "Flag", "Map", "Compass", "LifeBuoy", "Truck", "ShoppingBasket", "Gift"
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIcons = useMemo(() => {
    return NEWS_ICONS.filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm transition-all hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
            <DynamicIcon name={value} className="h-4 w-4" />
          </div>
          <span className={cn(value ? "text-foreground" : "text-muted-foreground")}>
            {value || "Bir simge seçin..."}
          </span>
        </div>
        <div className="text-muted-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
          Seç
        </div>
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Overlay to close */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-strong border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Search Box */}
            <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="İkon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full"
                autoFocus
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="max-h-[280px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted">
              <div className="grid grid-cols-4 gap-1">
                {filteredIcons.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl transition-all group relative",
                      value === iconName 
                        ? "bg-primary-500/10 text-primary-500 border border-primary-500/20" 
                        : "hover:bg-muted border border-transparent"
                    )}
                    title={iconName}
                  >
                    <DynamicIcon name={iconName} className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {iconName}
                    </span>
                    {value === iconName && (
                      <div className="absolute top-1 right-1">
                        <Check className="h-2 w-2" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {filteredIcons.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-xs italic">
                  Sonuç bulunamadı...
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
