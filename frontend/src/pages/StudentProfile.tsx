import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Student, Report, Analysis, ActivityRecommendation } from '../types'
import { fetchStudent, fetchStudentReports, fetchStudentAnalysis, deleteReport, fetchActivityRecommendations, LocationParams, getLocationAutocomplete, LocationSuggestion } from '../services/api'
import './StudentProfile.css'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<LocationParams | null>(null)
  const [manualLocation, setManualLocation] = useState('')
  const [locationError, setLocationError] = useState('')
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      loadStudentData(id)
    }
  }, [id])

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
    }, 300) // 300ms debounce

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
        await loadRecommendations(latestReport._id)
      }
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async (reportId: string) => {
    try {
      const recommendationsData = await fetchActivityRecommendations(reportId, userLocation || undefined)
      setRecommendations(recommendationsData)
    } catch (error) {
      console.error('Error loading activity recommendations:', error)
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
      async (position) => {
        const location: LocationParams = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        setIsLoadingLocation(false)

        // Reload recommendations with location
        if (reports.length > 0) {
          const latestReport = reports[reports.length - 1]
          try {
            const recommendationsData = await fetchActivityRecommendations(latestReport._id, location)
            setRecommendations(recommendationsData)
          } catch (error) {
            console.error('Error loading recommendations with location:', error)
          }
        }
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

    // Reload recommendations with location
    if (reports.length > 0) {
      const latestReport = reports[reports.length - 1]
      try {
        const recommendationsData = await fetchActivityRecommendations(latestReport._id, location)
        setRecommendations(recommendationsData)
      } catch (error) {
        console.error('Error loading recommendations with location:', error)
        setLocationError('Failed to find venues for this location. Please try a different city.')
      }
    }
  }

  const handleClearLocation = async () => {
    setUserLocation(null)
    setManualLocation('')
    setLocationError('')

    // Reload recommendations without location
    if (reports.length > 0) {
      const latestReport = reports[reports.length - 1]
      await loadRecommendations(latestReport._id)
    }
  }

  const handleSelectSuggestion = async (suggestion: LocationSuggestion) => {
    setManualLocation(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setLocationError('')

    const location: LocationParams = { city: suggestion.description }
    setUserLocation(location)

    // Reload recommendations with location
    if (reports.length > 0) {
      const latestReport = reports[reports.length - 1]
      try {
        const recommendationsData = await fetchActivityRecommendations(latestReport._id, location)
        setRecommendations(recommendationsData)
      } catch (error) {
        console.error('Error loading recommendations with location:', error)
        setLocationError('Failed to find venues for this location. Please try a different city.')
      }
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
        <>
          <div className="location-section">
            <div className="section-header">
              <h2>Find Nearby Venues</h2>
              <p className="section-subtitle">Get personalized venue recommendations based on your location</p>
            </div>

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

                  {activity.venues && activity.venues.length > 0 && (
                    <div className="venues-section">
                      <strong>Nearby Venues ({activity.venues.length}):</strong>
                      <div className="venues-list">
                        {activity.venues.slice(0, 3).map((venue, idx) => (
                          <div key={venue.placeId} className="venue-card">
                            <div className="venue-header">
                              <h4>{venue.name}</h4>
                              {venue.rating && (
                                <span className="venue-rating">
                                  ⭐ {venue.rating.toFixed(1)}
                                  {venue.totalRatings && ` (${venue.totalRatings})`}
                                </span>
                              )}
                            </div>
                            <p className="venue-address">{venue.address}</p>
                            {venue.distance && (
                              <p className="venue-distance">📍 {venue.distance} away</p>
                            )}
                            <div className="venue-actions">
                              {venue.phone && (
                                <a href={`tel:${venue.phone}`} className="venue-link">
                                  📞 Call
                                </a>
                              )}
                              {venue.website && (
                                <a href={venue.website} target="_blank" rel="noopener noreferrer" className="venue-link">
                                  🌐 Website
                                </a>
                              )}
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="venue-link primary"
                              >
                                🗺️ Directions
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
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
