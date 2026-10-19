import Category from '../models/Category.js';

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', type: 'expense' },
  { name: 'Transport', icon: '🚗', type: 'expense' },
  { name: 'Travel', icon: '🚆', type: 'expense' },
  { name: 'Food', icon: '🍽️', type: 'expense' },
  { name: 'Home', icon: '🏠', type: 'expense' },
  { name: 'Shopping', icon: '👕', type: 'expense' },
  { name: 'Personal care', icon: '🧴', type: 'expense' },
  { name: 'Gifts', icon: '🎁', type: 'expense' },
  { name: 'Fitness', icon: '🏃', type: 'expense' },
  { name: 'Health', icon: '🌡️', type: 'expense' },
  { name: 'Phone', icon: '📱', type: 'expense' },
  { name: 'Pets', icon: '🐈', type: 'expense' },
  { name: 'Salary', icon: '💼', type: 'income' },
  { name: 'Other income', icon: '＋', type: 'income' },
];

export async function seedDefaultCategories(userId) {
  await Category.insertMany(DEFAULT_CATEGORIES.map((category) => ({ ...category, user: userId })), { ordered: false });
}
