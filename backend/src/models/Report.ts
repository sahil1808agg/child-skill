import mongoose, { Document, Schema } from 'mongoose'

export interface ISubject {
  name: string
  grade: string
  percentage?: number
  remarks?: string
}

export interface IReportSummary {
  overallPerformance: string
  keyStrengths: string[]
  areasNeedingAttention: string[]
  teacherHighlights: string[]
  generatedAt: Date
}

export interface ISkillAssessment {
  category: string // e.g., "Social Skills", "Work Habits", "Learning Skills"
  skillName: string
  rating: string // e.g., "Excellent", "Satisfactory", "Needs Improvement"
  score?: number // Optional numerical score
  comments?: string
}

export interface IBehavioralTrait {
  trait: string // e.g., "Cooperation", "Self-control", "Respect"
  rating: string
  score?: number
}

export interface IWorkHabit {
  habit: string // e.g., "Organization", "Homework completion", "Participation"
  rating: string
  score?: number
}

export interface IIBSubjectArea {
  subjectName: string // e.g., "English", "Mathematics", "Unit of Inquiry"
  effortGrade?: string // e.g., "A", "D", "B", "E" (IB continuum indicators)
  skills: Array<{
    skillName: string
    indicator: string // "B", "D", "A", "E", "NA"
    description?: string
  }>
}

export interface IReport extends Document {
  studentId: mongoose.Types.ObjectId
  reportDate: Date
  academicYear: string
  term: string
  grade?: string  // Student's grade/class level (e.g., "1", "2", "Pre-K", "Kindergarten")

  // Report Type - NEW: Determines which fields are populated
  reportType?: 'traditional' | 'ib-standards' | 'mixed'

  // Academic Performance (Traditional Reports)
  subjects: ISubject[]
  overallGrade?: string
  overallPercentage?: number

  // IB Standards-Based Assessment - NEW
  ibSubjectAreas?: IIBSubjectArea[]
  learnerProfileAttributes?: Array<{
    attribute: string // e.g., "Inquirer", "Thinker", "Caring"
    evidence?: string
  }>

  // Skills & Development (Both report types)
  skillAssessments?: ISkillAssessment[]
  behavioralTraits?: IBehavioralTrait[]
  workHabits?: IWorkHabit[]

  // Learning & Social Skills (commonly assessed)
  readingLevel?: string
  mathLevel?: string
  participation?: string
  effort?: string
  cooperation?: string
  responsibility?: string
  selfControl?: string

  // Teacher Feedback
  teacherComments?: string
  areasOfStrength?: string[]
  areasOfImprovement?: string[]

  // Attendance & Behavior
  attendance?: number
  behavior?: string
  punctuality?: string

  // File Management
  uploadedFile: string
  extractedText?: string

  // AI-Generated Summary
  summary?: IReportSummary

  createdAt: Date
  updatedAt: Date
}

const SubjectSchema = new Schema<ISubject>({
  name: { type: String, required: true },
  grade: { type: String, required: true },
  percentage: { type: Number, min: 0, max: 100 },
  remarks: { type: String }
})

const SkillAssessmentSchema = new Schema<ISkillAssessment>({
  category: { type: String, required: true },
  skillName: { type: String, required: true },
  rating: { type: String, required: true },
  score: { type: Number },
  comments: { type: String }
})

const BehavioralTraitSchema = new Schema<IBehavioralTrait>({
  trait: { type: String, required: true },
  rating: { type: String, required: true },
  score: { type: Number }
})

const WorkHabitSchema = new Schema<IWorkHabit>({
  habit: { type: String, required: true },
  rating: { type: String, required: true },
  score: { type: Number }
})

const IBSkillSchema = new Schema({
  skillName: { type: String, required: true },
  indicator: { type: String, required: true }, // "B", "D", "A", "E", "NA"
  description: { type: String }
})

const IBSubjectAreaSchema = new Schema<IIBSubjectArea>({
  subjectName: { type: String, required: true },
  effortGrade: { type: String },
  skills: [IBSkillSchema]
})

const LearnerProfileSchema = new Schema({
  attribute: { type: String, required: true },
  evidence: { type: String }
})

const ReportSchema = new Schema<IReport>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    reportDate: {
      type: Date,
      required: true
    },
    academicYear: {
      type: String,
      required: true
    },
    term: {
      type: String,
      required: true
    },
    grade: {
      type: String
    },

    // Report Type
    reportType: {
      type: String,
      enum: ['traditional', 'ib-standards', 'mixed'],
      default: 'traditional'
    },

    // Academic Performance (Traditional)
    subjects: [SubjectSchema],
    overallGrade: { type: String },
    overallPercentage: { type: Number, min: 0, max: 100 },

    // IB Standards-Based Assessment
    ibSubjectAreas: [IBSubjectAreaSchema],
    learnerProfileAttributes: [LearnerProfileSchema],

    // Skills & Development
    skillAssessments: [SkillAssessmentSchema],
    behavioralTraits: [BehavioralTraitSchema],
    workHabits: [WorkHabitSchema],

    // Learning & Social Skills
    readingLevel: { type: String },
    mathLevel: { type: String },
    participation: { type: String },
    effort: { type: String },
    cooperation: { type: String },
    responsibility: { type: String },
    selfControl: { type: String },

    // Teacher Feedback
    teacherComments: { type: String },
    areasOfStrength: [{ type: String }],
    areasOfImprovement: [{ type: String }],

    // Attendance & Behavior
    attendance: { type: Number, min: 0, max: 100 },
    behavior: { type: String },
    punctuality: { type: String },

    // File Management
    uploadedFile: { type: String, required: true },
    extractedText: { type: String },

    // AI-Generated Summary
    summary: {
      overallPerformance: { type: String },
      keyStrengths: [{ type: String }],
      areasNeedingAttention: [{ type: String }],
      teacherHighlights: [{ type: String }],
      generatedAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IReport>('Report', ReportSchema)
