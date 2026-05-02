'use client'

import { CheckIcon, CopyIcon, LinkIcon, ShareIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Public signup link the owner shares with new members. Slug is the gym's
 * URL-safe identifier; the full URL is built from the active app origin so
 * it works on prod, preview, and localhost without extra config.
 */
export function InviteLinkCard({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copia il link:', inviteUrl)
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Iscriviti alla palestra',
          text: 'Crea il tuo account per iscriverti.',
          url: inviteUrl,
        })
        return
      } catch {
        // User cancelled or share failed — fall through to copy.
      }
    }
    handleCopy()
  }

  return (
    <Card className="overflow-hidden py-5">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <LinkIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight">
              Link di iscrizione
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Condividi questo link: chi lo apre potrà creare un account membro
              collegato alla tua palestra.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 truncate rounded-md border border-border bg-muted/60 px-3 py-2 font-mono text-xs">
            {inviteUrl}
          </code>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              aria-label="Copia link"
            >
              {copied ? (
                <CheckIcon className="size-4 text-success" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {copied ? 'Copiato' : 'Copia'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              aria-label="Condividi link"
            >
              <ShareIcon className="size-4" />
              Condividi
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
