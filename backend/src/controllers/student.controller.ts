import { Request, Response } from 'express'
import Student from '../models/Student'
import Report from '../models/Report'

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 })
    res.json(students)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' })
  }
}

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const student = await Student.findById(req.params.id)

    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }

    res.json(student)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' })
  }
}

export const createStudent = async (req: Request, res: Response) => {
  try {
    const { name, dateOfBirth, grade } = req.body

    const student = new Student({
      name,
      dateOfBirth,
      grade
    })

    await student.save()
    res.status(201).json(student)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create student' })
  }
}

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { name, dateOfBirth, grade } = req.body

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, dateOfBirth, grade },
      { new: true, runValidators: true }
    )

    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }

    res.json(student)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student' })
  }
}

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const studentId = req.params.id

    // Check if student exists
    const student = await Student.findById(studentId)
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }

    // Delete all reports associated with this student
    const deletedReports = await Report.deleteMany({ studentId })

    // Delete the student
    await Student.findByIdAndDelete(studentId)

    res.json({
      message: 'Student deleted successfully',
      studentName: student.name,
      reportsDeleted: deletedReports.deletedCount
    })
  } catch (error) {
    console.error('Error deleting student:', error)
    res.status(500).json({ error: 'Failed to delete student' })
  }
}
