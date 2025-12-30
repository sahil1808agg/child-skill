import mongoose, { Document, Schema } from 'mongoose'

export interface ICurrentActivity extends Document {
  studentId: mongoose.Types.ObjectId
  activityName: string
  startDate?: Date
  frequency?: string // e.g., "2 times per week"
  notes?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const CurrentActivitySchema = new Schema<ICurrentActivity>({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  activityName: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date
  },
  frequency: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Index for efficient queries
CurrentActivitySchema.index({ studentId: 1, isActive: 1 })

export default mongoose.model<ICurrentActivity>('CurrentActivity', CurrentActivitySchema)
