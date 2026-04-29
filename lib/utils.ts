import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind-aware class name combiner.
 *
 * Used by shadcn/ui generated components and our own components alike.
 * Combines `clsx` (conditional logic) with `tailwind-merge` (resolves
 * conflicting utility classes — last one wins).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
