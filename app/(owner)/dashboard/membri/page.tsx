/**
 * Members list page.
 *
 * Server component. Reads filter / search / page from URL search params,
 * runs the server query, and renders the table. The client-side filter bar
 * pushes URL changes that re-render this page on the server.
 */
import { PlusIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/owner/empty-state'
import { InviteLinkCard } from '@/components/owner/invite-link-card'
import { MembersFilterBar } from '@/components/owner/members-filter-bar'
import { MembersTable } from '@/components/owner/members-table'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { getCurrentGym } from '@/lib/queries/gym'
import {
  getMembersList,
  type MemberFilter,
  type MembersListParams,
} from '@/lib/queries/owner'

const VALID_FILTERS: MemberFilter[] = [
  'all',
  'active',
  'expiring',
  'expired',
  'suspended',
  'no_subscription',
]

function parseFilter(raw: string | undefined): MemberFilter {
  if (!raw) return 'all'
  return (VALID_FILTERS as string[]).includes(raw)
    ? (raw as MemberFilter)
    : 'all'
}

export const dynamic = 'force-dynamic'

export default async function MembersListPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string
    search?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const params: MembersListParams = {
    filter: parseFilter(sp.filter),
    search: sp.search ?? '',
    page: sp.page ? Math.max(1, Number(sp.page) || 1) : 1,
  }
  const [{ members, total, page, pageSize }, gym] = await Promise.all([
    getMembersList(params),
    getCurrentGym(),
  ])
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const inviteUrl = gym?.slug
    ? `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/signup?gym=${gym.slug}`
    : null

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Gestione</p>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">Membri</h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/membri/nuovo">
            <PlusIcon className="size-4" />
            Nuovo membro
          </Link>
        </Button>
      </header>

      {inviteUrl ? <InviteLinkCard inviteUrl={inviteUrl} /> : null}

      <MembersFilterBar
        currentFilter={params.filter ?? 'all'}
        currentSearch={params.search ?? ''}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={
            params.search || params.filter !== 'all'
              ? 'Nessun membro trovato'
              : 'Nessun membro ancora'
          }
          description={
            params.search || params.filter !== 'all'
              ? 'Prova a modificare i filtri o la ricerca.'
              : 'Inizia aggiungendo il primo membro.'
          }
          action={
            <Button asChild>
              <Link href="/dashboard/membri/nuovo">
                <PlusIcon className="size-4" />
                Aggiungi membro
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <MembersTable members={members} />
          {lastPage > 1 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Pagina {page} di {lastPage} · {total} membri
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/membri',
                        query: { ...sp, page: page - 1 },
                      }}
                    >
                      ← Precedente
                    </Link>
                  </Button>
                ) : null}
                {page < lastPage ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: '/dashboard/membri',
                        query: { ...sp, page: page + 1 },
                      }}
                    >
                      Successiva →
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
