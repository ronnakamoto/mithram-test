import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'wouter'
import { oidcClient } from '../config/auth'

function Callback() {
  const [, setLocation] = useLocation()
  const [error, setError] = useState(null)

  const processCallback = useCallback(async () => {
    // Get the current URL's search params
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    
    // Only process if we have a code and haven't processed it yet
    if (!code || sessionStorage.getItem(`processed_${code}`)) {
      return
    }

    try {
      // Mark this code as being processed
      sessionStorage.setItem(`processed_${code}`, 'true')
      
      const response = await oidcClient.processSigninResponse(window.location.href)
      console.log('Complete OIDC Response:', response)

      const userData = {
        accessToken: response.access_token,
        idToken: response.id_token,
        profile: response.profile,
        scope: response.scope,
        expiresAt: response.expires_at,
        patient: response.patient,
        patientIdentifier: response.patient_identifier,
        needPatientBanner: response.need_patient_banner,
        smartStyleUrl: response.smart_style_url
      }

      localStorage.setItem('mithram_user', JSON.stringify(userData))
      
      // Clean up
      sessionStorage.removeItem(`processed_${code}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      await oidcClient.clearStaleState()
      
      setLocation('/')
    } catch (err) {
      console.error('Failed to complete authentication:', err)
      sessionStorage.removeItem(`processed_${code}`)
      localStorage.removeItem('mithram_user')
      setError(err.message)
    }
  }, [setLocation])

  useEffect(() => {
    processCallback()
  }, [processCallback])

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-light tracking-tight text-red-600 mb-4">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-8">
              {error}
            </p>
            <button 
              onClick={() => window.location.href = '/launch'}
              className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-4">
            Completing Authentication
          </h1>
          <p className="text-gray-600 mb-8">
            Please wait while we complete the authentication process...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Callback
