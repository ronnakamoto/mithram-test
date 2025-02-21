import { useState, useEffect } from 'react'
import { Route, Switch, useLocation, Link } from 'wouter'
import Home from './components/Home'
import AnalysisDetails from './components/AnalysisDetails'
import Launch from './components/Launch'
import Callback from './components/Callback'
import Header from './components/Header'
import TermsOfService from './components/TermsOfService'

function App() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    const storedUser = localStorage.getItem('mithram_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setIsAuthenticated(parsedUser.expiresAt * 1000 > Date.now());
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mithram_user');
    localStorage.removeItem('launchParams');
    setIsAuthenticated(false);
    setLocation('/');
  };

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Navigation */}
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />

      {/* Routes */}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/analysis/:id">
          {(params) => (
            <AnalysisDetails 
              id={params.id} 
              setIsAuthenticated={setIsAuthenticated}
            />
          )}
        </Route>
        <Route path="/launch" component={Launch} />
        <Route path="/callback">
          {() => (
            <Callback 
              setIsAuthenticated={setIsAuthenticated}
            />
          )}
        </Route>
        <Route path="/terms" component={TermsOfService} />
      </Switch>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              2025 Mithram. All rights reserved. 
              <Link href="/terms" className="ml-2 text-blue-500 hover:text-blue-600">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
