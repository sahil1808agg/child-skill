import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Student, Report, Analysis, ActivityRecommendation } from '../types'
import { fetchStudent, fetchStudentReports, fetchStudentAnalysis, deleteReport, fetchActivityRecommendations } from '../services/api'
import './StudentProfile.css'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadStudentData(id)
    }
  }, [id])

  const loadStudentData = async (studentId: string) => {
    try {
      const [studentData, reportsData, analysisData] = await Promise.all([
        fetchStudent(studentId),
        fetchStudentReports(studentId),
        fetchStudentAnalysis(studentId)
      ])

      setStudent(studentData)
      setReports(reportsData)
      setAnalysis(analysisData)

      // Fetch activity recommendations for the latest report
      if (reportsData.length > 0) {
        const latestReport = reportsData[reportsData.length - 1]
        try {
          const recommendationsData = await fetchActivityRecommendations(latestReport._id)
          setRecommendations(recommendationsData)
        } catch (error) {
          console.error('Error loading activity recommendations:', error)
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return
    }

    try {
      await deleteReport(reportId)

      // Refresh data after deletion
      if (id) {
        await loadStudentData(id)
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Failed to delete report. Please try again.')
    }
  }

  if (loading) {
    return <div className="loading">Loading student profile...</div>
  }

  if (!student) {
    return <div className="error">Student not found</div>
  }

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

      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <div className="section-header">
            <h2>Recommended Activities</h2>
            <p className="section-subtitle">Based on latest report analysis</p>
          </div>
          <div className="recommendations-grid">
            {recommendations.map((activity) => (
              <div key={activity.id} className={`activity-card priority-${activity.priority.toLowerCase()}`}>
                <div className="activity-header">
                  <h3>{activity.name}</h3>
                  <span className={`priority-badge ${activity.priority.toLowerCase()}`}>
                    {activity.priority}
                  </span>
                </div>
                <div className="activity-category">{activity.category}</div>
                <p className="activity-description">{activity.description}</p>

                <div className="activity-details">
                  <div className="detail-item">
                    <strong>Frequency:</strong> {activity.frequency}
                  </div>
                  <div className="detail-item">
                    <strong>Estimated Cost:</strong> {activity.estimatedCost}
                  </div>
                </div>

                <div className="activity-benefits">
                  <strong>Benefits:</strong>
                  <ul>
                    {activity.benefits.slice(0, 3).map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>

                <div className="activity-attributes">
                  <strong>Target IB Attributes:</strong>
                  <div className="attributes-list">
                    {activity.targetAttributes.map((attr, idx) => (
                      <span key={idx} className="attribute-tag">{attr}</span>
                    ))}
                  </div>
                </div>

                <div className="why-recommended">
                  <strong>Why recommended:</strong>
                  <p>{activity.whyRecommended}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="reports-section">
        <div className="section-header">
          <h2>Report History ({reports.length})</h2>
          {reports.length === 1 && (
            <p className="upload-prompt">
              Upload more reports to track progress over time and see detailed trends!
            </p>
          )}
        </div>
        {reports.length === 0 ? (
          <p>No reports available</p>
        ) : (
          <div className="reports-list">
            {reports.map((report, index) => (
              <div key={report._id} className="report-card">
                <div className="report-header">
                  <div>
                    <span className="report-number">Report #{reports.length - index}</span>
                    <h3>{report.term} - {report.academicYear}</h3>
                  </div>
                  <div className="report-actions">
                    <span className="report-date">
                      {new Date(report.reportDate).toLocaleDateString()}
                    </span>
                    <button
                      className="delete-report-btn"
                      onClick={() => handleDeleteReport(report._id)}
                      title="Delete this report"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {report.summary ? (
                  <div className="report-summary">
                    <div className="summary-section">
                      <h4>Overall Performance</h4>
                      <p>{report.summary.overallPerformance}</p>
                    </div>

                    {report.summary.keyStrengths.length > 0 && (
                      <div className="summary-section strengths">
                        <h4>Key Strengths</h4>
                        <ul>
                          {report.summary.keyStrengths.map((strength, idx) => (
                            <li key={idx}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.summary.areasNeedingAttention.length > 0 && (
                      <div className="summary-section attention">
                        <h4>Areas to Focus On</h4>
                        <ul>
                          {report.summary.areasNeedingAttention.map((area, idx) => (
                            <li key={idx}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.summary.teacherHighlights.length > 0 && (
                      <div className="summary-section highlights">
                        <h4>Teacher Highlights</h4>
                        <ul>
                          {report.summary.teacherHighlights.map((highlight, idx) => (
                            <li key={idx}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {report.overallPercentage && (
                      <div className="overall-grade">
                        <span className="percentage">{report.overallPercentage}%</span>
                        <span className="grade">{report.overallGrade}</span>
                      </div>
                    )}

                    <div className="subjects-grid">
                      {report.subjects.map((subject, idx) => (
                        <div key={idx} className="subject-item">
                          <span className="subject-name">{subject.name}</span>
                          <span className="subject-grade">{subject.grade}</span>
                          {subject.percentage && (
                            <span className="subject-percentage">{subject.percentage}%</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {report.teacherComments && (
                      <div className="teacher-comments">
                        <strong>Teacher's Comments:</strong>
                        <p>{report.teacherComments}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
