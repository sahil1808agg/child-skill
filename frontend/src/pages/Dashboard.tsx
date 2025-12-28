import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Student } from '../types'
import { fetchStudents, fetchStudentReports, deleteStudent } from '../services/api'
import './Dashboard.css'

interface StudentWithReportCount extends Student {
  reportCount: number
}

export default function Dashboard() {
  const [students, setStudents] = useState<StudentWithReportCount[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const data = await fetchStudents()
      const studentsWithCounts = await Promise.all(
        data.map(async (student) => {
          try {
            const reports = await fetchStudentReports(student._id)
            return { ...student, reportCount: reports.length }
          } catch {
            return { ...student, reportCount: 0 }
          }
        })
      )
      setStudents(studentsWithCounts)
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string, studentName: string, e: React.MouseEvent) => {
    // Prevent card click event from firing
    e.stopPropagation()

    const confirmed = window.confirm(
      `Are you sure you want to delete ${studentName}?\n\nThis will permanently delete the student and all their reports. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await deleteStudent(studentId)
      alert(`${result.studentName} deleted successfully.\n${result.reportsDeleted} report(s) were also deleted.`)

      // Reload students after deletion
      await loadStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Failed to delete student. Please try again.')
    }
  }

  if (loading) {
    return <div className="loading">Loading students...</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Students Dashboard</h2>
        <button onClick={() => navigate('/upload')} className="btn-primary">
          Upload New Report
        </button>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <p>No students found. Upload a report to get started!</p>
          <button onClick={() => navigate('/upload')} className="btn-primary">
            Upload Report
          </button>
        </div>
      ) : (
        <div className="students-grid">
          {students.map(student => (
            <div
              key={student._id}
              className="student-card"
              onClick={() => navigate(`/student/${student._id}`)}
            >
              {student.reportCount > 0 && (
                <div className="report-badge">{student.reportCount} {student.reportCount === 1 ? 'Report' : 'Reports'}</div>
              )}
              <button
                className="delete-student-btn"
                onClick={(e) => handleDeleteStudent(student._id, student.name, e)}
                title="Delete student"
                aria-label="Delete student"
              >
                ×
              </button>
              <div className="student-avatar">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <h3>{student.name}</h3>
              <p className="student-grade">{student.grade || 'Grade not set'}</p>
              <p className="student-dob">
                Born: {new Date(student.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
