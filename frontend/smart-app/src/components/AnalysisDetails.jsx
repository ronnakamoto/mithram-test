import { useParams, useLocation } from 'wouter'
import { useEffect, useState } from 'react'
import Client from 'fhir-kit-client'
import apiConfig from '../config/api'

const PatientCard = ({ patient }) => {
  if (!patient) return null;
  
  const fullName = patient.name?.[0]?.given?.join(' ') + ' ' + patient.name?.[0]?.family;
  const age = patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : null;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-medium text-gray-900">{fullName}</h2>
          <p className="text-gray-500 mt-1">
            {age && `${age} years`} • {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)}
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-1 rounded-full text-sm">
          ID: {patient.identifier?.[0]?.value}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
          <div className="space-y-2">
            {patient.telecom?.map((contact, i) => (
              <p key={i} className="text-gray-900">
                {contact.value} ({contact.use})
              </p>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
          {patient.address?.[0] && (
            <p className="text-gray-900">
              {patient.address[0].line?.[0]}<br />
              {patient.address[0].city}, {patient.address[0].state} {patient.address[0].postalCode}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const AnalysisCard = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-medium text-gray-900">Analysis Results</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${analysis.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm text-gray-600 capitalize">{analysis.status}</span>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Risk Factors</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.recommendations.riskFactors.map((risk, i) => (
            <span key={i} className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm">
              {risk}
            </span>
          ))}
        </div>
      </div>

      {/* Specialist Recommendations */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Specialist Recommendations</h3>
        <div className="space-y-4">
          {analysis.recommendations.specialists.map((specialist, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{specialist.specialty}</h4>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  specialist.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {specialist.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{specialist.justification}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Timeframe: {specialist.timeframe}</span>
                <span className="text-gray-500">Confidence: {(specialist.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Analysis Confidence</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(analysis.recommendations.confidenceMetrics).map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className="text-lg font-medium text-gray-900">{(value * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function AnalysisDetails() {
  const { id } = useParams()
  const [, setLocation] = useLocation()
  const [userData, setUserData] = useState(null)
  const [patientData, setPatientData] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const launchParams = JSON.parse(localStorage.getItem('launchParams'))
        if (!launchParams) {
          throw new Error('No launch parameters found. Please authenticate first.')
        }
        const storedUser = localStorage.getItem('mithram_user')
        if (!storedUser) {
          throw new Error('No user data found. Please authenticate first.')
        }

        const parsedUser = JSON.parse(storedUser)
        // Check if the token is expired
        if (parsedUser.expiresAt * 1000 <= Date.now()) {
          localStorage.removeItem('mithram_user')
          throw new Error('Session expired. Please authenticate again.')
        }

        // Verify that the patient ID matches
        if (parsedUser.patient !== id && id !== 'default') {
          throw new Error('Patient ID mismatch. Please authenticate again.')
        }

        setUserData(parsedUser)

        const fhirClient = new Client({ baseUrl: launchParams.aud })
        fhirClient.bearerToken = parsedUser.accessToken

        const patient = await fhirClient.read({ resourceType: 'Patient', id: parsedUser.patient })
        setPatientData(patient)

        // Fetch analysis data from our backend API
        try {
          const response = await fetch(apiConfig.endpoints.patient.metadata(parsedUser.patient))
          if (!response.ok) {
            if (response.status === 404) {
              console.log('No analysis found for patient')
              setAnalysisData(null)
              return
            }
            throw new Error(`Failed to fetch analysis: ${response.statusText}`)
          }
          const metadata = await response.json()
          setAnalysisData(metadata.analysis)
        } catch (error) {
          console.error('Error fetching analysis:', error)
          setError('Failed to fetch analysis data. Please try again later.')
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
        setError(err.message)
      }
    }

    loadUserData()
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('mithram_user')
    setLocation('/launch')
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-light tracking-tight text-red-600 mb-8">
              Error Loading Analysis
              <span className="text-sm text-gray-500 block mt-2 font-normal">ID: {id}</span>
            </h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => setLocation('/launch')}
              className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Return to Launch
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!userData || !patientData || !analysisData) {
    return (
      <div className="min-h-screen w-full bg-gray-50 pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-medium text-gray-900">Patient Analysis</h1>
            <button
              onClick={handleLogout}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
          
          <PatientCard patient={patientData} />
          <AnalysisCard analysis={analysisData} />
        </div>
      </div>
    </div>
  )
}

export default AnalysisDetails
