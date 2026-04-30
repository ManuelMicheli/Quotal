/**
 * Shared layout for every transactional email.
 *
 * Renders the gym brand at the top, body in the middle, "Powered by
 * Quotal" footer at the bottom. Designed for ~600px max width and good
 * defaults across Gmail/Outlook/Apple Mail.
 */
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export type GymBrand = {
  name: string
  logo_url: string | null
  brand_color: string | null
  address: string | null
  email: string
}

type Props = {
  preview: string
  gym: GymBrand
  children: React.ReactNode
}

export function EmailLayout({ preview, gym, children }: Props) {
  const brandColor = gym.brand_color || '#0F766E'
  return (
    <Html lang="it">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#FAFAF9',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: '40px auto',
            padding: 32,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
          }}
        >
          <Section
            style={{
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '1px solid #E7E5E4',
            }}
          >
            {gym.logo_url ? (
              <Img
                src={gym.logo_url}
                alt={gym.name}
                height={48}
                style={{ display: 'block' }}
              />
            ) : (
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: brandColor,
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {gym.name}
              </Text>
            )}
          </Section>

          {children}

          <Hr
            style={{
              marginTop: 40,
              marginBottom: 16,
              borderColor: '#E7E5E4',
            }}
          />
          <Text
            style={{
              fontSize: 12,
              color: '#78716C',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {[gym.name, gym.address, gym.email].filter(Boolean).join(' · ')}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: '#A8A29E',
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            Powered by{' '}
            <Link href="https://quotal.it" style={{ color: '#A8A29E' }}>
              Quotal
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
