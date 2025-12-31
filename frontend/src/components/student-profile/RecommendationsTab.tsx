import { useState, useEffect } from 'react'
import { Student, Report, ActivityRecommendation, CurrentActivityEvaluation, CurrentActivity, ParentAction } from '../../types'
import { fetchActivityRecommendations, fetchCurrentActivities, LocationParams } from '../../services/api'
import './RecommendationsTab.css'

interface Props {
  student: Student
  latestReport: Report | null
}

interface ExpandedState {
  [key: string]: boolean
}

export default function RecommendationsTab({ student, latestReport }: Props) {
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [parentActions, setParentActions] = useState<ParentAction[]>([])
  const [activityEvaluations, setActivityEvaluations] = useState<CurrentActivityEvaluation[]>([])
  const [currentActivities, setCurrentActivities] = useState<CurrentActivity[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [error, setError] = useState('')
  const [expandedActivities, setExpandedActivities] = useState<ExpandedState>({})
  const [expandedParentActions, setExpandedParentActions] = useState<ExpandedState>({})
  const [expandedEvaluations, setExpandedEvaluations] = useState<ExpandedState>({})

  const toggleActivity = (id: string) => {
    setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleParentAction = (index: number) => {
    setExpandedParentActions(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const toggleEvaluation = (index: number) => {
    setExpandedEvaluations(prev => ({ ...prev, [index]: !prev[index] }))
  }

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
                  Assessment of {student.name}'s current activities
                </p>
              </div>
              <div className="evaluations-grid">
                {activityEvaluations.map((evaluation, index) => {
                  const isExpanded = expandedEvaluations[index]
                  return (
                    <div key={index} className={`evaluation-card-compact recommendation-${evaluation.recommendation}`}>
                      <div className="card-compact-header" onClick={() => toggleEvaluation(index)}>
                        <div className="card-title-row">
                          <h4>{evaluation.activityName}</h4>
                          <button className="expand-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                            {isExpanded ? '−' : '+'}
                          </button>
                        </div>
                        <div className="card-summary">
                          <span className={`evaluation-badge ${evaluation.recommendation}`}>
                            {evaluation.recommendation === 'continue' && '✓ Continue'}
                            {evaluation.recommendation === 'reconsider' && '⚠ Reconsider'}
                            {evaluation.recommendation === 'stop' && '✕ Stop'}
                          </span>
                          <div className="alignment-summary">
                            <div className="alignment-bar-mini">
                              <div className="alignment-fill" style={{ width: `${evaluation.alignment}%` }} />
                            </div>
                            <span className="alignment-score-mini">{evaluation.alignment}%</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="card-expanded-content">
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
                      )}
                    </div>
                  )
                })}
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
                    : 'Personalized recommendations'}
                </p>
              </div>
              <div className="recommendations-grid">
                {recommendations.map((activity) => {
                  const isExpanded = expandedActivities[activity.id]

                  // Generate recommendation reasoning
                  let recommendationReason = ''
                  if (activity.recommendationType === 'improvement') {
                    recommendationReason = `Recommended to improve ${activity.targetedAttributes?.join(', ') || 'key skills'}`
                  } else if (activity.recommendationType === 'strength') {
                    recommendationReason = `Recommended to build on ${student.name}'s strength in ${activity.targetedAttributes?.join(', ') || 'this area'}`
                  } else if (activity.recommendationType === 'age-based') {
                    recommendationReason = `Age-appropriate activity for ${student.name}'s developmental stage`
                  }

                  return (
                    <div key={activity.id} className={`activity-card-compact priority-${activity.priority.toLowerCase()}`}>
                      <div className="card-compact-header" onClick={() => toggleActivity(activity.id)}>
                        <div className="card-title-row">
                          <div className="title-with-badges">
                            <h4>{activity.name}</h4>
                            {activity.recommendationType === 'improvement' && (
                              <span className="rec-type-badge improvement">🎯 Improvement</span>
                            )}
                            {activity.recommendationType === 'strength' && (
                              <span className="rec-type-badge strength">⭐ Strength</span>
                            )}
                            {activity.recommendationType === 'age-based' && (
                              <span className="rec-type-badge age-based">👶 Age-Based</span>
                            )}
                          </div>
                          <button className="expand-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                            {isExpanded ? '−' : '+'}
                          </button>
                        </div>
                        {recommendationReason && (
                          <div className="recommendation-reason">
                            {recommendationReason}
                          </div>
                        )}
                        <div className="card-summary">
                          <span className="quick-info-item">📅 {activity.frequency}</span>
                          <span className="quick-info-item">💰 {activity.estimatedCost}</span>
                          {activity.venues && activity.venues.length > 0 && (
                            <span className="quick-info-item">📍 {activity.venues.length} venue{activity.venues.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="card-expanded-content">
                          {activity.targetedAttributes && activity.targetedAttributes.length > 0 && (
                            <div className="targeted-attributes">
                              <strong>Focuses on:</strong> {activity.targetedAttributes.map(a =>
                                a.charAt(0).toUpperCase() + a.slice(1)
                              ).join(', ')}
                            </div>
                          )}
                          <div className="activity-benefits">
                            <strong>Benefits:</strong>
                            <ul>
                              {activity.benefits.map((benefit, idx) => (
                                <li key={idx}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                          {activity.venues && activity.venues.length > 0 && (
                            <div className="venues-section">
                              <strong>📍 Nearby Venues:</strong>
                              <div className="venues-list">
                                {activity.venues.map((venue) => (
                                  <div key={venue.placeId} className="venue-card">
                                    <div className="venue-header">
                                      <span className="venue-name">{venue.name}</span>
                                      {venue.rating && (
                                        <span className="venue-rating">⭐ {venue.rating.toFixed(1)}</span>
                                      )}
                                    </div>
                                    {venue.distance && (
                                      <span className="venue-distance">{venue.distance}</span>
                                    )}
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="venue-directions-btn"
                                    >
                                      Directions →
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Product Recommendations */}
                          {activity.products && activity.products.length > 0 && (
                            <div className="products-section">
                              <strong>🛒 Recommended Products:</strong>
                              <div className="products-list">
                                {activity.products.map((product) => (
                                  <div key={product.id} className="product-card">
                                    <div className="product-header">
                                      <span className="product-name">{product.name}</span>
                                      <span className={`product-source ${product.source}`}>
                                        {product.source === 'amazon' ? '📦 Amazon' : '🛍️ Flipkart'}
                                      </span>
                                    </div>
                                    <div className="product-details">
                                      <span className="product-price">{product.price}</span>
                                      {product.rating && (
                                        <span className="product-rating">
                                          ⭐ {product.rating.toFixed(1)} ({product.reviewCount})
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={product.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="product-buy-btn"
                                    >
                                      View on {product.source === 'amazon' ? 'Amazon' : 'Flipkart'} →
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions for Parents Section */}
          {parentActions.length > 0 && (
            <div className="parent-actions-section">
              <div className="section-header">
                <h3>👨‍👩‍👧‍👦 Actions for Parents</h3>
                <p className="section-subtitle-small">
                  Simple home activities to support {student.name}'s growth
                </p>
              </div>

              {parentActions.map((action, index) => {
                const isExpanded = expandedParentActions[index]
                return (
                  <div key={index} className={`parent-action-table-wrapper priority-${action.priority.toLowerCase()}`}>
                    {/* Header with Title and Priority */}
                    <div className="parent-action-header">
                      <div className="header-left">
                        <h4>{action.title}</h4>
                        <span className={`priority-badge-table priority-${action.priority.toLowerCase()}`}>
                          {action.priority} Priority
                        </span>
                      </div>
                      <button
                        className="expand-btn-table"
                        onClick={() => toggleParentAction(index)}
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? 'Hide Details −' : 'Show Details +'}
                      </button>
                    </div>

                    {/* Key Benefit Banner */}
                    <div className="benefit-banner">
                      <span className="benefit-label">Expected Outcome:</span>
                      <strong>{action.expectedOutcome}</strong>
                      <span className="timeline-badge">⏳ {action.timeToSeeResults}</span>
                    </div>

                    {/* Activities Table */}
                    <div className="parent-actions-table-container">
                      <table className="parent-actions-table">
                        <thead>
                          <tr>
                            <th className="col-activity">Activity</th>
                            <th className="col-frequency">Frequency</th>
                            <th className="col-duration">Duration</th>
                            <th className="col-actions">How-To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {action.activities.map((activity, actIdx) => (
                            <tr key={actIdx}>
                              <td className="col-activity">
                                <strong>{actIdx + 1}. {activity.activity}</strong>
                              </td>
                              <td className="col-frequency">
                                <span className="frequency-badge">{activity.frequency}</span>
                              </td>
                              <td className="col-duration">
                                <span className="duration-badge">{activity.duration}</span>
                              </td>
                              <td className="col-actions">
                                {activity.tips && activity.tips.length > 0 && (
                                  <button
                                    className="tips-toggle-btn"
                                    onClick={() => {
                                      const key = `${index}-${actIdx}`
                                      setExpandedParentActions(prev => ({
                                        ...prev,
                                        [key]: !prev[key]
                                      }))
                                    }}
                                  >
                                    {expandedParentActions[`${index}-${actIdx}`] ? '✓ Tips' : 'View Tips'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tips sections (shown when toggled) */}
                    {action.activities.map((activity, actIdx) => {
                      const key = `${index}-${actIdx}`
                      return expandedParentActions[key] && activity.tips && activity.tips.length > 0 ? (
                        <div key={key} className="tips-expanded">
                          <strong>💡 Tips for {activity.activity}:</strong>
                          <ul>
                            {activity.tips.map((tip, tipIdx) => (
                              <li key={tipIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    })}

                    {/* Expandable Description */}
                    {isExpanded && (
                      <div className="action-description-expanded">
                        <strong>Why This Matters:</strong>
                        <p>{action.description}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
