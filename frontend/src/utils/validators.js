import { VALIDATION, GEOFENCE } from './constants';

// User Validation
export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (!VALIDATION.EMAIL_REGEX.test(email)) return 'Invalid email format';
  return '';
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    return `Password cannot exceed ${VALIDATION.PASSWORD_MAX_LENGTH} characters`;
  }
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[!@#$%^&*]/.test(password)) return 'Password must contain at least one special character';
  return '';
};

export const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  if (!VALIDATION.PHONE_REGEX.test(phone)) return 'Invalid phone number format';
  return '';
};

// Employee Validation
export const validateEmployeeData = (data) => {
  const errors = {};

  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length > VALIDATION.NAME_MAX_LENGTH) {
    errors.firstName = `First name cannot exceed ${VALIDATION.NAME_MAX_LENGTH} characters`;
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length > VALIDATION.NAME_MAX_LENGTH) {
    errors.lastName = `Last name cannot exceed ${VALIDATION.NAME_MAX_LENGTH} characters`;
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else {
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  }

  if (data.phone) {
    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;
  }

  if (data.employeeId && !VALIDATION.EMPLOYEE_ID_REGEX.test(data.employeeId)) {
    errors.employeeId = 'Invalid employee ID format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Geofence Validation
export const validateGeofenceData = (data) => {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.address?.trim()) {
    errors.address = 'Address is required';
  }

  if (!data.coordinates) {
    errors.coordinates = 'Coordinates are required';
  } else {
    if (typeof data.coordinates.lat !== 'number' || isNaN(data.coordinates.lat)) {
      errors.latitude = 'Valid latitude is required';
    }
    if (typeof data.coordinates.lng !== 'number' || isNaN(data.coordinates.lng)) {
      errors.longitude = 'Valid longitude is required';
    }
  }

  if (!data.radius) {
    errors.radius = 'Radius is required';
  } else if (data.radius < GEOFENCE.MIN_RADIUS || data.radius > GEOFENCE.MAX_RADIUS) {
    errors.radius = `Radius must be between ${GEOFENCE.MIN_RADIUS} and ${GEOFENCE.MAX_RADIUS} meters`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Organization Validation
export const validateOrganizationData = (data) => {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = 'Organization name is required';
  }

  if (!data.email) {
    errors.email = 'Organization email is required';
  } else {
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  }

  if (data.phone) {
    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;
  }

  if (!data.address?.trim()) {
    errors.address = 'Organization address is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Attendance Validation
export const validateAttendanceRecord = (data) => {
  const errors = {};

  if (!data.employeeId) {
    errors.employeeId = 'Employee ID is required';
  }

  if (!data.geofenceId) {
    errors.geofenceId = 'Geofence ID is required';
  }

  if (!data.type) {
    errors.type = 'Attendance type is required';
  }

  if (!data.timestamp) {
    errors.timestamp = 'Timestamp is required';
  }

  if (!data.coordinates) {
    errors.coordinates = 'Coordinates are required';
  } else {
    if (typeof data.coordinates.latitude !== 'number' || isNaN(data.coordinates.latitude)) {
      errors.latitude = 'Valid latitude is required';
    }
    if (typeof data.coordinates.longitude !== 'number' || isNaN(data.coordinates.longitude)) {
      errors.longitude = 'Valid longitude is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// File Validation
export const validateFileUpload = (file, allowedTypes, maxSize) => {
  const errors = {};

  if (!file) {
    errors.file = 'File is required';
    return { isValid: false, errors };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.type = `File type must be one of: ${allowedTypes.join(', ')}`;
  }

  if (maxSize && file.size > maxSize) {
    errors.size = `File size cannot exceed ${maxSize / (1024 * 1024)}MB`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Form Validation Helper
export const validateForm = (data, schema) => {
  const errors = {};

  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = data[field];

    // Required check
    if (rules.required && !value) {
      errors[field] = `${rules.label || field} is required`;
      return;
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) return;

    // Minimum length check
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `${rules.label || field} must be at least ${rules.minLength} characters`;
    }

    // Maximum length check
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `${rules.label || field} cannot exceed ${rules.maxLength} characters`;
    }

    // Pattern check
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${rules.label || field} is invalid`;
    }

    // Custom validation
    if (rules.validate) {
      const error = rules.validate(value, data);
      if (error) errors[field] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Export validation schemas
export const validationSchemas = {
  login: {
    email: {
      required: true,
      label: 'Email',
      pattern: VALIDATION.EMAIL_REGEX,
      message: 'Please enter a valid email address'
    },
    password: {
      required: true,
      label: 'Password',
      minLength: VALIDATION.PASSWORD_MIN_LENGTH
    }
  },
  registration: {
    firstName: {
      required: true,
      label: 'First Name',
      maxLength: VALIDATION.NAME_MAX_LENGTH
    },
    lastName: {
      required: true,
      label: 'Last Name',
      maxLength: VALIDATION.NAME_MAX_LENGTH
    },
    email: {
      required: true,
      label: 'Email',
      pattern: VALIDATION.EMAIL_REGEX,
      message: 'Please enter a valid email address'
    },
    password: {
      required: true,
      label: 'Password',
      validate: validatePassword
    }
  }
};