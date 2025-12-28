import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import UploadReport from './pages/UploadReport'
import StudentProfile from './pages/StudentProfile'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <h1>Enhance Your Child</h1>
          <nav>
            <a href="/">Dashboard</a>
            <a href="/upload">Upload Report</a>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadReport />} />
            <Route path="/student/:id" element={<StudentProfile />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
