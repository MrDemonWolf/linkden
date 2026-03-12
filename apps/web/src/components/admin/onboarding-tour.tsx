"use client";

import { Blocks, Palette, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TOUR_CARDS = [
  {
    icon: Blocks,
    title: "Builder",
    description: "Add links, headers, and content blocks to your page",
  },
  {
    icon: Palette,
    title: "Appearance",
    description: "Customize your theme, colors, and profile",
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Configure SEO, email, and security",
  },
];

export function OnboardingTour() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TOUR_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} size="sm">
            <CardContent className="flex flex-col items-center text-center gap-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="text-xs font-semibold">{card.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
