const mongoose = require('mongoose');

async function checkGrade() {
  try {
    await mongoose.connect('mongodb://localhost:27017/enhance-your-child');

    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    const report = await Report.findOne({}).sort({ createdAt: -1 }).lean();

    if (report) {
      console.log('=== LATEST REPORT ===');
      console.log('Report Type:', report.reportType);
      console.log('Grade:', report.grade);
      console.log('Term:', report.term);
      console.log('\n=== EXTRACTED TEXT (first 2000 chars) ===');
      console.log(report.extractedText ? report.extractedText.substring(0, 2000) : 'No extracted text');
    } else {
      console.log('No reports found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkGrade();
