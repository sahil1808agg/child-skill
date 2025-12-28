import { Request, Response } from 'express'
import Student from '../models/Student'
import Report from '../models/Report'
import ocrService from '../services/ocr.service'
import unifiedParserService from '../services/unified-parser.service'
import unifiedAnalysisService from '../services/unified-analysis.service'

export const uploadReport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { studentName, dateOfBirth } = req.body

    if (!studentName || !dateOfBirth) {
      return res.status(400).json({ error: 'Student name and date of birth are required' })
    }

    let student = await Student.findOne({
      name: studentName,
      dateOfBirth: new Date(dateOfBirth)
    })

    if (!student) {
      student = new Student({
        name: studentName,
        dateOfBirth: new Date(dateOfBirth)
      })
      await student.save()
    }

    const extractedText = await ocrService.extractText(
      req.file.path,
      req.file.mimetype
    )

    // Use unified parser to detect and parse the report
    const { reportType, data } = await unifiedParserService.parseReport(extractedText)

    const report = new Report({
      studentId: student._id,
      uploadedFile: req.file.path,
      extractedText,
      reportType,
      ...data
    })

    await report.save()

    res.status(201).json({
      message: 'Report uploaded successfully',
      studentId: student._id,
      reportId: report._id
    })
  } catch (error) {
    console.error('Error uploading report:', error)
    res.status(500).json({ error: 'Failed to upload and process report' })
  }
}

export const getStudentReports = async (req: Request, res: Response) => {
  try {
    const reports = await Report.find({ studentId: req.params.studentId }).sort({
      reportDate: 1  // Ascending order: oldest reports first
    })

    res.json(reports)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
}

export const getReportById = async (req: Request, res: Response) => {
  try {
    const report = await Report.findById(req.params.id)

    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    res.json(report)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' })
  }
}

export const getStudentAnalysis = async (req: Request, res: Response) => {
  try {
    const analysis = await unifiedAnalysisService.analyzeStudentProgress(req.params.studentId)
    res.json(analysis)
  } catch (error) {
    console.error('Error analyzing student:', error)
    res.status(500).json({ error: 'Failed to analyze student progress' })
  }
}
