const axios = require('axios');

axios.get('http://localhost:5000/api/reports/69533ee72474b8b5656c0e14/recommendations?lat=28.6139&lng=77.2090')
  .then(r => {
    console.log('\n✓ API Response Received\n');
    console.log('Location:', r.data.location);
    console.log('Recommendations:', r.data.recommendations.length);
    console.log();

    r.data.recommendations.forEach((rec, i) => {
      console.log(`${i+1}. ${rec.name}`);
      console.log(`   Venues found: ${rec.venues?.length || 0}`);

      if (rec.venues && rec.venues.length > 0) {
        rec.venues.slice(0, 3).forEach((v, j) => {
          console.log(`   ${j+1}. ${v.name}`);
          console.log(`      ${v.address}`);
          console.log(`      ${v.distance} away | Rating: ${v.rating || 'N/A'}/5`);
        });
      }
      console.log();
    });
  })
  .catch(e => {
    console.error('Error:', e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', e.response.data);
    }
  });
