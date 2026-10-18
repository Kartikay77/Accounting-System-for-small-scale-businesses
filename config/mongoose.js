const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/accounting_system';

const connectionPromise = mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000
});

connectionPromise
  .then(() => {
    if (process.env.NODE_ENV !== 'test') console.log('> MongoDB connected');
  })
  .catch((error) => {
    if (process.env.NODE_ENV !== 'test') console.error('MongoDB connection failed:', error.message);
  });

mongoose.connectionPromise = connectionPromise;
module.exports = mongoose;
