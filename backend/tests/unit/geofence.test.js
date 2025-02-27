const GeofenceService = require('../../src/services/geofence.service');
const Geofence = require('../../src/models/geofence.model');
const Employee = require('../../src/models/employee.model');
const { NotFoundError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock('../../src/models/geofence.model');
jest.mock('../../src/models/employee.model');
jest.mock('../../src/services/notification.service');

describe('GeofenceService', () => {
  let geofenceService;

  beforeEach(() => {
    geofenceService = new GeofenceService();
    jest.clearAllMocks();
  });

  describe('createGeofence', () => {
    const mockGeofenceData = {
      name: 'Test Office',
      organization: 'org123',
      location: {
        type: 'Point',
        coordinates: [12.34, 56.78],
        address: {
          street: '123 Test St',
          city: 'Test City'
        }
      },
      radius: 100,
      type: 'office'
    };

    it('should successfully create a geofence', async () => {
      const mockGeofence = { _id: 'geo123', ...mockGeofenceData };
      Geofence.prototype.save.mockResolvedValue(mockGeofence);

      const result = await geofenceService.createGeofence(mockGeofenceData);

      expect(Geofence.prototype.save).toHaveBeenCalled();
      expect(result).toEqual(mockGeofence);
    });

    it('should assign employees if provided', async () => {
      const mockEmployees = ['emp1', 'emp2'];
      const mockGeofence = { 
        _id: 'geo123', 
        ...mockGeofenceData,
        assignEmployees: jest.fn().mockResolvedValue(true)
      };

      Geofence.prototype.save.mockResolvedValue(mockGeofence);

      const result = await geofenceService.createGeofence({
        ...mockGeofenceData,
        employees: mockEmployees
      });

      expect(mockGeofence.assignEmployees).toHaveBeenCalledWith(mockEmployees);
      expect(result).toEqual(mockGeofence);
    });
  });

  describe('assignEmployeesToGeofence', () => {
    const mockGeofenceId = 'geo123';
    const mockEmployeeIds = ['emp1', 'emp2'];

    it('should assign employees to geofence', async () => {
      const mockGeofence = {
        _id: mockGeofenceId,
        assignedEmployees: [],
        save: jest.fn().mockResolvedValue(true),
        updateActiveEmployeeCount: jest.fn().mockResolvedValue(true)
      };

      const mockEmployees = [
        { _id: 'emp1', status: 'active' },
        { _id: 'emp2', status: 'active' }
      ];

      Geofence.findById.mockResolvedValue(mockGeofence);
      Employee.find.mockResolvedValue(mockEmployees);

      await geofenceService.assignEmployeesToGeofence(mockGeofenceId, mockEmployeeIds);

      expect(mockGeofence.save).toHaveBeenCalled();
      expect(mockGeofence.updateActiveEmployeeCount).toHaveBeenCalled();
      expect(mockGeofence.assignedEmployees).toHaveLength(2);
    });

    it('should throw NotFoundError if geofence not found', async () => {
      Geofence.findById.mockResolvedValue(null);

      await expect(
        geofenceService.assignEmployeesToGeofence(mockGeofenceId, mockEmployeeIds)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if any employee not found', async () => {
      const mockGeofence = { _id: mockGeofenceId };
      Geofence.findById.mockResolvedValue(mockGeofence);
      Employee.find.mockResolvedValue([{ _id: 'emp1' }]);  // Only one employee found

      await expect(
        geofenceService.assignEmployeesToGeofence(mockGeofenceId, mockEmployeeIds)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getGeofenceActivity', () => {
    const mockGeofenceId = 'geo123';
    const mockFilters = {
      startDate: '2023-01-01',
      endDate: '2023-01-31',
      employeeId: 'emp123'
    };

    it('should return geofence activity', async () => {
      const mockGeofence = { _id: mockGeofenceId };
      const mockActivity = [
        { type: 'check-in', timestamp: new Date() },
        { type: 'check-out', timestamp: new Date() }
      ];

      Geofence.findById.mockResolvedValue(mockGeofence);
      jest.spyOn(geofenceService, 'getActivityRecords')
          .mockResolvedValue(mockActivity);

      const result = await geofenceService.getGeofenceActivity(
        mockGeofenceId,
        mockFilters
      );

      expect(result).toEqual(mockActivity);
    });

    it('should throw NotFoundError if geofence not found', async () => {
      Geofence.findById.mockResolvedValue(null);

      await expect(
        geofenceService.getGeofenceActivity(mockGeofenceId, mockFilters)
      ).rejects.toThrow(NotFoundError);
    });

    it('should apply date range filters correctly', async () => {
      const mockGeofence = { _id: mockGeofenceId };
      Geofence.findById.mockResolvedValue(mockGeofence);

      await geofenceService.getGeofenceActivity(mockGeofenceId, mockFilters);

      expect(geofenceService.getActivityRecords).toHaveBeenCalledWith(
        mockGeofenceId,
        expect.objectContaining({
          startDate: new Date(mockFilters.startDate),
          endDate: new Date(mockFilters.endDate)
        })
      );
    });
  });

  describe('generateReport', () => {
    const mockGeofenceId = 'geo123';
    const startDate = '2023-01-01';
    const endDate = '2023-01-31';

    it('should generate PDF report', async () => {
      const mockGeofence = { _id: mockGeofenceId, name: 'Test Office' };
      const mockActivity = [
        { type: 'check-in', timestamp: new Date() }
      ];

      Geofence.findById.mockResolvedValue(mockGeofence);
      jest.spyOn(geofenceService, 'getActivityRecords')
          .mockResolvedValue(mockActivity);
      jest.spyOn(geofenceService, 'generatePDFReport')
          .mockResolvedValue(Buffer.from('mock-pdf'));

      const result = await geofenceService.generateReport(
        mockGeofenceId,
        startDate,
        endDate,
        'pdf'
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(geofenceService.generatePDFReport).toHaveBeenCalled();
    });

    it('should generate CSV report', async () => {
      const mockGeofence = { _id: mockGeofenceId, name: 'Test Office' };
      const mockActivity = [
        { type: 'check-in', timestamp: new Date() }
      ];

      Geofence.findById.mockResolvedValue(mockGeofence);
      jest.spyOn(geofenceService, 'getActivityRecords')
          .mockResolvedValue(mockActivity);
      jest.spyOn(geofenceService, 'generateCSVReport')
          .mockResolvedValue('mock,csv,data');

      const result = await geofenceService.generateReport(
        mockGeofenceId,
        startDate,
        endDate,
        'csv'
      );

      expect(typeof result).toBe('string');
      expect(geofenceService.generateCSVReport).toHaveBeenCalled();
    });

    it('should throw error for unsupported format', async () => {
      const mockGeofence = { _id: mockGeofenceId };
      Geofence.findById.mockResolvedValue(mockGeofence);

      await expect(
        geofenceService.generateReport(
          mockGeofenceId,
          startDate,
          endDate,
          'invalid'
        )
      ).rejects.toThrow('Unsupported report format');
    });
  });
});