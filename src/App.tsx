import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Grammar from './pages/Grammar'
import Vocabulary from './pages/Vocabulary'
import GrammarLesson from './pages/GrammarLesson'
import GrammarQuiz from './pages/GrammarQuiz'
import VocabularyList from './pages/VocabularyList'
import VocabularyQuiz from './pages/VocabularyQuiz'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/grammar" element={<Grammar />} />
          <Route path="/grammar/:lessonId" element={<GrammarLesson />} />
          <Route path="/grammar/:lessonId/quiz" element={<GrammarQuiz />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/vocabulary/list" element={<VocabularyList />} />
          <Route path="/vocabulary/quiz" element={<VocabularyQuiz />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

