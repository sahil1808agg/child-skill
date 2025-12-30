import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Student } from '../types'
import { fetchStudents, fetchStudentReports, deleteStudent, createStudent, getLocationAutocomplete, LocationSuggestion } from '../services/api'
import './Dashboard.css'

interface StudentWithReportCount extends Student {
  reportCount: number
}

export default function Dashboard() {
  const [students, setStudents] = useState<StudentWithReportCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: '',
    dateOfBirth: '',
    grade: '',
    city: '',
    address: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadStudents()
  }, [])

  // Debounced autocomplete for location
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (locationInput.trim().length >= 2 && showAddForm) {
        setIsLoadingSuggestions(true)
        const results = await getLocationAutocomplete(locationInput)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setIsLoadingSuggestions(false)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [locationInput, showAddForm])

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
      const data = await fetchStudents()
      const studentsWithCounts = await Promise.all(
        data.map(async (student) => {
          try {
            const reports = await fetchStudentReports(student._id)
            return { ...student, reportCount: reports.length }
          } catch {
            return { ...student, reportCount: 0 }
          }
        })
      )
      setStudents(studentsWithCounts)
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newStudent.name || !newStudent.dateOfBirth) {
      alert('Please provide student name and date of birth')
      return
    }

    setIsCreating(true)
    try {
      const studentData: any = {
        name: newStudent.name,
        dateOfBirth: newStudent.dateOfBirth,
        grade: newStudent.grade || undefined
      }

      // Add location if provided
      if (newStudent.city || newStudent.address) {
        studentData.location = {
          city: newStudent.city || undefined,
          address: newStudent.address || undefined
        }
      }

      const created = await createStudent(studentData)

      // Reset form
      setNewStudent({ name: '', dateOfBirth: '', grade: '', city: '', address: '' })
      setLocationInput('')
      setSuggestions([])
      setShowSuggestions(false)
      setShowAddForm(false)

      // Reload students
      await loadStudents()

      // Navigate to the new student's profile
      navigate(`/student/${created._id}`)
    } catch (error) {
      console.error('Error creating student:', error)
      alert('Failed to create student. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setLocationInput(suggestion.description)
    setNewStudent({
      ...newStudent,
      city: suggestion.description,
      address: suggestion.description
    })
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleDeleteStudent = async (studentId: string, studentName: string, e: React.MouseEvent) => {
    // Prevent card click event from firing
    e.stopPropagation()

    const confirmed = window.confirm(
      `Are you sure you want to delete ${studentName}?\n\nThis will permanently delete the student and all their reports. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const result = await deleteStudent(studentId)
      alert(`${result.studentName} deleted successfully.\n${result.reportsDeleted} report(s) were also deleted.`)

      // Reload students after deletion
      await loadStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Failed to delete student. Please try again.')
    }
  }

  if (loading) {
    return <div className="loading">Loading students...</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Students Dashboard</h2>
        <button onClick={() => setShowAddForm(true)} className="btn-primary">
          + Add New Student
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Student</h3>
            <form onSubmit={handleCreateStudent} className="student-form">
              <div className="form-group">
                <label>Student Name *</label>
                <input
                  type="text"
                  placeholder="Enter student name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={newStudent.dateOfBirth}
                  onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="form-group">
                <label>Grade (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., EYP3, Grade 1"
                  value={newStudent.grade}
                  onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                  disabled={isCreating}
                />
              </div>

              <div className="form-group">
                <label>Location (Optional)</label>
                <div className="autocomplete-container" ref={suggestionsRef}>
                  <input
                    type="text"
                    placeholder="Enter city or address (e.g., Delhi, Mumbai)"
                    value={locationInput}
                    onChange={(e) => {
                      setLocationInput(e.target.value)
                      setNewStudent({ ...newStudent, city: e.target.value, address: e.target.value })
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    autoComplete="off"
                    disabled={isCreating}
                  />
                  {isLoadingSuggestions && (
                    <div className="autocomplete-loading-small">Searching...</div>
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
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary" disabled={isCreating}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <div className="empty-state">
          <p>No students found. Add a new student to get started!</p>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            + Add New Student
          </button>
        </div>
      ) : (
        <div className="students-grid">
          {students.map(student => (
            <div
              key={student._id}
              className="student-card"
              onClick={() => navigate(`/student/${student._id}`)}
            >
              {student.reportCount > 0 && (
                <div className="report-badge">{student.reportCount} {student.reportCount === 1 ? 'Report' : 'Reports'}</div>
              )}
              <button
                className="delete-student-btn"
                onClick={(e) => handleDeleteStudent(student._id, student.name, e)}
                title="Delete student"
                aria-label="Delete student"
              >
                ×
              </button>
              <div className="student-avatar">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <h3>{student.name}</h3>
              <p className="student-grade">{student.grade || 'Grade not set'}</p>
              <p className="student-dob">
                Born: {new Date(student.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
