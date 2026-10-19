import { Router } from 'express';
import Budget from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

router.get('/:monthKey', async (req, res) => {
  const { monthKey } = req.params;
  if (!validMonth(monthKey)) return res.status(400).json({ message: 'Use a valid month (YYYY-MM).' });
  const budget = await Budget.findOne({ user: req.user._id, monthKey }).lean();
  res.json({ budget: budget || { amount: 0, monthKey } });
});

router.put('/:monthKey', async (req, res) => {
  const { monthKey } = req.params;
  if (!validMonth(monthKey)) return res.status(400).json({ message: 'Use a valid month (YYYY-MM).' });
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return res.status(400).json({ message: 'Enter a valid budget amount.' });
  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, monthKey },
    { $set: { amount: Number(amount.toFixed(2)) } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json({ budget });
});

export default router;
