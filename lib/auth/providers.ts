/**
 * OAuth provider availability flags.
 *
 * Read by the auth UI to dim disabled buttons and short-circuit the
 * `signInWithProvider` server action. Apple stays opt-in via env until the
 * Developer Program is in place.
 */
export const enabledOAuthProviders = {
  google: true,
  apple: process.env.APPLE_OAUTH_ENABLED === 'true',
} as const

export type OAuthProvider = keyof typeof enabledOAuthProviders
