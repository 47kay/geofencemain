const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./docs/swagger');
const path = require('path');

// Import middleware
const { enforceTenantIsolation } = require('./middleware/tenant.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const { authorize, authenticate } = require('./middleware/auth.middleware');

// Import routes
const authRoutes = require('./routes/v1/auth.routes');
const organizationRoutes = require('./routes/v1/organization.routes');
const geofenceRoutes = require('./routes/v1/geofence.routes');
const employeeRoutes = require('./routes/v1/employee.routes');
const subscriptionRoutes = require('./routes/v1/subscription.routes');
const departmentRoutes = require('./routes/v1/department.routes');
const platformRoutes = require('./routes/v1/platform.routes');
const adminRoutes = require('./routes/v1/admin.routes');
const adminController = require('./controllers/admin.controller');
const branchRoutes = require('./routes/v1/branch.routes');
// In app.js (or wherever you register routes)





// And then add this with the other route registrations

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(logger.requestMiddleware);

// Set up branch routes - try different paths
// Set up branch routes - try different paths


// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Geofencing API Documentation"
}));

// Public routes - no authentication required
app.use('/api/auth', authRoutes);

// Platform admin routes - authentication required but no tenant isolation
app.use('/api/platform', authenticate, platformRoutes);
app.use('/admin', authenticate, adminRoutes);

// Organization-specific routes - both authentication and tenant isolation required
app.use('/api/organizations', authenticate, enforceTenantIsolation, organizationRoutes);
app.use('/api/geofences', authenticate, enforceTenantIsolation, geofenceRoutes);
app.use('/api/employees', authenticate, enforceTenantIsolation, employeeRoutes);
app.use('/api/departments', authenticate, enforceTenantIsolation, departmentRoutes);
// app.use('/api/branches', authenticate, enforceTenantIsolation, branchRoutes);
app.use('/api/subscriptions', authenticate, enforceTenantIsolation, subscriptionRoutes);
app.use('/api/branches', authenticate, enforceTenantIsolation, branchRoutes);


// Try to load invitation routes
try {
  const invitationRoutes = require('./routes/v1/invitation.routes');
  app.use('/api/auth/invitations', authenticate, enforceTenantIsolation, invitationRoutes);
  logger.info('Invitation routes registered successfully');
} catch (error) {
  logger.error('Failed to register invitation routes:', error.message);
}

// Set up branch routes - try different paths with better error logging


    // Add the /create endpoint to the fallback router


// Special admin endpoint
app.get(
    '/api/admin/organizations',
    authenticate,
    authorize(['platform_admin']),
    adminController.listAllOrganizations
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;