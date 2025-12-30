import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Student, Report } from '../types'
import { fetchStudent, fetchStudentReports } from '../services/api'
import ReportsTab from '../components/student-profile/ReportsTab'
import CurrentActivitiesTab from '../components/student-profile/CurrentActivitiesTab'
import RecommendationsTab from '../components/student-profile/RecommendationsTab'
import './StudentProfile.css'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reports' | 'activities' | 'recommendations'>('reports')

  useEffect(() => {
    if (id) {
      loadStudentData(id)
    }
  }, [id])

  const loadStudentData = async (studentId: string) => {
    try {
      const [studentData, reportsData] = await Promise.all([
        fetchStudent(studentId),
        fetchStudentReports(studentId)
      ])

      setStudent(studentData)
      setReports(reportsData)
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReportUploaded = (newReport: Report) => {
    // Refresh reports list
    if (id) {
      loadStudentData(id)
    }
  }

  const handleReportDeleted = (reportId: string) => {
    setReports(reports.filter(r => r._id !== reportId))
  }

  if (loading) {
    return <div className="loading">Loading student profile...</div>
  }

  if (!student) {
    return <div className="error">Student not found</div>
  }

  const latestReport = reports.length > 0 ? reports[reports.length - 1] : null

  return (
    <div className="student-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h1>{student.name}</h1>
          <p>Grade: {student.grade || 'Not set'}</p>
          <p>Date of Birth: {new Date(student.dateOfBirth).toLocaleDateString()}</p>
          <div className="report-count">
            <span className="badge">{reports.length} Report{reports.length !== 1 ? 's' : ''}</span>
            {reports.length > 1 && <span className="timeline-info">Tracking progress over time</span>}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">📄</span>
          <span className="tab-label">Reports</span>
          <span className="tab-count">{reports.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          <span className="tab-icon">📝</span>
          <span className="tab-label">Current Activities</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
          disabled={reports.length === 0}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-label">Recommendations</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'reports' && (
          <ReportsTab
            student={student}
            reports={reports}
            onReportUploaded={handleReportUploaded}
            onReportDeleted={handleReportDeleted}
          />
        )}
        {activeTab === 'activities' && (
          <CurrentActivitiesTab
            student={student}
          />
        )}
        {activeTab === 'recommendations' && (
          <RecommendationsTab
            student={student}
            latestReport={latestReport}
          />
        )}
      </div>
    </div>
  )
}
