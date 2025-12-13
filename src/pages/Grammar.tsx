import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getGrammarLessons } from '../utils/api'

interface GrammarLesson {
  lessonId: string
  title: string
  subtitle?: string
  level: string
  order: number
}

export default function Grammar() {
  const [lessons, setLessons] = useState<GrammarLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true)
        const data = await getGrammarLessons()
        if (data && data.lessons) {
          // Remove duplicates based on lessonId
          const uniqueLessons = data.lessons.reduce((acc: GrammarLesson[], lesson: GrammarLesson) => {
            if (!acc.find(l => l.lessonId === lesson.lessonId)) {
              acc.push(lesson)
            }
            return acc
          }, [])
          
          // Sort by order
          const sortedLessons = uniqueLessons.sort((a: GrammarLesson, b: GrammarLesson) => 
            (a.order || 0) - (b.order || 0)
          )
          setLessons(sortedLessons)
        }
      } catch (err: any) {
        console.error('Failed to fetch lessons:', err)
        // If no lessons found, show empty state instead of error
        if (err.message && err.message.includes('404')) {
          setLessons([])
          setError(null)
        } else {
          setError(err.message || 'Failed to load lessons')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLessons()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lessons...</p>
        </div>
      </div>
    )
  }

  if (error && lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-gray-600 mb-4 text-sm">
          API URL: {import.meta.env.VITE_API_URL || 'https://fi3hva7yre.execute-api.ca-central-1.amazonaws.com/prod'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary-600 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (lessons.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No lessons found</h2>
        <p className="text-gray-600 mb-4">
          Please upload grammar lessons from the admin panel.
        </p>
        <Link
          to="/admin"
          className="text-primary-600 hover:underline"
        >
          Go to Admin Panel
        </Link>
      </div>
    )
  }

  const grammarLessons = lessons.map(lesson => ({
    id: lesson.lessonId,
    title: lesson.title,
    description: lesson.subtitle || `Learn about ${lesson.title}`,
    level: lesson.level === 'beginner' ? 'Beginner' : lesson.level === 'intermediate' ? 'Intermediate' : 'Advanced',
    duration: '15 min',
    completed: false,
  }))
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Grammar Lessons</h1>
        <p className="text-lg text-gray-600">
          Master English grammar step by step with interactive lessons and quizzes
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grammarLessons.map((lesson) => (
          <Link
            key={lesson.id}
            to={`/grammar/${lesson.id}`}
            className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  lesson.level === 'Beginner'
                    ? 'bg-green-100 text-green-700'
                    : lesson.level === 'Intermediate'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {lesson.level}
                </span>
                {lesson.completed && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                {lesson.title}
              </h3>
              <p className="text-gray-600 mb-4 text-sm">{lesson.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {lesson.duration}
                </div>
                <div className="flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  Start
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

