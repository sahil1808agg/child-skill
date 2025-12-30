import { useState, useEffect } from 'react'
import { Student, CurrentActivity } from '../../types'
import { fetchCurrentActivities, addCurrentActivity, updateCurrentActivity, deleteCurrentActivity, toggleActivityStatus } from '../../services/api'
import './CurrentActivitiesTab.css'

interface Props {
  student: Student
}

export default function CurrentActivitiesTab({ student }: Props) {
  const [activities, setActivities] = useState<CurrentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<CurrentActivity | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    activityName: '',
    startDate: '',
    frequency: '',
    notes: ''
  })

  useEffect(() => {
    loadActivities()
  }, [student._id])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const data = await fetchCurrentActivities(student._id)
      setActivities(data)
    } catch (error) {
      console.error('Error loading activities:', error)
      alert('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.activityName.trim()) {
      alert('Activity name is required')
      return
    }

    try {
      if (editingActivity) {
        // Update existing
        await updateCurrentActivity(editingActivity._id, formData)
        alert('Activity updated successfully')
      } else {
        // Add new
        await addCurrentActivity(student._id, formData)
        alert('Activity added successfully')
      }

      // Reload activities
      await loadActivities()

      // Reset form
      resetForm()
    } catch (error) {
      console.error('Error saving activity:', error)
      alert('Failed to save activity')
    }
  }

  const handleEdit = (activity: CurrentActivity) => {
    setEditingActivity(activity)
    setFormData({
      activityName: activity.activityName,
      startDate: activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : '',
      frequency: activity.frequency || '',
      notes: activity.notes || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (activityId: string) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) {
      return
    }

    try {
      await deleteCurrentActivity(activityId)
      await loadActivities()
      alert('Activity deleted successfully')
    } catch (error) {
      console.error('Error deleting activity:', error)
      alert('Failed to delete activity')
    }
  }

  const handleToggleStatus = async (activityId: string) => {
    try {
      await toggleActivityStatus(activityId)
      await loadActivities()
    } catch (error) {
      console.error('Error toggling activity status:', error)
      alert('Failed to update activity status')
    }
  }

  const resetForm = () => {
    setFormData({
      activityName: '',
      startDate: '',
      frequency: '',
      notes: ''
    })
    setEditingActivity(null)
    setShowAddForm(false)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }

  const activeActivities = activities.filter(a => a.isActive)
  const inactiveActivities = activities.filter(a => !a.isActive)

  return (
    <div className="current-activities-tab">
      <div className="tab-header">
        <div>
          <h2>📝 Current Activities</h2>
          <p className="tab-subtitle">Manage {student.name}'s ongoing activities and commitments</p>
        </div>
        <button
          className="add-activity-main-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Activity'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="activity-form-container">
          <h3>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</h3>
          <form onSubmit={handleSubmit} className="activity-form">
            <div className="form-row">
              <div className="form-group">
                <label>Activity Name *</label>
                <input
                  type="text"
                  value={formData.activityName}
                  onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                  placeholder="e.g., Swimming lessons, Piano class"
                  required
                />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Frequency</label>
                <input
                  type="text"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g., 2 times per week, Every Saturday"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details, coach name, location, etc."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingActivity ? 'Update Activity' : 'Add Activity'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activities List */}
      {loading ? (
        <div className="loading-state">Loading activities...</div>
      ) : (
        <>
          {/* Active Activities */}
          <div className="activities-section">
            <h3 className="section-title">
              Active Activities ({activeActivities.length})
            </h3>

            {activeActivities.length === 0 ? (
              <div className="empty-state">
                <p>No active activities yet.</p>
                <p className="empty-hint">Click "Add Activity" to get started!</p>
              </div>
            ) : (
              <div className="activities-grid">
                {activeActivities.map((activity) => (
                  <div key={activity._id} className="activity-card active">
                    <div className="activity-card-header">
                      <h4>{activity.activityName}</h4>
                      <div className="activity-actions">
                        <button
                          className="action-icon edit"
                          onClick={() => handleEdit(activity)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-icon toggle"
                          onClick={() => handleToggleStatus(activity._id)}
                          title="Mark as inactive"
                        >
                          ⏸️
                        </button>
                        <button
                          className="action-icon delete"
                          onClick={() => handleDelete(activity._id)}
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="activity-details">
                      {activity.startDate && (
                        <div className="detail-item">
                          <span className="detail-label">Started:</span>
                          <span>{formatDate(activity.startDate)}</span>
                        </div>
                      )}
                      {activity.frequency && (
                        <div className="detail-item">
                          <span className="detail-label">Frequency:</span>
                          <span>{activity.frequency}</span>
                        </div>
                      )}
                      {activity.notes && (
                        <div className="detail-item notes">
                          <span className="detail-label">Notes:</span>
                          <p>{activity.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="activity-footer">
                      <span className="activity-status active-badge">✓ Active</span>
                      <span className="activity-date">
                        Added {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inactive Activities */}
          {inactiveActivities.length > 0 && (
            <div className="activities-section inactive-section">
              <h3 className="section-title">
                Inactive Activities ({inactiveActivities.length})
              </h3>

              <div className="activities-grid">
                {inactiveActivities.map((activity) => (
                  <div key={activity._id} className="activity-card inactive">
                    <div className="activity-card-header">
                      <h4>{activity.activityName}</h4>
                      <div className="activity-actions">
                        <button
                          className="action-icon toggle"
                          onClick={() => handleToggleStatus(activity._id)}
                          title="Mark as active"
                        >
                          ▶️
                        </button>
                        <button
                          className="action-icon delete"
                          onClick={() => handleDelete(activity._id)}
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="activity-details">
                      {activity.startDate && (
                        <div className="detail-item">
                          <span className="detail-label">Started:</span>
                          <span>{formatDate(activity.startDate)}</span>
                        </div>
                      )}
                      {activity.frequency && (
                        <div className="detail-item">
                          <span className="detail-label">Frequency:</span>
                          <span>{activity.frequency}</span>
                        </div>
                      )}
                    </div>

                    <div className="activity-footer">
                      <span className="activity-status inactive-badge">⏸ Inactive</span>
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
