import { useState, useEffect } from 'react'
import { Student, Report, ActivityRecommendation, CurrentActivityEvaluation, CurrentActivity, ParentAction } from '../../types'
import { fetchActivityRecommendations, fetchCurrentActivities, LocationParams } from '../../services/api'
import './RecommendationsTab.css'

interface Props {
  student: Student
  latestReport: Report | null
}

export default function RecommendationsTab({ student, latestReport }: Props) {
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [parentActions, setParentActions] = useState<ParentAction[]>([])
  const [activityEvaluations, setActivityEvaluations] = useState<CurrentActivityEvaluation[]>([])
  const [currentActivities, setCurrentActivities] = useState<CurrentActivity[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [error, setError] = useState('')

  // Load current activities on mount
  useEffect(() => {
    loadCurrentActivities()
  }, [student._id])

  const loadCurrentActivities = async () => {
    try {
      const activities = await fetchCurrentActivities(student._id)
      setCurrentActivities(activities)
    } catch (error) {
      console.error('Error loading current activities:', error)
    }
  }

  const handleRecommendActivities = async () => {
    if (!latestReport) {
      setError('No reports available to generate recommendations')
      return
    }

    setIsLoadingRecommendations(true)
    setError('')

    try {
      // Get active activities
      const activityNames = currentActivities
        .filter(a => a.isActive)
        .map(a => a.activityName)

      // Get student's saved location
      let userLocation: LocationParams | undefined = undefined
      if (student.location && (student.location.city || student.location.address)) {
        userLocation = {
          city: student.location.city,
          address: student.location.address,
          lat: student.location.latitude,
          lng: student.location.longitude
        }
      }

      const response = await fetchActivityRecommendations(
        latestReport._id,
        userLocation,
        activityNames
      )

      setRecommendations(response.recommendations)
      setParentActions(response.parentActions || [])
      if (response.currentActivityEvaluations) {
        setActivityEvaluations(response.currentActivityEvaluations)
      }
    } catch (error) {
      console.error('Error loading activity recommendations:', error)
      setError('Failed to load recommendations. Please try again.')
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const activeActivityCount = currentActivities.filter(a => a.isActive).length

  return (
    <div className="recommendations-tab">
      <div className="tab-intro">
        <h2>🌟 Activity Recommendations</h2>
        <p className="section-subtitle">
          Get personalized activity recommendations based on {student.name}'s latest report
        </p>
      </div>

      {!latestReport ? (
        <div className="no-report-notice">
          <p>📄 No reports available yet.</p>
          <p className="notice-hint">Upload a report in the Reports tab to get personalized activity recommendations.</p>
        </div>
      ) : (
        <>
          {/* Info Summary */}
          <div className="recommendation-info-summary">
            <div className="info-item">
              <span className="info-icon">📝</span>
              <div className="info-content">
                <strong>Current Activities:</strong>
                <p>{activeActivityCount > 0 ? `${activeActivityCount} active ${activeActivityCount === 1 ? 'activity' : 'activities'}` : 'None'}</p>
              </div>
            </div>
            <div className="info-item">
              <span className="info-icon">📍</span>
              <div className="info-content">
                <strong>Location:</strong>
                <p>{student.location?.city || student.location?.address || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="info-note">
            {activeActivityCount === 0 && (
              <p className="hint-text">💡 Add activities in the "Current Activities" tab to get evaluations</p>
            )}
            {!student.location?.city && !student.location?.address && (
              <p className="hint-text">💡 Set location in the Dashboard to get nearby venue recommendations</p>
            )}
          </div>

          {/* Recommend Button */}
          <div className="recommend-btn-container">
            <button
              className="recommend-activities-btn"
              onClick={handleRecommendActivities}
              disabled={isLoadingRecommendations}
            >
              {isLoadingRecommendations ? '🔄 Generating Recommendations...' : '✨ Get Recommendations'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Current Activity Evaluations */}
          {activityEvaluations.length > 0 && (
            <div className="evaluations-section">
              <div className="section-header">
                <h3>📊 Current Activities Evaluation</h3>
                <p className="section-subtitle-small">
                  Assessment of {student.name}'s current activities based on their learning profile
                </p>
              </div>
              <div className="evaluations-grid">
                {activityEvaluations.map((evaluation, index) => (
                  <div key={index} className={`evaluation-card recommendation-${evaluation.recommendation}`}>
                    <div className="evaluation-header">
                      <h4>{evaluation.activityName}</h4>
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
              <div className="section-header">
                <h3>🎯 New Activity Recommendations</h3>
                <p className="section-subtitle-small">
                  {student.location?.city || student.location?.address
                    ? 'Personalized recommendations with nearby venues'
                    : 'Personalized recommendations based on latest report'}
                </p>
              </div>
              <div className="recommendations-grid">
                {recommendations.map((activity) => (
                  <div key={activity.id} className={`activity-card priority-${activity.priority.toLowerCase()}`}>
                    <div className="activity-header">
                      <div className="activity-title-section">
                        <h4>{activity.name}</h4>
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
                      <span className="quick-info-item">💰 {activity.estimatedCost}</span>
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
                ))}
              </div>
            </div>
          )}

          {/* Actions for Parents Section */}
          {parentActions.length > 0 && (
            <div className="parent-actions-section">
              <div className="section-header">
                <h3>👨‍👩‍👧‍👦 Actions for Parents</h3>
                <p className="section-subtitle-small">
                  Simple, home-based activities you can do with {student.name} to support their growth
                </p>
              </div>
              <div className="parent-actions-grid">
                {parentActions.map((action, index) => (
                  <div key={index} className={`parent-action-card priority-${action.priority.toLowerCase()} category-${action.category}`}>
                    <div className="action-header">
                      <div className="action-title-section">
                        <h4>{action.title}</h4>
                        <div className="action-badges">
                          {action.category === 'improvement' && (
                            <span className="action-badge improvement">
                              📈 Area to Improve
                            </span>
                          )}
                          {action.category === 'strength-maintenance' && (
                            <span className="action-badge strength">
                              ⭐ Maintain Strength
                            </span>
                          )}
                          <span className={`priority-badge priority-${action.priority.toLowerCase()}`}>
                            {action.priority}
                          </span>
                        </div>
                      </div>
                      <div className="target-area">
                        <strong>Target:</strong> {action.targetArea}
                      </div>
                    </div>

                    <p className="action-description">{action.description}</p>

                    <div className="activities-list">
                      <h5>Activities:</h5>
                      {action.activities.map((activity, actIdx) => (
                        <div key={actIdx} className="activity-detail">
                          <div className="activity-name-bar">
                            <span className="activity-icon">🎯</span>
                            <strong>{activity.activity}</strong>
                          </div>
                          <div className="activity-meta">
                            <span className="meta-item">
                              <span className="meta-label">⏰ Frequency:</span> {activity.frequency}
                            </span>
                            <span className="meta-item">
                              <span className="meta-label">⏱️ Duration:</span> {activity.duration}
                            </span>
                          </div>
                          <div className="activity-tips">
                            <strong>💡 Tips:</strong>
                            <ul>
                              {activity.tips.map((tip, tipIdx) => (
                                <li key={tipIdx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="action-outcomes">
                      <div className="outcome-item">
                        <strong>🎯 Expected Outcome:</strong>
                        <p>{action.expectedOutcome}</p>
                      </div>
                      <div className="outcome-item">
                        <strong>⏳ Time to See Results:</strong>
                        <p>{action.timeToSeeResults}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
