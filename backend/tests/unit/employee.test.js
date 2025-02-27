const EmployeeService = require('../../src/services/employee.service');
const Employee = require('../../src/models/employee.model');
const User = require('../../src/models/user.model');
const GeofenceService = require('../../src/services/geofence.service');
const { NotFoundError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock('../../src/models/employee.model');
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/geofence.service');
jest.mock('../../src/services/notification.service');

describe('EmployeeService', () => {
  let employeeService;

  beforeEach(() => {
    employeeService = new EmployeeService();
    jest.clearAllMocks();
  });

  describe('addEmployee', () => {
    const mockEmployeeData = {
      email: 'john.doe@test.com',
      firstName: 'John',
      lastName: 'Doe',
      organization: 'org123',
      employmentDetails: {
        department: 'Engineering',
        position: 'Developer',
        employmentType: 'full-time',
        startDate: '2023-01-01'
      },
      createdBy: 'admin123'
    };

    it('should successfully create employee and user accounts', async () => {
      const mockUser = { _id: 'user123', ...mockEmployeeData };
      const mockEmployee = { _id: 'emp123', user: mockUser._id };

      User.prototype.save.mockResolvedValue(mockUser);
      Employee.prototype.save.mockResolvedValue(mockEmployee);

      const result = await employeeService.addEmployee(mockEmployeeData);

      expect(User.prototype.save).toHaveBeenCalled();
      expect(Employee.prototype.save).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });

    it('should generate unique employee ID', async () => {
      const mockUser = { _id: 'user123' };
      User.prototype.save.mockResolvedValue(mockUser);

      await employeeService.addEmployee(mockEmployeeData);

      expect(Employee.prototype.save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: expect.stringMatching(/^EMP\d{6}$/)
        })
      );
    });
  });

  describe('requestLeave', () => {
    const mockEmployeeId = 'emp123';
    const mockLeaveData = {
      startDate: '2023-02-01',
      endDate: '2023-02-05',
      type: 'vacation',
      reason: 'Annual leave'
    };

    it('should successfully request leave', async () => {
      const mockEmployee = {
        _id: mockEmployeeId,
        employmentDetails: {
          supervisor: 'sup123'
        },
        leaves: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Employee.findById.mockResolvedValue(mockEmployee);

      await employeeService.requestLeave(mockEmployeeId, mockLeaveData);

      expect(mockEmployee.save).toHaveBeenCalled();
      expect(mockEmployee.leaves[0]).toMatchObject({
        ...mockLeaveData,
        status: 'pending'
      });
    });

    it('should notify supervisor when leave is requested', async () => {
      const mockEmployee = {
        _id: mockEmployeeId,
        employmentDetails: {
          supervisor: 'sup123'
        },
        leaves: [],
        save: jest.fn().mockResolvedValue(true)
      };

      Employee.findById.mockResolvedValue(mockEmployee);

      await employeeService.requestLeave(mockEmployeeId, mockLeaveData);

      expect(employeeService.notificationService.notifyLeaveRequest)
        .toHaveBeenCalledWith(
          mockEmployee.employmentDetails.supervisor,
          expect.objectContaining({
            employee: mockEmployeeId,
            leave: expect.objectContaining(mockLeaveData)
          })
        );
    });
  });

  describe('generateSchedule', () => {
    const mockEmployeeId = 'emp123';
    const startDate = '2023-02-01';
    const endDate = '2023-02-07';

    it('should generate work schedule for date range', async () => {
      const mockEmployee = {
        employmentDetails: {
          workSchedule: {
            type: 'fixed',
            hours: {
              start: '09:00',
              end: '17:00'
            },
            workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          }
        }
      };

      Employee.findById.mockResolvedValue(mockEmployee);

      const schedule = await employeeService.generateSchedule(
        mockEmployeeId,
        startDate,
        endDate
      );

      expect(schedule).toBeInstanceOf(Array);
      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0]).toHaveProperty('date');
      expect(schedule[0]).toHaveProperty('startTime');
      expect(schedule[0]).toHaveProperty('endTime');
    });

    it('should exclude non-working days', async () => {
      const mockEmployee = {
        employmentDetails: {
          workSchedule: {
            type: 'fixed',
            hours: {
              start: '09:00',
              end: '17:00'
            },
            workDays: ['Monday', 'Wednesday', 'Friday']
          }
        }
      };

      Employee.findById.mockResolvedValue(mockEmployee);

      const schedule = await employeeService.generateSchedule(
        mockEmployeeId,
        startDate,
        endDate
      );

      const scheduledDays = schedule.map(s => 
        new Date(s.date).toLocaleString('en-US', { weekday: 'long' })
      );

      expect(scheduledDays).not.toContain('Tuesday');
      expect(scheduledDays).not.toContain('Thursday');
    });
  });

  describe('generateReport', () => {
    const mockEmployeeId = 'emp123';
    const mockDateRange = {
      startDate: '2023-01-01',
      endDate: '2023-01-31'
    };

    it('should generate PDF attendance report', async () => {
      const mockEmployee = {
        _id: mockEmployeeId,
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockAttendance = [
        { type: 'check-in', timestamp: new Date() }
      ];

      Employee.findById.mockResolvedValue(mockEmployee);
      jest.spyOn(employeeService, 'getAttendance')
          .mockResolvedValue(mockAttendance);
      jest.spyOn(employeeService, 'generatePDFReport')
          .mockResolvedValue(Buffer.from('mock-pdf'));

      const result = await employeeService.generateReport(
        mockEmployeeId,
        'attendance',
        mockDateRange.startDate,
        mockDateRange.endDate,
        'pdf'
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(employeeService.generatePDFReport).toHaveBeenCalled();
    });

    it('should generate CSV attendance report', async () => {
      const mockEmployee = {
        _id: mockEmployeeId,
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockAttendance = [
        { type: 'check-in', timestamp: new Date() }
      ];

      Employee.findById.mockResolvedValue(mockEmployee);
      jest.spyOn(employeeService, 'getAttendance')
          .mockResolvedValue(mockAttendance);
      jest.spyOn(employeeService, 'generateCSVReport')
          .mockResolvedValue('mock,csv,data');

      const result = await employeeService.generateReport(
        mockEmployeeId,
        'attendance',
        mockDateRange.startDate,
        mockDateRange.endDate,
        'csv'
      );

      expect(typeof result).toBe('string');
      expect(employeeService.generateCSVReport).toHaveBeenCalled();
    });

    it('should calculate attendance statistics', async () => {
      const mockEmployee = {
        _id: mockEmployeeId,
        calculateWorkHours: jest.fn().mockResolvedValue(160)
      };

      const mockAttendance = [
        { type: 'check-in', isOnTime: true },
        { type: 'check-in', isOnTime: false }
      ];

      Employee.findById.mockResolvedValue(mockEmployee);
      jest.spyOn(employeeService, 'getAttendance')
          .mockResolvedValue(mockAttendance);

      const stats = await employeeService.calculateAttendanceStats(
        mockEmployeeId,
        mockDateRange.startDate,
        mockDateRange.endDate
      );

      expect(stats).toHaveProperty('totalDays', 2);
      expect(stats).toHaveProperty('onTime', 1);
      expect(stats).toHaveProperty('late', 1);
      expect(stats).toHaveProperty('totalHours', 160);
    });
  });
});