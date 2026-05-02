"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default" | "lg"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent",
        "shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)]",
        "transition-[background-color,box-shadow] duration-200 outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[size=sm]:h-4 data-[size=sm]:w-7 data-[size=sm]:p-0.5",
        "data-[size=default]:h-[1.375rem] data-[size=default]:w-[2.375rem] data-[size=default]:p-0.5",
        "data-[size=lg]:h-7 data-[size=lg]:w-12 data-[size=lg]:p-0.5",
        "data-[state=checked]:bg-accent data-[state=unchecked]:bg-input",
        "dark:data-[state=unchecked]:bg-input/80",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 shadow-[var(--shadow-1)]",
          "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:size-[1.125rem] group-data-[size=lg]/switch:size-6",
          "data-[state=unchecked]:translate-x-0",
          "group-data-[size=sm]/switch:data-[state=checked]:translate-x-3",
          "group-data-[size=default]/switch:data-[state=checked]:translate-x-4",
          "group-data-[size=lg]/switch:data-[state=checked]:translate-x-5",
          "dark:bg-foreground dark:data-[state=checked]:bg-accent-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
