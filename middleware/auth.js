const mongoose = require('mongoose');
const User = require('../models/user');
const Company = require('../models/company');

async function isAuthorized(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId).select('_id username email').lean();
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/login');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireCompany(req, res, next) {
  try {
    if (!req.session.companyId || !mongoose.isValidObjectId(req.session.companyId)) {
      return res.status(400).send('Please select Company');
    }

    const company = await Company.findOne({
      _id: req.session.companyId,
      userid: String(req.session.userId),
      isArchived: { $ne: true }
    }).lean();

    if (!company) {
      req.session.companyId = '';
      req.session.companyName = '';
      return res.status(403).send('Selected company is not available for this account');
    }

    req.company = company;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { isAuthorized, requireCompany };
