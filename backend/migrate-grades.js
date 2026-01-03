require('dotenv').config();
const mongoose = require('mongoose');

// Grade extraction function (matches the updated logic)
function extractGrade(text) {
  if (!text) return undefined;

  // Pattern 1: IB formats like "EYP 3D", "PYP 1A", "MYP 2B"
  const ibPattern = /\b(EYP|PYP|MYP|DP)\s+(\d+[A-Z]?)\b/i;
  const ibMatch = ibPattern.exec(text);
  if (ibMatch) {
    return ibMatch[2].trim();
  }

  // Pattern 2: "Grade: 1" or "Class: 2" (but not "grade level")
  const gradePattern1 = /(?:^|[^\w])(?:grade|class)[\s:]+([a-z0-9-]+)(?:\s|$)/im;
  const match1 = gradePattern1.exec(text);
  if (match1 && match1[1].toLowerCase() !== 'level' && match1[1].length <= 10) {
    return match1[1].trim();
  }

  // Pattern 3: "1st Grade", "2nd Grade", "Kindergarten", "Pre-K"
  const gradePattern2 = /(pre-?k|kindergarten|nursery|(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\s+grade)/i;
  const match2 = gradePattern2.exec(text);
  if (match2) {
    const gradeText = match2[1].toLowerCase();
    if (gradeText.includes('pre-k') || gradeText.includes('prek')) {
      return 'Pre-K';
    } else if (gradeText.includes('kindergarten')) {
      return 'Kindergarten';
    } else if (gradeText.includes('nursery')) {
      return 'Nursery';
    } else {
      const numMatch = gradeText.match(/(\d+)/);
      if (numMatch) {
        return numMatch[1];
      }
    }
  }

  // Pattern 4: Look for standalone numbers near "grade" context
  const gradePattern3 = /(?:^|[^\w])grade\s+(\d+)(?:\s|$)/im;
  const match3 = gradePattern3.exec(text);
  if (match3) {
    return match3[1];
  }

  return undefined;
}

async function migrateGrades() {
  try {
    console.log('Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully\n');

    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    // Find all reports
    const reports = await Report.find({}).lean();
    console.log(`Found ${reports.length} reports to process\n`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (const report of reports) {
      try {
        const oldGrade = report.grade;
        const newGrade = extractGrade(report.extractedText);

        if (newGrade && newGrade !== oldGrade) {
          // Update the report
          await Report.updateOne(
            { _id: report._id },
            { $set: { grade: newGrade } }
          );

          console.log(`✓ Updated Report ${report._id}`);
          console.log(`  Old grade: "${oldGrade || 'undefined'}"`);
          console.log(`  New grade: "${newGrade}"`);
          console.log(`  Student: ${report.studentId || 'Unknown'}`);
          console.log(`  Term: ${report.term || 'Unknown'}\n`);

          updated++;
        } else if (newGrade === oldGrade) {
          unchanged++;
        } else {
          console.log(`⚠ No grade found for Report ${report._id} (${report.term})`);
          unchanged++;
        }
      } catch (err) {
        console.error(`✗ Error processing report ${report._id}:`, err.message);
        errors++;
      }
    }

    console.log('\n========== MIGRATION SUMMARY ==========');
    console.log(`Total reports:     ${reports.length}`);
    console.log(`Updated:           ${updated}`);
    console.log(`Unchanged:         ${unchanged}`);
    console.log(`Errors:            ${errors}`);
    console.log('=======================================\n');

    await mongoose.connection.close();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrateGrades();
