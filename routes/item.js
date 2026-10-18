const express = require('express');
const Item = require('../models/items/item');
const ItemCompany = require('../models/items/itemCompany');
const ItemType = require('../models/items/itemType');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');
const { postOpeningInventory } = require('../services/accounting');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

const createFields = ['companyName','newModelName','hsn','itemType','tax','price','unitCost','quantityOnHand','reorderLevel'];
const editFields = ['companyName','newModelName','hsn','itemType','tax','price','unitCost','reorderLevel'];
function normalize(body, fields) {
  const data = Object.fromEntries(fields.filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
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
  let item;
  try {
    item = await Item.create({ ...normalize(req.body, createFields), companyId: String(req.session.companyId) });
    await postOpeningInventory({ companyId: req.company._id, item });
    return res.redirect('/item/list');
  } catch (error) {
    if (item) await Item.deleteOne({ _id: item._id });
    if (error?.code === 11000) return res.status(409).send('An item with this model name already exists for the selected company');
    if (String(error?.message || '').includes('is closed')) return res.status(409).send(error.message);
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
      normalize(req.body, editFields),
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
