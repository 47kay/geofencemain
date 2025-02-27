import React, { createContext, useReducer, useContext } from 'react';

const GeofenceContext = createContext();

const initialState = {
  geofences: [],
  activeGeofence: null,
  loading: false,
  error: null,
  employeeLocations: {},
  attendanceRecords: []
};

const geofenceReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_GEOFENCES_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_GEOFENCES_SUCCESS':
      return {
        ...state,
        geofences: action.payload,
        loading: false,
        error: null
      };
    case 'FETCH_GEOFENCES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'SET_ACTIVE_GEOFENCE':
      return {
        ...state,
        activeGeofence: action.payload
      };
    case 'ADD_GEOFENCE':
      return {
        ...state,
        geofences: [...state.geofences, action.payload]
      };
    case 'UPDATE_GEOFENCE':
      return {
        ...state,
        geofences: state.geofences.map(geofence =>
          geofence.id === action.payload.id ? action.payload : geofence
        )
      };
    case 'DELETE_GEOFENCE':
      return {
        ...state,
        geofences: state.geofences.filter(geofence => 
          geofence.id !== action.payload
        )
      };
    case 'UPDATE_EMPLOYEE_LOCATION':
      return {
        ...state,
        employeeLocations: {
          ...state.employeeLocations,
          [action.payload.employeeId]: action.payload.location
        }
      };
    case 'ADD_ATTENDANCE_RECORD':
      return {
        ...state,
        attendanceRecords: [...state.attendanceRecords, action.payload]
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export function GeofenceProvider({ children }) {
  const [state, dispatch] = useReducer(geofenceReducer, initialState);

  const fetchGeofences = async () => {
    dispatch({ type: 'FETCH_GEOFENCES_START' });
    try {
      // TODO: Implement API call
      const response = await fetch('/api/geofences');
      if (!response.ok) {
        throw new Error('Failed to fetch geofences');
      }
      const data = await response.json();
      dispatch({ type: 'FETCH_GEOFENCES_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_GEOFENCES_FAILURE', payload: error.message });
    }
  };

  const setActiveGeofence = (geofence) => {
    dispatch({ type: 'SET_ACTIVE_GEOFENCE', payload: geofence });
  };

  const addGeofence = async (geofenceData) => {
    try {
      // TODO: Implement API call
      const response = await fetch('/api/geofences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geofenceData),
      });

      if (!response.ok) {
        throw new Error('Failed to create geofence');
      }

      const data = await response.json();
      dispatch({ type: 'ADD_GEOFENCE', payload: data });
      return data;
    } catch (error) {
      dispatch({ type: 'FETCH_GEOFENCES_FAILURE', payload: error.message });
      throw error;
    }
  };

  const updateGeofence = async (id, geofenceData) => {
    try {
      // TODO: Implement API call
      const response = await fetch(`/api/geofences/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geofenceData),
      });

      if (!response.ok) {
        throw new Error('Failed to update geofence');
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_GEOFENCE', payload: data });
      return data;
    } catch (error) {
      dispatch({ type: 'FETCH_GEOFENCES_FAILURE', payload: error.message });
      throw error;
    }
  };

  const deleteGeofence = async (id) => {
    try {
      // TODO: Implement API call
      const response = await fetch(`/api/geofences/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete geofence');
      }

      dispatch({ type: 'DELETE_GEOFENCE', payload: id });
    } catch (error) {
      dispatch({ type: 'FETCH_GEOFENCES_FAILURE', payload: error.message });
      throw error;
    }
  };

  const updateEmployeeLocation = (employeeId, location) => {
    dispatch({
      type: 'UPDATE_EMPLOYEE_LOCATION',
      payload: { employeeId, location }
    });
  };

  const addAttendanceRecord = (record) => {
    dispatch({ type: 'ADD_ATTENDANCE_RECORD', payload: record });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    fetchGeofences,
    setActiveGeofence,
    addGeofence,
    updateGeofence,
    deleteGeofence,
    updateEmployeeLocation,
    addAttendanceRecord,
    clearError
  };

  return (
    <GeofenceContext.Provider value={value}>
      {children}
    </GeofenceContext.Provider>
  );
}

export default GeofenceContext;