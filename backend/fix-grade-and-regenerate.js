require('dotenv').config();
const mongoose = require('mongoose');

async function fixGradeAndRegenerate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child');
    console.log('Connected to MongoDB\n');

    // Import the service
    const { SummarizationService } = require('./dist/services/summarization.service.js');
    const summarizationService = new SummarizationService();

    // Get Report model
    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    // Find the report with grade "EYP 3"
    const report = await Report.findOne({ grade: 'EYP 3' });

    if (!report) {
      console.log('No report found with grade "EYP 3"');
      await mongoose.connection.close();
      return;
    }

    console.log(`Found report: ${report._id}`);
    console.log(`Current grade: ${report.grade}`);

    // Convert to plain object for summary generation
    const reportData = report.toObject();

    // Generate new summary with corrected grade
    console.log('Regenerating summary with correct grade...\n');
    const newSummary = await summarizationService.generateReportSummary(reportData);

    // Update the report
    report.summary = newSummary;
    await report.save();

    console.log('✓ Report updated successfully!\n');
    console.log('='.repeat(80));
    console.log('UPDATED REPORT SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nGrade: ${report.grade}`);
    console.log('\nOVERALL PERFORMANCE:');
    console.log(newSummary.overallPerformance);

    console.log('\nKEY STRENGTHS:');
    newSummary.keyStrengths?.forEach((strength, i) => {
      console.log(`${i + 1}. ${strength}`);
    });

    console.log('\nAREAS FOR GROWTH:');
    newSummary.areasNeedingAttention?.forEach((area, i) => {
      console.log(`${i + 1}. ${area}`);
    });

    console.log('\nTEACHER HIGHLIGHTS:');
    newSummary.teacherHighlights?.forEach((highlight, i) => {
      console.log(`${i + 1}. ${highlight}`);
    });

    console.log('\n' + '='.repeat(80));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixGradeAndRegenerate();
