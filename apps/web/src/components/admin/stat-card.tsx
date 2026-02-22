"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
}

export function StatCard({ icon, label, value, delta, deltaType = "neutral" }: StatCardProps) {
  return (
    <div className="glass-card flex items-start gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--button-bg)] text-brand-cyan shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
        {delta && (
          <p
            className={cn(
              "text-xs font-medium mt-1",
              deltaType === "positive" && "text-emerald-400",
              deltaType === "negative" && "text-red-400",
              deltaType === "neutral" && "text-[var(--text-secondary)]",
            )}
          >
            {delta}
          </p>
        )}
      </div>
    </div>
  );
}
