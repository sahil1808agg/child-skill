require('dotenv').config();
const axios = require('axios');

async function testParentActions() {
  try {
    // Get a report ID first
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);

    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
    const report = await Report.findOne().lean();

    if (!report) {
      console.log('No reports found in database');
      return;
    }

    console.log('Testing with report ID:', report._id);
    console.log('Report grade:', report.grade);
    console.log('\n');

    // Make API request with current activities
    console.log('Test 1: With reading activity only\n');
    const response1 = await axios.get(`http://localhost:5001/api/reports/${report._id}/recommendations`, {
      params: {
        address: 'Aparna Cyberzon, Hyderabad',
        currentActivities: ['Reading Books']
      }
    });

    console.log(`Parent actions returned: ${response1.data.parentActions.length}`);
    response1.data.parentActions.forEach((action, i) => {
      console.log(`${i + 1}. ${action.title}`);
    });

    console.log('\n\nTest 2: With NO current activities\n');
    const response = await axios.get(`http://localhost:5001/api/reports/${report._id}/recommendations`, {
      params: {
        address: 'Aparna Cyberzon, Hyderabad'
      }
    });

    console.log('=== PARENT ACTIONS RESPONSE ===\n');

    const parentActions = response.data.parentActions;

    if (!parentActions || parentActions.length === 0) {
      console.log('No parent actions returned');
    } else {
      console.log(`Total parent actions: ${parentActions.length}\n`);

      parentActions.forEach((action, index) => {
        console.log(`${index + 1}. ${action.title}`);
        console.log(`   Category: ${action.category}`);
        console.log(`   Target Area: ${action.targetArea}`);
        console.log(`   Priority: ${action.priority}`);
        console.log(`   Description: ${action.description.substring(0, 100)}...`);
        console.log(`   Activities (${action.activities.length}):`);

        action.activities.forEach((activity, i) => {
          console.log(`     ${i + 1}. ${activity.activity}`);
          console.log(`        First tip: ${activity.tips[0].substring(0, 80)}...`);
        });
        console.log('');
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testParentActions();
