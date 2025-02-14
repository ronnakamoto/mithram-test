import { Link } from 'wouter';

export default function Header({ isAuthenticated, onLogout }) {
  return (
    <nav className="w-full bg-white/80 backdrop-blur-md fixed top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <a className="text-xl font-medium tracking-tight text-gray-900">Mithram</a>
          </Link>
          <div className="flex items-center space-x-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Documentation</a>
            <a href="https://github.com/ronnakamoto/mithram" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">GitHub</a>
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
