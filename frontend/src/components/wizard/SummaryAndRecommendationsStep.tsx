import { useState, useEffect } from 'react'
import { Report, ActivityRecommendation, CurrentActivityEvaluation, LocationParams } from '../../types'
import { fetchStudentReports, fetchActivityRecommendations, downloadReportPDF } from '../../services/api'
import './SummaryAndRecommendationsStep.css'

interface SummaryAndRecommendationsStepProps {
  reportId: string
  studentId: string
  currentActivities: string[]
  userLocation: LocationParams | null
  onFinish: (studentId?: string) => void
}

export default function SummaryAndRecommendationsStep({
  reportId,
  studentId,
  currentActivities,
  userLocation,
  onFinish
}: SummaryAndRecommendationsStepProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [activityEvaluations, setActivityEvaluations] = useState<CurrentActivityEvaluation[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)

  useEffect(() => {
    loadReportSummary()
    loadRecommendations()
  }, [])

  const loadReportSummary = async () => {
    setLoadingSummary(true)
    try {
      const reports = await fetchStudentReports(studentId)
      const latestReport = reports.find(r => r._id === reportId) || reports[reports.length - 1]

      if (latestReport) {
        setReport(latestReport)

        // If summary not ready, poll for it
        if (!latestReport.summary) {
          pollForSummary(studentId)
        }
      }
    } catch (error) {
      console.error('Error loading report summary:', error)
    } finally {
      setLoadingSummary(false)
    }
  }

  const pollForSummary = async (studentId: string) => {
    let attempts = 0
    const maxAttempts = 60 // 2 minutes max (60 * 2 seconds)

    const interval = setInterval(async () => {
      attempts++

      try {
        const reports = await fetchStudentReports(studentId)
        const latestReport = reports.find(r => r._id === reportId) || reports[reports.length - 1]

        if (latestReport?.summary) {
          setReport(latestReport)
          clearInterval(interval)
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          console.error('Summary generation timeout')
        }
      } catch (error) {
        console.error('Error polling for summary:', error)
        clearInterval(interval)
      }
    }, 2000)
  }

  const loadRecommendations = async () => {
    setLoadingRecommendations(true)
    setRecommendationsError(null)

    try {
      const response = await fetchActivityRecommendations(
        reportId,
        userLocation || undefined,
        currentActivities
      )
      setRecommendations(response.recommendations)
      if (response.currentActivityEvaluations) {
        setActivityEvaluations(response.currentActivityEvaluations)
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
      setRecommendationsError('Failed to load recommendations. Please try again.')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleDownloadWithRecommendations = async () => {
    try {
      await downloadReportPDF(reportId, {
        includeRecommendations: true,
        address: userLocation?.address || '',
        city: userLocation?.city || '',
        currentActivities
      })
      alert('PDF with recommendations downloaded successfully!')
    } catch (error) {
      alert('Failed to download PDF. Please try again.')
    }
  }

  const handleDownloadSummary = async () => {
    try {
      await downloadReportPDF(reportId, {
        includeRecommendations: false
      })
      alert('PDF downloaded successfully!')
    } catch (error) {
      alert('Failed to download PDF. Please try again.')
    }
  }

  return (
    <div className="summary-and-recommendations-step">
      <h2>Report Summary & Recommendations</h2>
      <p className="step-description">
        Review your child's progress and personalized activity recommendations
      </p>

      {/* Summary Section */}
      <div className="summary-section-wrapper">
        <div className="section-header">
          <h3>📊 Report Summary</h3>
        </div>

        {loadingSummary ? (
          <div className="summary-loading">
            <div className="loading-spinner"></div>
            <p>Loading report...</p>
          </div>
        ) : report ? (
          <div className="report-summary-display">
            <div className="summary-header">
              <h4>{report.term} - {report.academicYear}</h4>
              <span className="report-date">
                {new Date(report.reportDate).toLocaleDateString()}
              </span>
            </div>

            {/* AI-Generated Summary */}
            {report.summary ? (
              <>
                <div className="summary-section ai-summary">
                  <h5>Overall Performance</h5>
                  <p>{report.summary.overallPerformance}</p>
                </div>

                {report.summary.keyStrengths.length > 0 && (
                  <div className="summary-section strengths">
                    <h5>✓ Key Strengths</h5>
                    <ul>
                      {report.summary.keyStrengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.summary.areasNeedingAttention.length > 0 && (
                  <div className="summary-section attention">
                    <h5>🎯 Areas to Focus On</h5>
                    <ul>
                      {report.summary.areasNeedingAttention.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.summary.teacherHighlights.length > 0 && (
                  <div className="summary-section highlights">
                    <h5>💬 Teacher Highlights</h5>
                    <ul>
                      {report.summary.teacherHighlights.map((highlight, idx) => (
                        <li key={idx}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="summary-generating">
                <div className="loading-spinner"></div>
                <p>Generating AI summary...</p>
                <p className="loading-subtext">This may take 10-15 seconds</p>
              </div>
            )}

            {/* Skill Assessments */}
            {report.skillAssessments && report.skillAssessments.length > 0 && (
              <div className="summary-section skills">
                <h5>🔧 Skills Assessment</h5>
                <div className="skills-grid">
                  {report.skillAssessments.map((skill, idx) => (
                    <div key={idx} className="skill-assessment">
                      <div className="skill-category">{skill.category}</div>
                      <div className="skill-detail">
                        <strong>{skill.skillName}:</strong> {skill.rating}
                      </div>
                      {skill.comments && (
                        <div className="skill-comment">{skill.comments}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="download-summary-btn-wrapper">
              <button
                className="download-summary-btn"
                onClick={handleDownloadSummary}
              >
                📄 Download Summary as PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="summary-generating">
            <div className="loading-spinner"></div>
            <p>Loading report summary...</p>
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="recommendations-section-wrapper">
        <div className="section-header">
          <h3>🎯 Activity Recommendations</h3>
        </div>

        {loadingRecommendations ? (
          <div className="recommendation-loading">
            <div className="loading-spinner"></div>
            <p>Generating personalized recommendations...</p>
            <p className="loading-subtext">This may take a few moments</p>
          </div>
        ) : recommendationsError ? (
          <div className="recommendation-error">
            <h4>Unable to Load Recommendations</h4>
            <p>{recommendationsError}</p>
          </div>
        ) : (
          <>
            {/* Current Activity Evaluations */}
            {activityEvaluations.length > 0 && (
              <div className="evaluations-section">
                <h4>Current Activities Evaluation</h4>
                <p className="subsection-subtitle">
                  Assessment of your child's current activities based on their learning profile
                </p>
                <div className="evaluations-grid">
                  {activityEvaluations.map((evaluation, index) => (
                    <div key={index} className={`evaluation-card recommendation-${evaluation.recommendation}`}>
                      <div className="evaluation-header">
                        <h5>{evaluation.activityName}</h5>
                        <span className={`evaluation-badge ${evaluation.recommendation}`}>
                          {evaluation.recommendation === 'continue' && '✓ Continue'}
                          {evaluation.recommendation === 'reconsider' && '⚠ Reconsider'}
                          {evaluation.recommendation === 'stop' && '✕ Consider Stopping'}
                        </span>
                      </div>
                      <div className="evaluation-alignment">
                        <strong>Alignment Score:</strong>
                        <div className="alignment-bar">
                          <div
                            className="alignment-fill"
                            style={{ width: `${evaluation.alignment}%` }}
                          />
                        </div>
                        <span className="alignment-score">{evaluation.alignment}%</span>
                      </div>
                      <div className="evaluation-reasoning">
                        <strong>Reasoning:</strong>
                        <p>{evaluation.reasoning}</p>
                      </div>
                      {evaluation.alternatives && evaluation.alternatives.length > 0 && (
                        <div className="evaluation-alternatives">
                          <strong>Suggested Alternatives:</strong>
                          <ul>
                            {evaluation.alternatives.map((alt, idx) => (
                              <li key={idx}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Activity Recommendations */}
            {recommendations.length > 0 && (
              <div className="new-recommendations-section">
                <h4>New Activity Recommendations</h4>
                <p className="subsection-subtitle">
                  Activities to help your child develop targeted skills and attributes
                </p>
                <div className="recommendations-grid">
                  {recommendations.map((activity) => {
                    // Parse price range for local currency conversion
                    const priceMatch = activity.estimatedCost.match(/\$(\d+)-(\d+)/)
                    const localPrice = priceMatch
                      ? `₹${Math.round(parseInt(priceMatch[1]) * 83)}-${Math.round(parseInt(priceMatch[2]) * 83)}/month`
                      : activity.estimatedCost

                    return (
                      <div key={activity.id} className={`activity-card priority-${activity.priority.toLowerCase()}`}>
                        <div className="activity-header">
                          <div className="activity-title-section">
                            <h5>{activity.name}</h5>
                            <div className="activity-badges">
                              {activity.recommendationType === 'improvement' && (
                                <span className="rec-type-badge improvement">
                                  🎯 Area to Improve
                                </span>
                              )}
                              {activity.recommendationType === 'strength' && (
                                <span className="rec-type-badge strength">
                                  ⭐ Build on Strength
                                </span>
                              )}
                              {activity.recommendationType === 'age-based' && (
                                <span className="rec-type-badge age-based">
                                  👶 Age-Appropriate
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {activity.targetedAttributes && activity.targetedAttributes.length > 0 && (
                          <div className="targeted-attributes">
                            <strong>Focuses on:</strong> {activity.targetedAttributes.map(a =>
                              a.charAt(0).toUpperCase() + a.slice(1)
                            ).join(', ')}
                          </div>
                        )}

                        <div className="activity-quick-info">
                          <span className="quick-info-item">📅 {activity.frequency}</span>
                          <span className="quick-info-item">💰 {localPrice}</span>
                        </div>

                        <div className="activity-benefits-compact">
                          <strong>Key Benefits:</strong>
                          <ul>
                            {activity.benefits.slice(0, 2).map((benefit, idx) => (
                              <li key={idx}>{benefit}</li>
                            ))}
                          </ul>
                        </div>

                        {activity.venues && activity.venues.length > 0 && (
                          <div className="venues-section-compact">
                            <strong>📍 {activity.venues.length} Nearby Venue{activity.venues.length !== 1 ? 's' : ''}</strong>
                            <div className="venues-list-compact">
                              {activity.venues.slice(0, 2).map((venue) => (
                                <div key={venue.placeId} className="venue-card-compact">
                                  <div className="venue-info">
                                    <span className="venue-name">{venue.name}</span>
                                    {venue.rating && (
                                      <span className="venue-rating-compact">
                                        ⭐ {venue.rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                  {venue.distance && (
                                    <span className="venue-distance-compact">{venue.distance}</span>
                                  )}
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="venue-directions-btn"
                                  >
                                    Get Directions
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="step-actions">
        <button
          className="action-btn secondary"
          onClick={() => onFinish()}
        >
          Back to Dashboard
        </button>
        <button
          className="action-btn primary download"
          onClick={handleDownloadWithRecommendations}
        >
          📄 Download Full Report (PDF)
        </button>
        <button
          className="action-btn primary"
          onClick={() => onFinish(studentId)}
        >
          View Full Profile
        </button>
      </div>
    </div>
  )
}
