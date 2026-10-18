const express = require('express');
const Item = require('../models/items/item');
const ItemCompany = require('../models/items/itemCompany');
const ItemType = require('../models/items/itemType');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

router.get('/edit', (req, res) => res.render('item/edit', { title: 'Edit Item', userName: req.session.username, companyName: req.session.companyName }));
router.get('/list', (req, res) => res.render('item/list', { title: 'List Item', userName: req.session.username, companyName: req.session.companyName, item_page: true }));

router.get('/new', async (req, res, next) => {
  try {
    const [itemCompanies, itemTypes] = await Promise.all([
      ItemCompany.findByCompanyId(req.session.companyId),
      ItemType.findByCompanyId(req.session.companyId)
    ]);
    return res.render('item/new', { title: 'New Item', userName: req.session.username, companyName: req.session.companyName, new_item_page: true, itemCompanies, itemTypes });
  } catch (error) {
    return next(error);
  }
});

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    const data = { ...req.body, companyId: String(req.session.companyId) };
    if (data.newCompanyName) data.companyName = data.newCompanyName;
    if (data.newItemType) data.itemType = data.newItemType;
    delete data.newCompanyName;
    delete data.newItemType;
    await Item.create(data);
    return res.redirect('/item/list');
  } catch (error) {
    return next(error);
  }
});

router.get('/getitemforlist', async (req, res, next) => {
  try {
    const items = await Item.findByCompanyId(req.session.companyId);
    const data = items.map((item) => ({
      newModelName: item.newModelName,
      companyName: item.companyName,
      hsn: item.hsn,
      itemType: item.itemType,
      tax: item.tax,
      price: item.price,
      actions: `<td><div class="dropdown-content"><a href="/item/edit/${item._id}" class="dropdown-item">Edit</a><form method="POST" action="/item/delete/${item._id}" style="display:inline"><button type="submit" class="dropdown-item">Delete</button></form></div></td>`
    }));
    return res.send({ data });
  } catch (error) {
    return next(error);
  }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const [item, itemCompanies, itemTypes] = await Promise.all([
      Item.findOne({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } }),
      ItemCompany.findByCompanyId(req.session.companyId),
      ItemType.findByCompanyId(req.session.companyId)
    ]);
    if (!item) return res.status(404).send('Item not found');
    return res.render('item/edit', { title: 'Edit Item', userName: req.session.username, companyName: req.session.companyName, new_item_page: true, itemCompanies, itemTypes, item });
  } catch (error) {
    return next(error);
  }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const allowed = ['companyName','newModelName','hsn','itemType','tax','price','quantityOnHand','reorderLevel'];
    const update = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body, key)).map((key) => [key, req.body[key]]));
    const item = await Item.findOneAndUpdate({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } }, update, { runValidators: true, new: true });
    if (!item) return res.status(404).send('Item not found');
    return res.redirect('/item/list');
  } catch (error) {
    return next(error);
  }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const item = await Item.findOneAndUpdate({ _id: req.params.id, companyId: String(req.session.companyId) }, { isArchived: true }, { new: true });
    if (!item) return res.status(404).send('Item not found');
    return res.redirect('/item/list');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
