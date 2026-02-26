import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../utils";

type TabsVariant = "default" | "pills";

const TabsContext = React.createContext<TabsVariant>("default");

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn(
        variant === "pills"
          ? "flex gap-1.5 overflow-x-auto scrollbar-none bg-transparent p-0"
          : "inline-flex h-10 items-center justify-center rounded-md bg-[var(--ld-muted)] p-1 text-[var(--ld-muted-foreground)]",
        className,
      )}
      {...props}
    />
  </TabsContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsContext);

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        variant === "pills"
          ? [
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/30",
              "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            ]
          : [
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-[var(--ld-background)] transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ld-primary)] focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "data-[state=active]:bg-[var(--ld-card)] data-[state=active]:text-[var(--ld-foreground)] data-[state=active]:shadow-sm",
            ],
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    data-slot="tabs-content"
    className={cn(
      "mt-2 ring-offset-[var(--ld-background)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ld-primary)] focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
