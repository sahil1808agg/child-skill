import { useState, useEffect, useRef } from 'react'
import { Student, Report, ActivityRecommendation, CurrentActivityEvaluation } from '../../types'
import { fetchActivityRecommendations, LocationParams, getLocationAutocomplete, LocationSuggestion } from '../../services/api'
import './ActivitiesTab.css'

interface Props {
  student: Student
  latestReport: Report | null
}

export default function ActivitiesTab({ student, latestReport }: Props) {
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [currentActivities, setCurrentActivities] = useState<string[]>([])
  const [currentActivityInput, setCurrentActivityInput] = useState('')
  const [activityEvaluations, setActivityEvaluations] = useState<CurrentActivityEvaluation[]>([])
  const [userLocation, setUserLocation] = useState<LocationParams | null>(null)
  const [manualLocation, setManualLocation] = useState('')
  const [locationError, setLocationError] = useState('')
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (manualLocation.trim().length >= 2 && !userLocation) {
        setIsLoadingSuggestions(true)
        const results = await getLocationAutocomplete(manualLocation)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsLoadingSuggestions(false)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [manualLocation, userLocation])

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddCurrentActivity = () => {
    const activity = currentActivityInput.trim()
    if (activity && !currentActivities.includes(activity)) {
      setCurrentActivities([...currentActivities, activity])
      setCurrentActivityInput('')
    }
  }

  const handleRemoveCurrentActivity = (activity: string) => {
    setCurrentActivities(currentActivities.filter(a => a !== activity))
  }

  const handleCurrentActivityKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCurrentActivity()
    }
  }

  const handleRecommendActivities = async () => {
    if (!latestReport) {
      setLocationError('No reports available to generate recommendations')
      return
    }

    setIsLoadingLocation(true)
    setLocationError('')

    try {
      const response = await fetchActivityRecommendations(
        latestReport._id,
        userLocation || undefined,
        currentActivities
      )
      setRecommendations(response.recommendations)
      if (response.currentActivityEvaluations) {
        setActivityEvaluations(response.currentActivityEvaluations)
      }
    } catch (error) {
      console.error('Error loading activity recommendations:', error)
      setLocationError('Failed to load recommendations. Please try again.')
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLoadingLocation(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationParams = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        setIsLoadingLocation(false)
      },
      (error) => {
        setIsLoadingLocation(false)
        setLocationError('Unable to retrieve your location. Please enter manually.')
        console.error('Geolocation error:', error)
      }
    )
  }

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualLocation.trim()) {
      setLocationError('Please enter a city or address')
      return
    }

    setLocationError('')
    const location: LocationParams = { city: manualLocation.trim() }
    setUserLocation(location)
  }

  const handleClearLocation = () => {
    setUserLocation(null)
    setManualLocation('')
    setLocationError('')
    setRecommendations([])
    setActivityEvaluations([])
  }

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setManualLocation(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setLocationError('')

    const location: LocationParams = { city: suggestion.description }
    setUserLocation(location)
  }

  return (
    <div className="activities-tab">
      <div className="tab-intro">
        <h2>🎯 Activity Recommendations</h2>
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
          {/* Location Section */}
          <div className="location-section">
            <h3>📍 Set Your Location</h3>
            <p className="section-subtitle-small">Find nearby venues for recommended activities</p>

            <div className="location-controls">
              {!userLocation ? (
                <>
                  <button
                    className="location-btn primary"
                    onClick={handleGetCurrentLocation}
                    disabled={isLoadingLocation}
                  >
                    {isLoadingLocation ? 'Getting location...' : '📍 Use My Current Location'}
                  </button>

                  <div className="location-divider">
                    <span>or</span>
                  </div>

                  <form className="manual-location-form" onSubmit={handleManualLocationSubmit}>
                    <div className="autocomplete-container" ref={suggestionsRef}>
                      <input
                        type="text"
                        placeholder="Enter city or address (e.g., Delhi, Mumbai)"
                        value={manualLocation}
                        onChange={(e) => setManualLocation(e.target.value)}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true)
                          }
                        }}
                        className="location-input"
                        autoComplete="off"
                      />
                      {isLoadingSuggestions && (
                        <div className="autocomplete-loading">Searching...</div>
                      )}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="autocomplete-suggestions">
                          {suggestions.map((suggestion) => (
                            <div
                              key={suggestion.placeId}
                              className="autocomplete-suggestion"
                              onClick={() => handleSelectSuggestion(suggestion)}
                            >
                              <div className="suggestion-main">{suggestion.mainText}</div>
                              <div className="suggestion-secondary">{suggestion.secondaryText}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="submit" className="location-btn secondary">
                      Find Venues
                    </button>
                  </form>
                </>
              ) : (
                <div className="location-active">
                  <span className="location-status">
                    ✓ Location set: {userLocation.city || `${userLocation.lat?.toFixed(4)}, ${userLocation.lng?.toFixed(4)}`}
                  </span>
                  <button className="location-btn clear" onClick={handleClearLocation}>
                    Clear Location
                  </button>
                </div>
              )}

              {locationError && <div className="location-error">{locationError}</div>}
            </div>
          </div>

          {/* Current Activities Section */}
          <div className="current-activities-section">
            <h3>📝 Current Activities (Optional)</h3>
            <p className="section-subtitle-small">
              List activities {student.name} is currently engaged in to get recommendations on whether to continue them
            </p>

            <div className="current-activities-input">
              <input
                type="text"
                placeholder="e.g., Swimming lessons, Piano classes, Soccer"
                value={currentActivityInput}
                onChange={(e) => setCurrentActivityInput(e.target.value)}
                onKeyPress={handleCurrentActivityKeyPress}
                className="activity-input"
              />
              <button
                onClick={handleAddCurrentActivity}
                className="add-activity-btn"
                disabled={!currentActivityInput.trim()}
              >
                Add Activity
              </button>
            </div>

            {currentActivities.length > 0 && (
              <div className="current-activities-list">
                {currentActivities.map((activity, index) => (
                  <div key={index} className="activity-tag">
                    <span>{activity}</span>
                    <button
                      onClick={() => handleRemoveCurrentActivity(activity)}
                      className="remove-activity-btn"
                      title="Remove activity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommend Button */}
          <div className="recommend-btn-container">
            <button
              className="recommend-activities-btn"
              onClick={handleRecommendActivities}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? '🔄 Generating Recommendations...' : '✨ Recommend Activities'}
            </button>
            <p className="recommend-hint">
              {userLocation
                ? 'Get personalized activity recommendations with nearby venues'
                : 'Set your location above to include nearby venues in recommendations'}
            </p>
          </div>

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
            <div className="recommendations-section">
              <div className="section-header">
                <h3>🌟 New Activity Recommendations</h3>
                <p className="section-subtitle-small">
                  {userLocation
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
        </>
      )}
    </div>
  )
}
