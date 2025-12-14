import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms</h1>
        <p className="text-lg text-gray-600">
          Master terms, formulas, and concepts with flashcards, quizzes, and interactive exercises
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Terms List Card */}
        <Link
          to="/terms/list"
          className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-700/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Terms List</h2>
            <p className="text-gray-600 mb-6">
              Browse and study terms with definitions, examples, and explanations
            </p>
            <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
              View Terms
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Quiz Card */}
        <Link
          to="/terms/quiz"
          className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-700/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Terms Quiz</h2>
            <p className="text-gray-600 mb-6">
              Test your knowledge with multiple choice questions, definition matching, and term selection exercises
            </p>
            <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
              Take Quiz
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Section */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="text-3xl font-bold text-primary-600 mb-2">3,000+</div>
          <div className="text-gray-600">Common Terms</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="text-3xl font-bold text-primary-600 mb-2">5,000+</div>
          <div className="text-gray-600">Advanced Terms</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="text-3xl font-bold text-primary-600 mb-2">Multiple</div>
          <div className="text-gray-600">Quiz Types</div>
        </div>
      </div>
    </div>
  )
}
