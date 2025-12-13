import { Link } from 'react-router-dom'

// Mock data - will be replaced with DynamoDB data
const grammarLessons = [
  {
    id: '1',
    title: 'Present Simple Tense',
    description: 'Learn how to use the present simple tense in English',
    level: 'Beginner',
    duration: '15 min',
    completed: false,
  },
  {
    id: '2',
    title: 'Present Continuous Tense',
    description: 'Master the present continuous tense and its usage',
    level: 'Beginner',
    duration: '20 min',
    completed: false,
  },
  {
    id: '3',
    title: 'Past Simple Tense',
    description: 'Understand how to form and use the past simple tense',
    level: 'Beginner',
    duration: '18 min',
    completed: true,
  },
  {
    id: '4',
    title: 'Future Tenses',
    description: 'Learn about will, going to, and present continuous for future',
    level: 'Intermediate',
    duration: '25 min',
    completed: false,
  },
  {
    id: '5',
    title: 'Present Perfect Tense',
    description: 'Master the present perfect tense and its various uses',
    level: 'Intermediate',
    duration: '22 min',
    completed: false,
  },
  {
    id: '6',
    title: 'Conditionals',
    description: 'Learn zero, first, second, and third conditionals',
    level: 'Intermediate',
    duration: '30 min',
    completed: false,
  },
]

export default function Grammar() {
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

