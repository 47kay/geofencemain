const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Geofence = require('../../src/models/geofence.model');
const User = require('../../src/models/user.model');
const Organization = require('../../src/models/organization.model');
const Employee = require('../../src/models/employee.model');

describe('Geofence Routes', () => {
  let mongoServer;
  let token;
  let organization;
  let user;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Geofence.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Employee.deleteMany({});

    // Create test organization
    organization = await Organization.create({
      name: 'Test Company',
      industry: 'Technology',
      contact: {
        email: 'org@test.com',
        phone: '+1234567890'
      }
    });

    // Create test user
    user = await User.create({
      email: 'admin@test.com',
      password: await bcrypt.hash('Password123!', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      organization: organization._id,
      status: 'active'
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Password123!'
      });

    token = loginResponse.body.tokens.accessToken;
  });

  describe('GET /api/geofences', () => {
    beforeEach(async () => {
      // Create test geofences
      await Geofence.create([
        {
          name: 'Office 1',
          organization: organization._id,
          location: {
            type: 'Point',
            coordinates: [12.34, 56.78]
          },
          radius: 100,
          type: 'office',
          status: 'active'
        },
        {
          name: 'Office 2',
          organization: organization._id,
          location: {
            type: 'Point',
            coordinates: [23.45, 67.89]
          },
          radius: 150,
          type: 'office',
          status: 'inactive'
        }
      ]);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/geofences?status=active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('active');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/geofences?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/geofences/:id', () => {
    let testGeofence;

    beforeEach(async () => {
      testGeofence = await Geofence.create({
        name: 'Test Office',
        organization: organization._id,
        location: {
          type: 'Point',
          coordinates: [12.34, 56.78]
        },
        radius: 100,
        type: 'office',
        status: 'active'
      });
    });

    it('should return geofence details', async () => {
      const response = await request(app)
        .get(`/api/geofences/${testGeofence._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._id).toBe(testGeofence._id.toString());
      expect(response.body.name).toBe(testGeofence.name);
    });

    it('should handle non-existent geofence', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/geofences/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/geofences/:id', () => {
    let testGeofence;

    beforeEach(async () => {
      testGeofence = await Geofence.create({
        name: 'Test Office',
        organization: organization._id,
        location: {
          type: 'Point',
          coordinates: [12.34, 56.78]
        },
        radius: 100,
        type: 'office',
        status: 'active'
      });
    });

    it('should update geofence details', async () => {
      const updateData = {
        name: 'Updated Office',
        radius: 150
      };

      const response = await request(app)
        .put(`/api/geofences/${testGeofence._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.radius).toBe(updateData.radius);

      // Verify database update
      const updatedGeofence = await Geofence.findById(testGeofence._id);
      expect(updatedGeofence.name).toBe(updateData.name);
    });

    it('should validate update data', async () => {
      const invalidData = {
        radius: -50 // Invalid radius
      };

      const response = await request(app)
        .put(`/api/geofences/${testGeofence._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/geofences/:id/employees', () => {
    let testGeofence;
    let testEmployees;

    beforeEach(async () => {
      testGeofence = await Geofence.create({
        name: 'Test Office',
        organization: organization._id,
        location: {
          type: 'Point',
          coordinates: [12.34, 56.78]
        },
        radius: 100,
        type: 'office',
        status: 'active'
      });

      // Create test employees
      testEmployees = await Employee.create([
        {
          user: new mongoose.Types.ObjectId(),
          organization: organization._id,
          employeeId: 'EMP001',
          status: 'active'
        },
        {
          user: new mongoose.Types.ObjectId(),
          organization: organization._id,
          employeeId: 'EMP002',
          status: 'active'
        }
      ]);
    });

    it('should assign employees to geofence', async () => {
      const employeeIds = testEmployees.map(emp => emp._id);

      const response = await request(app)
        .post(`/api/geofences/${testGeofence._id}/employees`)
        .set('Authorization', `Bearer ${token}`)
        .send({ employeeIds })
        .expect(200);

      expect(response.body.assignedEmployees).toHaveLength(2);

      // Verify database update
      const updatedGeofence = await Geofence.findById(testGeofence._id);
      expect(updatedGeofence.assignedEmployees).toHaveLength(2);
    });

    it('should validate employee IDs', async () => {
      const invalidEmployeeIds = [
        new mongoose.Types.ObjectId() // Non-existent employee
      ];

      const response = await request(app)
        .post(`/api/geofences/${testGeofence._id}/employees`)
        .set('Authorization', `Bearer ${token}`)
        .send({ employeeIds: invalidEmployeeIds })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/geofences/check-location', () => {
    let testGeofence;

    beforeEach(async () => {
      testGeofence = await Geofence.create({
        name: 'Test Office',
        organization: organization._id,
        location: {
          type: 'Point',
          coordinates: [12.34, 56.78]
        },
        radius: 100,
        type: 'office',
        status: 'active'
      });
    });

    it('should check if coordinates are within geofence', async () => {
      const coordinates = {
        latitude: 56.78,
        longitude: 12.34
      };

      const response = await request(app)
        .post('/api/geofences/check-location')
        .set('Authorization', `Bearer ${token}`)
        .send(coordinates)
        .expect(200);

      expect(response.body).toHaveProperty('isInside');
      expect(response.body).toHaveProperty('geofence');
    });

    it('should validate coordinates', async () => {
      const invalidCoordinates = {
        latitude: 200, // Invalid latitude
        longitude: 12.34
      };

      const response = await request(app)
        .post('/api/geofences/check-location')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidCoordinates)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});