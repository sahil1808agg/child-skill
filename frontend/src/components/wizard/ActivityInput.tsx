import { useState, useEffect, useRef } from 'react'
import { LocationParams, getLocationAutocomplete, LocationSuggestion } from '../../services/api'
import './ActivityInput.css'

interface ActivityInputProps {
  currentActivities: string[]
  onActivitiesChange: (activities: string[]) => void
  location: LocationParams | null
  onLocationChange: (location: LocationParams | null) => void
}

export default function ActivityInput({
  currentActivities,
  onActivitiesChange,
  location,
  onLocationChange
}: ActivityInputProps) {
  const [activityInput, setActivityInput] = useState('')
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
      if (manualLocation.trim().length >= 2 && !location) {
        setIsLoadingSuggestions(true)
        const results = await getLocationAutocomplete(manualLocation)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsLoadingSuggestions(false)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [manualLocation, location])

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

  const handleAddActivity = () => {
    const activity = activityInput.trim()
    if (activity && !currentActivities.includes(activity)) {
      onActivitiesChange([...currentActivities, activity])
      setActivityInput('')
    }
  }

  const handleRemoveActivity = (activity: string) => {
    onActivitiesChange(currentActivities.filter(a => a !== activity))
  }

  const handleActivityKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddActivity()
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
        const locationData: LocationParams = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        onLocationChange(locationData)
        setIsLoadingLocation(false)
      },
      (error) => {
        setIsLoadingLocation(false)
        setLocationError('Unable to retrieve your location. Please enter manually.')
        console.error('Geolocation error:', error)
      }
    )
  }

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualLocation.trim()) {
      setLocationError('Please enter a city or address')
      return
    }

    setLocationError('')
    const locationData: LocationParams = { city: manualLocation.trim() }
    onLocationChange(locationData)
  }

  const handleClearLocation = () => {
    onLocationChange(null)
    setManualLocation('')
    setLocationError('')
  }

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setManualLocation(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setLocationError('')

    const locationData: LocationParams = { city: suggestion.description }
    onLocationChange(locationData)
  }

  return (
    <div className="activity-input-container">
      <h2>Additional Details (Optional)</h2>
      <p className="step-description">
        Provide current activities and location to get more personalized recommendations
      </p>

      {/* Current Activities Section */}
      <div className="current-activities-section">
        <h3>Current Activities</h3>
        <p className="section-subtitle">
          List activities your child is currently engaged in to get recommendations on whether to continue them
        </p>

        <div className="current-activities-input">
          <input
            type="text"
            placeholder="e.g., Swimming lessons, Piano classes, Soccer"
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            onKeyPress={handleActivityKeyPress}
            className="activity-input"
          />
          <button
            onClick={handleAddActivity}
            className="add-activity-btn"
            disabled={!activityInput.trim()}
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
                  onClick={() => handleRemoveActivity(activity)}
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

      {/* Location Section */}
      <div className="location-section">
        <h3>Location</h3>
        <p className="section-subtitle">
          Set your location to include nearby venues in recommendations
        </p>

        <div className="location-controls">
          {!location ? (
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
                ✓ Location set: {location.city || `${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}`}
              </span>
              <button className="location-btn clear" onClick={handleClearLocation}>
                Clear Location
              </button>
            </div>
          )}

          {locationError && <div className="location-error">{locationError}</div>}
        </div>
      </div>

      <div className="optional-notice">
        <p>Both activities and location are optional. You can skip this step and still get recommendations based on the report.</p>
      </div>
    </div>
  )
}
