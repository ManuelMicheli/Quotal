import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.02)] dark:bg-card/30",
        "transition-[color,border-color,box-shadow,background-color] duration-150 outline-none resize-y",
        "selection:bg-accent/30 selection:text-foreground placeholder:text-muted-foreground/70",
        "hover:border-border-strong",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
