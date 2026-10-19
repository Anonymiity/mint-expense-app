import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  monthKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  amount: { type: Number, min: 0, required: true, default: 0 },
}, { timestamps: true });

budgetSchema.index({ user: 1, monthKey: 1 }, { unique: true });
export default mongoose.model('Budget', budgetSchema);
