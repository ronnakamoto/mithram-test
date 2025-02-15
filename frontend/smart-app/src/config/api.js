// Get the API URL from environment variables or use default for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'
const BLOCK_EXPLORER_URL = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://app.tryethernal.com/transaction'

export const config = {
  apiUrl: API_URL,
  blockExplorer: {
    baseUrl: BLOCK_EXPLORER_URL,
    transaction: (hash) => `${BLOCK_EXPLORER_URL}/${hash}`
  },
  endpoints: {
    patient: {
      metadata: (patientId, userId) => `${API_URL}/patient/${patientId}/metadata?userId=${userId}`
    },
    analysis: {
      history: (analysisId) => `${API_URL}/analysis/${analysisId}/history`,
      deepAnalysis: (analysisId) => `${API_URL}/analysis/${analysisId}/deep-analysis`
    },
    chat: {
      init: (patientId) => `${API_URL}/chat/${patientId}/init`,
      message: (patientId) => `${API_URL}/chat/${patientId}/message`,
      history: (patientId) => `${API_URL}/chat/${patientId}/history`
    }
  }
}

export default config
