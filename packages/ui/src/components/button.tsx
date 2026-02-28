import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none",
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
