const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  password: { type: String, required: true, minlength: 8, select: false }
}, { timestamps: true });

UserSchema.statics.authenticate = async function authenticate(email, password) {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await this.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
  if (!user) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  return user;
};

UserSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

module.exports = mongoose.model('User', UserSchema);
