require('dotenv').config();

console.log('\n=== Environment Variables ===');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET (' + process.env.GOOGLE_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
console.log('GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY ? 'SET (' + process.env.GOOGLE_PLACES_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('=== End ===\n');
