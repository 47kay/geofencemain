const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Organization = require('../../src/models/organization.model');

describe('Auth Routes', () => {
  let mongoServer;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      organization: {
        name: 'Test Company',
        industry: 'Technology',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postalCode: '12345'
        },
        contact: {
          email: 'org@test.com',
          phone: '+1234567890'
        }
      },
      admin: {
        email: 'admin@test.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User'
      },
      plan: 'basic'
    };

    it('should register new organization and admin', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toHaveProperty('organization');
      expect(response.body).toHaveProperty('admin');
      expect(response.body).toHaveProperty('tokens');

      // Verify database records
      const organization = await Organization.findById(response.body.organization._id);
      expect(organization).toBeTruthy();
      expect(organization.name).toBe(validRegistrationData.organization.name);

      const user = await User.findById(response.body.admin._id);
      expect(user).toBeTruthy();
      expect(user.email).toBe(validRegistrationData.admin.email);
    });

    it('should not allow duplicate organization email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        organization: {
          name: 'Test Company'
        },
        admin: {
          email: 'admin@test.com'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(Array.isArray(response.body.error)).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        organization: new mongoose.Types.ObjectId(),
        status: 'active'
      });
    });

    it('should authenticate valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      token = response.body.tokens.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        firstName: 'Test',
        lastName: 'User',
        status: 'active'
      });
    });

    it('should generate reset token for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user.security.passwordResetToken).toBeTruthy();
      expect(user.security.passwordResetExpires).toBeTruthy();
    });

    it('should handle non-existent email silently', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken;
    let user;

    beforeEach(async () => {
      user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('Password123!', 12),
        firstName: 'Test',
        lastName: 'User',
        status: 'active'
      });

      resetToken = user.generatePasswordResetToken();
      await user.save();
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify password was changed
      const updatedUser = await User.findById(user._id);
      const isNewPasswordValid = await bcrypt.compare('NewPassword123!', updatedUser.password);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should invalidate refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify token was invalidated
      const loginResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: token })
        .expect(401);

      expect(loginResponse.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should issue new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject expired refresh token', async () => {
      // Wait for token to expire (if using short expiry for testing)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'expired-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});