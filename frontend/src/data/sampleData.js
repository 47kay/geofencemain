// Sample data for Geofences
const sampleGeofences = [
    {
      id: 1,
      name: 'Main Office',
      address: '123 Business District, Silicon Valley, CA 94025',
      radius: 100, // in meters
      active: true,
      coordinates: {
        lat: 37.4419,
        lng: -122.1430
      },
      employeeCount: 45,
      type: 'office',
      workingHours: {
        start: '09:00',
        end: '18:00',
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      statistics: {
        presentToday: 42,
        lateToday: 3,
        absent: 0
      },
      lastUpdated: '2024-02-13T08:00:00Z'
    },
    {
      id: 2,
      name: 'Branch Office',
      address: '456 Tech Park, San Francisco, CA 94105',
      radius: 75,
      active: true,
      coordinates: {
        lat: 37.7749,
        lng: -122.4194
      },
      employeeCount: 28,
      type: 'office',
      workingHours: {
        start: '08:00',
        end: '17:00',
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      statistics: {
        presentToday: 25,
        lateToday: 2,
        absent: 1
      },
      lastUpdated: '2024-02-13T08:00:00Z'
    },
    {
      id: 3,
      name: 'Warehouse',
      address: '789 Industrial Zone, Oakland, CA 94621',
      radius: 150,
      active: true,
      coordinates: {
        lat: 37.7546,
        lng: -122.2033
      },
      employeeCount: 15,
      type: 'warehouse',
      workingHours: {
        start: '07:00',
        end: '16:00',
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      statistics: {
        presentToday: 14,
        lateToday: 1,
        absent: 0
      },
      lastUpdated: '2024-02-13T07:00:00Z'
    },
    {
      id: 4,
      name: 'Research Center',
      address: '321 Innovation Hub, Palo Alto, CA 94301',
      radius: 80,
      active: false,
      coordinates: {
        lat: 37.4419,
        lng: -122.1419
      },
      employeeCount: 12,
      type: 'office',
      workingHours: {
        start: '10:00',
        end: '19:00',
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      statistics: {
        presentToday: 0,
        lateToday: 0,
        absent: 12
      },
      lastUpdated: '2024-02-13T08:00:00Z'
    }
  ];
  
  // Sample attendance data for a specific geofence
  const sampleAttendanceRecords = [
    {
      id: 1,
      employeeId: 'EMP001',
      employeeName: 'John Doe',
      type: 'entry',
      timestamp: '2024-02-13T09:02:34Z',
      status: 'on_time',
      coordinates: {
        lat: 37.4419,
        lng: -122.1430
      }
    },
    {
      id: 2,
      employeeId: 'EMP002',
      employeeName: 'Jane Smith',
      type: 'entry',
      timestamp: '2024-02-13T09:15:00Z',
      status: 'late',
      coordinates: {
        lat: 37.4419,
        lng: -122.1430
      }
    },
    {
      id: 3,
      employeeId: 'EMP003',
      employeeName: 'Bob Wilson',
      type: 'entry',
      timestamp: '2024-02-13T08:55:00Z',
      status: 'on_time',
      coordinates: {
        lat: 37.4419,
        lng: -122.1430
      }
    }
  ];
  
  // Sample statistics for all geofences
  const sampleGeofenceStats = {
    total: 4,
    active: 3,
    inactive: 1,
    totalEmployees: 100,
    presentToday: 81,
    lateToday: 6,
    absentToday: 13,
    averageAttendance: 92
  };
  
  // Sample alert data
  const sampleAlerts = [
    {
      id: 1,
      type: 'late_entry',
      geofenceId: 1,
      employeeId: 'EMP002',
      employeeName: 'Jane Smith',
      timestamp: '2024-02-13T09:15:00Z',
      message: 'Late arrival detected',
      status: 'unresolved'
    },
    {
      id: 2,
      type: 'early_exit',
      geofenceId: 2,
      employeeId: 'EMP010',
      employeeName: 'Mike Johnson',
      timestamp: '2024-02-13T16:30:00Z',
      message: 'Early departure detected',
      status: 'resolved'
    }
  ];
  
  // Export all sample data
  export {
    sampleGeofences,
    sampleAttendanceRecords,
    sampleGeofenceStats,
    sampleAlerts
  };