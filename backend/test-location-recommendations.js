const axios = require('axios');

async function testLocationRecommendations() {
  try {
    console.log('='.repeat(80));
    console.log('TESTING LOCATION-BASED ACTIVITY RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log();

    // Get students
    const studentsResponse = await axios.get('http://localhost:5000/api/students');
    const students = studentsResponse.data;

    if (students.length === 0) {
      console.log('No students found');
      return;
    }

    // Get reports
    const student = students[0];
    const reportsResponse = await axios.get(`http://localhost:5000/api/students/${student._id}/reports`);
    const reports = reportsResponse.data;

    const eypReport = reports.find(r => r.grade === 'EYP 3') || reports[0];

    console.log(`Student: ${student.name}`);
    console.log(`Report: ${eypReport._id} (Grade: ${eypReport.grade})`);
    console.log();

    // Test 1: Without location (no venues)
    console.log('='.repeat(80));
    console.log('TEST 1: Recommendations WITHOUT Location');
    console.log('='.repeat(80));
    console.log();

    const resp1 = await axios.get(`http://localhost:5000/api/reports/${eypReport._id}/recommendations`);
    console.log(`Number of recommendations: ${resp1.data.recommendations.length}`);
    console.log(`Location provided: ${resp1.data.location ? 'Yes' : 'No'}`);
    console.log();

    resp1.data.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.name}`);
      console.log(`   Venues: ${rec.venues ? rec.venues.length + ' found' : 'None (no location provided)'}`);
    });

    console.log();

    // Test 2: With coordinates (Delhi, India)
    console.log('='.repeat(80));
    console.log('TEST 2: Recommendations WITH Location (Delhi coordinates)');
    console.log('='.repeat(80));
    console.log();

    const delhiLat = 28.6139;
    const delhiLng = 77.2090;

    const resp2 = await axios.get(
      `http://localhost:5000/api/reports/${eypReport._id}/recommendations?lat=${delhiLat}&lng=${delhiLng}`
    );

    console.log(`Number of recommendations: ${resp2.data.recommendations.length}`);
    console.log(`Location: ${resp2.data.location ? JSON.stringify(resp2.data.location) : 'None'}`);
    console.log();

    resp2.data.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.name} (${rec.category})`);
      console.log(`   Targets: ${rec.targetAttributes.join(', ')}`);

      if (rec.venues && rec.venues.length > 0) {
        console.log(`   Nearby Venues (${rec.venues.length}):`);
        rec.venues.forEach((venue, j) => {
          console.log(`     ${j + 1}. ${venue.name}`);
          console.log(`        ${venue.address}`);
          console.log(`        Distance: ${venue.distance}`);
          if (venue.rating) {
            console.log(`        Rating: ${venue.rating}/5 (${venue.totalRatings || 0} reviews)`);
          }
        });
      } else {
        console.log(`   No venues found nearby (may need Google Places API key)`);
      }
      console.log();
    });

    // Test 3: With city name
    console.log('='.repeat(80));
    console.log('TEST 3: Recommendations WITH City Name');
    console.log('='.repeat(80));
    console.log();

    try {
      const resp3 = await axios.get(
        `http://localhost:5000/api/reports/${eypReport._id}/recommendations?city=Delhi`
      );

      console.log(`City geocoded to: ${JSON.stringify(resp3.data.location)}`);
      console.log(`Number of recommendations: ${resp3.data.recommendations.length}`);
      console.log(`Venues in first recommendation: ${resp3.data.recommendations[0].venues?.length || 0}`);
    } catch (error) {
      console.log(`Error with city geocoding (expected if no Google API key): ${error.response?.data?.error || error.message}`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('NOTES:');
    console.log('='.repeat(80));
    console.log('- Venue search requires GOOGLE_PLACES_API_KEY in .env file');
    console.log('- Without API key, recommendations work but venues will be empty');
    console.log('- API accepts: ?lat=X&lng=Y or ?city=CityName or ?address=FullAddress');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testLocationRecommendations();
