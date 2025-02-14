// Get the API URL from environment variables or use default for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export const config = {
  apiUrl: API_URL,
  endpoints: {
    patient: {
      metadata: (patientId, userId) => `${API_URL}/patient/${patientId}/metadata?userId=${userId}`
    },
    analysis: {
      history: (analysisId) => `${API_URL}/analysis/${analysisId}/history`,
      deepAnalysis: (analysisId) => `${API_URL}/analysis/${analysisId}/deep-analysis`
    }
  }
}

export default config
