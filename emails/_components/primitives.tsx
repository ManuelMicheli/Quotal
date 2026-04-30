/**
 * Small typography + button primitives shared by every template.
 * Inline styles only — email clients ignore most CSS.
 */
import { Button, Heading, Text } from '@react-email/components'
import * as React from 'react'

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#1C1917',
        margin: '0 0 16px',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </Heading>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 15,
        lineHeight: '24px',
        color: '#44403C',
        margin: '0 0 12px',
      }}
    >
      {children}
    </Text>
  )
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <span style={{ fontWeight: 600, color: '#1C1917' }}>{children}</span>
}

export function CTAButton({
  href,
  color,
  children,
}: {
  href: string
  color?: string | null
  children: React.ReactNode
}) {
  const bg = color || '#0F766E'
  return (
    <Button
      href={href}
      style={{
        display: 'inline-block',
        backgroundColor: bg,
        color: '#FFFFFF',
        padding: '12px 24px',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 15,
        textDecoration: 'none',
        marginTop: 8,
        marginBottom: 8,
      }}
    >
      {children}
    </Button>
  )
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: '#F5F5F4',
        borderRadius: 8,
        padding: 16,
        margin: '16px 0',
        fontSize: 14,
        color: '#44403C',
        lineHeight: '22px',
      }}
    >
      {children}
    </div>
  )
}
