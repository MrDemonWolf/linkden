"use client";

import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  MenuSeparator,
  MenuHeading,
  MenuSection,
} from "@headlessui/react";
import * as React from "react";

import { cn } from "@/lib/utils";

function DropdownMenu({ children, ...props }: React.ComponentProps<typeof Menu>) {
  return (
    <Menu as="div" data-slot="dropdown-menu" className="relative inline-block text-left" {...props}>
      {children}
    </Menu>
  );
}

function DropdownMenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenuButton>) {
  return (
    <MenuButton
      data-slot="dropdown-menu-trigger"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  ...props
}: Omit<React.ComponentProps<typeof MenuItems>, "anchor">) {
  return (
    <MenuItems
      data-slot="dropdown-menu-content"
      transition
      className={cn(
        "absolute right-0 mt-1 z-50 min-w-32 rounded-xl p-1 flex flex-col gap-1 shadow-lg",
        "bg-popover text-popover-foreground backdrop-blur-2xl border border-white/25 dark:border-white/20",
        "transition duration-100 ease-out",
        "data-closed:scale-95 data-closed:opacity-0",
        "origin-top-right",
        "focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuGroup({
  className,
  ...props
}: React.ComponentProps<typeof MenuSection>) {
  return (
    <MenuSection
      as="div"
      data-slot="dropdown-menu-group"
      className={className}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuHeading> & {
  inset?: boolean;
}) {
  return (
    <MenuHeading
      as="div"
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("text-muted-foreground mx-1 px-2 py-2 text-xs data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenuItem> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenuItem
      as="button"
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "mx-1 w-[calc(100%-0.5rem)] text-left data-focus:bg-accent data-focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-focus:bg-destructive/10 dark:data-[variant=destructive]:data-focus:bg-destructive/20 data-[variant=destructive]:data-focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:data-focus:**:text-accent-foreground gap-2 rounded-lg px-2 py-2 text-xs [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuSeparator>) {
  return (
    <MenuSeparator
      as="div"
      data-slot="dropdown-menu-separator"
      className={cn("bg-border mx-1 my-0.5 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground group-data-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
};
