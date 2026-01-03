require('dotenv').config();
const mongoose = require('mongoose');

async function regenerateSummaries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child');
    console.log('Connected to MongoDB\n');

    // Import the service
    const { SummarizationService } = require('./dist/services/summarization.service.js');
    const summarizationService = new SummarizationService();

    // Get Report model
    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    // Find all reports
    const reports = await Report.find({}).lean();
    console.log(`Found ${reports.length} reports\n`);

    for (const report of reports) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Regenerating summary for report: ${report._id}`);
      console.log(`Grade: ${report.grade}, Type: ${report.reportType}`);
      console.log(`${'='.repeat(80)}\n`);

      try {
        // Generate new summary
        const newSummary = await summarizationService.generateReportSummary(report);

        // Update in database
        await Report.updateOne(
          { _id: report._id },
          { $set: { summary: newSummary } }
        );

        console.log('✓ Summary regenerated successfully\n');
        console.log('OVERALL PERFORMANCE:');
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

      } catch (error) {
        console.error(`✗ Error regenerating summary for report ${report._id}:`, error.message);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('All summaries regenerated!');
    console.log(`${'='.repeat(80)}\n`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

regenerateSummaries();
