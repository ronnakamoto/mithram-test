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

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {[
              {
                image: "https://picsum.photos/seed/genesis/400/300.webp",
                title: "GENESIS Protocol",
                description: "Multi-perspective AI analysis with dynamic prompt generation and parallel processing for comprehensive medical insights.",
                highlight: "Advanced Analysis"
              },
              {
                image: "https://picsum.photos/seed/chat/400/300.webp",
                title: "Intelligent Chat",
                description: "Context-aware medical responses with fast-track processing for basic queries and specialist consultation for complex cases.",
                highlight: "Smart Responses"
              },
              {
                image: "https://picsum.photos/seed/cds/400/300.webp",
                title: "CDS Hooks Integration",
                description: "Seamless integration with SMART on FHIR authentication and secure token-based session management for protected data handling.",
                highlight: "FHIR Ready"
              },
              {
                image: "https://picsum.photos/seed/nft/400/300.webp",
                title: "NFT Integration",
                description: "Secure storage of medical analyses on decentralized IPFS with private buckets, maintaining an immutable chain of medical records.",
                highlight: "Blockchain Secured"
              },
              {
                image: "https://picsum.photos/seed/analysis/400/300.webp",
                title: "Multi-Perspective Analysis",
                description: "Parallel processing of unique analytical perspectives using zero-temperature LLM for deterministic medical insights.",
                highlight: "4-Way Analysis"
              },
              {
                image: "https://picsum.photos/seed/synthesis/400/300.webp",
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
