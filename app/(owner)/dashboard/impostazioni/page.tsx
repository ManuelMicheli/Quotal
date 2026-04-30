/**
 * Impostazioni hub. A simple grid of links into the four settings sections.
 * Each card is one big tap target — friendlier than a sidebar at this depth.
 */
import {
  BellIcon,
  BuildingIcon,
  CreditCardIcon,
  DoorOpenIcon,
  ScrollTextIcon,
  ShieldIcon,
  UserIcon,
} from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'

const SECTIONS = [
  {
    href: '/dashboard/impostazioni/palestra',
    title: 'Palestra',
    description: 'Dati anagrafici, P.IVA, indirizzo, brand.',
    icon: BuildingIcon,
  },
  {
    href: '/dashboard/impostazioni/piani',
    title: 'Piani abbonamento',
    description: 'Crea, modifica e riordina i piani vendibili ai membri.',
    icon: CreditCardIcon,
  },
  {
    href: '/dashboard/impostazioni/regole',
    title: 'Regole operative',
    description: 'Periodo di grazia, sospensioni, notifiche scadenza.',
    icon: ScrollTextIcon,
  },
  {
    href: '/dashboard/impostazioni/dispositivi',
    title: 'Dispositivi accessi',
    description: 'Tornelli e tablet autorizzati a verificare gli ingressi.',
    icon: DoorOpenIcon,
  },
  {
    href: '/dashboard/impostazioni/notifiche',
    title: 'Notifiche',
    description: 'Email che vuoi ricevere come titolare (digest, alert, report).',
    icon: BellIcon,
  },
  {
    href: '/dashboard/impostazioni/profilo',
    title: 'Il tuo profilo',
    description: 'Dati personali del titolare e cambio password.',
    icon: UserIcon,
  },
  {
    href: '/dashboard/impostazioni/gdpr-richieste',
    title: 'Richieste GDPR',
    description:
      'Coda di esportazioni e cancellazioni richieste dai membri (Art. 17 e 20).',
    icon: ShieldIcon,
  },
] as const

export default function SettingsHubPage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Configurazione</p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">Impostazioni</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-lg"
            >
              <Card className="h-full transition-colors group-hover:border-accent/40 group-hover:bg-accent/5">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="rounded-md bg-muted p-2 text-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
