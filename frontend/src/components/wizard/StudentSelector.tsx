import { useState, useEffect } from 'react'
import { Student } from '../../types'
import { fetchStudents, uploadReport } from '../../services/api'
import './StudentSelector.css'

interface UploadProgress {
  fileName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  message?: string
  reportId?: string
}

interface StudentSelectorProps {
  onComplete: (reportId: string, studentId: string) => void
}

export default function StudentSelector({ onComplete }: StudentSelectorProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showNewStudentForm, setShowNewStudentForm] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentDOB, setNewStudentDOB] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles: File[] = []
      const invalidFiles: string[] = []

      selectedFiles.forEach(file => {
        const fileType = file.type
        if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
          validFiles.push(file)
        } else {
          invalidFiles.push(file.name)
        }
      })

      if (invalidFiles.length > 0) {
        setError(`Invalid file type(s): ${invalidFiles.join(', ')}. Only PDF and images are allowed.`)
      } else {
        setError('')
      }

      setFiles(validFiles)
      setUploadProgress([])
    }
  }

  const isValid = (): boolean => {
    const hasStudent = selectedStudent !== null || (newStudentName && newStudentDOB)
    const hasFiles = files.length > 0
    return hasStudent && hasFiles && !uploading
  }

  const handleUpload = async () => {
    if (!isValid()) {
      setError('Please select a student and at least one file')
      return
    }

    setUploading(true)
    setError('')

    // Determine student data
    const studentName = selectedStudent?.name || newStudentName
    const dateOfBirth = selectedStudent?.dateOfBirth.split('T')[0] || newStudentDOB

    // Initialize progress for all files
    const initialProgress: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      status: 'pending'
    }))
    setUploadProgress(initialProgress)

    let lastReportId: string | undefined
    let lastStudentId: string | undefined

    // Upload files sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Update status to uploading
      setUploadProgress(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'uploading' } : p
      ))

      try {
        const formData = new FormData()
        formData.append('report', file)
        formData.append('studentName', studentName)
        formData.append('dateOfBirth', dateOfBirth)

        const result = await uploadReport(formData)
        lastReportId = result.reportId
        lastStudentId = result.studentId

        // Update status to success
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? {
            ...p,
            status: 'success',
            message: 'Uploaded successfully',
            reportId: result.reportId
          } : p
        ))
      } catch (err: any) {
        // Update status to error
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? {
            ...p,
            status: 'error',
            message: err.message || 'Upload failed'
          } : p
        ))
      }
    }

    setUploading(false)

    // If all uploads successful, notify parent
    const allSuccess = uploadProgress.every(p => p.status === 'success' || p.status === 'pending')
    if (allSuccess && lastReportId && lastStudentId) {
      setTimeout(() => {
        onComplete(lastReportId, lastStudentId)
      }, 1000)
    }
  }

  if (loading) {
    return <div className="student-selector-loading">Loading students...</div>
  }

  return (
    <div className="student-selector">
      <h2>Select or Create Student</h2>
      <p className="step-description">Choose an existing student or create a new one, then upload their report</p>

      {!showNewStudentForm && students.length > 0 && (
        <div className="student-table-section">
          <h3>Existing Students</h3>
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
          <h3>{students.length === 0 ? 'Create New Student' : 'Add New Student'}</h3>
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

      <div className="file-upload-section">
        <h3>Upload Report Files</h3>
        <p className="upload-hint">Select PDF or image files of the student's report card</p>

        <div className="file-input-wrapper">
          <input
            type="file"
            id="reportFiles"
            onChange={handleFileChange}
            accept=".pdf,image/*"
            multiple
            className="file-input"
          />
          <label htmlFor="reportFiles" className="file-input-label">
            {files.length === 0 ? 'Choose Files' : `${files.length} file(s) selected`}
          </label>
        </div>

        {files.length > 0 && (
          <div className="files-preview">
            {files.map((file, index) => (
              <div key={index} className="file-preview-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {uploadProgress.length > 0 && (
        <div className="upload-progress-section">
          <h3>Upload Progress</h3>
          {uploadProgress.map((progress, index) => (
            <div key={index} className={`progress-item ${progress.status}`}>
              <div className="progress-info">
                <span className="file-name">{progress.fileName}</span>
                <span className={`status-badge ${progress.status}`}>
                  {progress.status === 'pending' && '⏳ Waiting'}
                  {progress.status === 'uploading' && '⬆️ Uploading...'}
                  {progress.status === 'success' && '✅ Success'}
                  {progress.status === 'error' && '❌ Failed'}
                </span>
              </div>
              {progress.message && (
                <p className="progress-message">{progress.message}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="step-actions">
        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!isValid()}
        >
          {uploading
            ? `Uploading... (${uploadProgress.filter(p => p.status === 'success').length}/${files.length})`
            : 'Upload and Continue'}
        </button>
      </div>
    </div>
  )
}
