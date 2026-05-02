"use client"

/**
 * Drawer — bottom-anchored sheet, iOS-style. Wraps the existing Sheet
 * primitive with side="bottom" defaults. Use for mobile-first modal flows
 * (filters, action menus, member subscription details).
 */
import * as React from "react"

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function Drawer(props: React.ComponentProps<typeof Sheet>) {
  return <Sheet data-slot="drawer" {...props} />
}

const DrawerTrigger = SheetTrigger
const DrawerClose = SheetClose

function DrawerContent({
  className,
  ...props
}: React.ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      side="bottom"
      data-slot="drawer-content"
      className={cn("max-h-[88vh] gap-0", className)}
      {...props}
    />
  )
}

function DrawerHeader({
  className,
  ...props
}: React.ComponentProps<typeof SheetHeader>) {
  return (
    <SheetHeader
      data-slot="drawer-header"
      className={cn("pt-8 pb-2", className)}
      {...props}
    />
  )
}

const DrawerFooter = SheetFooter
const DrawerTitle = SheetTitle
const DrawerDescription = SheetDescription

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
