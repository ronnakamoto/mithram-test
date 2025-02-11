import { useLocation, useSearchParams } from 'wouter'
import { useEffect, useState } from 'react'
import { userManager } from '../config/auth'

function Launch() {
  const [location] = useLocation()
  const [params] = useSearchParams()
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const initiateLogin = async () => {
      try {
        const aud = params.get('iss')
        const launch = params.get('launch')
        const extraQueryParams = {
          aud,
          launch,
        }
        
        // Log the launch parameters
        console.log('SMART App Launch Parameters:', extraQueryParams)

        // Redirect to authorization endpoint with the correct parameters
        userManager.signinRedirect({
          scope: 'openid profile launch patient/*.read',
          extraQueryParams
        })
      } catch (err) {
        console.error('Failed to initiate SMART app launch:', err)
        setError(err.message)
      }
    }

    initiateLogin()
  }, [location, params])

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-light tracking-tight text-red-600 mb-4">
              Launch Error
            </h1>
            <p className="text-gray-600 mb-8">
              {error}
            </p>
            <button 
              onClick={() => window.location.reload()}
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
            Launching SMART App
          </h1>
          <p className="text-gray-600 mb-8">
            Initializing connection to EHR...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Launch
