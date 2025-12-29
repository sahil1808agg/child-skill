import { Request, Response } from 'express'
import Student from '../models/Student'
import Report from '../models/Report'
import ocrService from '../services/ocr.service'
import unifiedParserService from '../services/unified-parser.service'
import unifiedAnalysisService from '../services/unified-analysis.service'
import summarizationService from '../services/summarization.service'
import activityRecommendationService from '../services/activity-recommendation.service'

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

    // Create report object with parsed data
    const reportData = {
      studentId: student._id,
      uploadedFile: req.file.path,
      extractedText,
      reportType,
      ...data
    }

    // Generate AI summary automatically
    console.log('Generating report summary...')
    const summary = await summarizationService.generateReportSummary(reportData)

    const report = new Report({
      ...reportData,
      summary
    })

    await report.save()

    console.log('Report summary generated successfully')

    res.status(201).json({
      message: 'Report uploaded successfully',
      studentId: student._id,
      reportId: report._id,
      summaryGenerated: true
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

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id

    // Find the report first
    const report = await Report.findById(reportId)

    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Store student ID for response
    const studentId = report.studentId

    // Delete the uploaded file from filesystem (optional but recommended)
    const fs = require('fs')
    const path = require('path')
    if (report.uploadedFile) {
      const filePath = path.resolve(report.uploadedFile)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`Deleted file: ${filePath}`)
      }
    }

    // Delete the report from database
    await Report.findByIdAndDelete(reportId)

    res.json({
      message: 'Report deleted successfully',
      studentId: studentId.toString(),
      reportId
    })
  } catch (error) {
    console.error('Error deleting report:', error)
    res.status(500).json({ error: 'Failed to delete report' })
  }
}

export const getActivityRecommendations = async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id

    // Find the report
    const report = await Report.findById(reportId)

    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Generate activity recommendations
    const recommendations = activityRecommendationService.generateRecommendations(report)

    res.json({
      reportId,
      recommendations
    })
  } catch (error) {
    console.error('Error generating activity recommendations:', error)
    res.status(500).json({ error: 'Failed to generate activity recommendations' })
  }
}
