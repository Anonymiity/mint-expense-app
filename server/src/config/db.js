import mongoose from 'mongoose';

let connectionPromise;

export function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Set it in your deployment environment variables.');
  }
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .then(() => mongoose.connection)
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  return connectionPromise;
}
