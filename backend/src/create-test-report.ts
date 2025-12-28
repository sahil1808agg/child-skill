import mongoose from 'mongoose';
import Report from './models/Report';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/enhance-your-child');

async function createTestReport() {
  try {
    const report = new Report({
      studentId: '695134071909236a8065af3e',
      reportDate: new Date('2026-03-15'),
      academicYear: '2025-2026',
      term: 'Trimester 2',
      reportType: 'ib-standards',
      ibSubjectAreas: [
        { subjectName: 'Hindi', effortGrade: 'A', skills: [] },
        { subjectName: 'PSPE', effortGrade: 'A', skills: [] },
        { subjectName: 'Arts', effortGrade: 'E', skills: [] },  // Improved from A to E (Excelling)
        { subjectName: 'Mathematics', effortGrade: 'D', skills: [] },  // New subject at D (Developing)
        { subjectName: 'Language', effortGrade: 'A', skills: [] }  // New subject at A (Achieving)
      ],
      areasOfStrength: ['Excellent progress in Arts - moved to Excelling level', 'Strong mathematical thinking'],
      areasOfImprovement: [],
      subjects: [],
      teacherComments: 'Great progress this trimester!',
      attendance: 92,
      uploadedFile: 'test-report-2.pdf',
      extractedText: 'Test report for progress analysis'
    });

    await report.save();
    console.log('Test report created successfully!');
    console.log('Report ID:', report._id);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating report:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createTestReport();
