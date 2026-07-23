import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../utils";

// INTENTIONAL BOUNDARY: this is the design-system Button — a plain native
// <button> used by shared @linkden/ui consumers. The web app has a *separate*
// Button (apps/web/src/components/ui/button.tsx) that wraps @base-ui/react with
// its own variant vocabulary (destructive/link, icon sizes, touch targets).
// They are not merged on purpose: different runtimes and variant sets. Import
// the one that matches your surface; don't cross-import buttonVariants.
const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
				primary: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
				secondary: "bg-secondary text-foreground hover:bg-secondary/80 focus-visible:ring-ring",
				ghost: "hover:bg-muted hover:text-foreground focus-visible:ring-ring",
				danger: "bg-red-600 text-primary-foreground hover:bg-red-700 focus-visible:ring-red-600",
				outline:
					"border border-border bg-transparent hover:bg-muted hover:text-foreground focus-visible:ring-ring",
				gradient:
					"bg-gradient-to-r from-blue-500 to-indigo-600 text-primary-foreground hover:from-blue-600 hover:to-indigo-700 focus-visible:ring-blue-500 shadow-lg shadow-blue-500/20",
			},
			size: {
				sm: "h-8 px-3 text-xs",
				md: "h-9 px-4 text-sm",
				lg: "h-11 px-6 text-base",
			},
			fullWidth: {
				true: "w-full",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "md",
			fullWidth: false,
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, fullWidth, ...props }, ref) => {
		return (
			<button
				ref={ref}
				data-slot="button"
				className={cn(buttonVariants({ variant, size, fullWidth, className }))}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
export default Button;
