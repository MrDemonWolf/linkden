import * as React from "react";
import { cn } from "../utils";

// Base UI has no standalone Label primitive (it lives inside Field); a native
// <label htmlFor> gives the same click-to-focus behavior with zero deps.
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
	({ className, ...props }, ref) => (
		<label
			ref={ref}
			data-slot="label"
			className={cn(
				"text-sm font-medium leading-none text-foreground",
				"peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
				className,
			)}
			{...props}
		/>
	),
);
Label.displayName = "Label";

export { Label };
export default Label;
