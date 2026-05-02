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
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-72 md:h-16 md:w-[28rem]" />
      </header>

      <section className="grid gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-40" />
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
