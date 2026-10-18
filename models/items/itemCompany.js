const mongoose = require('mongoose');

const ItemCompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  companyId: { type: String, required: true, index: true }
}, { timestamps: true });

ItemCompanySchema.index({ companyId: 1, name: 1 }, { unique: true });
ItemCompanySchema.statics.findByCompanyId = function findByCompanyId(companyId) {
  return this.find({ companyId: String(companyId) }).sort({ name: 1 });
};
ItemCompanySchema.statics.findByCompanyName = function findByCompanyName(name, companyId) {
  const query = { name: String(name || '').trim() };
  if (companyId) query.companyId = String(companyId);
  return this.findOne(query);
};

module.exports = mongoose.model('ItemCompany', ItemCompanySchema);
