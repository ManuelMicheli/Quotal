/**
 * Member PWA loading skeleton.
 *
 * Streams in instantly between member-app navs so the page paints before
 * `getMemberHomeData()` returns. Mirrors the actual content shape so the
 * jump from skeleton to real content is barely perceptible.
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function MemberAppLoading() {
  return (
    <div className="flex flex-col gap-5 md:gap-8 lg:gap-10">
      <header className="flex flex-col gap-3 pt-2 md:pt-4">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="h-12 w-64 rounded-2xl md:h-16 md:w-96" />
        <Skeleton className="h-4 w-40 rounded-full" />
      </header>

      <div className="grid gap-5 md:grid-cols-12 md:gap-6 lg:gap-8">
        <div className="md:col-span-7">
          <Skeleton className="h-64 rounded-3xl md:h-72" />
        </div>
        <div className="md:col-span-5">
          <Skeleton className="h-64 rounded-3xl md:h-72" />
        </div>

        <div className="md:col-span-7">
          <div className="flex gap-3 md:grid md:grid-cols-4 md:gap-4">
            <Skeleton className="h-28 w-32 rounded-3xl md:w-auto" />
            <Skeleton className="h-28 w-32 rounded-3xl md:w-auto" />
            <Skeleton className="h-28 w-32 rounded-3xl md:w-auto" />
            <Skeleton className="h-28 w-32 rounded-3xl md:w-auto" />
          </div>
        </div>
        <div className="md:col-span-5 md:row-span-2">
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}
