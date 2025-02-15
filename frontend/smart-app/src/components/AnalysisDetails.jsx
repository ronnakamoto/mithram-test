import { useParams, useLocation } from 'wouter'
import { useEffect, useState } from 'react'
import Client from 'fhir-kit-client'
import apiConfig from '../config/api'
import AnalysisHistory from './AnalysisHistory'
import DeepAnalysisModal from './DeepAnalysisModal'
import Chat from './Chat'
import { 
  ClockIcon, 
  ArrowPathIcon, 
  XMarkIcon,
  ArrowLeftIcon,
  SparklesIcon,
  LinkIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

const PatientCard = ({ patient }) => {
  if (!patient) return null;
  
  const fullName = patient.name?.[0]?.given?.join(' ') + ' ' + patient.name?.[0]?.family;
  const age = patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : null;
  
  return (
    <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-100/50 shadow-xl shadow-blue-500/5 p-8 mb-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0" 
           style={{ 
             backgroundImage: `
               repeating-linear-gradient(0deg, transparent, transparent 49px, rgb(59 130 246 / 0.08) 49px, rgb(59 130 246 / 0.08) 51px),
               repeating-linear-gradient(90deg, transparent, transparent 49px, rgb(59 130 246 / 0.08) 49px, rgb(59 130 246 / 0.08) 51px)
             `,
             backgroundSize: '50px 50px',
             backgroundColor: 'rgb(239 246 255 / 0.6)'
           }}>
      </div>
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {fullName}
            </h2>
            <p className="text-gray-500 mt-2 flex items-center space-x-3">
              {age && (
                <span className="bg-gradient-to-r from-blue-400/10 to-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  {age} years
                </span>
              )}
              <span className="bg-gradient-to-r from-purple-400/10 to-purple-600/10 text-purple-600 px-3 py-1 rounded-full text-sm font-medium capitalize">
                {patient.gender}
              </span>
            </p>
          </div>
          <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-2xl text-sm font-medium shadow-lg shadow-blue-500/20">
            ID: {patient.identifier?.[0]?.value}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-100/50">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 mr-2"></span>
              Contact Information
            </h3>
            <div className="space-y-3">
              {patient.telecom?.map((contact, i) => (
                <p key={i} className="text-gray-600 flex items-center space-x-2 group">
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-400/10 to-blue-600/10 group-hover:from-blue-400 group-hover:to-blue-600 transition-all duration-300">
                    <svg className="w-4 h-4 text-blue-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {contact.system === 'phone' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      )}
                    </svg>
                  </span>
                  <span className="text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{contact.value}</span>
                  <span className="text-sm text-gray-400 capitalize">({contact.use})</span>
                </p>
              ))}
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-100/50">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 mr-2"></span>
              Address
            </h3>
            {patient.address?.[0] && (
              <div className="space-y-2 text-gray-600">
                <p className="flex items-center space-x-2 group">
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-400/10 to-blue-600/10 group-hover:from-blue-400 group-hover:to-blue-600 transition-all duration-300">
                    <svg className="w-4 h-4 text-blue-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div className="flex flex-col group-hover:text-blue-600 transition-colors duration-200">
                    <span className="text-gray-900">{patient.address[0].line?.[0]}</span>
                    <span>{patient.address[0].city}, {patient.address[0].state} {patient.address[0].postalCode}</span>
                  </div>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalysisCard = ({ analysis }) => {
  if (!analysis) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const getExplorerUrl = (hash, chainId) => {
    return apiConfig.blockExplorer.transaction(hash);
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-medium text-gray-900">Analysis Results</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${analysis.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm text-gray-600 capitalize">{analysis.status}</span>
        </div>
      </div>

      {/* Transaction Information */}
      {analysis.transaction && (
        <div className="mb-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Blockchain Verification</h3>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
              Chain ID: {analysis.transaction.chainId}
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Transaction Hash</span>
                <button
                  onClick={() => copyToClipboard(analysis.transaction.hash)}
                  className="text-blue-600 hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:text-white p-1 rounded transition-all duration-200 cursor-pointer"
                  title="Copy to clipboard"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1 font-mono text-sm text-gray-900 break-all">
                {analysis.transaction.hash}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <ClockIcon className="w-4 h-4 inline-block mr-1" />
                {formatDate(analysis.transaction.timestamp)}
              </div>
              <a
                href={getExplorerUrl(analysis.transaction.hash, analysis.transaction.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1 rounded-full hover:from-blue-500 hover:to-blue-700 transition-all duration-200 cursor-pointer"
              >
                View on Explorer
                <LinkIcon className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      )}

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

function AnalysisDetails({ id, setIsAuthenticated }) {
  const {  } = useParams()
  const [, setLocation] = useLocation()
  const [userData, setUserData] = useState(null)
  const [patientData, setPatientData] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false)
  const [deepAnalysisResult, setDeepAnalysisResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(apiConfig.endpoints.analysis.deepAnalysis(analysisData.analysisId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to perform deep analysis: ${response.statusText}`);
      }
      
      const result = await response.json();
      setDeepAnalysisResult(result);
      setShowDeepAnalysis(true);
    } catch (error) {
      console.error('Deep analysis failed:', error);
      // Add user-friendly error handling
      // TODO: Add a toast notification here
    } finally {
      setIsAnalyzing(false);
    }
  };

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
          setIsAuthenticated(false)
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
          const response = await fetch(apiConfig.endpoints.patient.metadata(parsedUser.patient, parsedUser.profile.sub), {
            headers: {
              'Authorization': `Bearer ${parsedUser.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (!response.ok) {
            if (response.status === 404) {
              console.log('No analysis found for patient')
              setAnalysisData(null)
              return
            }
            throw new Error(`Failed to fetch analysis: ${response.statusText}`)
          }
          const metadata = await response.json()

          setAnalysisData({ ...metadata.analysis, analysisId: metadata.analysisId, transaction: metadata.transaction, patientId: metadata.patientId })
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
  }, [id, setIsAuthenticated])

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
              className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:from-blue-500 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer inline-flex items-center space-x-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Return to Launch</span>
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
      <div className="container mx-auto px-6 py-8 pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Patient Analysis</h1>
          <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-medium text-gray-700">Analysis Actions</h2>
                <p className="text-sm text-gray-500">View history or create new analysis</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer space-x-2"
                >
                  <ClockIcon className="h-4 w-4" />
                  <span>View Analysis History</span>
                </button>
                <button
                  onClick={handleDeepAnalysis}
                  disabled={isAnalyzing}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white space-x-2 ${
                    isAnalyzing 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      <span>Create Deep Analysis</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer space-x-2"
                >
                  <ChatBubbleLeftIcon className="h-4 w-4" />
                  <span>Chat with Mithram</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <PatientCard patient={patientData} />
        </div>

        {analysisData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <AnalysisCard analysis={analysisData} />
              {showHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
                    <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
                      <h2 className="text-lg font-medium text-gray-900">Analysis History</h2>
                      <button
                        onClick={() => setShowHistory(false)}
                        className="rounded-full p-2 hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:text-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-6 pt-20 overflow-y-auto max-h-[90vh]">
                      <AnalysisHistory analysisId={analysisData.analysisId} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <DeepAnalysisModal
          isOpen={showDeepAnalysis}
          setIsOpen={setShowDeepAnalysis}
          analysis={deepAnalysisResult}
        />
        {showChat && analysisData && userData && (
          <Chat 
            key={`chat-${analysisData.analysisId}`} 
            onClose={() => setShowChat(false)} 
            patientId={analysisData.patientId}
            analysisId={analysisData.analysisId}
            accessToken={userData.accessToken}
          />
        )}
      </div>
    </div>
  )
}

export default AnalysisDetails
