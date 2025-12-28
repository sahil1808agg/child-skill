import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadReport, fetchStudents } from '../services/api'
import { Student } from '../types'
import './UploadReport.css'

interface UploadProgress {
  fileName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  message?: string
  studentId?: string
}

export default function UploadReport() {
  const [files, setFiles] = useState<File[]>([])
  const [studentName, setStudentName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [existingStudents, setExistingStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [useExisting, setUseExisting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [showResults, setShowResults] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadExistingStudents()
  }, [])

  const loadExistingStudents = async () => {
    try {
      const students = await fetchStudents()
      setExistingStudents(students)
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const studentId = e.target.value
    const student = existingStudents.find(s => s._id === studentId)
    if (student) {
      setSelectedStudent(student)
      setStudentName(student.name)
      setDateOfBirth(student.dateOfBirth.split('T')[0])
    }
  }

  const handleToggleMode = (isExisting: boolean) => {
    setUseExisting(isExisting)
    if (!isExisting) {
      setSelectedStudent(null)
      setStudentName('')
      setDateOfBirth('')
    }
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
      setShowResults(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    if (!studentName || !dateOfBirth) {
      setError('Please provide student name and date of birth')
      return
    }

    setUploading(true)
    setError('')
    setShowResults(true)

    // Initialize progress for all files
    const initialProgress: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      status: 'pending'
    }))
    setUploadProgress(initialProgress)

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
        lastStudentId = result.studentId

        // Update status to success
        setUploadProgress(prev => prev.map((p, idx) =>
          idx === i ? {
            ...p,
            status: 'success',
            message: 'Uploaded successfully',
            studentId: result.studentId
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

    // If all uploads successful, navigate to student page after a delay
    const allSuccess = uploadProgress.every(p => p.status === 'success')
    if (allSuccess && lastStudentId) {
      setTimeout(() => {
        navigate(`/student/${lastStudentId}`)
      }, 2000)
    }
  }

  return (
    <div className="upload-report">
      <h2>Upload Student Report</h2>

      <div className="info-banner">
        ℹ️ You can upload multiple report files at once for a student to track progress over time
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        {existingStudents.length > 0 && (
          <div className="form-group">
            <label>Select Student Type</label>
            <div className="student-type-toggle">
              <button
                type="button"
                className={useExisting ? 'active' : ''}
                onClick={() => handleToggleMode(true)}
              >
                Existing Student
              </button>
              <button
                type="button"
                className={!useExisting ? 'active' : ''}
                onClick={() => handleToggleMode(false)}
              >
                New Student
              </button>
            </div>
          </div>
        )}

        {useExisting && existingStudents.length > 0 ? (
          <div className="form-group">
            <label htmlFor="existingStudent">Select Existing Student *</label>
            <select
              id="existingStudent"
              onChange={handleStudentSelect}
              required
              value={selectedStudent?._id || ''}
            >
              <option value="">-- Choose a student --</option>
              {existingStudents.map(student => (
                <option key={student._id} value={student._id}>
                  {student.name} - {new Date(student.dateOfBirth).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="studentName">Student Name *</label>
              <input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student's full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth *</label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="reportFile">Report Files (PDF or Image) *</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              id="reportFile"
              onChange={handleFileChange}
              accept=".pdf,image/*"
              multiple
              required
            />
            {files.length > 0 && (
              <div className="files-preview">
                <p className="files-count">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
                {files.map((file, index) => (
                  <div key={index} className="file-preview">
                    <span>{file.name}</span>
                    <span className="file-size">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary" disabled={uploading}>
            Cancel
          </button>
          <button type="submit" disabled={uploading} className="btn-primary">
            {uploading ? `Uploading... (${uploadProgress.filter(p => p.status === 'success').length}/${files.length})` : `Upload ${files.length > 1 ? `${files.length} Reports` : 'Report'}`}
          </button>
        </div>
      </form>

      {showResults && uploadProgress.length > 0 && (
        <div className="upload-progress-section">
          <h3>Upload Progress</h3>
          <div className="progress-list">
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
          {!uploading && (
            <div className="progress-actions">
              <button
                onClick={() => {
                  setFiles([])
                  setUploadProgress([])
                  setShowResults(false)
                }}
                className="btn-secondary"
              >
                Upload More Reports
              </button>
              {uploadProgress.some(p => p.studentId) && (
                <button
                  onClick={() => {
                    const successItem = uploadProgress.find(p => p.studentId)
                    if (successItem?.studentId) {
                      navigate(`/student/${successItem.studentId}`)
                    }
                  }}
                  className="btn-primary"
                >
                  View Student Profile
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="upload-info">
        <h3>How It Works</h3>
        <ul>
          <li><strong>Multiple Reports:</strong> Upload as many reports as you want for each student</li>
          <li><strong>Automatic Matching:</strong> Reports with the same name and DOB are linked automatically</li>
          <li><strong>Progress Tracking:</strong> View trends and improvements over time</li>
        </ul>
        <h3>Supported Formats</h3>
        <ul>
          <li>PDF documents (.pdf)</li>
          <li>Images (JPG, PNG, JPEG)</li>
        </ul>
        <p>
          The system will automatically extract information from the report card
          including grades, subjects, teacher comments, and more.
        </p>
      </div>
    </div>
  )
}
