import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Stepper from '../components/wizard/Stepper'
import StudentDetailsStep from '../components/wizard/StudentDetailsStep'
import UploadAndResultsStep from '../components/wizard/UploadAndResultsStep'
import { Student, LocationParams } from '../types'
import './ReportWizard.css'

export default function ReportWizard() {
  const navigate = useNavigate()
  const location = useLocation()

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Step 1 data
  const [selectedStudent, setSelectedStudent] = useState<Student | { name: string; dateOfBirth: string } | null>(null)
  const [currentActivities, setCurrentActivities] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<LocationParams | null>(null)

  const steps = [
    { number: 1, label: 'Student Details & Activities', shortLabel: 'Details' },
    { number: 2, label: 'Upload & View Results', shortLabel: 'Results' }
  ]

  // Sync URL with current step
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const stepParam = searchParams.get('step')
    if (stepParam) {
      const step = parseInt(stepParam)
      if (step >= 1 && step <= 2) {
        // Only allow navigation to a step if previous steps are completed
        if (step === 1 || completedSteps.has(step - 1)) {
          setCurrentStep(step)
        }
      }
    }
  }, [location.search, completedSteps])

  const handleStepClick = (step: number) => {
    if (step === 1 || completedSteps.has(step - 1)) {
      navigateToStep(step)
    }
  }

  const navigateToStep = (step: number) => {
    setCurrentStep(step)
    navigate(`/wizard?step=${step}`)
  }

  const handleStep1Complete = (
    student: Student | { name: string; dateOfBirth: string },
    activities: string[],
    location: LocationParams | null
  ) => {
    setSelectedStudent(student)
    setCurrentActivities(activities)
    setUserLocation(location)
    setCompletedSteps(prev => new Set(prev).add(1))
    navigateToStep(2)
  }

  const handleFinish = (studentId?: string) => {
    // Clear wizard state
    sessionStorage.removeItem('wizardState')

    // Navigate to student profile if we have the studentId
    if (studentId) {
      navigate(`/student/${studentId}`)
    } else {
      navigate('/')
    }
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
          <StudentDetailsStep
            onComplete={handleStep1Complete}
            initialStudent={selectedStudent || undefined}
            initialActivities={currentActivities}
            initialLocation={userLocation}
          />
        )}

        {currentStep === 2 && selectedStudent && (
          <UploadAndResultsStep
            studentName={'_id' in selectedStudent ? selectedStudent.name : selectedStudent.name}
            dateOfBirth={'_id' in selectedStudent ? selectedStudent.dateOfBirth.split('T')[0] : selectedStudent.dateOfBirth}
            currentActivities={currentActivities}
            userLocation={userLocation}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
