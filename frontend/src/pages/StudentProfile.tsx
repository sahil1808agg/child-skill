import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Student, Report, Analysis } from '../types'
import { fetchStudent, fetchStudentReports, fetchStudentAnalysis } from '../services/api'
import './StudentProfile.css'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
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
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading student profile...</div>
  }

  if (!student) {
    return <div className="error">Student not found</div>
  }

  const prepareChartData = () => {
    return reports.map(report => ({
      date: new Date(report.reportDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      percentage: report.overallPercentage || 0,
      ...report.subjects.reduce((acc, subject) => {
        acc[subject.name] = subject.percentage || 0
        return acc
      }, {} as Record<string, number>)
    }))
  }

  const chartData = prepareChartData()

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

      {analysis && (
        <div className="analysis-section">
          <div className="analysis-card strengths">
            <h3>Strengths</h3>
            <ul>
              {analysis.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-card improvements">
            <h3>Areas for Improvement</h3>
            <ul>
              {analysis.improvements.map((improvement, idx) => (
                <li key={idx}>{improvement}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-card trends">
            <h3>Performance Trends</h3>
            {analysis.trends.improving.length > 0 && (
              <div>
                <h4 className="trend-improving">Improving</h4>
                <ul>
                  {analysis.trends.improving.map((subject, idx) => (
                    <li key={idx}>{subject}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.trends.declining.length > 0 && (
              <div>
                <h4 className="trend-declining">Needs Attention</h4>
                <ul>
                  {analysis.trends.declining.map((subject, idx) => (
                    <li key={idx}>{subject}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="charts-section">
          <h2>Progress Over Time</h2>
          <div className="chart-container">
            <h3>Overall Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#3498db" name="Overall %" />
              </LineChart>
            </ResponsiveContainer>
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
                  <span className="report-date">
                    {new Date(report.reportDate).toLocaleDateString()}
                  </span>
                </div>

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
