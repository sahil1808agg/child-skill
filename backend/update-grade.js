require('dotenv').config();
const mongoose = require('mongoose');

async function updateGrade() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child');
    console.log('Connected to MongoDB\n');

    // Update all reports with grade "3D" to "EYP 3"
    const result = await mongoose.connection.db.collection('reports').updateMany(
      { grade: '3D' },
      { $set: { grade: 'EYP 3' } }
    );

    console.log(`Updated ${result.modifiedCount} reports`);
    console.log(`Matched ${result.matchedCount} reports\n`);

    // Verify the update
    const report = await mongoose.connection.db.collection('reports').findOne({});
    console.log('Verified - Grade is now:', report?.grade);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateGrade();
