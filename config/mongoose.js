const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/accounting_system';

mongoose
  .connect(mongoUri)
  .then(() => console.log('> MongoDB connected'))
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });

module.exports = mongoose;
