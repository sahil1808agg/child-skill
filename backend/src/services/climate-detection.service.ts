/**
 * Climate Detection Service
 *
 * Provides utilities for detecting climate zones and regional characteristics
 * based on geographic coordinates.
 */

export type ClimateZone = 'tropical' | 'subtropical' | 'temperate' | 'cold' | 'arid'

/**
 * Detects the climate zone based on latitude and longitude
 * Uses simplified latitude-based zones with regional adjustments
 *
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @returns ClimateZone classification
 */
export function detectClimateZone(latitude: number, longitude: number): ClimateZone {
  const absLat = Math.abs(latitude)

  // Arid zones (major deserts and dry regions)
  // Middle East, North Africa, Central Australia, Southwest US
  if (isAridRegion(latitude, longitude)) {
    return 'arid'
  }

  // Tropical zone: ±23.5° (Tropic of Cancer to Tropic of Capricorn)
  if (absLat <= 23.5) {
    return 'tropical'
  }

  // Subtropical zone: 23.5° to 35°
  if (absLat <= 35) {
    return 'subtropical'
  }

  // Temperate zone: 35° to 50°
  if (absLat <= 50) {
    return 'temperate'
  }

  // Cold zone: 50° to 90° (polar regions)
  return 'cold'
}

/**
 * Checks if coordinates fall within major arid (desert) regions
 *
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @returns true if location is in an arid region
 */
function isAridRegion(latitude: number, longitude: number): boolean {
  // Middle East & Arabian Peninsula: 15-35°N, 35-60°E
  if (latitude >= 15 && latitude <= 35 && longitude >= 35 && longitude <= 60) {
    return true
  }

  // North Africa (Sahara): 15-35°N, -15-35°E
  if (latitude >= 15 && latitude <= 35 && longitude >= -15 && longitude <= 35) {
    return true
  }

  // Central Australia: -30 to -20°S, 115-145°E
  if (latitude >= -30 && latitude <= -20 && longitude >= 115 && longitude <= 145) {
    return true
  }

  // Southwest US & Mexico: 25-40°N, -120 to -100°W
  if (latitude >= 25 && latitude <= 40 && longitude >= -120 && longitude <= -100) {
    return true
  }

  return false
}

/**
 * Checks if coordinates are in a coastal region
 * Uses simplified regional checks for major coastal areas
 *
 * @param latitude - Latitude in decimal degrees
 * @param longitude - Longitude in decimal degrees
 * @returns true if location is coastal
 */
export function isCoastalRegion(latitude: number, longitude: number): boolean {
  // This is a simplified implementation
  // In a production system, you'd use a proper coastal detection API
  // or geospatial database

  // Major coastal cities and regions:

  // India coastal regions
  // West coast (Mumbai, Goa): 8-22°N, 72-76°E
  if (latitude >= 8 && latitude <= 22 && longitude >= 72 && longitude <= 76) {
    return true
  }
  // East coast (Chennai, Vizag): 8-22°N, 78-85°E
  if (latitude >= 8 && latitude <= 22 && longitude >= 78 && longitude <= 85) {
    return true
  }

  // Southeast Asia coastal
  // Thailand, Malaysia, Indonesia: -10 to 20°N, 95-125°E
  if (latitude >= -10 && latitude <= 20 && longitude >= 95 && longitude <= 125) {
    const isInland = (latitude >= 5 && latitude <= 15 && longitude >= 100 && longitude <= 105)
    if (!isInland) return true
  }

  // Singapore (island nation)
  if (latitude >= 1.2 && latitude <= 1.5 && longitude >= 103.6 && longitude <= 104.0) {
    return true
  }

  // UAE coastal (Dubai, Abu Dhabi): 24-26°N, 54-56°E
  if (latitude >= 24 && latitude <= 26 && longitude >= 54 && longitude <= 56) {
    return true
  }

  // Australia coastal (major cities)
  // Sydney, Melbourne, Brisbane: -38 to -27°S, 150-154°E (east coast)
  if (latitude >= -38 && latitude <= -27 && longitude >= 150 && longitude <= 154) {
    return true
  }
  // Perth: -32 to -31°S, 115-116°E (west coast)
  if (latitude >= -32 && latitude <= -31 && longitude >= 115 && longitude <= 116) {
    return true
  }

  // US coastal regions
  // California coast: 32-42°N, -125 to -117°W
  if (latitude >= 32 && latitude <= 42 && longitude >= -125 && longitude <= -117) {
    return true
  }
  // Florida: 24-31°N, -87 to -80°W
  if (latitude >= 24 && latitude <= 31 && longitude >= -87 && longitude <= -80) {
    return true
  }
  // Northeast coast (NYC, Boston): 38-43°N, -75 to -70°W
  if (latitude >= 38 && latitude <= 43 && longitude >= -75 && longitude <= -70) {
    return true
  }

  // UK coastal (island nation): 50-59°N, -6 to 2°E
  if (latitude >= 50 && latitude <= 59 && longitude >= -6 && longitude <= 2) {
    return true
  }

  // Mediterranean coastal: 35-45°N, -5 to 20°E
  if (latitude >= 35 && latitude <= 45 && longitude >= -5 && longitude <= 20) {
    return true
  }

  return false
}

/**
 * Gets a human-readable description of the climate zone
 *
 * @param zone - ClimateZone type
 * @returns Description string
 */
export function getClimateDescription(zone: ClimateZone): string {
  const descriptions: Record<ClimateZone, string> = {
    tropical: 'Warm year-round with high humidity',
    subtropical: 'Hot summers with mild winters',
    temperate: 'Four distinct seasons with moderate temperatures',
    cold: 'Cold winters with short summers',
    arid: 'Dry climate with minimal rainfall'
  }

  return descriptions[zone]
}

/**
 * Suggests seasonal considerations for activity planning
 *
 * @param zone - ClimateZone type
 * @returns Array of seasonal recommendation strings
 */
export function getSeasonalRecommendations(zone: ClimateZone): string[] {
  const recommendations: Record<ClimateZone, string[]> = {
    tropical: [
      'Indoor activities recommended during monsoon season',
      'Early morning or evening outdoor activities to avoid midday heat',
      'Water activities available year-round'
    ],
    subtropical: [
      'Outdoor activities ideal in winter and early spring',
      'Indoor alternatives recommended during hot summer months',
      'Swimming popular in summer'
    ],
    temperate: [
      'Outdoor activities best in spring and fall',
      'Winter sports available in cold months',
      'Indoor activities recommended in extreme temperatures'
    ],
    cold: [
      'Winter sports and activities during long cold season',
      'Indoor activities dominant for much of the year',
      'Outdoor activities concentrated in short summer'
    ],
    arid: [
      'Early morning or evening outdoor activities',
      'Indoor air-conditioned venues preferred',
      'Water activities especially valued'
    ]
  }

  return recommendations[zone]
}

export default {
  detectClimateZone,
  isCoastalRegion,
  getClimateDescription,
  getSeasonalRecommendations
}
