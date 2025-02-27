import { useState, useEffect } from 'react';

export default function useLocation() {
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve(position);
        },
        error => {
          setError(error.message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  const watchPosition = (callback) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setWatching(true);
    const id = navigator.geolocation.watchPosition(
      position => {
        callback(position);
      },
      error => {
        setError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    setWatchId(id);
    return () => {
      navigator.geolocation.clearWatch(id);
      setWatching(false);
      setWatchId(null);
    };
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // Distance in meters
  };

  const formatLocation = (position) => {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
  };

  const getLocationHistory = async (employeeId, startDate, endDate) => {
    try {
      // TODO: Implement API call
      const response = await fetch(
        `/api/location-history?employeeId=${employeeId}&start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location history');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  };

  const clearLocationHistory = async (employeeId, before) => {
    try {
      // TODO: Implement API call
      const response = await fetch(
        `/api/location-history?employeeId=${employeeId}&before=${before}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to clear location history');
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  return {
    error,
    watching,
    getCurrentPosition,
    watchPosition,
    calculateDistance,
    formatLocation,
    getLocationHistory,
    clearLocationHistory
  };
}