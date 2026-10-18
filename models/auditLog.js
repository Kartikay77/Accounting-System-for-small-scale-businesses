const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  companyId: { type: String, index: true },
  userId: { type: String, index: true },
  action: { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  entityId: { type: String, trim: true, index: true },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String, trim: true }
}, { timestamps: true });

AuditLogSchema.index({ companyId: 1, createdAt: -1 });
module.exports = mongoose.model('AuditLog', AuditLogSchema);
