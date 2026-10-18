const express = require('express');
const Company = require('../models/company');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized);

const allowedFields = ['name','email','gstin','address','city','state','pincode','country','bankName','branch','ifsc','accountNumber'];
function pick(body) {
  return Object.fromEntries(allowedFields.filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
}

function companyForJson(company) {
  return {
    _id: company._id,
    name: company.name,
    email: company.email,
    gstin: company.gstin,
    address: company.address,
    city: company.city,
    state: company.state,
    pincode: company.pincode,
    country: company.country
  };
}

router.get('/new', (req, res) => res.render('company/new', { newcompany: true, title: 'New Company' }));

router.get('/list', async (req, res, next) => {
  try {
    const companies = await Company.findByUserId(req.session.userId).lean();
    return res.render('company/list', { company_page: true, ajax_list_page: true, title: 'Companies', companies });
  } catch (error) { return next(error); }
});

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    const company = await Company.create({ ...pick(req.body), userid: String(req.session.userId) });
    if (!req.session.companyId) {
      req.session.companyId = company._id.toString();
      req.session.companyName = company.name;
    }
    return res.redirect('/company/list');
  } catch (error) { return next(error); }
});

router.post('/select', sameOriginOnly, async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.body.companyId, userid: String(req.session.userId), isArchived: { $ne: true } });
    if (!company) return res.status(404).send('Company not found');
    req.session.companyId = company._id.toString();
    req.session.companyName = company.name;
    return res.redirect(req.get('referer') || '/home');
  } catch (error) { return next(error); }
});

router.get('/getcompanies', async (req, res, next) => {
  try {
    const companies = await Company.findByUserId(req.session.userId).lean();
    return res.json({ companies: companies.map(companyForJson), success: true });
  } catch (error) { return next(error); }
});

router.get('/getcompanyforlist', async (req, res, next) => {
  try {
    const companies = await Company.findByUserId(req.session.userId).lean();
    return res.json({ data: companies.map(companyForJson) });
  } catch (error) { return next(error); }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, userid: String(req.session.userId), isArchived: { $ne: true } });
    if (!company) return res.status(404).send('Company not found');
    return res.render('company/edit', { company_page: true, company, title: 'Edit Company' });
  } catch (error) { return next(error); }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, userid: String(req.session.userId), isArchived: { $ne: true } },
      pick(req.body),
      { runValidators: true, new: true }
    );
    if (!company) return res.status(404).send('Company not found');
    if (String(req.session.companyId) === String(company._id)) req.session.companyName = company.name;
    return res.redirect('/company/list');
  } catch (error) { return next(error); }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, userid: String(req.session.userId) },
      { isArchived: true },
      { new: true }
    );
    if (!company) return res.status(404).send('Company not found');
    if (String(req.session.companyId) === String(company._id)) {
      req.session.companyId = '';
      req.session.companyName = '';
    }
    return res.redirect('/company/list');
  } catch (error) { return next(error); }
});

module.exports = router;
