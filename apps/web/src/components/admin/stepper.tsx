"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: { label: string; icon: LucideIcon }[];
  currentStep: number;
  completedSteps?: number[];
}

export function Stepper({ steps, currentStep, completedSteps = [] }: StepperProps) {
  return (
    <div
      className="flex items-center justify-center gap-0"
      aria-label={`Step ${currentStep + 1} of ${steps.length}`}
      role="navigation"
    >
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentStep;
        const isCompleted = completedSteps.includes(i) || i < currentStep;

        return (
          <div key={step.label} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-full transition-all",
                isActive && "bg-primary/15 text-primary font-medium",
                isCompleted && !isActive && "text-primary/60",
                !isActive && !isCompleted && "text-muted-foreground/50",
              )}
            >
              {isCompleted && !isActive ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors",
                  isCompleted ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
