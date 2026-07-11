import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
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
					? "flex gap-2 overflow-x-auto scrollbar-none bg-transparent p-0"
					: "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
				className,
			)}
			{...props}
		/>
	</TabsContext.Provider>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Tab>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab>
>(({ className, ...props }, ref) => {
	const variant = React.useContext(TabsContext);

	const pillsClasses = [
		"inline-flex items-center shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200",
		// Base state (shows when inactive)
		"border border-border/50 bg-muted text-muted-foreground",
		"hover:bg-muted/80 hover:text-foreground",
		// Active state (Base UI marks the active tab with data-selected)
		"data-[selected]:border-transparent data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:shadow-sm data-[selected]:ring-1 data-[selected]:ring-primary/30",
		"data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground",
		// Focus
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	].join(" ");

	return (
		<TabsPrimitive.Tab
			ref={ref}
			data-slot="tabs-trigger"
			className={cn(
				variant === "pills"
					? pillsClasses
					: [
							"inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							"disabled:pointer-events-none disabled:opacity-50",
							"data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-sm",
						],
				className,
			)}
			{...props}
		/>
	);
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
	React.ComponentRef<typeof TabsPrimitive.Panel>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel>
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
