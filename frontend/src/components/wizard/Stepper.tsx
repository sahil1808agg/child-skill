import './Stepper.css'

interface Step {
  number: number
  label: string
  shortLabel?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  completedSteps: Set<number>
  onStepClick: (step: number) => void
}

export default function Stepper({ steps, currentStep, completedSteps, onStepClick }: StepperProps) {
  const getStepStatus = (stepNumber: number): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.has(stepNumber)) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'upcoming'
  }

  const canClickStep = (stepNumber: number): boolean => {
    // Can click if completed or if all previous steps are completed
    if (completedSteps.has(stepNumber)) return true
    if (stepNumber === 1) return true
    return completedSteps.has(stepNumber - 1)
  }

  return (
    <div className="stepper">
      {steps.map((step, index) => {
        const status = getStepStatus(step.number)
        const clickable = canClickStep(step.number)
        const isLast = index === steps.length - 1

        return (
          <div key={step.number} className="stepper-item-wrapper">
            <div
              className={`stepper-item ${status} ${clickable ? 'clickable' : ''}`}
              onClick={() => clickable && onStepClick(step.number)}
            >
              <div className="step-circle">
                <span className="step-number">{step.number}</span>
              </div>
              <div className="step-label">
                <span className="step-label-full">{step.label}</span>
                {step.shortLabel && (
                  <span className="step-label-short">{step.shortLabel}</span>
                )}
              </div>
            </div>
            {!isLast && (
              <div className={`step-connector ${status === 'completed' ? 'completed' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
