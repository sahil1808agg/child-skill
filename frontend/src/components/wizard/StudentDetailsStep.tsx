import { useState, useEffect, useRef } from 'react'
import { Student, LocationParams, LocationSuggestion } from '../../types'
import { fetchStudents, getLocationAutocomplete } from '../../services/api'
import './StudentDetailsStep.css'

interface StudentDetailsStepProps {
  onComplete: (student: Student | { name: string; dateOfBirth: string }, activities: string[], location: LocationParams | null) => void
  initialStudent?: Student | { name: string; dateOfBirth: string }
  initialActivities?: string[]
  initialLocation?: LocationParams | null
}

export default function StudentDetailsStep({
  onComplete,
  initialStudent,
  initialActivities = [],
  initialLocation = null
}: StudentDetailsStepProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent && '_id' in initialStudent ? initialStudent : null)
  const [showNewStudentForm, setShowNewStudentForm] = useState(false)
  const [newStudentName, setNewStudentName] = useState(initialStudent && !('_id' in initialStudent) ? initialStudent.name : '')
  const [newStudentDOB, setNewStudentDOB] = useState(initialStudent && !('_id' in initialStudent) ? initialStudent.dateOfBirth : '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Activities state
  const [currentActivities, setCurrentActivities] = useState<string[]>(initialActivities)
  const [activityInput, setActivityInput] = useState('')

  // Location state
  const [userLocation, setUserLocation] = useState<LocationParams | null>(initialLocation)
  const [manualLocation, setManualLocation] = useState('')
  const [locationError, setLocationError] = useState('')
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStudents()
  }, [])

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

  const loadStudents = async () => {
    try {
      const studentList = await fetchStudents()
      setStudents(studentList)
    } catch (error) {
      console.error('Error loading students:', error)
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowNewStudentForm(false)
    setNewStudentName('')
    setNewStudentDOB('')
    setError('')
  }

  const handleShowNewStudentForm = () => {
    setShowNewStudentForm(true)
    setSelectedStudent(null)
    setError('')
  }

  const handleCancelNewStudent = () => {
    setShowNewStudentForm(false)
    setNewStudentName('')
    setNewStudentDOB('')
  }

  // Activity handlers
  const handleAddActivity = () => {
    const activity = activityInput.trim()
    if (activity && !currentActivities.includes(activity)) {
      setCurrentActivities([...currentActivities, activity])
      setActivityInput('')
    }
  }

  const handleRemoveActivity = (activity: string) => {
    setCurrentActivities(currentActivities.filter(a => a !== activity))
  }

  const handleActivityKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddActivity()
    }
  }

  // Location handlers
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
        setUserLocation(locationData)
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
    setUserLocation(locationData)
  }

  const handleClearLocation = () => {
    setUserLocation(null)
    setManualLocation('')
    setLocationError('')
  }

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setManualLocation(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    setLocationError('')

    const locationData: LocationParams = { city: suggestion.description }
    setUserLocation(locationData)
  }

  const handleContinue = () => {
    const hasStudent = selectedStudent !== null || (newStudentName && newStudentDOB)

    if (!hasStudent) {
      setError('Please select a student or create a new one')
      return
    }

    const studentData = selectedStudent || { name: newStudentName, dateOfBirth: newStudentDOB }
    onComplete(studentData, currentActivities, userLocation)
  }

  if (loading) {
    return <div className="student-details-loading">Loading students...</div>
  }

  return (
    <div className="student-details-step">
      <h2>Student Details</h2>
      <p className="step-description">Select or create a student and provide their current activities and location</p>

      {/* Student Selection Section */}
      <div className="student-selection-section">
        <h3>Select Student</h3>

        {!showNewStudentForm && students.length > 0 && (
          <div className="student-table-section">
            <div className="student-table">
              <div className="student-table-header">
                <div className="col-select"></div>
                <div className="col-name">Name</div>
                <div className="col-grade">Grade</div>
                <div className="col-dob">Date of Birth</div>
                <div className="col-reports">Reports</div>
              </div>
              {students.map(student => (
                <div
                  key={student._id}
                  className={`student-table-row ${selectedStudent?._id === student._id ? 'selected' : ''}`}
                  onClick={() => handleSelectStudent(student)}
                >
                  <div className="col-select">
                    <input
                      type="radio"
                      name="student"
                      checked={selectedStudent?._id === student._id}
                      onChange={() => handleSelectStudent(student)}
                    />
                  </div>
                  <div className="col-name">{student.name}</div>
                  <div className="col-grade">{student.grade || '-'}</div>
                  <div className="col-dob">{new Date(student.dateOfBirth).toLocaleDateString()}</div>
                  <div className="col-reports">{student.reportCount || 0}</div>
                </div>
              ))}
            </div>

            <button className="add-new-student-btn" onClick={handleShowNewStudentForm}>
              + Add New Student
            </button>
          </div>
        )}

        {(showNewStudentForm || students.length === 0) && (
          <div className="new-student-form">
            <h4>{students.length === 0 ? 'Create New Student' : 'Add New Student'}</h4>
            <div className="form-group">
              <label htmlFor="studentName">Student Name *</label>
              <input
                type="text"
                id="studentName"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Enter student's full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth *</label>
              <input
                type="date"
                id="dateOfBirth"
                value={newStudentDOB}
                onChange={(e) => setNewStudentDOB(e.target.value)}
                required
              />
            </div>

            {students.length > 0 && (
              <button className="cancel-btn" onClick={handleCancelNewStudent}>
                Cancel
              </button>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Current Activities Section */}
      <div className="current-activities-section">
        <h3>Current Activities (Optional)</h3>
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
        <h3>Location (Optional)</h3>
        <p className="section-subtitle">
          Set your location to include nearby venues in recommendations
        </p>

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
                  Set Location
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

      <div className="step-actions">
        <button
          className="continue-btn"
          onClick={handleContinue}
        >
          Continue to Upload Report →
        </button>
      </div>
    </div>
  )
}
