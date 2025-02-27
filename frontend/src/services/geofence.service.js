import api from './api';

class GeofenceService {
  async getAllGeofences() {
    try {
      const response = await api.get('/geofences');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGeofenceById(id) {
    try {
      const response = await api.get(`/geofences/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createGeofence(geofenceData) {
    try {
      const response = await api.post('/geofences', geofenceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateGeofence(id, geofenceData) {
    try {
      const response = await api.put(`/geofences/${id}`, geofenceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteGeofence(id) {
    try {
      const response = await api.delete(`/geofences/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGeofenceAttendance(id, startDate, endDate) {
    try {
      const response = await api.get(`/geofences/${id}/attendance`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignEmployeesToGeofence(id, employeeIds) {
    try {
      const response = await api.post(`/geofences/${id}/employees`, {
        employeeIds
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeEmployeesFromGeofence(id, employeeIds) {
    try {
      const response = await api.delete(`/geofences/${id}/employees`, {
        data: { employeeIds }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGeofenceEmployees(id) {
    try {
      const response = await api.get(`/geofences/${id}/employees`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGeofenceStats(id, timeframe = 'daily') {
    try {
      const response = await api.get(`/geofences/${id}/stats`, {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async recordAttendance(geofenceId, employeeId, type, coordinates) {
    try {
      const response = await api.post('/attendance', {
        geofenceId,
        employeeId,
        type,
        coordinates
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAttendanceHistory(params) {
    try {
      const response = await api.get('/attendance', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message || 'Geofence operation failed';
      return new Error(message);
    }
    return error;
  }
}

export default new GeofenceService();