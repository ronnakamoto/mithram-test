import { useLocation } from 'wouter'

function Launch() {
  const [location] = useLocation()
  
  // Get URL search params
  const searchParams = new URLSearchParams(window.location.search)
  const params = Object.fromEntries(searchParams.entries())
  
  // Log the launch parameters
  console.log('SMART App Launch Parameters:', {
    location,
    params,
    fullUrl: window.location.href
  })

  return (
    <div className="min-h-screen w-full bg-white pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-4">
            Launching SMART App
          </h1>
          <p className="text-gray-600">
            Initializing connection to EHR...
          </p>
        </div>
      </div>
    </div>
  )
}

export default Launch
