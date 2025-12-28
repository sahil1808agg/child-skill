/**
 * Test script to verify IB report parsing and analysis
 * This simulates uploading Reyansh's actual IB report
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import ocrService from './services/ocr.service'
import unifiedParserService from './services/unified-parser.service'
import unifiedAnalysisService from './services/unified-analysis.service'
import Student from './models/Student'
import Report from './models/Report'

dotenv.config()

async function testIBReport() {
  try {
    console.log('🧪 Testing IB Report Processing...\n')
    console.log('=' .repeat(80))

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child'
    await mongoose.connect(mongoUri)
    console.log('✓ Connected to MongoDB\n')

    // Path to Reyansh's report
    const reportPath = 'C:\\Users\\Sahil\\Downloads\\Reyansh_Aggarwal_34065_End Semester 1 Report 24-25 (1).pdf'

    console.log('📄 STEP 1: OCR Text Extraction')
    console.log('-'.repeat(80))
    const extractedText = await ocrService.extractText(reportPath, 'application/pdf')
    console.log(`✓ Extracted ${extractedText.length} characters from PDF`)
    console.log(`First 500 characters:\n${extractedText.substring(0, 500)}...\n`)

    console.log('🔍 STEP 2: Report Type Detection & Parsing')
    console.log('-'.repeat(80))
    const { reportType, data } = await unifiedParserService.parseReport(extractedText)
    console.log(`✓ Detected Report Type: ${reportType}`)
    console.log(`✓ Parsed Data:`)
    console.log(JSON.stringify(data, null, 2))
    console.log()

    // Check if student exists or create new one
    console.log('👤 STEP 3: Student Management')
    console.log('-'.repeat(80))
    let student = await Student.findOne({
      name: 'Reyansh Aggarwal',
      dateOfBirth: new Date('2020-08-01')
    })

    if (!student) {
      student = new Student({
        name: 'Reyansh Aggarwal',
        dateOfBirth: new Date('2020-08-01')
      })
      await student.save()
      console.log('✓ Created new student record')
    } else {
      console.log('✓ Found existing student record')
    }
    console.log(`Student ID: ${student._id}\n`)

    // Save report
    console.log('💾 STEP 4: Saving Report to Database')
    console.log('-'.repeat(80))
    const report = new Report({
      studentId: student._id,
      uploadedFile: reportPath,
      extractedText,
      reportType,
      ...data
    })
    await report.save()
    console.log('✓ Report saved successfully')
    console.log(`Report ID: ${report._id}`)
    console.log(`Report Type: ${report.reportType}`)
    console.log(`Report Date: ${report.reportDate}`)
    console.log(`Academic Year: ${report.academicYear}`)
    console.log(`Term: ${report.term}`)
    console.log(`Attendance: ${report.attendance}%`)

    if (report.ibSubjectAreas && report.ibSubjectAreas.length > 0) {
      console.log(`\n✓ IB Subject Areas (${report.ibSubjectAreas.length}):`)
      report.ibSubjectAreas.forEach(area => {
        console.log(`  - ${area.subjectName}: Effort Grade ${area.effortGrade || 'N/A'}`)
      })
    }

    if (report.learnerProfileAttributes && report.learnerProfileAttributes.length > 0) {
      console.log(`\n✓ Learner Profile Attributes (${report.learnerProfileAttributes.length}):`)
      report.learnerProfileAttributes.forEach(attr => {
        console.log(`  - ${attr.attribute}`)
      })
    }

    console.log()

    // Generate analysis
    console.log('📊 STEP 5: Generating Analysis')
    console.log('-'.repeat(80))
    const analysis = await unifiedAnalysisService.analyzeStudentProgress(student._id.toString())

    console.log('✓ Analysis completed!\n')

    console.log('🌟 STRENGTHS:')
    analysis.strengths.forEach((strength, i) => {
      console.log(`  ${i + 1}. ${strength}`)
    })

    console.log('\n📈 AREAS FOR IMPROVEMENT:')
    if (analysis.improvements.length > 0) {
      analysis.improvements.forEach((improvement, i) => {
        console.log(`  ${i + 1}. ${improvement}`)
      })
    } else {
      console.log('  (None identified)')
    }

    console.log('\n📉 TRENDS:')
    console.log(`  Improving: ${analysis.trends.improving.length > 0 ? analysis.trends.improving.join(', ') : 'None yet (single report)'}`)
    console.log(`  Declining: ${analysis.trends.declining.length > 0 ? analysis.trends.declining.join(', ') : 'None'}`)
    console.log(`  Stable: ${analysis.trends.stable.length > 0 ? analysis.trends.stable.join(', ') : 'None yet'}`)

    console.log('\n💡 RECOMMENDATIONS:')
    analysis.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('✅ TEST COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('\n❌ ERROR:', error)
    throw error
  } finally {
    await mongoose.disconnect()
    console.log('\n✓ Disconnected from MongoDB')
  }
}

// Run the test
testIBReport()
  .then(() => {
    console.log('\n✓ Test script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error)
    process.exit(1)
  })
