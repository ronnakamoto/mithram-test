import { useState } from 'react'
import { Route, Switch, Link } from 'wouter'
import Home from './components/Home'
import AnalysisDetails from './components/AnalysisDetails'
import Launch from './components/Launch'

function App() {
  return (
    <div className="min-h-screen w-full bg-white">
      {/* Navigation */}
      <nav className="w-full bg-white/80 backdrop-blur-md fixed top-0 z-50 border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <a className="text-xl font-medium tracking-tight text-gray-900">Mithram</a>
            </Link>
            <div className="flex space-x-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Documentation</a>
              <a href="https://github.com/ronnakamoto/mithram" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/analysis/:id" component={AnalysisDetails} />
        <Route path="/launch" component={Launch} />
      </Switch>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <p className="text-sm text-gray-600"> 2025 Mithram. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
