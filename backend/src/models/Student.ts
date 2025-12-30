import mongoose, { Document, Schema } from 'mongoose'

export interface IStudent extends Document {
  name: string
  dateOfBirth: Date
  grade?: string
  location?: {
    address?: string
    city?: string
    latitude?: number
    longitude?: number
    climateZone?: 'tropical' | 'subtropical' | 'temperate' | 'cold' | 'arid'
  }
  preferences?: {
    monthlyBudgetUSD?: number
    budgetFlexibility?: 'strict' | 'moderate' | 'flexible'
  }
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
    },
    location: {
      address: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      },
      climateZone: {
        type: String,
        enum: ['tropical', 'subtropical', 'temperate', 'cold', 'arid']
      }
    },
    preferences: {
      monthlyBudgetUSD: {
        type: Number,
        min: 0
      },
      budgetFlexibility: {
        type: String,
        enum: ['strict', 'moderate', 'flexible'],
        default: 'moderate'
      }
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IStudent>('Student', StudentSchema)
