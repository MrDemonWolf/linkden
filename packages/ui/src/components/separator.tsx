import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "../utils";

const Separator = React.forwardRef<
	React.ComponentRef<typeof SeparatorPrimitive>,
	React.ComponentPropsWithoutRef<typeof SeparatorPrimitive>
>(({ className, orientation = "horizontal", ...props }, ref) => (
	<SeparatorPrimitive
		ref={ref}
		data-slot="separator"
		orientation={orientation}
		className={cn(
			"shrink-0 bg-border",
			orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
			className,
		)}
		{...props}
	/>
));
Separator.displayName = "Separator";

export { Separator };
export default Separator;
