import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm",
        "shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)]",
        "transition-[color,border-color,box-shadow,background-color] duration-150",
        "outline-none",
        // Selection + placeholder
        "selection:bg-accent/30 selection:text-foreground placeholder:text-muted-foreground/70",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Dark mode
        "dark:bg-card/30 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.02)]",
        // Hover
        "hover:border-border-strong",
        // Focus — Apple-style focus halo
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
