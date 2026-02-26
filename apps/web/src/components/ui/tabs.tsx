"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "pills" }
>(({ className, variant = "default", ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		data-slot="tabs-list"
		className={cn(
			variant === "pills"
				? "flex gap-2 overflow-x-auto scrollbar-none bg-transparent p-0"
				: "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
			className,
		)}
		{...props}
	/>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement> & { value: unknown }
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Tab
		ref={ref}
		data-slot="tabs-trigger"
		className={cn(
			"inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-selected:bg-card data-selected:text-foreground data-selected:shadow-sm",
			className,
		)}
		{...props}
	/>
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & { value: unknown }
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Panel
		ref={ref}
		data-slot="tabs-content"
		className={cn(
			"mt-2 ring-offset-background",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			className,
		)}
		{...props}
	/>
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
