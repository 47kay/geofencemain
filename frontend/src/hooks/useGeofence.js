import { useContext } from 'react';
import GeofenceContext from '../contexts/GeofenceContext';
import useLocation from './useLocation';

export default function useGeofence() {
  const geofence = useContext(GeofenceContext);
  const { getCurrentPosition, watchPosition, calculateDistance } = useLocation();

  const checkGeofenceEntry = async (employeeId) => {
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const matchingGeofence = geofence.geofences.find(fence => {
        const distance = calculateDistance(
          latitude,
          longitude,
          fence.coordinates.lat,
          fence.coordinates.lng
        );
        return distance <= fence.radius;
      });

      if (matchingGeofence) {
        const record = {
          employeeId,
          geofenceId: matchingGeofence.id,
          type: 'entry',
          timestamp: new Date().toISOString(),
          coordinates: { latitude, longitude }
        };

        // TODO: Implement API call
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(record),
        });

        if (!response.ok) {
          throw new Error('Failed to record attendance');
        }

        const data = await response.json();
        geofence.addAttendanceRecord(data);
        return { inGeofence: true, geofence: matchingGeofence };
      }

      return { inGeofence: false, geofence: null };
    } catch (error) {
      throw error;
    }
  };

  const startGeofenceMonitoring = (employeeId, onEntry, onExit) => {
    return watchPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Update employee location
      geofence.updateEmployeeLocation(employeeId, { latitude, longitude });

      // Check each geofence
      geofence.geofences.forEach(fence => {
        const distance = calculateDistance(
          latitude,
          longitude,
          fence.coordinates.lat,
          fence.coordinates.lng
        );

        const wasInside = geofence.employeeLocations[employeeId]?.lastGeofence === fence.id;
        const isInside = distance <= fence.radius;

        if (!wasInside && isInside) {
          onEntry && onEntry(fence);
          checkGeofenceEntry(employeeId);
        } else if (wasInside && !isInside) {
          onExit && onExit(fence);
          // Record exit
          const record = {
            employeeId,
            geofenceId: fence.id,
            type: 'exit',
            timestamp: new Date().toISOString(),
            coordinates: { latitude, longitude }
          };
          geofence.addAttendanceRecord(record);
        }
      });
    });
  };

  const getGeofenceStatus = async (employeeId) => {
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      return geofence.geofences.map(fence => {
        const distance = calculateDistance(
          latitude,
          longitude,
          fence.coordinates.lat,
          fence.coordinates.lng
        );

        return {
          ...fence,
          distance,
          isInside: distance <= fence.radius
        };
      });
    } catch (error) {
      throw error;
    }
  };

  const getAttendanceRecords = async (employeeId, startDate, endDate) => {
    try {
      // TODO: Implement API call
      const response = await fetch(
        `/api/attendance?employeeId=${employeeId}&start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  };

  return {
    geofences: geofence.geofences,
    activeGeofence: geofence.activeGeofence,
    loading: geofence.loading,
    error: geofence.error,
    employeeLocations: geofence.employeeLocations,
    attendanceRecords: geofence.attendanceRecords,
    fetchGeofences: geofence.fetchGeofences,
    setActiveGeofence: geofence.setActiveGeofence,
    addGeofence: geofence.addGeofence,
    updateGeofence: geofence.updateGeofence,
    deleteGeofence: geofence.deleteGeofence,
    checkGeofenceEntry,
    startGeofenceMonitoring,
    getGeofenceStatus,
    getAttendanceRecords,
    clearError: geofence.clearError
  };
}