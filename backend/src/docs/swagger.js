// docs/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Geofencing API Documentation',
      version: '1.0.0',
      description: 'API documentation for Geofencing application',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      }
    ]
  },
  // Path to the API docs
  apis: [
    path.join(__dirname, './schemas/*.yaml'),
    path.join(__dirname, './paths/*.yaml'),
    path.join(__dirname, './components/*.yaml')
  ]
};

const specs = swaggerJsdoc(options);
module.exports = specs;