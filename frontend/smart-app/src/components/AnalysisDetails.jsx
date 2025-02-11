import { useParams } from 'wouter'

function AnalysisDetails() {
  const { id } = useParams()

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
