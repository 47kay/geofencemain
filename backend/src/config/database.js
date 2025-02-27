// config/database.js
const config = require('./env');

const dbConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
  autoIndex: config.env !== 'production'
};

module.exports = dbConfig;