import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Please log in to continue.' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Server authentication is not configured.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select('_id name email');
    if (!user) return res.status(401).json({ message: 'This account could not be found.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or expired. Please log in again.' });
  }
}
