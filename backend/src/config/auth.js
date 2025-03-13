// config/auth.js
const config = require('./env');
require('dotenv').config()

const authConfig = {
  jwt: {
    secret:  process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN
  },
  oauth: {
    google: config.oauth.google
  }
};

module.exports = authConfig;