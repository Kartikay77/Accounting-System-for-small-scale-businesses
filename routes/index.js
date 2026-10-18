const express = require('express');
const auth = require('../middleware/auth');
const Party = require('../models/party');
const Invoice = require('../models/invoice/invoice');
const Item = require('../models/items/item');
const Company = require('../models/company');

const router = express.Router();

router.get('/', (req, res) => res.render('pages/index', { title: 'Index' }));
router.get('/login', (req, res) => res.render('pages/login', { title: 'Login' }));
router.get('/register', (req, res) => res.render('pages/register', { title: 'Register' }));

router.get('/home', auth.isAuthorized, async (req, res, next) => {
  try {
    const companyId = req.session.companyId || null;
    const [totalInvoices, totalParties, totalItems, totalCompanies] = await Promise.all([
      Invoice.countTotalDoucments(companyId),
      Party.countTotalDoucments(companyId),
      Item.countTotalDoucments(companyId),
      Company.countTotalDoucments(req.session.userId)
    ]);

    return res.render('homepage/home', {
      userName: req.session.username,
      companyName: req.session.companyName,
      title: 'Home',
      totalInvoices,
      totalItems,
      totalParties,
      totalCompanies,
      totalInvoices10000: Math.min(100, totalInvoices),
      totalItems500: Math.min(100, totalItems),
      totalParties2000: Math.min(100, totalParties),
      totalCompanies5: Math.min(100, totalCompanies * 20)
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/logout', auth.isAuthorized, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('accounting.sid');
    return res.redirect('/');
  });
});

module.exports = router;
