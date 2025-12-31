import { useState, useRef } from 'react'
import { Report, Student } from '../../types'
import { uploadReport, deleteReport, downloadReportPDF } from '../../services/api'
import './ReportsTab.css'

interface Props {
  student: Student
  reports: Report[]
  onReportUploaded: (report: Report) => void
  onReportDeleted: (reportId: string) => void
}

export default function ReportsTab({ student, reports, onReportUploaded, onReportDeleted }: Props) {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getQuickSummary = (report: Report): string => {
    if (report.summary?.overallPerformance) {
      const text = report.summary.overallPerformance
      return text.length > 80 ? text.substring(0, 80) + '...' : text
    }
    return 'Summary not available'
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('report', file)
    formData.append('studentName', student.name)
    formData.append('dateOfBirth', student.dateOfBirth)

    setUploadingFile(true)
    setUploadProgress(0)

    try {
      // Simulate progress (since we don't have real upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await uploadReport(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Fetch the uploaded report to get full details
      // For now, we'll need to refresh the reports list
      // The parent component should handle this
      if (result.reportId) {
        // Notify parent to refresh reports
        alert('Report uploaded successfully! Refreshing...')
        window.location.reload()
      }
    } catch (error) {
      console.error('Error uploading report:', error)
      alert('Failed to upload report. Please try again.')
    } finally {
      setUploadingFile(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleToggleExpand = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId)
  }

  const handleDeleteReport = async (reportId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this report? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      await deleteReport(reportId)
      onReportDeleted(reportId)
      alert('Report deleted successfully')

      // If deleted report was expanded, close it
      if (expandedReportId === reportId) {
        setExpandedReportId(null)
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Failed to delete report. Please try again.')
    }
  }

  const handleDownloadPDF = async (reportId: string) => {
    try {
      setDownloadingPDF(reportId)
      await downloadReportPDF(reportId, {
        includeRecommendations: false
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF. Please try again.')
    } finally {
      setDownloadingPDF(null)
    }
  }

  const sortedReports = [...reports].sort((a, b) => {
    return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  })

  return (
    <div className="reports-tab">
      <div className="reports-header">
        <h2>📄 Reports ({reports.length})</h2>
        <button
          className="upload-btn"
          onClick={handleUploadClick}
          disabled={uploadingFile}
        >
          {uploadingFile ? `Uploading... ${uploadProgress}%` : '📤 Upload Report'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
        />
      </div>

      {uploadingFile && (
        <div className="upload-progress-bar">
          <div
            className="upload-progress-fill"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {sortedReports.length === 0 ? (
        <div className="no-reports">
          <p>No reports uploaded yet.</p>
          <p className="no-reports-hint">Click "Upload Report" to get started!</p>
        </div>
      ) : (
        <table className="reports-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Term / Year</th>
              <th>Quick Summary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedReports.map(report => (
              <>
                <tr
                  key={report._id}
                  className={expandedReportId === report._id ? 'expanded-row' : ''}
                >
                  <td onClick={() => handleToggleExpand(report._id)}>
                    {formatDate(report.reportDate)}
                  </td>
                  <td onClick={() => handleToggleExpand(report._id)}>
                    {report.term}, {report.academicYear}
                  </td>
                  <td onClick={() => handleToggleExpand(report._id)}>
                    {getQuickSummary(report)}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="action-btn view-btn"
                      onClick={() => handleToggleExpand(report._id)}
                      title="View/Hide Summary"
                    >
                      {expandedReportId === report._id ? '▼' : '👁'}
                    </button>
                    <button
                      className="action-btn pdf-btn"
                      onClick={() => handleDownloadPDF(report._id)}
                      disabled={downloadingPDF === report._id}
                      title="Download PDF"
                    >
                      {downloadingPDF === report._id ? '⏳' : '📄'}
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteReport(report._id)}
                      title="Delete Report"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
                {expandedReportId === report._id && (
                  <tr className="expanded-summary-row">
                    <td colSpan={4}>
                      <div className="expanded-summary">
                        {report.summary ? (
                          <>
                            <div className="summary-section overall">
                              <h4>📊 Overall Performance</h4>
                              <p>{report.summary.overallPerformance}</p>
                            </div>

                            {report.summary.keyStrengths.length > 0 && (
                              <div className="summary-section strengths">
                                <h4>✓ Key Strengths</h4>
                                <ul>
                                  {report.summary.keyStrengths.map((strength, idx) => (
                                    <li key={idx}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {report.summary.areasNeedingAttention.length > 0 && (
                              <div className="summary-section attention">
                                <h4>🎯 Areas to Focus On</h4>
                                <ul>
                                  {report.summary.areasNeedingAttention.map((area, idx) => (
                                    <li key={idx}>{area}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {report.summary.teacherHighlights.length > 0 && (
                              <div className="summary-section highlights">
                                <h4>💬 Teacher Highlights</h4>
                                <ul>
                                  {report.summary.teacherHighlights.map((highlight, idx) => (
                                    <li key={idx}>{highlight}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="summary-loading">
                            <p>Summary not yet generated...</p>
                          </div>
                        )}

                        {/* Original Teacher Comments */}
                        {report.teacherComments && (
                          <div className="summary-section teacher-comments">
                            <h4>💬 Original Teacher's Comments</h4>
                            <p>{report.teacherComments}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
