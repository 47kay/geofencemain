// config/auth.js
const config = require('./env');

const authConfig = {
  jwt: {
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn
  },
  oauth: {
    google: config.oauth.google
  }
};

module.exports = authConfig;