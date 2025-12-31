import { useState } from 'react'
import { ActivityRecommendation, CurrentActivityEvaluation } from '../../types'
import './RecommendationView.css'

interface RecommendationViewProps {
  recommendations: ActivityRecommendation[]
  activityEvaluations: CurrentActivityEvaluation[]
  loading: boolean
  error: string | null
}

interface ExpandedState {
  [key: string]: boolean
}

export default function RecommendationView({
  recommendations,
  activityEvaluations,
  loading,
  error
}: RecommendationViewProps) {
  const [expandedEvaluations, setExpandedEvaluations] = useState<ExpandedState>({})
  const [expandedActivities, setExpandedActivities] = useState<ExpandedState>({})

  const toggleEvaluation = (index: number) => {
    setExpandedEvaluations(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const toggleActivity = (id: string) => {
    setExpandedActivities(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div className="recommendation-loading">
        <div className="loading-spinner"></div>
        <p>Generating personalized recommendations...</p>
        <p className="loading-subtext">This may take a few moments</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="recommendation-error">
        <h3>Unable to Load Recommendations</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (recommendations.length === 0 && activityEvaluations.length === 0) {
    return (
      <div className="recommendation-empty">
        <h3>No Recommendations Available</h3>
        <p>Unable to generate recommendations at this time. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="recommendation-view">
      <h2>Activity Recommendations</h2>
      <p className="step-description">
        Personalized recommendations based on your child's learning profile
      </p>

      {/* Current Activity Evaluations */}
      {activityEvaluations.length > 0 && (
        <div className="evaluations-section">
          <div className="section-header">
            <h3>Current Activities Evaluation</h3>
            <p className="section-subtitle">
              Assessment of your child's current activities
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
        <div className="recommendations-section">
          <div className="section-header">
            <h3>New Activity Recommendations</h3>
            <p className="section-subtitle">
              Activities to help your child develop targeted skills
            </p>
          </div>
          <div className="recommendations-grid">
            {recommendations.map((activity) => {
              const isExpanded = expandedActivities[activity.id]
              // Parse price range for local currency conversion
              const priceMatch = activity.estimatedCost.match(/\$(\d+)-(\d+)/)
              const localPrice = priceMatch
                ? `₹${Math.round(parseInt(priceMatch[1]) * 83)}-${Math.round(parseInt(priceMatch[2]) * 83)}/month`
                : activity.estimatedCost

              // Generate recommendation reasoning
              let recommendationReason = ''
              if (activity.recommendationType === 'improvement') {
                recommendationReason = `Recommended to improve ${activity.targetedAttributes?.join(', ') || 'key skills'}`
              } else if (activity.recommendationType === 'strength') {
                recommendationReason = `Recommended to build on your child's strength in ${activity.targetedAttributes?.join(', ') || 'this area'}`
              } else if (activity.recommendationType === 'age-based') {
                recommendationReason = `Age-appropriate activity for your child's developmental stage`
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
                      <span className="quick-info-item">💰 {localPrice}</span>
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
