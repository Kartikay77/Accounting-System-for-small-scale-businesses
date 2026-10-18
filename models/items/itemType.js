const mongoose = require('mongoose');

const ItemTypeSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true },
  companyId: { type: String, required: true, index: true }
}, { timestamps: true });

ItemTypeSchema.index({ companyId: 1, type: 1 }, { unique: true });
ItemTypeSchema.statics.findByCompanyId = function findByCompanyId(companyId) {
  return this.find({ companyId: String(companyId) }).sort({ type: 1 });
};
ItemTypeSchema.statics.findByItemType = function findByItemType(type, companyId) {
  const query = { type: String(type || '').trim() };
  if (companyId) query.companyId = String(companyId);
  return this.findOne(query);
};

module.exports = mongoose.model('ItemType', ItemTypeSchema);
