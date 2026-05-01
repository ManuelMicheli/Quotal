'use client'

import { CheckIcon, CopyIcon, LinkIcon, ShareIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

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
      // Clipboard blocked — fall back to a manual selection prompt.
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
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LinkIcon className="size-4" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Link di iscrizione</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Condividi questo link: chi lo apre potrà creare un account membro
            collegato alla tua palestra.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs">
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
              <CheckIcon className="size-4" />
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
    </div>
  )
}
