import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { TooltipProvider } from './contexts/TooltipContext'
import { AppConfigProvider, useAppConfig } from './contexts/AppConfigContext'
import Home from './pages/Home'
import Lessons from './pages/Lessons'
import Terms from './pages/Terms'
import Lesson from './pages/Lesson'
import LessonQuiz from './pages/LessonQuiz'
import TermsList from './pages/TermsList'
import TermsQuiz from './pages/TermsQuiz'
import Admin from './pages/Admin'
import Layout from './components/Layout'

function AppRoutes() {
  const { config, loading } = useAppConfig()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Lessons (formerly Grammar) */}
      {config?.features.lessons && (
        <>
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/lessons/:lessonId" element={<Lesson />} />
          <Route path="/lessons/:lessonId/quiz" element={<LessonQuiz />} />
          {/* Keep old /grammar routes for backward compatibility */}
          <Route path="/grammar" element={<Lessons />} />
          <Route path="/grammar/:lessonId" element={<Lesson />} />
          <Route path="/grammar/:lessonId/quiz" element={<LessonQuiz />} />
        </>
      )}
      {/* Terms/Formulas */}
      {config?.features.terms && (
        <>
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms/list" element={<TermsList />} />
          <Route path="/terms/quiz" element={<TermsQuiz />} />
        </>
      )}
      {/* Keep old /vocabulary routes for backward compatibility */}
      {config?.features.terms && (
        <>
          <Route path="/vocabulary" element={<Terms />} />
          <Route path="/vocabulary/list" element={<TermsList />} />
          <Route path="/vocabulary/quiz" element={<TermsQuiz />} />
        </>
      )}
      {/* Quizzes - separate page if enabled */}
      {config?.features.quizzes && (
        <Route path="/quizzes" element={<TermsQuiz />} />
      )}
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

function App() {
  return (
    <LanguageProvider>
      <TooltipProvider>
        <AppConfigProvider>
          <Router>
            <Layout>
              <AppRoutes />
            </Layout>
          </Router>
        </AppConfigProvider>
      </TooltipProvider>
    </LanguageProvider>
  )
}

export default App

