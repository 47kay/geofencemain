// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      VERIFY_EMAIL: '/auth/verify-email'
    },
    GEOFENCE: {
      BASE: '/geofences',
      ATTENDANCE: '/geofences/:id/attendance',
      EMPLOYEES: '/geofences/:id/employees',
      STATS: '/geofences/:id/stats'
    },
    EMPLOYEE: {
      BASE: '/employees',
      IMPORT: '/employees/import',
      EXPORT: '/employees/export',
      ATTENDANCE: '/employees/:id/attendance',
      LOCATIONS: '/employees/locations'
    }
  };
  
  // Status Codes
  export const STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended'
  };
  
  // Role Types
  export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    SUPERVISOR: 'supervisor'
  };
  
  // Attendance Types
  export const ATTENDANCE_TYPES = {
    ENTRY: 'entry',
    EXIT: 'exit',
    BREAK_START: 'break_start',
    BREAK_END: 'break_end',
    OVERTIME_START: 'overtime_start',
    OVERTIME_END: 'overtime_end'
  };
  
  // Time Intervals
  export const TIME_INTERVALS = {
    LOCATION_UPDATE: 30000, // 30 seconds
    TOKEN_REFRESH: 300000, // 5 minutes
    SYNC_INTERVAL: 600000  // 10 minutes
  };
  
  // Geofence Constants
  export const GEOFENCE = {
    MIN_RADIUS: 50,    // meters
    MAX_RADIUS: 5000,  // meters
    DEFAULT_RADIUS: 100,
    MAX_LOCATIONS: 100,
    MAX_EMPLOYEES: 1000
  };
  
  // Subscription Plans
  export const PLANS = {
    STARTER: {
      id: 'starter',
      name: 'Starter',
      maxEmployees: 25,
      maxGeofences: 1,
      features: ['basic_geofencing', 'attendance_reports', 'email_support']
    },
    PROFESSIONAL: {
      id: 'professional',
      name: 'Professional',
      maxEmployees: 100,
      maxGeofences: 10,
      features: ['advanced_geofencing', 'real_time_tracking', 'priority_support']
    },
    ENTERPRISE: {
      id: 'enterprise',
      name: 'Enterprise',
      maxEmployees: -1, // unlimited
      maxGeofences: -1, // unlimited
      features: ['premium_geofencing', '24_7_support', 'custom_integration']
    }
  };
  
  // Validation Constants
  export const VALIDATION = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    NAME_MAX_LENGTH: 100,
    PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    EMPLOYEE_ID_REGEX: /^[A-Z]{2}[0-9]{6}$/
  };
  
  // Error Messages
  export const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password',
    NETWORK_ERROR: 'Network error occurred',
    SERVER_ERROR: 'Server error occurred',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    GEOFENCE_LIMIT: 'Geofence limit reached',
    EMPLOYEE_LIMIT: 'Employee limit reached'
  };
  
  // Route Paths
  export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    GEOFENCES: '/geofences',
    EMPLOYEES: '/employees',
    SETTINGS: '/settings',
    REPORTS: '/reports',
    PROFILE: '/profile'
  };
  
  // Local Storage Keys
  export const STORAGE_KEYS = {
    TOKEN: 'token',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    SETTINGS: 'settings',
    THEME: 'theme',
    LANGUAGE: 'language'
  };
  
  // Date Formats
  export const DATE_FORMATS = {
    DISPLAY: 'MMM DD, YYYY',
    API: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
    DATETIME: 'YYYY-MM-DD HH:mm:ss'
  };