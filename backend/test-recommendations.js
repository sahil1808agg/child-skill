const axios = require('axios');

async function testRecommendations() {
  try {
    // Get all students first
    const studentsResponse = await axios.get('http://localhost:5000/api/students');
    const students = studentsResponse.data;

    if (students.length === 0) {
      console.log('No students found');
      return;
    }

    // Get reports for the first student
    const student = students[0];
    const reportsResponse = await axios.get(`http://localhost:5000/api/students/${student._id}/reports`);
    const reports = reportsResponse.data;

    if (reports.length === 0) {
      console.log('No reports found');
      return;
    }

    const report = reports.find(r => r.grade === 'EYP 3') || reports[0];
    console.log(`Testing recommendations for report: ${report._id}`);
    console.log(`Grade: ${report.grade}, Report Type: ${report.reportType}\n`);

    // Display the summary to understand what we're working with
    if (report.summary) {
      console.log('='.repeat(80));
      console.log('REPORT SUMMARY');
      console.log('='.repeat(80));
      console.log('\nStrengths:');
      report.summary.keyStrengths?.slice(0, 3).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.substring(0, 100)}...`);
      });

      console.log('\nAreas for Growth:');
      report.summary.areasNeedingAttention?.slice(0, 3).forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.substring(0, 100)}...`);
      });
    }

    // Get recommendations
    console.log('\n' + '='.repeat(80));
    console.log('ACTIVITY RECOMMENDATIONS');
    console.log('='.repeat(80));

    const recommendationsResponse = await axios.get(`http://localhost:5000/api/reports/${report._id}/recommendations`);
    const data = recommendationsResponse.data;

    console.log(`\nTotal Recommendations: ${data.recommendations.length}\n`);

    data.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.name} (${rec.priority} Priority)`);
      console.log(`   Category: ${rec.category}`);
      console.log(`   Target Attributes: ${rec.targetAttributes.join(', ')}`);
      console.log(`   Why Recommended: ${rec.whyRecommended}`);
      console.log(`   Frequency: ${rec.frequency}`);
      console.log(`   Cost: ${rec.estimatedCost}`);
      console.log();
    });

    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testRecommendations();
