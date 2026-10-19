import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  description: { type: String, trim: true, maxlength: 240, default: '' },
  category: { type: String, required: true, trim: true, maxlength: 40 },
  categoryIcon: { type: String, trim: true, maxlength: 8, default: '•' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  date: { type: Date, required: true, default: Date.now },
  paymentMode: { type: String, enum: ['CASH', 'ONLINE'], default: 'CASH' },
  source: { type: String, enum: ['manual', 'imported'], default: 'manual' },
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
export default mongoose.model('Transaction', transactionSchema);
