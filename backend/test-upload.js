const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function testUpload() {
  try {
    // You can change this to any PDF file path
    const pdfPath = process.argv[2] || 'C:\\Users\\Sahil\\Downloads\\1st_sem (1).pdf';

    if (!fs.existsSync(pdfPath)) {
      console.error(`File not found: ${pdfPath}`);
      console.log('\nUsage: node test-upload.js <path-to-pdf>');
      process.exit(1);
    }

    console.log(`Uploading: ${pdfPath}\n`);

    const form = new FormData();
    form.append('report', fs.createReadStream(pdfPath));
    form.append('studentName', 'Test Student');
    form.append('dateOfBirth', '2015-01-15');

    const response = await axios.post('http://localhost:5000/api/reports/upload', form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✓ Upload successful!\n');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n='.repeat(80));
    console.log('Now checking the report details...\n');

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the report details
    const reportId = response.data.reportId;
    const reportResponse = await axios.get(`http://localhost:5000/api/reports/${reportId}`);
    const report = reportResponse.data;

    console.log('REPORT ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Grade Level: ${report.grade}`);
    console.log(`Report Type: ${report.reportType}`);
    console.log(`Term: ${report.term}`);

    if (report.summary) {
      console.log('\n--- OVERALL PERFORMANCE ---');
      console.log(report.summary.overallPerformance);

      console.log('\n--- KEY STRENGTHS ---');
      report.summary.keyStrengths?.forEach((s, i) => {
        console.log(`${i + 1}. ${s}`);
      });

      console.log('\n--- AREAS FOR GROWTH ---');
      report.summary.areasNeedingAttention?.forEach((a, i) => {
        console.log(`${i + 1}. ${a}`);
      });

      console.log('\n--- TEACHER HIGHLIGHTS ---');
      report.summary.teacherHighlights?.forEach((h, i) => {
        console.log(`${i + 1}. ${h}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✓ Test complete!');

  } catch (error) {
    console.error('Error uploading report:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testUpload();
