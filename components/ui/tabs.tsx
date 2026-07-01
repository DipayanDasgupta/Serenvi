"use client";

import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 border-b border-border overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === tab.value
              ? "text-accent"
              : "text-muted hover:text-foreground"
          )}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
