const express = require('express');
const Company = require('../models/company');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized);

router.get('/new', (req, res) => {
  res.render('company/new', { userName: req.session.username, companyName: req.session.companyName, newcompany: true, title: 'New Company' });
});

router.get('/list', (req, res) => {
  res.render('company/list', { userName: req.session.username, companyName: req.session.companyName, company_page: true, title: 'List Company' });
});

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    const company = await Company.create({ ...req.body, userid: String(req.session.userId) });
    if (!req.session.companyId) {
      req.session.companyId = company._id.toString();
      req.session.companyName = company.name;
    }
    return res.redirect('/company/list');
  } catch (error) {
    return next(error);
  }
});

router.get('/select', async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.query.companyId, userid: String(req.session.userId), isArchived: { $ne: true } });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    req.session.companyId = company._id.toString();
    req.session.companyName = company.name;
    return res.json({ companyName: company.name, success: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/getcompanies', async (req, res, next) => {
  try {
    const companies = await Company.findByUserId(req.session.userId);
    return res.json({ companies, success: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/getcompanyforlist', async (req, res, next) => {
  try {
    const companies = await Company.findByUserId(req.session.userId);
    const data = companies.map((company) => ({
      name: company.name,
      gstin: company.gstin,
      city: company.city,
      accountNumber: company.accountNumber,
      branch: company.branch,
      ifsc: company.ifsc,
      actions: `<td><div class="dropdown-content"><a href="/company/edit/${company._id}" class="dropdown-item">Edit</a><form method="POST" action="/company/delete/${company._id}" style="display:inline"><button type="submit" class="dropdown-item">Delete</button></form></div></td>`
    }));
    return res.send({ data });
  } catch (error) {
    return next(error);
  }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, userid: String(req.session.userId), isArchived: { $ne: true } });
    if (!company) return res.status(404).send('Company not found');
    return res.render('company/edit', { userName: req.session.username, companyName: req.session.companyName, company_page: true, company, title: 'Edit Company' });
  } catch (error) {
    return next(error);
  }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const allowed = ['name','email','gstin','address','city','state','pincode','country','bankName','branch','ifsc','accountNumber'];
    const update = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body, key)).map((key) => [key, req.body[key]]));
    const company = await Company.findOneAndUpdate({ _id: req.params.id, userid: String(req.session.userId), isArchived: { $ne: true } }, update, { runValidators: true, new: true });
    if (!company) return res.status(404).send('Company not found');
    if (String(req.session.companyId) === String(company._id)) req.session.companyName = company.name;
    return res.redirect('/company/list');
  } catch (error) {
    return next(error);
  }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate({ _id: req.params.id, userid: String(req.session.userId) }, { isArchived: true }, { new: true });
    if (!company) return res.status(404).send('Company not found');
    if (String(req.session.companyId) === String(company._id)) {
      req.session.companyId = '';
      req.session.companyName = '';
    }
    return res.redirect('/company/list');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
