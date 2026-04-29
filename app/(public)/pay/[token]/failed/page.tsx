import { AlertTriangleIcon } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function PayFailedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ reason?: string }>
}) {
  const { token } = await params
  const { reason } = await searchParams

  return (
    <main className="mx-auto flex w-full max-w-md">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertTriangleIcon className="size-14 text-destructive" />
          <h1 className="font-display text-2xl">Pagamento non riuscito</h1>
          <p className="text-sm text-muted-foreground">
            {reason
              ? reason
              : 'Si è verificato un problema durante il pagamento. Per favore riprova.'}
          </p>
          <Button asChild>
            <Link href={`/pay/${token}`}>Riprova</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
