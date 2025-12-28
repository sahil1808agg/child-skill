import mongoose, { Document, Schema } from 'mongoose'

export interface IStudent extends Document {
  name: string
  dateOfBirth: Date
  grade?: string
  createdAt: Date
  updatedAt: Date
}

const StudentSchema = new Schema<IStudent>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    grade: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IStudent>('Student', StudentSchema)
