import { useParams, Link } from 'react-router-dom'
import ClickableText from '../components/ClickableText'

// Mock data - will be replaced with DynamoDB data
const lessons: Record<string, {
  title: string
  subtitle: string
  content: string[]
  formula?: string
  uses: { icon: string; title: string; description: string; example: string }[]
  examples: { sentence: string; explanation: string }[]
  tips?: string[]
}> = {
  '1': {
    title: 'Present Simple Tense',
    subtitle: 'Learn the foundation of English grammar',
    content: [
      'The present simple tense is one of the most fundamental tenses in English. It is used to describe habits, unchanging situations, general truths, and fixed arrangements.',
      'Understanding when and how to use the present simple is essential for effective communication in English.',
    ],
    formula: 'Subject + Base Verb (+ s/es for he/she/it)',
    uses: [
      {
        icon: '🔄',
        title: 'Habits and Routines',
        description: 'Actions that happen regularly',
        example: 'I drink coffee every morning.',
      },
      {
        icon: '🌍',
        title: 'General Truths',
        description: 'Facts that are always true',
        example: 'The sun rises in the east.',
      },
      {
        icon: '📅',
        title: 'Fixed Arrangements',
        description: 'Scheduled events and timetables',
        example: 'The train leaves at 8 AM.',
      },
      {
        icon: '📚',
        title: 'Timetables',
        description: 'Scheduled activities',
        example: 'School starts in September.',
      },
    ],
    examples: [
      {
        sentence: 'I work in a hospital.',
        explanation: 'This describes a regular job or routine.',
      },
      {
        sentence: 'She plays tennis every weekend.',
        explanation: 'Third person singular uses -s form of the verb.',
      },
      {
        sentence: 'Water boils at 100 degrees Celsius.',
        explanation: 'This is a general truth or scientific fact.',
      },
    ],
    tips: [
      'Remember to add -s or -es for third person singular (he, she, it)',
      'Use present simple for facts and permanent situations',
      'Time expressions like "always", "usually", "often" are common with present simple',
    ],
  },
  '2': {
    title: 'Present Continuous Tense',
    subtitle: 'Actions happening now and around the present',
    content: [
      'The present continuous tense describes actions that are happening right now or around the present time. It emphasizes the ongoing nature of an action.',
      'This tense is formed using a form of "be" (am, is, are) plus the verb with -ing ending.',
    ],
    formula: 'Subject + am/is/are + Verb + -ing',
    uses: [
      {
        icon: '⏰',
        title: 'Actions Happening Now',
        description: 'What you are doing at this moment',
        example: 'I am reading a book.',
      },
      {
        icon: '🏠',
        title: 'Temporary Situations',
        description: 'Situations that are not permanent',
        example: 'She is staying with friends this week.',
      },
      {
        icon: '📆',
        title: 'Future Arrangements',
        description: 'Planned future events',
        example: 'We are meeting tomorrow.',
      },
      {
        icon: '📈',
        title: 'Changing Situations',
        description: 'Things that are developing',
        example: 'The weather is getting warmer.',
      },
    ],
    examples: [
      {
        sentence: 'I am studying English right now.',
        explanation: 'Action happening at this moment.',
      },
      {
        sentence: 'They are building a new house.',
        explanation: 'Action in progress, not necessarily right now.',
      },
      {
        sentence: 'We are going to the cinema tonight.',
        explanation: 'Future arrangement that is already planned.',
      },
    ],
    tips: [
      'Always use am/is/are before the -ing verb',
      'Use present continuous for temporary actions',
      'Some verbs (like, know, understand) are rarely used in continuous form',
    ],
  },
}

export default function GrammarLesson() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const lesson = lessonId ? lessons[lessonId] : null

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Lesson not found</h2>
        <Link to="/grammar" className="text-primary-600 hover:underline">
          Back to Grammar Lessons
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back Button */}
      <Link
        to="/grammar"
        className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors group"
      >
        <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Lessons
      </Link>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{lesson.title}</h1>
            <p className="text-xl text-primary-100">{lesson.subtitle}</p>
          </div>
          <div className="hidden md:block w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary-500">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-3">
            {lesson.content.map((paragraph, index) => (
              <p key={index} className="text-gray-700 leading-relaxed text-lg">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Formula Section */}
      {lesson.formula && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-md p-6 border-2 border-purple-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Formula</h2>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
            <code className="text-2xl font-mono font-bold text-purple-700">{lesson.formula}</code>
          </div>
        </div>
      )}

      {/* Uses Section */}
      <div>
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">When to Use</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {lesson.uses.map((use, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100 group"
            >
              <div className="flex items-start">
                <div className="text-4xl mr-4 group-hover:scale-110 transition-transform">{use.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{use.title}</h3>
                  <p className="text-gray-600 mb-3">{use.description}</p>
                  <div className="bg-primary-50 rounded-lg p-3 border-l-4 border-primary-500">
                    <p className="text-gray-800 font-medium italic">
                      "<ClickableText text={use.example} />"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Examples Section */}
      <div>
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Examples</h2>
        </div>
        <div className="space-y-4">
          {lesson.examples.map((example, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border-l-4 border-primary-500 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-xl font-semibold text-gray-900 mb-3 italic">
                    "<ClickableText text={example.sentence} />"
                  </p>
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-700">{example.explanation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      {lesson.tips && (
        <div className="bg-yellow-50 rounded-xl shadow-md p-6 border-2 border-yellow-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">💡 Pro Tips</h2>
          </div>
          <ul className="space-y-3">
            {lesson.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-3 font-bold">✓</span>
                <span className="text-gray-800">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h3 className="text-2xl font-bold mb-2">Ready to test your knowledge?</h3>
            <p className="text-primary-100">Take the quiz to see how well you understand this lesson</p>
          </div>
          <Link
            to={`/grammar/${lessonId}/quiz`}
            className="px-8 py-4 bg-white text-primary-600 rounded-lg font-bold hover:bg-primary-50 transition-colors shadow-lg hover:shadow-xl flex items-center group whitespace-nowrap"
          >
            Take Quiz
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
