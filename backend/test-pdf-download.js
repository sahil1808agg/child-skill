require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function testPDFDownload() {
  try {
    // Get a report ID first
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);

    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
    const report = await Report.findOne().lean();

    if (!report) {
      console.log('No reports found in database');
      return;
    }

    console.log('Testing PDF download with report ID:', report._id);
    console.log('Report grade:', report.grade);
    console.log('\n');

    // Test PDF download with current activities
    console.log('Downloading PDF with recommendations and current activities...\n');

    const response = await axios.post(
      `http://localhost:5001/api/reports/${report._id}/download-pdf`,
      {
        includeRecommendations: true,
        address: 'Aparna Cyberzon, Hyderabad',
        currentActivities: ['Swimming', 'Reading Books', 'Piano Lessons']
      },
      {
        responseType: 'blob'
      }
    );

    // Save the PDF
    const filename = `test-report-${Date.now()}.pdf`;
    fs.writeFileSync(filename, response.data);

    console.log(`\n✓ PDF downloaded successfully: ${filename}`);
    console.log('Please check the backend console logs for current activities data');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPDFDownload();
