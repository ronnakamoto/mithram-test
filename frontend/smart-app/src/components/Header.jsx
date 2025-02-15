import { Link } from 'wouter';
import { 
  ArrowRightOnRectangleIcon, 
  BookOpenIcon, 
  BeakerIcon,
  CodeBracketIcon 
} from '@heroicons/react/24/outline';

export default function Header({ isAuthenticated, onLogout }) {
  return (
    <nav className="w-full bg-white/80 backdrop-blur-md fixed top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <a className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent hover:from-blue-500 hover:to-blue-700 transition-all duration-200">Mithram</a>
          </Link>
          <div className="flex items-center space-x-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center space-x-1">
              <BeakerIcon className="h-4 w-4" />
              <span>Features</span>
            </a>
            <a href="#docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center space-x-1">
              <BookOpenIcon className="h-4 w-4" />
              <span>Documentation</span>
            </a>
            <a href="https://github.com/ronnakamoto/mithram" className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center space-x-1">
              <CodeBracketIcon className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer space-x-1"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
