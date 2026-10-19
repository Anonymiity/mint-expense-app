import 'dotenv/config';
import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let databaseConnection;
export default async function handler(req, res) {
  try {
    databaseConnection ??= connectDB();
    await databaseConnection;
    return app(req, res);
  } catch (error) {
    console.error('API initialization failed:', error.message);
    return res.status(500).json({ message: 'The API could not connect to its database.' });
  }
}
