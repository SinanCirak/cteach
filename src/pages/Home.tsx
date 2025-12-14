import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 sm:space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 px-4">
          Welcome to <span className="text-primary-600">cteach</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
          Learn any subject with interactive lessons, quizzes, and comprehensive content. Perfect for English, Math, Physics, Languages, and more.
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-8 sm:mt-12 md:mt-16">
        {/* Grammar Card */}
        <Link
          to="/grammar"
          className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-primary-700/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-6 sm:p-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Grammar</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Learn English grammar fundamentals with structured lessons and practice exercises
            </p>
            <div className="flex items-center text-primary-600 font-semibold group-hover:translate-x-2 transition-transform">
              Start Learning
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Vocabulary Card */}
        <Link
          to="/vocabulary"
          className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-700/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-6 sm:p-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Vocabulary</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Master 3,000-5,000 most common English words with flashcards and interactive quizzes
            </p>
            <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
              Start Learning
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Features Section */}
      <div className="mt-12 sm:mt-16 md:mt-20 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Interactive Quizzes</h3>
          <p className="text-sm sm:text-base text-gray-600">Test your knowledge after each lesson with comprehensive quizzes</p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Progress Tracking</h3>
          <p className="text-sm sm:text-base text-gray-600">Monitor your learning progress and see your improvement over time</p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md sm:col-span-2 md:col-span-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Comprehensive Content</h3>
          <p className="text-sm sm:text-base text-gray-600">Access thousands of words and grammar rules in one place</p>
        </div>
      </div>
    </div>
  )
}

