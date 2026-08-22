import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The app's single Button: a @base-ui/react wrapper with app-specific variants
// (destructive/link, icon sizes, mobile touch targets). The old @linkden/ui
// Button was removed in the design-system pass; import from here.
const buttonVariants = cva(
	"focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-xs font-medium focus-visible:ring-2 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none min-h-11 min-w-11 md:min-h-0 md:min-w-0",
	{
		variants: {
			variant: {
				default:
					// Solid primary so the main CTA never reads as disabled next to
					// muted surfaces (the old bg-foreground pill looked washed in dark
					// mode). Matches @linkden/ui Button's default and the consent CTA.
					"bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20",
				outline:
					"border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost:
					"hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
				destructive:
					"bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				xs: "h-6 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 gap-1 rounded-md px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-8",
				"icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 rounded-md",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	// A `render` prop means the button is rendered as something else (usually a
	// Next <Link>), so tell Base UI not to expect native <button> semantics.
	const nativeButton = props.nativeButton ?? props.render === undefined;
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
			nativeButton={nativeButton}
		/>
	);
}

export { Button, buttonVariants };
