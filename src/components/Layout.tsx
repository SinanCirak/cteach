import { Link, useLocation } from 'react-router-dom'
import LanguageSelector from './LanguageSelector'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity group">
                <img 
                  src="/logo-icon.svg" 
                  alt="Tilgo Logo" 
                  className="w-12 h-12 group-hover:scale-105 transition-transform"
                />
                <span className="text-2xl font-bold text-gray-800">tilgo</span>
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                to="/grammar"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/grammar')
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Grammar
              </Link>
              <Link
                to="/vocabulary"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/vocabulary')
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Vocabulary
              </Link>
              <LanguageSelector />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

