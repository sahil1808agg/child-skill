require('dotenv').config();
const mongoose = require('mongoose');

async function getStudentInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child');

    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));

    const report = await Report.findOne({}).sort({ createdAt: -1 }).lean();

    if (report) {
      const student = await Student.findById(report.studentId).lean();

      if (student) {
        console.log('=== STUDENT INFORMATION ===');
        console.log('Name:', student.name);
        console.log('Date of Birth:', student.dateOfBirth);
        console.log('Age:', Math.floor((new Date() - new Date(student.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)), 'years');
        console.log('Grade:', student.grade || 'Not specified');
        console.log('Location:', student.location || 'Not specified');
        console.log('School:', student.school || 'The Shri Ram Academy (from report)');
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getStudentInfo();
