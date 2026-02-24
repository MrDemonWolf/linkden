import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none aspect-square",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ld-primary)] text-white hover:bg-[var(--ld-primary)]/90 focus-visible:ring-[var(--ld-primary)]",
        primary:
          "bg-[var(--ld-primary)] text-white hover:bg-[var(--ld-primary)]/90 focus-visible:ring-[var(--ld-primary)]",
        secondary:
          "bg-[var(--ld-secondary)] text-[var(--ld-foreground)] hover:bg-[var(--ld-secondary)]/80 focus-visible:ring-[var(--ld-secondary)]",
        ghost:
          "hover:bg-[var(--ld-muted)] hover:text-[var(--ld-foreground)] focus-visible:ring-[var(--ld-muted)]",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
        outline:
          "border border-[var(--ld-border)] bg-transparent hover:bg-[var(--ld-muted)] hover:text-[var(--ld-foreground)] focus-visible:ring-[var(--ld-border)]",
      },
      size: {
        sm: "h-8 w-8 [&_svg]:size-4",
        md: "h-9 w-9 [&_svg]:size-4",
        lg: "h-11 w-11 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-slot="icon-button"
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
export default IconButton;
