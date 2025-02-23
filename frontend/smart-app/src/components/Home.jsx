import { Link } from 'wouter'
import VideoPlayer from './VideoPlayer'

function Home() {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Navigation Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="text-xl font-medium bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Mithram
            </div>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => scrollToSection('hero')}
                className="text-gray-600 hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:bg-clip-text hover:text-transparent transition-all cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('video')}
                className="text-gray-600 hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:bg-clip-text hover:text-transparent transition-all cursor-pointer"
              >
                Demo
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-600 hover:bg-clip-text hover:text-transparent transition-all cursor-pointer"
              >
                Features
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div id="hero" className="w-full min-h-screen flex items-center pt-16 hero-gradient">
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-light tracking-tight text-gray-900 mb-8">
              Transform Patient Care
              <br />
              <span className="font-normal bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">with AI-Powered Insights</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Imagine turning complex medical data into crystal-clear action plans in minutes. Our innovative platform combines cutting-edge AI with seamless FHIR integration to revolutionize healthcare decision support.
            </p>
            <div className="flex justify-center space-x-6">
              <button
                onClick={() => scrollToSection('video')}
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-8 py-4 rounded-full text-sm font-medium hover:from-blue-500 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 cursor-pointer"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div id="video" className="w-full bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="container mx-auto px-6 py-32">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-light text-gray-900 mb-4">See How It Works</h2>
            <p className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent max-w-2xl mx-auto">Watch our quick overview video to understand how our AI-powered platform transforms healthcare decision making.</p>
          </div>
          <VideoPlayer videoUrl="https://youtu.be/Kdsa8eSj01g?si=y6C48ohIB-rl9k5C" />
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="w-full bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-6 py-32">
          {/* Section Header */}
          <div className="text-center mb-24">
            <h2 className="text-4xl font-light text-gray-900 mb-6">
              Powered by GENESIS
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">The Future of Medical Analysis</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Our innovative GENESIS protocol combines advanced AI techniques with blockchain technology for comprehensive medical analysis
            </p>
          </div>

          {/* What is GENESIS Protocol Section */}
          <div className="mb-16">
            <div className="max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="text-2xl font-medium text-gray-900 mb-6">What is GENESIS Protocol?</h3>
                <p className="text-gray-600 mb-8">
                  GENESIS (Generative Enrichment via NFT and Synthesis) is our groundbreaking approach to medical analysis that combines multi-perspective AI analysis with secure blockchain technology.
                </p>
              </div>

              {/* How It Works Section */}
              <div className="mb-12">
                <h4 className="text-xl font-medium text-gray-900 mb-6 text-center">How It Works</h4>
                <div className="space-y-8">
                  {/* Step 1 */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          1
                        </div>
                      </div>
                      <div className="ml-4">
                        <h5 className="text-lg font-medium text-gray-900 mb-2">Patient History Analysis</h5>
                        <p className="text-gray-600 mb-3">
                          The protocol begins by analyzing the patient's medical history. It retrieves and sorts the two most recent analyses by timestamp, creating a temporal context for understanding the patient's health progression.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Technical Detail:</span> Uses structured data format including analysis ID, timestamp, and metadata for comprehensive historical context.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          2
                        </div>
                      </div>
                      <div className="ml-4">
                        <h5 className="text-lg font-medium text-gray-900 mb-2">Dynamic Prompt Generation</h5>
                        <p className="text-gray-600 mb-3">
                          GENESIS dynamically generates four unique analytical perspectives using gpt-4o-mini. Each perspective is designed to focus on different aspects of patient care, ensuring comprehensive analysis.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Example Perspectives:</span> Clinical assessment, preventive care strategies, treatment optimization, and long-term health planning.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          3
                        </div>
                      </div>
                      <div className="ml-4">
                        <h5 className="text-lg font-medium text-gray-900 mb-2">Parallel Multi-Perspective Analysis</h5>
                        <p className="text-gray-600 mb-3">
                          All four perspectives are analyzed simultaneously using parallel processing. Each analysis is performed with zero temperature setting for maximum consistency and deterministic outputs.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Key Feature:</span> Concurrent processing reduces analysis time while maintaining high accuracy through specialized perspective-based prompts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          4
                        </div>
                      </div>
                      <div className="ml-4">
                        <h5 className="text-lg font-medium text-gray-900 mb-2">Comprehensive Synthesis</h5>
                        <p className="text-gray-600 mb-3">
                          The protocol synthesizes all analyses into a structured format, producing actionable insights including patient overview, care recommendations, and risk factors.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Output Structure:</span>
                          </p>
                          <ul className="text-sm text-gray-500 list-disc pl-4">
                            <li>Patient overview (age, gender, chronic conditions)</li>
                            <li>Care approach recommendations</li>
                            <li>Patient engagement strategies</li>
                            <li>Interdisciplinary coordination plans</li>
                            <li>Preventive health measures</li>
                            <li>Specialist referral suggestions</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          5
                        </div>
                      </div>
                      <div className="ml-4">
                        <h5 className="text-lg font-medium text-gray-900 mb-2">Secure Storage & Verification</h5>
                        <p className="text-gray-600 mb-3">
                          Each analysis is securely stored using private IPFS buckets, with data spread across multiple nodes. An immutable blockchain-like chain of analyses maintains complete accountability.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Security Features:</span> End-to-end encryption, distributed storage, and blockchain-based verification ensure data integrity and HIPAA compliance.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h4>
                  <ul className="space-y-3 text-gray-600">
                    <li>• AI Model: gpt-4o-mini with zero temperature</li>
                    <li>• Processing: Parallel analysis execution</li>
                    <li>• Storage: Private IPFS buckets</li>
                    <li>• Security: End-to-end encryption</li>
                    <li>• Integration: FHIR-compatible endpoints</li>
                  </ul>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Benefits</h4>
                  <ul className="space-y-3 text-gray-600">
                    <li>• Comprehensive multi-perspective analysis</li>
                    <li>• Rapid, consistent results</li>
                    <li>• Structured, actionable insights</li>
                    <li>• Complete audit trail</li>
                    <li>• HIPAA-compliant security</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {[
              {
                image: "feature-1.jpeg",
                title: "GENESIS Protocol",
                description: "Multi-perspective AI analysis with dynamic prompt generation and parallel processing for comprehensive medical insights.",
                highlight: "Advanced Analysis"
              },
              {
                image: "feature-2.jpeg",
                title: "Intelligent Chat",
                description: "Context-aware medical responses with fast-track processing for basic queries and specialist consultation for complex cases.",
                highlight: "Smart Responses"
              },
              {
                image: "feature-3.jpeg",
                title: "CDS Hooks Integration",
                description: "Seamless integration with SMART on FHIR authentication and secure token-based session management for protected data handling.",
                highlight: "FHIR Ready"
              },
              {
                image: "feature-4.jpeg",
                title: "NFT Integration",
                description: "Secure storage of medical analyses on decentralized IPFS with private buckets, maintaining an immutable chain of medical records.",
                highlight: "Blockchain Secured"
              },
              {
                image: "feature-5.jpeg",
                title: "Multi-Perspective Analysis",
                description: "Parallel processing of unique analytical perspectives using zero-temperature LLM for deterministic medical insights.",
                highlight: "4-Way Analysis"
              },
              {
                image: "feature-6.jpeg",
                title: "Analysis Synthesis",
                description: "Advanced synthesis of multiple perspectives into structured recommendations and risk assessments for comprehensive care.",
                highlight: "Smart Synthesis"
              }
            ].map((feature, index) => (
              <div key={index} className="group relative">
                <div className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
                  {/* Feature Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-full object-cover transform transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white text-sm font-medium shadow-sm">
                        {feature.highlight}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {/* Feature Title */}
                    <h3 className="text-xl font-medium mb-3 text-gray-900">
                      {feature.title}
                    </h3>
                    
                    {/* Feature Description */}
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Home
