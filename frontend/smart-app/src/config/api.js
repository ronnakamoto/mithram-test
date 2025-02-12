// Get the API URL from environment variables or use default for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export const config = {
  apiUrl: API_URL,
  endpoints: {
    patient: {
      metadata: (patientId) => `${API_URL}/patient/${patientId}/metadata`
    }
  }
}

export default config
