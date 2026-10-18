const mongoose = require('mongoose');
const ItemCompany = require('./itemCompany');
const ItemType = require('./itemType');

const ItemSchema = new mongoose.Schema({
  companyName: { type: String, trim: true },
  newModelName: { type: String, required: true, trim: true, maxlength: 120 },
  hsn: { type: String, trim: true, uppercase: true },
  itemType: { type: String, trim: true },
  tax: { type: Number, min: 0, max: 100, default: 0 },
  price: { type: Number, min: 0, default: 0 },
  unitCost: { type: Number, min: 0, default: 0 },
  quantityOnHand: { type: Number, min: 0, default: 0 },
  reorderLevel: { type: Number, min: 0, default: 0 },
  companyId: { type: String, required: true, index: true },
  isArchived: { type: Boolean, default: false, index: true }
}, { timestamps: true });

ItemSchema.index({ companyId: 1, newModelName: 1 }, { unique: true });

ItemSchema.statics.findByCompanyId = function findByCompanyId(companyId) {
  return this.find({ companyId: String(companyId), isArchived: { $ne: true } }).sort({ newModelName: 1 });
};

ItemSchema.statics.getByName = function getByName(newModelName, companyId) {
  const query = { newModelName: String(newModelName || '').trim(), isArchived: { $ne: true } };
  if (companyId) query.companyId = String(companyId);
  return this.findOne(query);
};

ItemSchema.statics.countTotalDoucments = function countTotalDocuments(companyId) {
  if (!companyId) return 0;
  return this.countDocuments({ companyId: String(companyId), isArchived: { $ne: true } });
};

ItemSchema.post('save', async function syncReferenceData(doc) {
  const operations = [];
  if (doc.companyName) {
    operations.push(ItemCompany.updateOne(
      { companyId: doc.companyId, name: doc.companyName },
      { $setOnInsert: { companyId: doc.companyId, name: doc.companyName } },
      { upsert: true }
    ));
  }
  if (doc.itemType) {
    operations.push(ItemType.updateOne(
      { companyId: doc.companyId, type: doc.itemType },
      { $setOnInsert: { companyId: doc.companyId, type: doc.itemType } },
      { upsert: true }
    ));
  }
  await Promise.all(operations);
});

module.exports = mongoose.model('Item', ItemSchema);
