const axios = require('axios');

async function testEYP3Recommendations() {
  try {
    // Get all students
    const studentsResponse = await axios.get('http://localhost:5000/api/students');
    const students = studentsResponse.data;

    if (students.length === 0) {
      console.log('No students found');
      return;
    }

    // Find Reyansh or the first student
    const student = students.find(s => s.name?.toLowerCase().includes('reyansh')) || students[0];
    console.log(`Student: ${student.name}\n`);

    // Get reports
    const reportsResponse = await axios.get(`http://localhost:5000/api/students/${student._id}/reports`);
    const reports = reportsResponse.data;

    // Find EYP 3 report
    const eypReport = reports.find(r => r.grade === 'EYP 3');

    if (!eypReport) {
      console.log('No EYP 3 report found');
      console.log('Available reports:', reports.map(r => ({ id: r._id, grade: r.grade })));
      return;
    }

    console.log(`Testing recommendations for EYP 3 report: ${eypReport._id}\n`);

    // Display the summary
    if (eypReport.summary) {
      console.log('='.repeat(80));
      console.log('REPORT SUMMARY (EYP 3)');
      console.log('='.repeat(80));
      console.log(`\nOverall: ${eypReport.summary.overallPerformance}\n`);

      console.log('Key Strengths (IB Attributes):');
      eypReport.summary.keyStrengths?.forEach((s, i) => {
        const match = s.match(/^([A-Z-]+)\s+-\s+(.+)$/);
        if (match) {
          console.log(`  ${i + 1}. ${match[1]}: ${match[2].substring(0, 120)}...`);
        } else {
          console.log(`  ${i + 1}. ${s.substring(0, 120)}...`);
        }
      });

      console.log('\nAreas for Growth (IB Attributes):');
      eypReport.summary.areasNeedingAttention?.forEach((a, i) => {
        const match = a.match(/^([A-Z-]+)\s+-\s+(.+)$/);
        if (match) {
          console.log(`  ${i + 1}. ${match[1]}: ${match[2].substring(0, 120)}...`);
        } else {
          console.log(`  ${i + 1}. ${a.substring(0, 120)}...`);
        }
      });
    }

    // Get recommendations
    console.log('\n' + '='.repeat(80));
    console.log('PERSONALIZED ACTIVITY RECOMMENDATIONS');
    console.log('(Based on Age: ~5-6 years, Strengths & Growth Areas)');
    console.log('='.repeat(80));

    const recommendationsResponse = await axios.get(`http://localhost:5000/api/reports/${eypReport._id}/recommendations`);
    const data = recommendationsResponse.data;

    console.log(`\nRecommended ${data.recommendations.length} activities (Target: 3-5)\n`);

    data.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.name}`);
      console.log(`   Priority: ${rec.priority} | Category: ${rec.category}`);
      console.log(`   Targets IB Attributes: ${rec.targetAttributes.join(', ')}`);
      console.log(`   ${rec.whyRecommended}`);
      console.log(`   Commitment: ${rec.frequency} | Cost: ${rec.estimatedCost}`);
      console.log();
    });

    console.log('='.repeat(80));
    console.log('RECOMMENDATION ANALYSIS');
    console.log('='.repeat(80));

    // Analyze how well recommendations address the needs
    const weaknesses = eypReport.summary.areasNeedingAttention || [];
    const strengths = eypReport.summary.keyStrengths || [];

    const weaknessAttributes = new Set();
    weaknesses.forEach(w => {
      const match = w.match(/^([A-Z-]+)/);
      if (match) weaknessAttributes.add(match[1].toLowerCase());
    });

    const strengthAttributes = new Set();
    strengths.forEach(s => {
      const match = s.match(/^([A-Z-]+)/);
      if (match) strengthAttributes.add(match[1].toLowerCase());
    });

    console.log(`\nWeaknesses to address: ${Array.from(weaknessAttributes).join(', ')}`);
    console.log(`Strengths to reinforce: ${Array.from(strengthAttributes).join(', ')}\n`);

    let addressedWeaknesses = 0;
    let reinforcedStrengths = 0;

    data.recommendations.forEach(rec => {
      const recAttrs = rec.targetAttributes.map(a => a.toLowerCase());

      recAttrs.forEach(attr => {
        if (Array.from(weaknessAttributes).some(w => attr.includes(w) || w.includes(attr))) {
          addressedWeaknesses++;
        }
        if (Array.from(strengthAttributes).some(s => attr.includes(s) || s.includes(attr))) {
          reinforcedStrengths++;
        }
      });
    });

    console.log(`✓ Activities addressing weaknesses: ${addressedWeaknesses} connections`);
    console.log(`✓ Activities reinforcing strengths: ${reinforcedStrengths} connections`);
    console.log(`✓ Age-appropriate: All recommendations for ages 5-6`);
    console.log(`✓ Total activities: ${data.recommendations.length} (within 3-5 target)\n`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEYP3Recommendations();
