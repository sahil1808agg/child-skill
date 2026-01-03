require('dotenv').config();
const mongoose = require('mongoose');

async function getReportDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child');

    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    const report = await Report.findOne({}).sort({ createdAt: -1 }).lean();

    if (report) {
      console.log('=== STUDENT REPORT ANALYSIS ===\n');
      console.log('Grade Level:', report.grade);
      console.log('Report Type:', report.reportType);
      console.log('Term:', report.term);

      console.log('\n=== IB SUBJECT AREAS ===');
      if (report.ibSubjectAreas && report.ibSubjectAreas.length > 0) {
        report.ibSubjectAreas.forEach(area => {
          console.log(`\n${area.subjectName}: ${area.effortGrade || 'N/A'}`);
          if (area.skills && area.skills.length > 0) {
            area.skills.forEach(skill => {
              console.log(`  - ${skill.skillName}: ${skill.indicator}`);
            });
          }
        });
      }

      console.log('\n=== LEARNER PROFILE ATTRIBUTES ===');
      if (report.learnerProfileAttributes && report.learnerProfileAttributes.length > 0) {
        report.learnerProfileAttributes.forEach(attr => {
          console.log(`- ${attr.attribute}`);
          if (attr.evidence) {
            console.log(`  Evidence: ${attr.evidence.substring(0, 150)}...`);
          }
        });
      }

      console.log('\n=== TEACHER COMMENTS ===');
      console.log(report.teacherComments || 'No teacher comments');

      console.log('\n=== AI-GENERATED SUMMARY ===');
      if (report.summary) {
        console.log('\nOverall Performance:');
        console.log(report.summary.overallPerformance);

        console.log('\nKey Strengths:');
        report.summary.keyStrengths?.forEach((strength, i) => {
          console.log(`${i + 1}. ${strength}`);
        });

        console.log('\nAreas Needing Attention:');
        report.summary.areasNeedingAttention?.forEach((area, i) => {
          console.log(`${i + 1}. ${area}`);
        });

        console.log('\nTeacher Highlights:');
        report.summary.teacherHighlights?.forEach((highlight, i) => {
          console.log(`${i + 1}. ${highlight}`);
        });
      }

      console.log('\n=== AREAS OF STRENGTH ===');
      if (report.areasOfStrength && report.areasOfStrength.length > 0) {
        report.areasOfStrength.forEach(strength => {
          console.log(`- ${strength}`);
        });
      }

      console.log('\n=== AREAS OF IMPROVEMENT ===');
      if (report.areasOfImprovement && report.areasOfImprovement.length > 0) {
        report.areasOfImprovement.forEach(area => {
          console.log(`- ${area}`);
        });
      }
    } else {
      console.log('No reports found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getReportDetails();
