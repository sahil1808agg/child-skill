import { Request, Response } from 'express'
import Student from '../models/Student'
import Report from '../models/Report'
import ocrService from '../services/ocr.service'
import unifiedParserService from '../services/unified-parser.service'
import unifiedAnalysisService from '../services/unified-analysis.service'
import summarizationService from '../services/summarization.service'
import activityRecommendationService from '../services/activity-recommendation.service'
import pdfGeneratorService from '../services/pdf-generator.service'
import climateDetectionService from '../services/climate-detection.service'

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

    // Get location and budget from query parameters
    // Can be: ?lat=28.6139&lng=77.2090 or ?address=Delhi or ?city=Delhi
    const {
      lat, lng, latitude, longitude, address, city, currentActivities,
      budget, // Monthly budget in USD
      budgetFlexibility // 'strict' | 'moderate' | 'flexible'
    } = req.query

    // Find the report
    const report = await Report.findById(reportId)

    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Find the student to get preferences
    const student = await Student.findById(report.studentId)
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }

    // Determine location and climate zone
    let location: { latitude: number; longitude: number } | null = null
    let climateZone: string | undefined = student.location?.climateZone
    let isCoastal = false

    if (lat && lng) {
      // Direct lat/lng provided
      location = {
        latitude: parseFloat(lat as string),
        longitude: parseFloat(lng as string)
      }
    } else if (latitude && longitude) {
      // Alternative parameter names
      location = {
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string)
      }
    } else if (address || city) {
      // Geocode address/city
      const venueSearchService = require('../services/venue-search.service').default
      const searchAddress = (address || city) as string
      console.log(`Geocoding address: ${searchAddress}`)
      location = await venueSearchService.geocodeLocation(searchAddress)

      if (!location) {
        console.warn(`Could not geocode address: ${searchAddress}`)
      }
    } else if (student.location?.latitude && student.location?.longitude) {
      // Use student's stored location if available
      location = {
        latitude: student.location.latitude,
        longitude: student.location.longitude
      }
    }

    // Detect climate zone if location provided and not already stored
    if (location && !climateZone) {
      climateZone = climateDetectionService.detectClimateZone(
        location.latitude,
        location.longitude
      )

      // Check if coastal
      isCoastal = climateDetectionService.isCoastalRegion(
        location.latitude,
        location.longitude
      )

      console.log(`Detected climate zone: ${climateZone}, coastal: ${isCoastal}`)
    }

    // Merge budget from query params or student profile
    const finalBudget = budget
      ? parseFloat(budget as string)
      : student.preferences?.monthlyBudgetUSD

    const finalFlexibility = (budgetFlexibility as any) || student.preferences?.budgetFlexibility

    // Generate activity recommendations with feasibility options
    let recommendations = activityRecommendationService.generateRecommendations(
      report,
      {
        budget: finalBudget,
        budgetFlexibility: finalFlexibility,
        climateZone,
        isCoastal
      }
    )

    // Parse current activities if provided
    let activitiesList: string[] | undefined = undefined;
    if (currentActivities) {
      activitiesList = Array.isArray(currentActivities)
        ? currentActivities as string[]
        : [currentActivities as string];
    }

    // Generate parent actions - home-based activities for parents
    // Pass current activities to avoid suggesting duplicate activities
    const parentActions = activityRecommendationService.generateParentActions(
      report,
      activitiesList
    )

    // Evaluate current activities if provided
    let currentActivityEvaluations = null;
    if (activitiesList) {
      currentActivityEvaluations = activityRecommendationService.evaluateCurrentActivities(
        report,
        activitiesList
      );
    }

    // Enrich with venues if location is available
    if (location) {
      console.log(`Enriching recommendations with venues near ${location.latitude}, ${location.longitude}`);
      recommendations = await activityRecommendationService.enrichWithVenues(
        recommendations,
        location.latitude,
        location.longitude,
        10000 // 10km radius
      );
    }

    res.json({
      reportId,
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        climateZone
      } : null,
      recommendations,
      parentActions,
      currentActivityEvaluations
    })
  } catch (error) {
    console.error('Error generating activity recommendations:', error)
    res.status(500).json({ error: 'Failed to generate activity recommendations' })
  }
}

export const getLocationAutocomplete = async (req: Request, res: Response) => {
  try {
    const { input } = req.query

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input query parameter is required' })
    }

    const venueSearchService = require('../services/venue-search.service').default
    const suggestions = await venueSearchService.getLocationSuggestions(input)

    res.json({ suggestions })
  } catch (error) {
    console.error('Error getting location autocomplete:', error)
    res.status(500).json({ error: 'Failed to get location suggestions' })
  }
}

export const downloadReportPDF = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params

    // Fetch the report with student information
    const report = await Report.findById(reportId).lean()
    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    const student = await Student.findById(report.studentId).lean()
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }

    // Check if report has a summary
    if (!report.summary) {
      return res.status(400).json({ error: 'Report summary not yet generated' })
    }

    // Get recommendations if available
    let recommendations = undefined
    let currentActivityEvaluations = undefined
    let location = undefined

    // Try to get recommendations and location from request body (optional)
    if (req.body.includeRecommendations) {
      const { address, city, currentActivities } = req.body

      // Generate recommendations
      recommendations = activityRecommendationService.generateRecommendations(report)

      // Evaluate current activities if provided
      if (currentActivities && currentActivities.length > 0) {
        currentActivityEvaluations = activityRecommendationService.evaluateCurrentActivities(
          report,
          currentActivities
        )
      }

      // Get location if provided
      if (address || city) {
        const venueSearchService = require('../services/venue-search.service').default
        const searchAddress = (address || city) as string
        const locationData = await venueSearchService.geocodeLocation(searchAddress)

        if (locationData) {
          location = { address: searchAddress }
          // Enrich with venues
          recommendations = await activityRecommendationService.enrichWithVenues(
            recommendations,
            locationData.latitude,
            locationData.longitude,
            10000
          )
        }
      }
    }

    // Prepare PDF data
    const pdfData = {
      studentName: student.name,
      grade: report.grade || student.grade || 'Not specified',
      reportDate: report.reportDate.toString(),
      summary: {
        overallPerformance: report.summary.overallPerformance,
        keyStrengths: report.summary.keyStrengths,
        areasNeedingAttention: report.summary.areasNeedingAttention,
        teacherHighlights: report.summary.teacherHighlights
      },
      currentActivities: req.body.currentActivities || [],
      currentActivityEvaluations,
      recommendations,
      location
    }

    // Generate and stream PDF
    pdfGeneratorService.generateReportPDF(pdfData, res)
  } catch (error) {
    console.error('Error generating PDF:', error)
    res.status(500).json({ error: 'Failed to generate PDF report' })
  }
}
