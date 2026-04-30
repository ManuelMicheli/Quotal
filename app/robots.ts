/**
 * Robots policy.
 *
 * Index the public landing + auth screens + legal pages. Disallow every
 * authenticated surface (`/dashboard`, `/app`), every API route, and the
 * one-shot owner onboarding endpoint.
 */
import type { MetadataRoute } from 'next'

import { LEGAL_CONFIG } from '@/lib/legal/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/privacy', '/termini', '/cookie-policy'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/app/',
          '/access/',
          '/pay/',
          '/auth/',
          '/onboarding-titolare',
          '/update-password',
          '/reset-password',
          '/dev/',
        ],
      },
    ],
    sitemap: `${LEGAL_CONFIG.app.url}/sitemap.xml`,
    host: LEGAL_CONFIG.app.url,
  }
}
