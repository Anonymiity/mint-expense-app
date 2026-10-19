import { Router } from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function cleanCategory(body) {
  const name = String(body.name || '').trim();
  const icon = String(body.icon || '✨').trim();
  const type = ['expense', 'income', 'both'].includes(body.type) ? body.type : 'expense';
  if (!name || name.length > 32) return { error: 'Category name must be between 1 and 32 characters.' };
  if (icon.length > 8) return { error: 'Use a short icon or emoji (maximum 8 characters).' };
  return { name, icon: icon || '✨', type };
}

router.get('/', async (req, res) => {
  const categories = await Category.find({ user: req.user._id }).sort({ type: 1, name: 1 }).lean();
  res.json({ categories });
});

router.post('/', async (req, res) => {
  const clean = cleanCategory(req.body);
  if (clean.error) return res.status(400).json({ message: clean.error });
  try {
    const category = await Category.create({ ...clean, user: req.user._id });
    return res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a category with that name.' });
    throw error;
  }
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid category ID.' });
  const clean = cleanCategory(req.body);
  if (clean.error) return res.status(400).json({ message: clean.error });
  try {
    const category = await Category.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, clean, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a category with that name.' });
    throw error;
  }
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid category ID.' });
  const result = await Category.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Category not found.' });
  res.json({ success: true });
});

export default router;
