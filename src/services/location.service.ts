export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  forceRefresh?: boolean;
}

export interface HighAccuracyLocationOptions extends LocationOptions {
  enableHighAccuracy: true;
  timeout: 15000;  // 15 seconds for better accuracy
  maximumAge: 30000;  // 30 seconds max cache age
  forceRefresh?: boolean;
}

export interface LocationResult {
  success: boolean;
  location?: LocationCoordinates;
  error?: string;
  accuracy?: number;
  accuracyLevel?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  isWithinGeofence?: boolean;
  distance?: number;
}

class LocationService {
  private watchId: number | null = null;
  private currentLocation: LocationCoordinates | null = null;

  /**
   * Check if geolocation is available
   */
  isGeolocationAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current location with high accuracy
   */
  async getCurrentLocation(options: LocationOptions = {}): Promise<LocationResult> {
    const {
      enableHighAccuracy = true,
      timeout = 15000,
      maximumAge = 60000,
      forceRefresh = false
    } = options;

    if (!this.isGeolocationAvailable()) {
      return {
        success: false,
        error: 'Geolocation is not supported by this browser'
      };
    }

    // If forceRefresh is true, clear any existing watch and start fresh
    if (forceRefresh) {
      this.stopLocationWatch();
      this.currentLocation = null; // Clear cached location
    }

    for (let attempt = 1; attempt <= 3; attempt++) { // Maximum 3 attempts
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy,
              timeout,
              maximumAge
            }
          );
        });

        const location: LocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        };

        this.currentLocation = location;

        return {
          success: true,
          location,
          accuracy: location.accuracy,
          accuracyLevel: this.getAccuracyLevel(location.accuracy || 0)
        };
      } catch (error) {
        if (attempt === 3) { // Only return error after 3 attempts
          return {
            success: false,
            error: this.getLocationErrorMessage(error as GeolocationPositionError)
          };
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      success: false,
      error: 'Failed to get location after multiple attempts'
    };
  }

  /**
   * Check if current location is within a geofence
   */
  async isWithinGeofence(geofence: GeofenceLocation): Promise<LocationResult> {
    const locationResult = await this.getCurrentLocation();
    
    if (!locationResult.success || !locationResult.location) {
      return locationResult;
    }

    const distance = this.calculateDistance(
      locationResult.location,
      { latitude: geofence.latitude, longitude: geofence.longitude }
    );

    const isWithin = distance <= geofence.radius;

    return {
      success: true,
      location: locationResult.location,
      isWithinGeofence: isWithin,
      distance
    };
  }

  /**
   * Start watching location changes
   */
  startLocationWatch(
    callback: (result: LocationResult) => void,
    options: LocationOptions = {}
  ): boolean {
    if (!this.isGeolocationAvailable()) {
      callback({
        success: false,
        error: 'Geolocation is not supported by this browser'
      });
      return false;
    }

    const {
      enableHighAccuracy = true,
      timeout = 15000,
      maximumAge = 60000
    } = options;

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: LocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          };

          this.currentLocation = location;

          callback({
            success: true,
            location,
            accuracy: location.accuracy,
            accuracyLevel: this.getAccuracyLevel(location.accuracy || 0)
          });
        },
        (error) => {
          callback({
            success: false,
            error: this.getLocationErrorMessage(error as GeolocationPositionError)
          });
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );

      return true;
    } catch (error) {
      callback({
        success: false,
        error: 'Failed to start location watching'
      });
      return false;
    }
  }

  /**
   * Stop watching location changes
   */
  stopLocationWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Get cached location if available
   */
  getCachedLocation(): LocationCoordinates | null {
    return this.currentLocation;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    coord1: LocationCoordinates,
    coord2: LocationCoordinates
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get formatted distance string
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Get location error message
   */
  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services in your browser settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please check your GPS signal.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Failed to get location. Please try again.';
    }
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    if (!this.isGeolocationAvailable()) {
      return false;
    }

    try {
      // Try to get a quick location to trigger permission request
      const result = await this.getCurrentLocation({
        timeout: 5000,
        maximumAge: 0
      });
      
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get location accuracy level
   */
  getAccuracyLevel(accuracy: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 50) return 'Good';
    if (accuracy <= 100) return 'Fair';
    return 'Poor';
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Get high-accuracy location for mobile GPS tracking
   * Optimized for geofencing within 150-meter radius
   */
  async getHighAccuracyLocation(): Promise<LocationResult> {
    const options: HighAccuracyLocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,  // 15 seconds for better accuracy
      maximumAge: 30000,  // 30 seconds max cache age
      forceRefresh: true  // Force fresh GPS reading
    };

    return this.getCurrentLocation(options);
  }

  /**
   * Check if current location is within a geofence with high accuracy
   */
  async isWithinGeofenceHighAccuracy(geofence: GeofenceLocation): Promise<LocationResult> {
    const locationResult = await this.getHighAccuracyLocation();
    
    if (!locationResult.success || !locationResult.location) {
      return locationResult;
    }

    const distance = this.calculateDistance(
      locationResult.location,
      { latitude: geofence.latitude, longitude: geofence.longitude }
    );

    const isWithin = distance <= geofence.radius;

    return {
      success: true,
      location: locationResult.location,
      accuracy: locationResult.accuracy,
      accuracyLevel: locationResult.accuracyLevel,
      isWithinGeofence: isWithin,
      distance
    };
  }
}

export const locationService = new LocationService();
