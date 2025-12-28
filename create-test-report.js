const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/enhance-your-child', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define Report schema (simplified)
const reportSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  reportDate: Date,
  academicYear: String,
  term: String,
  reportType: String,
  ibSubjectAreas: [{
    subjectName: String,
    effortGrade: String,
    skills: [String]
  }],
  areasOfStrength: [String],
  areasOfImprovement: [String],
  subjects: [],
  teacherComments: String
});

const Report = mongoose.model('Report', reportSchema);

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
        { subjectName: 'Arts', effortGrade: 'E', skills: [] },  // Improved from A to E
        { subjectName: 'Mathematics', effortGrade: 'D', skills: [] },  // New subject at D
        { subjectName: 'Language', effortGrade: 'A', skills: [] }  // New subject at A
      ],
      areasOfStrength: ['Excellent progress in Arts - moved to Excelling level', 'Strong mathematical thinking'],
      areasOfImprovement: [],
      subjects: [],
      teacherComments: 'Great progress this trimester!'
    });

    await report.save();
    console.log('Test report created successfully!');
    console.log('Report ID:', report._id);
    process.exit(0);
  } catch (error) {
    console.error('Error creating report:', error);
    process.exit(1);
  }
}

createTestReport();
