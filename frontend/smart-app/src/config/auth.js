import { UserManager, OidcClient } from 'oidc-client-ts'

// Get the launch parameters from the URL
const searchParams = new URLSearchParams(window.location.search)
const iss = searchParams.get('iss') || 'http://localhost:8080/fhir'
const launch = searchParams.get('launch')

const settings = {
  authority: 'https://app.meldrx.com',
  client_id: '6c2d96cf430242a39a55c55e5f355164',
  redirect_uri: 'http://localhost:5173/callback',
  response_type: 'code',
}

export const userManager = new UserManager(settings)
export const oidcClient = new OidcClient(settings)
