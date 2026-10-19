import { Router } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const filter = { user: req.user._id };
  const month = String(req.query.month || '');
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNumber] = month.split('-').map(Number);
    filter.date = { $gte: new Date(year, monthNumber - 1, 1), $lt: new Date(year, monthNumber, 1) };
  }
  const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).limit(2000).lean();
  res.json({ transactions });
});

router.post('/', async (req, res) => {
  const { type, amount, description = '', category, categoryIcon = '•', categoryId = null, date, source = 'manual' } = req.body;
  const numericAmount = Number(amount);
  if (!['expense', 'income'].includes(type)) return res.status(400).json({ message: 'Choose expense or income.' });
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000_000) return res.status(400).json({ message: 'Enter a valid transaction amount.' });
  if (!String(category || '').trim()) return res.status(400).json({ message: 'Choose a category.' });
  if (String(description).length > 240) return res.status(400).json({ message: 'Description must be 240 characters or fewer.' });
  const transactionDate = date ? new Date(date) : new Date();
  if (Number.isNaN(transactionDate.getTime())) return res.status(400).json({ message: 'Choose a valid date.' });
  let categoryName = String(category).trim();
  let validCategoryIcon = String(categoryIcon || '•').slice(0, 8);
  let validCategoryId = null;
  if (categoryId && mongoose.isValidObjectId(categoryId)) {
    const ownedCategory = await Category.findOne({ _id: categoryId, user: req.user._id });
    if (ownedCategory) { categoryName = ownedCategory.name; validCategoryIcon = ownedCategory.icon || '•'; validCategoryId = ownedCategory._id; }
  }
  const isImported = source === 'imported';
  const transaction = await Transaction.create({
    user: req.user._id,
    type,
    amount: Number(numericAmount.toFixed(2)),
    description: String(description).trim(),
    category: categoryName,
    categoryIcon: validCategoryIcon,
    categoryId: validCategoryId,
    date: transactionDate,
    source: isImported ? 'imported' : 'manual',
    paymentMode: isImported ? 'ONLINE' : 'CASH',
  });
  res.status(201).json({ transaction });
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction ID.' });
  const result = await Transaction.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Transaction not found.' });
  res.json({ success: true });
});

export default router;
