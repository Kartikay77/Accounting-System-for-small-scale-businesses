const express = require('express');
const Party = require('../models/party');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

router.get('/edit', (req, res) => res.render('party/edit', { title: 'Edit Party', userName: req.session.username, companyName: req.session.companyName }));
router.get('/list', (req, res) => res.render('party/list', { title: 'List Party', userName: req.session.username, companyName: req.session.companyName, party_page: true }));
router.get('/new', (req, res) => res.render('party/new', { title: 'New Party', userName: req.session.username, companyName: req.session.companyName }));

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    await Party.create({ ...req.body, companyid: String(req.session.companyId) });
    return res.redirect('/party/list');
  } catch (error) {
    return next(error);
  }
});

router.get('/getpartyforlist', async (req, res, next) => {
  try {
    const parties = await Party.findByCompanyId(req.session.companyId);
    const data = parties.map((party) => ({
      name: party.name,
      city: party.city,
      gstin: party.gstin,
      contactPersonName: party.contactPersonName,
      mobileNumber: party.mobileNumber,
      email: party.email,
      actions: `<td><div class="dropdown-content"><a href="/party/edit/${party._id}" class="dropdown-item">Edit</a><form method="POST" action="/party/delete/${party._id}" style="display:inline"><button type="submit" class="dropdown-item">Delete</button></form></div></td>`
    }));
    return res.send({ data });
  } catch (error) {
    return next(error);
  }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const party = await Party.findOne({ _id: req.params.id, companyid: String(req.session.companyId), isArchived: { $ne: true } });
    if (!party) return res.status(404).send('Party not found');
    return res.render('party/edit', { title: 'Edit Party', userName: req.session.username, companyName: req.session.companyName, party });
  } catch (error) {
    return next(error);
  }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const allowed = ['name','gstin','address','city','state','pincode','country','contactPersonName','email','mobileNumber','altMobileNumber'];
    const update = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body, key)).map((key) => [key, req.body[key]]));
    const party = await Party.findOneAndUpdate({ _id: req.params.id, companyid: String(req.session.companyId), isArchived: { $ne: true } }, update, { runValidators: true, new: true });
    if (!party) return res.status(404).send('Party not found');
    return res.redirect('/party/list');
  } catch (error) {
    return next(error);
  }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const party = await Party.findOneAndUpdate({ _id: req.params.id, companyid: String(req.session.companyId) }, { isArchived: true }, { new: true });
    if (!party) return res.status(404).send('Party not found');
    return res.redirect('/party/list');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
