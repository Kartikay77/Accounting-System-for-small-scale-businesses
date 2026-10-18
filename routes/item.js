const express = require('express');
const Item = require('../models/items/item');
const ItemCompany = require('../models/items/itemCompany');
const ItemType = require('../models/items/itemType');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

const allowedFields = ['companyName','newModelName','hsn','itemType','tax','price','unitCost','quantityOnHand','reorderLevel'];
function normalize(body) {
  const data = Object.fromEntries(allowedFields.filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
  if (body.newCompanyName) data.companyName = body.newCompanyName;
  if (body.newItemType) data.itemType = body.newItemType;
  return data;
}

router.get('/list', async (req, res, next) => {
  try {
    const items = await Item.findByCompanyId(req.session.companyId).lean();
    return res.render('item/list', { title: 'Items', item_page: true, items });
  } catch (error) { return next(error); }
});

router.get('/new', async (req, res, next) => {
  try {
    const [itemCompanies, itemTypes] = await Promise.all([
      ItemCompany.findByCompanyId(req.session.companyId),
      ItemType.findByCompanyId(req.session.companyId)
    ]);
    return res.render('item/new', { title: 'New Item', new_item_page: true, itemCompanies, itemTypes });
  } catch (error) { return next(error); }
});

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    await Item.create({ ...normalize(req.body), companyId: String(req.session.companyId) });
    return res.redirect('/item/list');
  } catch (error) {
    if (error?.code === 11000) return res.status(409).send('An item with this model name already exists for the selected company');
    return next(error);
  }
});

router.get('/getitemforlist', async (req, res, next) => {
  try {
    const items = await Item.findByCompanyId(req.session.companyId).lean();
    return res.json({ data: items });
  } catch (error) { return next(error); }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const [item, itemCompanies, itemTypes] = await Promise.all([
      Item.findOne({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } }),
      ItemCompany.findByCompanyId(req.session.companyId),
      ItemType.findByCompanyId(req.session.companyId)
    ]);
    if (!item) return res.status(404).send('Item not found');
    return res.render('item/edit', { title: 'Edit Item', new_item_page: true, itemCompanies, itemTypes, item });
  } catch (error) { return next(error); }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } },
      normalize(req.body),
      { runValidators: true, new: true }
    );
    if (!item) return res.status(404).send('Item not found');
    return res.redirect('/item/list');
  } catch (error) { return next(error); }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: String(req.session.companyId) },
      { isArchived: true },
      { new: true }
    );
    if (!item) return res.status(404).send('Item not found');
    return res.redirect('/item/list');
  } catch (error) { return next(error); }
});

module.exports = router;
