/**
 * Root middleware: refreshes the Supabase session on every non-static
 * request so that Server Components always see a fresh `auth.getUser()`.
 */
import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *   - `_next/static` (build output)
     *   - `_next/image`  (image optimizer)
     *   - `favicon.ico`
     *   - PWA static assets (manifest.webmanifest, sw.js) — must be
     *     reachable anonymously so the browser can install the PWA before
     *     the user logs in.
     *   - common static asset extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf|otf|eot|webmanifest)$).*)',
  ],
}
