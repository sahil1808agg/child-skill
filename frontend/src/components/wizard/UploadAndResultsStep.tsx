import { useState } from 'react'
import { uploadReport } from '../../services/api'
import SummaryAndRecommendationsStep from './SummaryAndRecommendationsStep'
import { LocationParams } from '../../types'
import './UploadAndResultsStep.css'

interface UploadProgress {
  fileName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  message?: string
  reportId?: string
}

interface UploadAndResultsStepProps {
  studentName: string
  dateOfBirth: string
  currentActivities: string[]
  userLocation: LocationParams | null
  onFinish: () => void
}

export default function UploadAndResultsStep({
  studentName,
  dateOfBirth,
  currentActivities,
  userLocation,
  onFinish
}: UploadAndResultsStepProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // After upload completes
  const [uploadedReportId, setUploadedReportId] = useState<string | null>(null)
  const [uploadedStudentId, setUploadedStudentId] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

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

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    setUploading(true)
    setError('')

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

        // Wait a bit before uploading next file
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
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

    // If all uploads successful, show results
    const allSuccess = uploadProgress.every(p => p.status === 'success' || p.status === 'pending')
    if (allSuccess && lastReportId && lastStudentId) {
      setUploadedReportId(lastReportId)
      setUploadedStudentId(lastStudentId)

      // Wait a moment then show results
      setTimeout(() => {
        setShowResults(true)
      }, 1500)
    }
  }

  // If results should be shown, display the summary and recommendations
  if (showResults && uploadedReportId && uploadedStudentId) {
    return (
      <SummaryAndRecommendationsStep
        reportId={uploadedReportId}
        studentId={uploadedStudentId}
        currentActivities={currentActivities}
        userLocation={userLocation}
        onFinish={onFinish}
      />
    )
  }

  // Otherwise show the upload interface
  return (
    <div className="upload-and-results-step">
      <h2>Upload Report</h2>
      <p className="step-description">Upload the report card for {studentName}</p>

      <div className="file-upload-section">
        <h3>Select Report Files</h3>
        <p className="upload-hint">Select PDF or image files of the student's report card (you can select multiple files)</p>

        <div className="file-input-wrapper">
          <input
            type="file"
            id="reportFiles"
            onChange={handleFileChange}
            accept=".pdf,image/*"
            multiple
            className="file-input"
            disabled={uploading}
          />
          <label htmlFor="reportFiles" className={`file-input-label ${uploading ? 'disabled' : ''}`}>
            {files.length === 0 ? '📁 Choose Files' : `📁 ${files.length} file(s) selected`}
          </label>
        </div>

        {files.length > 0 && uploadProgress.length === 0 && (
          <div className="files-preview">
            <h4>Selected Files:</h4>
            {files.map((file, index) => (
              <div key={index} className="file-preview-item">
                <span className="file-icon">📄</span>
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
                <span className="progress-icon">
                  {progress.status === 'pending' && '⏳'}
                  {progress.status === 'uploading' && '⬆️'}
                  {progress.status === 'success' && '✅'}
                  {progress.status === 'error' && '❌'}
                </span>
                <span className="file-name">{progress.fileName}</span>
                <span className={`status-badge ${progress.status}`}>
                  {progress.status === 'pending' && 'Waiting'}
                  {progress.status === 'uploading' && 'Uploading...'}
                  {progress.status === 'success' && 'Success'}
                  {progress.status === 'error' && 'Failed'}
                </span>
              </div>
              {progress.message && (
                <p className="progress-message">{progress.message}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!showResults && (
        <div className="step-actions">
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading
              ? `Uploading... (${uploadProgress.filter(p => p.status === 'success').length}/${files.length})`
              : 'Upload and View Results →'}
          </button>
        </div>
      )}
    </div>
  )
}
