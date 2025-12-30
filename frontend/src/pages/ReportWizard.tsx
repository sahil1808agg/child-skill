import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Stepper from '../components/wizard/Stepper'
import StudentSelector from '../components/wizard/StudentSelector'
import ActivityInput from '../components/wizard/ActivityInput'
import RecommendationView from '../components/wizard/RecommendationView'
import { Report, ActivityRecommendation, CurrentActivityEvaluation } from '../types'
import { fetchStudentReports, fetchActivityRecommendations, LocationParams, downloadReportPDF } from '../services/api'
import './ReportWizard.css'

export default function ReportWizard() {
  const navigate = useNavigate()
  const location = useLocation()

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Step 1 data
  const [uploadedReportId, setUploadedReportId] = useState<string | null>(null)
  const [uploadedStudentId, setUploadedStudentId] = useState<string | null>(null)

  // Step 2 data
  const [report, setReport] = useState<Report | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Step 3 data
  const [currentActivities, setCurrentActivities] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<LocationParams | null>(null)

  // Step 4 data
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([])
  const [activityEvaluations, setActivityEvaluations] = useState<CurrentActivityEvaluation[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)

  const steps = [
    { number: 1, label: 'Select Student & Upload', shortLabel: 'Upload' },
    { number: 2, label: 'Review Summary', shortLabel: 'Summary' },
    { number: 3, label: 'Add Details', shortLabel: 'Details' },
    { number: 4, label: 'Recommendations', shortLabel: 'Results' }
  ]

  // Sync URL with current step
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const stepParam = searchParams.get('step')
    if (stepParam) {
      const step = parseInt(stepParam)
      if (step >= 1 && step <= 4) {
        // Only allow navigation to a step if previous steps are completed
        if (step === 1 || completedSteps.has(step - 1)) {
          setCurrentStep(step)
        }
      }
    }
  }, [location.search, completedSteps])

  // Load report summary when entering Step 2
  useEffect(() => {
    if (currentStep === 2 && uploadedReportId && uploadedStudentId && !report) {
      loadReportSummary()
    }
  }, [currentStep, uploadedReportId, uploadedStudentId, report])

  // Load recommendations when entering Step 4
  useEffect(() => {
    if (currentStep === 4 && uploadedReportId && recommendations.length === 0) {
      loadRecommendations()
    }
  }, [currentStep, uploadedReportId, recommendations.length])

  const loadReportSummary = async () => {
    if (!uploadedStudentId) return

    setLoadingSummary(true)
    try {
      const reports = await fetchStudentReports(uploadedStudentId)
      const latestReport = reports.find(r => r._id === uploadedReportId) || reports[reports.length - 1]

      if (latestReport) {
        setReport(latestReport)

        // If summary not ready, poll for it
        if (!latestReport.summary) {
          pollForSummary(uploadedStudentId)
        }
      }
    } catch (error) {
      console.error('Error loading report summary:', error)
    } finally {
      setLoadingSummary(false)
    }
  }

  const pollForSummary = async (studentId: string) => {
    let attempts = 0
    const maxAttempts = 60 // 2 minutes max (60 * 2 seconds)

    const interval = setInterval(async () => {
      attempts++

      try {
        const reports = await fetchStudentReports(studentId)
        const latestReport = reports.find(r => r._id === uploadedReportId) || reports[reports.length - 1]

        if (latestReport?.summary) {
          setReport(latestReport)
          clearInterval(interval)
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          console.error('Summary generation timeout')
        }
      } catch (error) {
        console.error('Error polling for summary:', error)
        clearInterval(interval)
      }
    }, 2000)
  }

  const loadRecommendations = async () => {
    if (!uploadedReportId) return

    setLoadingRecommendations(true)
    setRecommendationsError(null)

    try {
      const response = await fetchActivityRecommendations(
        uploadedReportId,
        userLocation || undefined,
        currentActivities
      )
      setRecommendations(response.recommendations)
      if (response.currentActivityEvaluations) {
        setActivityEvaluations(response.currentActivityEvaluations)
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
      setRecommendationsError('Failed to load recommendations. Please try again.')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleStepClick = (step: number) => {
    if (step === 1 || completedSteps.has(step - 1)) {
      navigateToStep(step)
    }
  }

  const navigateToStep = (step: number) => {
    setCurrentStep(step)
    navigate(`/wizard?step=${step}`)
  }

  const handleStep1Complete = (reportId: string, studentId: string) => {
    setUploadedReportId(reportId)
    setUploadedStudentId(studentId)
    setCompletedSteps(prev => new Set(prev).add(1))
    navigateToStep(2)
  }

  const handleNextStep = () => {
    if (currentStep < 4) {
      if (currentStep === 2) {
        setCompletedSteps(prev => new Set(prev).add(2))
      } else if (currentStep === 3) {
        setCompletedSteps(prev => new Set(prev).add(3))
      }
      navigateToStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      navigateToStep(currentStep - 1)
    }
  }

  const handleFinish = () => {
    // Clear wizard state
    sessionStorage.removeItem('wizardState')

    // Navigate to dashboard or student profile
    if (uploadedStudentId) {
      navigate(`/student/${uploadedStudentId}`)
    } else {
      navigate('/')
    }
  }

  const handleDownloadSummary = async () => {
    if (!uploadedReportId) return

    try {
      await downloadReportPDF(uploadedReportId, {
        includeRecommendations: false
      })
      alert('PDF downloaded successfully!')
    } catch (error) {
      alert('Failed to download PDF. Please try again.')
    }
  }

  const handleDownloadWithRecommendations = async () => {
    if (!uploadedReportId) return

    try {
      await downloadReportPDF(uploadedReportId, {
        includeRecommendations: true,
        address: userLocation?.address || '',
        city: userLocation?.city || '',
        currentActivities
      })
      alert('PDF with recommendations downloaded successfully!')
    } catch (error) {
      alert('Failed to download PDF. Please try again.')
    }
  }

  const canProceedToNext = (): boolean => {
    if (currentStep === 1) {
      return false // Step 1 has its own upload button
    }
    if (currentStep === 2) {
      return report !== null
    }
    if (currentStep === 3) {
      return true // Activities and location are optional
    }
    return false
  }

  return (
    <div className="report-wizard">
      <div className="wizard-header">
        <h1>Upload Report & Get Recommendations</h1>
        <p className="wizard-subtitle">Follow these steps to upload a report and receive personalized activity recommendations</p>
      </div>

      <Stepper
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <div className="wizard-content">
        {currentStep === 1 && (
          <StudentSelector onComplete={handleStep1Complete} />
        )}

        {currentStep === 2 && (
          <div className="summary-step">
            <h2>Report Summary</h2>
            <p className="step-description">Comprehensive overview of your child's progress and development</p>

            {loadingSummary ? (
              <div className="summary-loading">
                <div className="loading-spinner"></div>
                <p>Loading report...</p>
              </div>
            ) : report ? (
              <div className="report-summary-display">
                <div className="summary-header">
                  <h3>{report.term} - {report.academicYear}</h3>
                  <span className="report-date">
                    {new Date(report.reportDate).toLocaleDateString()}
                  </span>
                </div>

                {/* AI-Generated Summary */}
                {report.summary && (
                  <>
                    <div className="summary-section ai-summary">
                      <h4>📊 Overall Performance</h4>
                      <p>{report.summary.overallPerformance}</p>
                    </div>

                    {report.summary.keyStrengths.length > 0 && (
                      <div className="summary-section strengths">
                        <h4>✓ Key Strengths</h4>
                        <ul>
                          {report.summary.keyStrengths.map((strength, idx) => (
                            <li key={idx}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.summary.areasNeedingAttention.length > 0 && (
                      <div className="summary-section attention">
                        <h4>🎯 Areas to Focus On</h4>
                        <ul>
                          {report.summary.areasNeedingAttention.map((area, idx) => (
                            <li key={idx}>{area}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.summary.teacherHighlights.length > 0 && (
                      <div className="summary-section highlights">
                        <h4>💬 Teacher Highlights</h4>
                        <ul>
                          {report.summary.teacherHighlights.map((highlight, idx) => (
                            <li key={idx}>{highlight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Skill Assessments */}
                {report.skillAssessments && report.skillAssessments.length > 0 && (
                  <div className="summary-section skills">
                    <h4>🔧 Skills Assessment</h4>
                    <div className="skills-grid">
                      {report.skillAssessments.map((skill, idx) => (
                        <div key={idx} className="skill-assessment">
                          <div className="skill-category">{skill.category}</div>
                          <div className="skill-detail">
                            <strong>{skill.skillName}:</strong> {skill.rating}
                          </div>
                          {skill.comments && (
                            <div className="skill-comment">{skill.comments}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Teacher Comments */}
                {report.teacherComments && (
                  <div className="summary-section teacher-comments">
                    <h4>💬 Teacher's Comments</h4>
                    <p>{report.teacherComments}</p>
                  </div>
                )}

                {/* Download PDF Button */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                  <button
                    className="nav-btn primary"
                    onClick={handleDownloadSummary}
                    style={{ padding: '1rem 2rem' }}
                  >
                    📄 Download Summary as PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="summary-generating">
                <div className="loading-spinner"></div>
                <p>Generating AI summary...</p>
                <p className="loading-subtext">This may take 10-15 seconds</p>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <ActivityInput
            currentActivities={currentActivities}
            onActivitiesChange={setCurrentActivities}
            location={userLocation}
            onLocationChange={setUserLocation}
          />
        )}

        {currentStep === 4 && (
          <RecommendationView
            recommendations={recommendations}
            activityEvaluations={activityEvaluations}
            loading={loadingRecommendations}
            error={recommendationsError}
          />
        )}
      </div>

      <div className="wizard-navigation">
        {currentStep > 1 && (
          <button
            className="nav-btn secondary"
            onClick={handlePreviousStep}
          >
            ← Previous
          </button>
        )}

        {currentStep < 4 && currentStep !== 1 && (
          <button
            className="nav-btn primary"
            onClick={handleNextStep}
            disabled={!canProceedToNext()}
          >
            Next →
          </button>
        )}

        {currentStep === 4 && (
          <div className="finish-actions">
            <button
              className="nav-btn secondary"
              onClick={() => navigate('/')}
            >
              Back to Dashboard
            </button>
            <button
              className="nav-btn primary"
              onClick={handleDownloadWithRecommendations}
              style={{ background: '#e67e22', borderColor: '#e67e22' }}
            >
              📄 Download Full Report (PDF)
            </button>
            <button
              className="nav-btn primary"
              onClick={handleFinish}
            >
              View Full Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
