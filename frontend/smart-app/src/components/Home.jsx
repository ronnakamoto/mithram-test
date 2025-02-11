import { Link } from 'wouter'

function Home() {
  return (
    <>
      {/* Hero Section */}
      <div className="w-full pt-32 hero-gradient">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-light tracking-tight text-gray-900 mb-8">
              Clinical intelligence,
              <br />
              <span className="font-normal">reimagined.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Experience the future of healthcare decision support. Powered by advanced AI and seamless FHIR integration.
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/analysis/demo-123">
                <a className="bg-gray-900 text-white px-8 py-4 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                  View Demo Analysis
                </a>
              </Link>
              <button className="bg-gray-100 text-gray-900 px-8 py-4 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors">
                Watch the Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="w-full bg-gray-50">
        <div className="container mx-auto px-6 py-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: "🔄",
                title: "FHIR Integration",
                description: "Connect seamlessly with any FHIR server. Industry-standard healthcare data exchange, simplified."
              },
              {
                icon: "🤖",
                title: "AI-Powered Analysis",
                description: "Advanced clinical decision support powered by state-of-the-art artificial intelligence."
              },
              {
                icon: "⚡",
                title: "Real-time Processing",
                description: "Lightning-fast analysis with our optimized asynchronous processing engine."
              }
            ].map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-white rounded-2xl p-8 h-full hover:scale-[1.02] transition-transform duration-300 ease-out">
                  <div className="text-4xl mb-6">{feature.icon}</div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default Home
