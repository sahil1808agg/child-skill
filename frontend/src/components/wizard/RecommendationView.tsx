import { ActivityRecommendation, CurrentActivityEvaluation } from '../../types'
import './RecommendationView.css'

interface RecommendationViewProps {
  recommendations: ActivityRecommendation[]
  activityEvaluations: CurrentActivityEvaluation[]
  loading: boolean
  error: string | null
}

export default function RecommendationView({
  recommendations,
  activityEvaluations,
  loading,
  error
}: RecommendationViewProps) {
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
              Assessment of your child's current activities based on their learning profile
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
        <div className="recommendations-section">
          <div className="section-header">
            <h3>New Activity Recommendations</h3>
            <p className="section-subtitle">
              Activities to help your child develop targeted skills and attributes
            </p>
          </div>
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
    </div>
  )
}
