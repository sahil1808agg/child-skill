# Location-Based Activity Recommendations Setup

## Overview

The application now supports location-based activity recommendations! When you provide a location (coordinates or city name), the system will find nearby venues where the child can participate in recommended activities.

## API Usage

### Get Recommendations with Location

**Endpoint:** `GET /api/reports/:reportId/recommendations`

**Query Parameters:**

1. **Using Coordinates:**
   ```
   GET /api/reports/:reportId/recommendations?lat=28.6139&lng=77.2090
   ```
   or
   ```
   GET /api/reports/:reportId/recommendations?latitude=28.6139&longitude=77.2090
   ```

2. **Using City Name:**
   ```
   GET /api/reports/:reportId/recommendations?city=Delhi
   ```

3. **Using Full Address:**
   ```
   GET /api/reports/:reportId/recommendations?address=Connaught Place, Delhi
   ```

4. **Without Location** (no venues returned):
   ```
   GET /api/reports/:reportId/recommendations
   ```

### Response Format

```json
{
  "reportId": "...",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209
  },
  "recommendations": [
    {
      "id": "gymnastics-toddler",
      "name": "Gymnastics/Tumbling Program",
      "category": "Physical Development",
      "priority": "HIGH",
      "targetAttributes": ["Risk-taker", "Balanced", "Reflective"],
      "description": "...",
      "benefits": ["..."],
      "frequency": "2x per week, 45-60 minutes",
      "estimatedCost": "$100-150 per month",
      "whyRecommended": "...",
      "venues": [
        {
          "name": "Delhi Gymnastics Academy",
          "address": "123 Main Street, Delhi",
          "distance": "2.3 km",
          "rating": 4.5,
          "totalRatings": 150,
          "phone": "+91-123-456-7890",
          "website": "https://example.com",
          "placeId": "ChIJ...",
          "latitude": 28.6234,
          "longitude": 77.2145,
          "types": ["gym", "school"]
        }
      ]
    }
  ]
}
```

## Google Places API Setup

To enable venue search, you need a Google Places API key.

### Step 1: Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API**
   - **Geocoding API** (for city/address lookup)
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > API Key**
6. Copy your API key

### Step 2: Secure Your API Key (Recommended)

1. Click on your API key to edit it
2. Under **API restrictions**, select **Restrict key**
3. Choose:
   - Places API
   - Geocoding API
4. Under **Application restrictions**, add your domain/IP

### Step 3: Add to Environment Variables

Add the API key to your `.env` file in the backend directory:

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

**Example `.env` file:**
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/enhance-your-child

# API Keys
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Server
PORT=5000
```

### Step 4: Restart the Server

After adding the API key, restart the backend server:

```bash
cd backend
npm run dev
```

## Frontend Integration

### Option 1: Browser Geolocation

```javascript
// Get user's current location from browser
navigator.geolocation.getCurrentPosition(
  (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Fetch recommendations with location
    fetch(`/api/reports/${reportId}/recommendations?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(data => {
        // Display recommendations with venues
        console.log(data.recommendations);
      });
  },
  (error) => {
    console.error('Geolocation error:', error);
    // Fallback to asking for city name
  }
);
```

### Option 2: Manual Location Input

```javascript
// User enters their city
const city = userInput; // e.g., "Delhi"

fetch(`/api/reports/${reportId}/recommendations?city=${city}`)
  .then(res => res.json())
  .then(data => {
    // Display recommendations with venues
    console.log(data.recommendations);
  });
```

### Display Venues

```jsx
{recommendations.map(recommendation => (
  <div key={recommendation.id}>
    <h3>{recommendation.name}</h3>
    <p>{recommendation.description}</p>

    {recommendation.venues && recommendation.venues.length > 0 && (
      <div>
        <h4>Nearby Venues:</h4>
        <ul>
          {recommendation.venues.map(venue => (
            <li key={venue.placeId}>
              <strong>{venue.name}</strong>
              <p>{venue.address}</p>
              <p>Distance: {venue.distance}</p>
              {venue.rating && <p>Rating: {venue.rating}/5 ⭐</p>}
              {venue.phone && <p>Phone: {venue.phone}</p>}
              {venue.website && (
                <a href={venue.website} target="_blank">
                  Visit Website
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`}
                target="_blank"
              >
                Get Directions
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
))}
```

## Pricing

**Google Places API Pricing (as of 2024):**
- **Places Nearby Search:** $32 per 1000 requests
- **Geocoding:** $5 per 1000 requests
- **Place Details:** $17 per 1000 requests (if you fetch phone/website)

**Free Tier:** $200 credit per month (covers ~6,000 searches/month)

For a typical use case:
- 100 users/month × 2 searches each = 200 requests = ~$6.40/month
- Well within the free tier!

## Features

✓ Automatic venue search based on activity type
✓ Distance calculation from user location
✓ Rating and review information
✓ Phone numbers and websites (when available)
✓ Google Maps integration for directions
✓ Fallback to city/address if geolocation blocked
✓ Works without API key (just no venues shown)

## Supported Activity Types

The system intelligently maps activities to venue search queries:

- **Gymnastics** → "gymnastics school children"
- **Swimming** → "swimming lessons children pool"
- **Multi-Sport** → "kids sports program recreation center"
- **Yoga** → "kids yoga mindfulness"
- **Music** → "music classes children"
- **Language Immersion** → "language school children immersion"
- **Science/STEM** → "science center kids museum STEM"
- **Drama/Theater** → "theater arts drama kids"
- **Art** → "art classes children"
- **Nature/Outdoor** → "nature center outdoor education kids"
- **Engineering/Building** → "engineering kids robotics LEGO"

## Troubleshooting

### No venues returned

1. **Check API key:** Ensure `GOOGLE_PLACES_API_KEY` is set in `.env`
2. **Check API is enabled:** Verify Places API is enabled in Google Cloud Console
3. **Check quota:** You might have exceeded the free tier
4. **Check location:** Very rural areas may have no results (try increasing radius)
5. **Check logs:** Backend will log "Google Places API key not configured" if missing

### Geocoding fails for city name

1. Ensure Geocoding API is enabled
2. Try using full city name with country: "Delhi, India"
3. Fallback to asking user for coordinates

### Rate limiting

If you hit rate limits, you can:
1. Cache venue results for frequently searched locations
2. Increase the radius to return more results per search
3. Upgrade your Google Cloud billing plan
