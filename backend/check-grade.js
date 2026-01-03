require('dotenv').config();
const mongoose = require('mongoose');

async function checkGrade() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child';
    await mongoose.connect(MONGODB_URI);

    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    const report = await Report.findOne({}).sort({ createdAt: -1 }).lean();

    if (report) {
      console.log('=== LATEST REPORT ===');
      console.log('Report ID:', report._id);
      console.log('Created At:', report.createdAt);
      console.log('Report Type:', report.reportType);
      console.log('Grade (stored):', report.grade);
      console.log('Term:', report.term);
      console.log('\n=== EXTRACTED TEXT (first 3000 chars) ===');
      console.log(report.extractedText ? report.extractedText.substring(0, 3000) : 'No extracted text');

      // Try to find grade patterns in the text
      console.log('\n=== SEARCHING FOR GRADE PATTERNS ===');
      const text = report.extractedText || '';

      // Pattern 1: EYP/PYP followed by number and optionally a letter
      const eyp_pattern = /\b(EYP|PYP)\s+(\d+[A-Z]?)\b/i;
      const eyp_match = eyp_pattern.exec(text);
      if (eyp_match) console.log('EYP/PYP Pattern found:', eyp_match[0]);

      // Pattern 2: Class/Grade with value
      const class_pattern = /(?:class|grade)[:\s]+([^\n]{1,30})/i;
      const class_match = class_pattern.exec(text);
      if (class_match) console.log('Class/Grade Pattern found:', class_match[0]);

      // Find student name area
      const nameIndex = text.indexOf('Reyansh Aggarwal');
      if (nameIndex >= 0) {
        console.log('\n=== TEXT AROUND STUDENT NAME ===');
        console.log(text.substring(Math.max(0, nameIndex - 50), Math.min(text.length, nameIndex + 150)));
      }

      // Test new extraction logic
      console.log('\n=== TESTING NEW EXTRACTION LOGIC ===');
      const ibPattern = /\b(EYP|PYP|MYP|DP)\s+(\d+[A-Z]?)\b/i;
      const ibMatch = ibPattern.exec(text);
      if (ibMatch) {
        console.log('NEW LOGIC would extract grade as:', ibMatch[2]);
      } else {
        console.log('NEW LOGIC did not find IB pattern');
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

checkGrade();
