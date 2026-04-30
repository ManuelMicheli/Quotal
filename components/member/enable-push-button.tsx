'use client'

/**
 * "Abilita notifiche push" button — only renders when the browser
 * supports the API. Asks for permission, subscribes via the SW
 * registration, and POSTs the subscription to /api/member/push-subscribe.
 *
 * The button is hidden entirely if NEXT_PUBLIC_VAPID_PUBLIC_KEY is
 * unset on the client (SSR-injected). Without VAPID keys the SW would
 * refuse to subscribe anyway.
 */
import { BellIcon, BellOffIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

function urlBase64ToBufferSource(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

type Props = {
  vapidPublicKey: string | null
}

export function EnablePushButton({ vapidPublicKey }: Props) {
  const [supported, setSupported] = React.useState<null | boolean>(null)
  const [permission, setPermission] = React.useState<NotificationPermission>(
    'default',
  )
  const [subscribed, setSubscribed] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      typeof Notification !== 'undefined'
    if (!ok) {
      // Defer to a microtask so we don't synchronously update state in
      // the effect body (lint rule react-hooks/set-state-in-effect).
      queueMicrotask(() => {
        if (!cancelled) setSupported(false)
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      setSupported(true)
      setPermission(Notification.permission)
    })
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscribed(Boolean(sub))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!vapidPublicKey) {
    return (
      <p className="text-xs text-muted-foreground">
        Notifiche push non ancora configurate per questa palestra.
      </p>
    )
  }

  if (supported === null) {
    return null
  }
  if (supported === false) {
    return (
      <p className="text-xs text-muted-foreground">
        Il tuo browser non supporta le notifiche push.
      </p>
    )
  }

  async function enable() {
    if (!vapidPublicKey) return
    setPending(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        toast.warning('Permesso negato dal browser.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBufferSource(vapidPublicKey),
      })
      const json = sub.toJSON() as {
        endpoint: string
        keys?: { p256dh?: string; auth?: string }
      }
      const resp = await fetch('/api/member/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
          user_agent: navigator.userAgent,
        }),
      })
      if (!resp.ok) {
        const data = (await resp.json().catch(() => null)) as {
          error?: string
        } | null
        toast.error(data?.error ?? 'Registrazione non riuscita.')
        return
      }
      setSubscribed(true)
      toast.success('Notifiche push attivate.')
    } catch (err) {
      console.error('[push] enable failed', err)
      toast.error("Errore durante l'attivazione delle notifiche.")
    } finally {
      setPending(false)
    }
  }

  async function disable() {
    setPending(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
      }
      setSubscribed(false)
      toast.success('Notifiche push disattivate.')
    } catch (err) {
      console.error('[push] disable failed', err)
      toast.error('Errore durante la disattivazione.')
    } finally {
      setPending(false)
    }
  }

  if (subscribed) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={disable}
        disabled={pending}
        className="w-full justify-start"
      >
        <BellOffIcon size={16} />
        {pending ? 'Disattivazione…' : 'Disattiva notifiche push'}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      onClick={enable}
      disabled={pending || permission === 'denied'}
      className="w-full justify-start"
    >
      <BellIcon size={16} />
      {permission === 'denied'
        ? 'Permesso negato — sblocca dalle impostazioni del browser'
        : pending
          ? 'Attivazione…'
          : 'Attiva notifiche push'}
    </Button>
  )
}
