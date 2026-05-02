/**
 * Dashboard loading skeleton.
 *
 * Streams in instantly while the segment's server queries run, so the user
 * never sees a frozen screen between navs. The shell (sidebar + topbar) is
 * already rendered by the layout — only the main content area swaps.
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:gap-10">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-72 md:h-14 md:w-[28rem]" />
      </header>

      <section className="grid gap-4 md:grid-cols-3 md:gap-6 lg:gap-8">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 md:gap-6 lg:gap-8">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </section>
    </div>
  )
}
