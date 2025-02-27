const AuthService = require('../../src/services/auth.service');
const User = require('../../src/models/user.model');
const Organization = require('../../src/models/organization.model');
const { UnauthorizedError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock('../../src/models/user.model');
jest.mock('../../src/models/organization.model');
jest.mock('../../src/services/notification.service');

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('registerOrganization', () => {
    const mockOrgData = {
      name: 'Test Org',
      industry: 'Technology',
      contact: {
        email: 'admin@test.com',
        phone: '+1234567890'
      }
    };

    const mockAdminData = {
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User'
    };

    const mockPlanData = {
      type: 'basic',
      interval: 'monthly'
    };

    it('should successfully register organization and admin', async () => {
      const mockOrg = { _id: 'org123', ...mockOrgData };
      const mockAdmin = { _id: 'user123', ...mockAdminData };

      Organization.prototype.save.mockResolvedValue(mockOrg);
      User.prototype.save.mockResolvedValue(mockAdmin);

      const result = await authService.registerOrganization(
        mockOrgData,
        mockAdminData,
        mockPlanData
      );

      expect(Organization.prototype.save).toHaveBeenCalled();
      expect(User.prototype.save).toHaveBeenCalled();
      expect(result).toHaveProperty('organization', mockOrg);
      expect(result).toHaveProperty('admin');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw error if organization email already exists', async () => {
      Organization.prototype.save.mockRejectedValue(
        new Error('Duplicate key error')
      );

      await expect(
        authService.registerOrganization(mockOrgData, mockAdminData, mockPlanData)
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    const mockCredentials = {
      email: 'user@test.com',
      password: 'Password123!'
    };

    it('should successfully authenticate user', async () => {
      const mockUser = {
        _id: 'user123',
        email: mockCredentials.email,
        verifyPassword: jest.fn().mockResolvedValue(true),
        recordLogin: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.login(
        mockCredentials.email,
        mockCredentials.password
      );

      expect(User.findOne).toHaveBeenCalledWith({ email: mockCredentials.email });
      expect(mockUser.verifyPassword).toHaveBeenCalledWith(mockCredentials.password);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw UnauthorizedError for invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.login(mockCredentials.email, mockCredentials.password)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should handle 2FA requirement', async () => {
      const mockUser = {
        _id: 'user123',
        email: mockCredentials.email,
        verifyPassword: jest.fn().mockResolvedValue(true),
        security: { mfaEnabled: true }
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.login(
        mockCredentials.email,
        mockCredentials.password
      );

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('tempToken');
    });
  });

  describe('verify2FA', () => {
    const mockUserId = 'user123';
    const mockToken = '123456';

    it('should successfully verify 2FA token', async () => {
      const mockUser = {
        _id: mockUserId,
        security: { mfaSecret: 'secret' },
        recordLogin: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);
      authService.verify2FAToken = jest.fn().mockReturnValue(true);

      const result = await authService.verify2FA(mockUserId, mockToken);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(authService.verify2FAToken).toHaveBeenCalledWith(
        mockToken,
        mockUser.security.mfaSecret
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      const mockUser = {
        _id: mockUserId,
        security: { mfaSecret: 'secret' }
      };

      User.findById.mockResolvedValue(mockUser);
      authService.verify2FAToken = jest.fn().mockReturnValue(false);

      await expect(
        authService.verify2FA(mockUserId, mockToken)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'refresh_token_123';

    it('should successfully refresh access token', async () => {
      const mockUser = {
        _id: 'user123',
        tokens: [{ token: mockRefreshToken, type: 'refresh' }],
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshToken(mockRefreshToken);

      expect(User.findById).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        authService.refreshToken(mockRefreshToken)
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});