require('dotenv').config();
const mongoose = require('mongoose');

async function directUpdateSummary() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child');
    console.log('Connected to MongoDB\n');

    const summary = {
      overallPerformance: "As a EYP 3 student in the IB Early Years Programme, Reyansh demonstrates strong overall development, consistently exceeding expectations in attributes like Communicator and Thinker. He shows great enthusiasm and curiosity, though continued focus on developing Open-mindedness and Reflectiveness will further enhance his holistic growth.",
      keyStrengths: [
        "COMMUNICATOR - Reyansh expresses himself confidently and creatively in more than one language and in many ways, demonstrating particular strength in early writing with excellent spacing and direction, which significantly exceeds the EYP 3 expectation of merely 'developing language skills' and 'expressing ideas in multiple ways'.",
        "INQUIRER - Reyansh is a positive and curious student who actively engages in Hindi lessons, participating enthusiastically in stories and rhymes, which goes beyond the EYP 3 standard of simply 'showing curiosity' and 'exploring with support'.",
        "THINKER - Reyansh confidently contributes thoughtful insights during class discussions, indicating a level of critical engagement and initiative that surpasses the EYP 3 expectation of 'making simple choices' and 'beginning problem-solving'.",
        "PRINCIPLED - Reyansh demonstrates a strong sense of fairness and justice, which clearly exceeds the EYP 3 standard of 'understanding right and wrong' and 'developing self-regulation'."
      ],
      areasNeedingAttention: [
        "OPEN-MINDED - The report lacks specific evidence of Reyansh showing interest in others' cultures or traditions, indicating he is developing toward the EYP 3 expectation of 'showing interest in others, beginning cultural awareness'.",
        "REFLECTIVE - There is no explicit evidence in the report detailing Reyansh's ability to think about his own learning and actions, suggesting this attribute is developing toward the EYP 3 standard of 'beginning to think about own learning and actions'.",
        "CARING - While Reyansh has a positive attitude, the report does not provide specific examples of him showing empathy or helping others, indicating this attribute is developing toward the EYP 3 expectation of 'showing empathy, helps others with prompting'."
      ],
      teacherHighlights: [
        "Reyansh excels in early writing, forming letters and words with excellent spacing and direction, which is a key demonstration of the COMMUNICATOR attribute.",
        "He is a positive and curious student who actively engages in Hindi lessons, showcasing his INQUIRER and RISK-TAKER attributes by participating enthusiastically.",
        "Reyansh confidently contributes thoughtful insights during class discussions and demonstrates a strong sense of fairness and justice, highlighting his THINKER and PRINCIPLED attributes."
      ],
      generatedAt: new Date()
    };

    const result = await mongoose.connection.db.collection('reports').updateOne(
      { grade: 'EYP 3' },
      { $set: { summary } }
    );

    console.log(`Updated ${result.modifiedCount} reports`);
    console.log(`Matched ${result.matchedCount} reports\n`);

    // Verify
    const report = await mongoose.connection.db.collection('reports').findOne({ grade: 'EYP 3' });
    console.log('Verified - Summary updated:');
    console.log('\nOverall Performance:');
    console.log(report?.summary?.overallPerformance);
    console.log('\nKey Strengths:');
    report?.summary?.keyStrengths?.forEach((s, i) => console.log(`${i + 1}. ${s}`));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

directUpdateSummary();
