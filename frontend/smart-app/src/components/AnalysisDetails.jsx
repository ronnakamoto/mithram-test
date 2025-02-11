import { useParams } from 'wouter'
import { useEffect, useState } from 'react'
import { userManager } from '../config/auth'

function AnalysisDetails() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await userManager.getUser()
        console.log('Current User:', currentUser)
        setUser(currentUser)
      } catch (err) {
        console.error('Failed to get user:', err)
        setError(err.message)
      }
    }

    getUser()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-light tracking-tight text-red-600 mb-8">
              Error Loading Analysis
              <span className="text-sm text-gray-500 block mt-2 font-normal">ID: {id}</span>
            </h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-white pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading user data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-8">
            Analysis Details
            <span className="text-sm text-gray-500 block mt-2 font-normal">ID: {id}</span>
          </h1>
          
          {/* Analysis Content */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="space-y-8">
              {/* User Information */}
              <section>
                <h2 className="text-xl font-medium mb-4">User Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Access Token</span>
                    <p className="text-gray-900 break-all">{user.access_token}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Scope</span>
                    <p className="text-gray-900">{user.scope}</p>
                  </div>
                </div>
              </section>

              {/* Patient Information */}
              <section>
                <h2 className="text-xl font-medium mb-4">Patient Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="text-gray-900">John Doe</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Age</span>
                    <p className="text-gray-900">45</p>
                  </div>
                </div>
              </section>

              {/* AI Analysis Results */}
              <section>
                <h2 className="text-xl font-medium mb-4">AI Analysis Results</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Primary Observations</h3>
                    <p className="text-gray-600">Detailed analysis of patient's current condition and medical history...</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h3>
                    <p className="text-gray-600">Based on the analysis, the following actions are recommended...</p>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <section className="flex space-x-4">
                <button className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                  Export Report
                </button>
                <button className="bg-gray-100 text-gray-900 px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                  Share Analysis
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisDetails
