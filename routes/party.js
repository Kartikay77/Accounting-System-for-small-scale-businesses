const express = require('express');
const Party = require('../models/party');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

const allowedFields = ['name','gstin','address','city','state','pincode','country','contactPersonName','email','mobileNumber','altMobileNumber'];
function pick(body) {
  return Object.fromEntries(allowedFields.filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
}

router.get('/list', async (req, res, next) => {
  try {
    const parties = await Party.findByCompanyId(req.session.companyId).lean();
    return res.render('party/list', { title: 'Parties', party_page: true, parties });
  } catch (error) { return next(error); }
});
router.get('/new', (req, res) => res.render('party/new', { title: 'New Party' }));

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    await Party.create({ ...pick(req.body), companyid: String(req.session.companyId) });
    return res.redirect('/party/list');
  } catch (error) { return next(error); }
});

router.get('/getpartyforlist', async (req, res, next) => {
  try {
    const parties = await Party.findByCompanyId(req.session.companyId).lean();
    return res.json({ data: parties });
  } catch (error) { return next(error); }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const party = await Party.findOne({ _id: req.params.id, companyid: String(req.session.companyId), isArchived: { $ne: true } });
    if (!party) return res.status(404).send('Party not found');
    return res.render('party/edit', { title: 'Edit Party', party });
  } catch (error) { return next(error); }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, companyid: String(req.session.companyId), isArchived: { $ne: true } },
      pick(req.body),
      { runValidators: true, new: true }
    );
    if (!party) return res.status(404).send('Party not found');
    return res.redirect('/party/list');
  } catch (error) { return next(error); }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const party = await Party.findOneAndUpdate(
      { _id: req.params.id, companyid: String(req.session.companyId) },
      { isArchived: true },
      { new: true }
    );
    if (!party) return res.status(404).send('Party not found');
    return res.redirect('/party/list');
  } catch (error) { return next(error); }
});

module.exports = router;
