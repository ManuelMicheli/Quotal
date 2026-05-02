/**
 * Impostazioni hub. A simple grid of links into the four settings sections.
 * Each card is one big tap target — friendlier than a sidebar at this depth.
 */
import {
  ArrowRightIcon,
  BanknoteIcon,
  BellIcon,
  BuildingIcon,
  CreditCardIcon,
  DoorOpenIcon,
  ScrollTextIcon,
  ShieldIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'

type Section = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  group: 'Palestra' | 'Operazioni' | 'Account'
}

const SECTIONS: Section[] = [
  {
    href: '/dashboard/impostazioni/palestra',
    title: 'Palestra',
    description: 'Dati anagrafici, P.IVA, indirizzo, brand.',
    icon: BuildingIcon,
    group: 'Palestra',
  },
  {
    href: '/dashboard/impostazioni/piani',
    title: 'Piani abbonamento',
    description: 'Crea, modifica e riordina i piani vendibili ai membri.',
    icon: CreditCardIcon,
    group: 'Palestra',
  },
  {
    href: '/dashboard/impostazioni/stripe',
    title: 'Stripe',
    description:
      'Stato account, saldo, ultimi payout. KYC e IBAN si gestiscono su Stripe.',
    icon: BanknoteIcon,
    group: 'Palestra',
  },
  {
    href: '/dashboard/impostazioni/regole',
    title: 'Regole operative',
    description: 'Periodo di grazia, sospensioni, notifiche scadenza.',
    icon: ScrollTextIcon,
    group: 'Operazioni',
  },
  {
    href: '/dashboard/impostazioni/dispositivi',
    title: 'Dispositivi accessi',
    description: 'Tornelli e tablet autorizzati a verificare gli ingressi.',
    icon: DoorOpenIcon,
    group: 'Operazioni',
  },
  {
    href: '/dashboard/impostazioni/notifiche',
    title: 'Notifiche',
    description: 'Email che vuoi ricevere come titolare (digest, alert, report).',
    icon: BellIcon,
    group: 'Account',
  },
  {
    href: '/dashboard/impostazioni/profilo',
    title: 'Il tuo profilo',
    description: 'Dati personali del titolare e cambio password.',
    icon: UserIcon,
    group: 'Account',
  },
  {
    href: '/dashboard/impostazioni/gdpr-richieste',
    title: 'Richieste GDPR',
    description:
      'Coda di esportazioni e cancellazioni richieste dai membri (Art. 17 e 20).',
    icon: ShieldIcon,
    group: 'Account',
  },
]

const GROUPS: Section['group'][] = ['Palestra', 'Operazioni', 'Account']

export default function SettingsHubPage() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Configurazione</PageHeaderEyebrow>
          <PageHeaderHeading>Impostazioni</PageHeaderHeading>
          <PageHeaderDescription>
            Configura la palestra, le regole operative e le tue preferenze.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {GROUPS.map((group) => {
        const items = SECTIONS.filter((s) => s.group === group)
        return (
          <section key={group} className="flex flex-col gap-3">
            <h2 className="eyebrow">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group/setting tap-shrink relative flex items-start gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-3)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover/setting:bg-accent-soft group-hover/setting:text-accent">
                      <Icon className="size-[1.0625rem]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] font-semibold tracking-tight">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-pretty text-[0.8125rem] text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover/setting:translate-x-0.5 group-hover/setting:text-foreground" />
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
