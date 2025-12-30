import axios from 'axios';

export interface Venue {
  name: string;
  address: string;
  distance?: string;
  rating?: number;
  totalRatings?: number;
  phone?: string;
  website?: string;
  placeId: string;
  latitude: number;
  longitude: number;
  types: string[];
}

export class VenueSearchService {
  private googleApiKey: string | undefined;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  }

  /**
   * Search for venues near a location for a specific activity
   */
  async searchVenuesForActivity(
    activityName: string,
    activityCategory: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000 // Default 5km radius
  ): Promise<Venue[]> {
    if (!this.googleApiKey) {
      console.log('Google Places API key not configured, skipping venue search');
      return [];
    }

    try {
      // Determine search keywords based on activity
      const searchQuery = this.buildSearchQuery(activityName, activityCategory);

      // Search using Google Places API (Nearby Search)
      const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      const params = {
        location: `${latitude},${longitude}`,
        radius: radiusMeters,
        keyword: searchQuery,
        key: this.googleApiKey
      };

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
        const venues = response.data.results.slice(0, 5).map((place: any) => this.formatVenue(place, latitude, longitude));
        return venues;
      } else {
        console.error('Google Places API error:', response.data.status);
        return [];
      }
    } catch (error) {
      console.error('Error searching venues:', error);
      return [];
    }
  }

  /**
   * Build search query based on activity type
   */
  private buildSearchQuery(activityName: string, activityCategory: string): string {
    const activityLower = activityName.toLowerCase();
    const categoryLower = activityCategory.toLowerCase();

    // Map activities to search terms
    if (activityLower.includes('gymnastics') || activityLower.includes('tumbling')) {
      return 'gymnastics school children';
    }
    if (activityLower.includes('swimming')) {
      return 'swimming lessons children pool';
    }
    if (activityLower.includes('multi-sport') || activityLower.includes('sports')) {
      return 'kids sports program recreation center';
    }
    if (activityLower.includes('yoga')) {
      return 'kids yoga mindfulness';
    }
    if (activityLower.includes('music')) {
      return 'music classes children';
    }
    if (activityLower.includes('language immersion') || activityLower.includes('language')) {
      return 'language school children immersion';
    }
    if (activityLower.includes('science exploration') || activityLower.includes('stem')) {
      return 'science center kids museum STEM';
    }
    if (activityLower.includes('drama') || activityLower.includes('theater')) {
      return 'theater arts drama kids';
    }
    if (activityLower.includes('art')) {
      return 'art classes children';
    }
    if (activityLower.includes('nature') || activityLower.includes('outdoor')) {
      return 'nature center outdoor education kids';
    }
    if (activityLower.includes('engineering') || activityLower.includes('building')) {
      return 'engineering kids robotics LEGO';
    }

    // Fallback: use category
    if (categoryLower.includes('physical')) {
      return 'kids sports recreation center';
    }
    if (categoryLower.includes('cultural')) {
      return 'cultural center kids classes';
    }
    if (categoryLower.includes('stem')) {
      return 'STEM education kids';
    }
    if (categoryLower.includes('creative')) {
      return 'art music theater kids classes';
    }

    // Default
    return `${activityName} children classes`;
  }

  /**
   * Format Google Places result into Venue object
   */
  private formatVenue(place: any, userLat: number, userLng: number): Venue {
    const venue: Venue = {
      name: place.name,
      address: place.vicinity || place.formatted_address || 'Address not available',
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      placeId: place.place_id,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      types: place.types || []
    };

    // Calculate distance
    venue.distance = this.calculateDistance(userLat, userLng, venue.latitude, venue.longitude);

    return venue;
  }

  /**
   * Get additional details for a venue (phone, website)
   */
  async getVenueDetails(placeId: string): Promise<{ phone?: string; website?: string }> {
    if (!this.googleApiKey) {
      return {};
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      const params = {
        place_id: placeId,
        fields: 'formatted_phone_number,website',
        key: this.googleApiKey
      };

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK') {
        return {
          phone: response.data.result.formatted_phone_number,
          website: response.data.result.website
        };
      }
    } catch (error) {
      console.error('Error getting venue details:', error);
    }

    return {};
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns formatted distance string
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    } else {
      return `${distanceKm.toFixed(1)} km`;
    }
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get user's location from IP address (fallback when browser geolocation not available)
   */
  async getLocationFromIP(): Promise<{ latitude: number; longitude: number; city: string } | null> {
    try {
      // Using ipapi.co free service
      const response = await axios.get('https://ipapi.co/json/');

      if (response.data.latitude && response.data.longitude) {
        return {
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          city: response.data.city || 'Unknown'
        };
      }
    } catch (error) {
      console.error('Error getting location from IP:', error);
    }

    return null;
  }

  /**
   * Geocode a city/address to coordinates
   */
  async geocodeLocation(address: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!this.googleApiKey) {
      return null;
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = {
        address: address,
        key: this.googleApiKey
      };

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng
        };
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
    }

    return null;
  }

  /**
   * Get autocomplete suggestions for a location query
   */
  async getLocationSuggestions(input: string): Promise<Array<{
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
  }>> {
    if (!this.googleApiKey) {
      console.log('Google Places API key not configured, cannot get autocomplete suggestions');
      return [];
    }

    if (!input || input.trim().length < 2) {
      return [];
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
      const params = {
        input: input.trim(),
        // Remove type restriction to allow all place types including:
        // - Cities and regions
        // - Specific addresses
        // - Establishments (buildings, societies, apartments)
        // - Landmarks
        key: this.googleApiKey
      };

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK' && response.data.predictions) {
        return response.data.predictions.map((prediction: any) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting.main_text,
          secondaryText: prediction.structured_formatting.secondary_text || ''
        }));
      }
    } catch (error) {
      console.error('Error getting location autocomplete:', error);
    }

    return [];
  }

  /**
   * Get place details by place ID (to get coordinates)
   */
  async getPlaceDetails(placeId: string): Promise<{ latitude: number; longitude: number; name: string } | null> {
    if (!this.googleApiKey) {
      return null;
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      const params = {
        place_id: placeId,
        fields: 'geometry,name',
        key: this.googleApiKey
      };

      const response = await axios.get(url, { params });

      if (response.data.status === 'OK' && response.data.result) {
        const result = response.data.result;
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          name: result.name
        };
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }

    return null;
  }
}

export default new VenueSearchService();
