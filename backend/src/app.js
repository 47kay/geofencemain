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

// Import routes
// const authRoutes = require('./routes/v1/auth.routes');
const authRoutes = require('./routes/v1/auth.routes');
const organizationRoutes = require('./routes/v1/organization.routes');
const geofenceRoutes = require('./routes/v1/geofence.routes');
const employeeRoutes = require('./routes/v1/employee.routes');
const subscriptionRoutes = require('./routes/v1/subscription.routes');
// const invitationRoutes = require('./routes/v1/invitation.routes');
const departmentRoutes = require('./routes/v1/department.routes');
const platformRoutes = require('./routes/v1/platform.routes');
const adminRoutes = require('./routes/systemAdmin/v1/admin.routes');
const adminController = require('./controllers/admin.controller');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const {authorize, authenticate} = require("./middleware/auth.middleware");

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(xss());
app.use(mongoSanitize());

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Geofencing API Documentation"
}));

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/platform', platformRoutes);
app.use('/admin', adminRoutes);


// Try to load invitation routes
try {
  const invitationRoutes = require('./routes/v1/invitation.routes');
  app.use('/api/auth/invitations', invitationRoutes);
  console.log('Invitation routes registered successfully');
} catch (error) {
  console.error('Failed to register invitation routes:', error);
  // Continue without crashing
}

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