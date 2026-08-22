import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import * as React from "react";
import { cn } from "../utils";

const Switch = React.forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitive.Root
		ref={ref}
		data-slot="switch"
		className={cn(
			"peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors",
			// 44px touch target (WCAG 2.5.8) without growing the visual 36x20 pill
			"after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"data-[checked]:bg-primary data-[unchecked]:bg-muted",
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				"pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform",
				// Thumb contrasts its own track: ink on the muted track, primary's
				// foreground on the primary track (a flat bg-background would vanish on
				// the dark muted track).
				"data-[checked]:translate-x-4 data-[checked]:bg-primary-foreground data-[unchecked]:translate-x-0 data-[unchecked]:bg-foreground",
			)}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
export default Switch;
