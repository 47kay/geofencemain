import api from './api';

class EmployeeService {
  async getAllEmployees(params = {}) {
    try {
      const response = await api.get('/employees', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeById(id) {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEmployee(employeeData) {
    try {
      const response = await api.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEmployee(id, employeeData) {
    try {
      const response = await api.put(`/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEmployee(id) {
    try {
      const response = await api.delete(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeAttendance(id, startDate, endDate) {
    try {
      const response = await api.get(`/employees/${id}/attendance`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeStats(id, timeframe = 'monthly') {
    try {
      const response = await api.get(`/employees/${id}/stats`, {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkImportEmployees(fileData) {
    try {
      const formData = new FormData();
      formData.append('file', fileData);

      const response = await api.post('/employees/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async exportEmployees(format = 'csv') {
    try {
      const response = await api.get('/employees/export', {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async assignGeofences(employeeId, geofenceIds) {
    try {
      const response = await api.post(`/employees/${employeeId}/geofences`, {
        geofenceIds
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAssignedGeofences(employeeId) {
    try {
      const response = await api.get(`/employees/${employeeId}/geofences`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEmployeeStatus(id, status) {
    try {
      const response = await api.patch(`/employees/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeLocations(params = {}) {
    try {
      const response = await api.get('/employees/locations', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message || 'Employee operation failed';
      return new Error(message);
    }
    return error;
  }
}

export default new EmployeeService();