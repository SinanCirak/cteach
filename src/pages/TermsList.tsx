import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ClickableText from '../components/ClickableText'
import { getTerms } from '../utils/api'

interface Term {
  termId: string
  term: string
  definition: string
  example: string
  level: string
  partOfSpeech?: string
  category?: string
}

export default function TermsList() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true)
        const data = await getTerms()
        if (data && data.terms) {
          setTerms(data.terms)
        }
      } catch (err: any) {
        console.error('Failed to fetch terms:', err)
        setError(err.message || 'Failed to load terms')
      } finally {
        setLoading(false)
      }
    }

    fetchTerms()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading terms...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary-600 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }
  const [selectedLevel, setSelectedLevel] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const termsPerPage = 10

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           term.definition.toLowerCase().includes(searchTerm.toLowerCase())
      const termLevel = term.level === 'beginner' ? 'Beginner' : term.level === 'intermediate' ? 'Intermediate' : 'Advanced'
      const matchesLevel = selectedLevel === 'All' || termLevel === selectedLevel
      return matchesSearch && matchesLevel
    })
  }, [terms, searchTerm, selectedLevel])

  const termsWithId = filteredTerms.map(term => ({
    id: term.termId,
    term: term.term,
    definition: term.definition,
    example: term.example,
    level: term.level === 'beginner' ? 'Beginner' : term.level === 'intermediate' ? 'Intermediate' : 'Advanced',
  }))

  const totalPages = Math.ceil(termsWithId.length / termsPerPage)
  const paginatedTerms = termsWithId.slice(
    (currentPage - 1) * termsPerPage,
    currentPage * termsPerPage
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/terms"
          className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Terms
        </Link>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms List</h1>
        <p className="text-lg text-gray-600 mb-6">
          Browse and study terms with definitions and examples
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search terms or definitions..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value)
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Showing {termsWithId.length} term{termsWithId.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Term Cards */}
      <div className="space-y-4">
        {paginatedTerms.length > 0 ? (
          paginatedTerms.map((term) => (
            <div
              key={term.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{term.term}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      term.level === 'Beginner'
                        ? 'bg-green-100 text-green-700'
                        : term.level === 'Intermediate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {term.level}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{term.definition}</p>
                  <div className="bg-primary-50 rounded-lg p-3 border-l-4 border-primary-500">
                    <p className="text-gray-600 italic">
                      <span className="font-semibold">Example: </span>
                      <ClickableText text={term.example} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No terms found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
