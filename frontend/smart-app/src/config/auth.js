import { UserManager, OidcClient } from 'oidc-client-ts'

const settings = {
  authority: 'https://app.meldrx.com',
  client_id: '6c2d96cf430242a39a55c55e5f355164',
  redirect_uri: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/callback',
  response_type: 'code',
}

export const userManager = new UserManager(settings)
export const oidcClient = new OidcClient(settings)
