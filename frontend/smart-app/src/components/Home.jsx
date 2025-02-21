import { Link } from 'wouter'
import VideoPlayer from './VideoPlayer'

function Home() {
  return (
    <>
      {/* Hero Section */}
      <div className="w-full pt-32 hero-gradient">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-light tracking-tight text-gray-900 mb-8">
              Transform Patient Care
              <br />
              <span className="font-normal">with AI-Powered Insights</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Imagine turning complex medical data into crystal-clear action plans in minutes. Our innovative platform combines cutting-edge AI with seamless FHIR integration to revolutionize healthcare decision support.
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/analysis/demo-123">
                <a className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-full text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg">
                  Learn More
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="w-full bg-gradient-to-b from-white via-blue-50 to-white py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">See How It Works</h2>
            <p className="text-blue-600 max-w-2xl mx-auto">Watch our quick overview video to understand how our AI-powered platform transforms healthcare decision making.</p>
          </div>
          <VideoPlayer videoUrl="https://youtu.be/Kdsa8eSj01g?si=y6C48ohIB-rl9k5C" />
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="w-full bg-gray-50">
        <div className="container mx-auto px-6 py-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: "🎯",
                title: "Instant FHIR Integration",
                description: "Connect to any FHIR server with a single click. Experience seamless healthcare data exchange that just works."
              },
              {
                icon: "🧠",
                title: "Smart Clinical AI",
                description: "Leverage advanced machine learning to spot patterns and insights that could be easily missed by human analysis alone."
              },
              {
                icon: "⚡",
                title: "Lightning-Fast Results",
                description: "Get comprehensive analysis in seconds. Designed for speed and efficiency when you need answers fast."
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
