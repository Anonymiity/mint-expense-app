import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 32 },
  icon: { type: String, trim: true, maxlength: 8, default: '✨' },
  type: { type: String, enum: ['expense', 'income', 'both'], default: 'expense' },
}, { timestamps: true });

categorySchema.index({ user: 1, name: 1 }, { unique: true });
export default mongoose.model('Category', categorySchema);
