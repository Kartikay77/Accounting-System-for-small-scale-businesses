const express = require('express');
const PayrollEntry = require('../models/payrollEntry');
const auth = require('../middleware/auth');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();
router.use(auth.isAuthorized, auth.requireCompany);

function toView(entry) {
  const monthly = Number(entry.monthlySalary || 0);
  return {
    ...entry,
    monthlyDisplay: monthly.toFixed(2),
    dailyDisplay: (monthly / 30).toFixed(2),
    yearlyDisplay: (monthly * 12).toFixed(2)
  };
}

router.get('/list', async (req, res, next) => {
  try {
    const entries = await PayrollEntry.findByCompanyId(req.session.companyId).lean();
    const payrollRows = entries.map(toView);
    const monthlyTotal = payrollRows.reduce((sum, entry) => sum + Number(entry.monthlySalary || 0), 0);
    return res.render('salary/list', {
      title: 'Salary Management',
      salary_page: true,
      payrollRows,
      monthlyTotal: monthlyTotal.toFixed(2),
      dailyTotal: (monthlyTotal / 30).toFixed(2),
      yearlyTotal: (monthlyTotal * 12).toFixed(2)
    });
  } catch (error) { return next(error); }
});

router.get('/new', (req, res) => res.render('salary/new', { title: 'Add Employee Salary', salary_page: true }));

router.post('/new', sameOriginOnly, async (req, res, next) => {
  try {
    const employeeName = String(req.body.employeeName || '').trim();
    const monthlySalary = Number(req.body.monthlySalary);
    if (!employeeName || !Number.isFinite(monthlySalary) || monthlySalary < 0) {
      return res.status(400).send('Valid employee name and monthly salary are required');
    }
    await PayrollEntry.create({ companyId: String(req.session.companyId), employeeName, monthlySalary });
    return res.redirect('/salary/list');
  } catch (error) {
    if (error?.code === 11000) return res.status(409).send('This employee already has a salary entry for the selected company');
    return next(error);
  }
});

router.get('/edit/:id', async (req, res, next) => {
  try {
    const entry = await PayrollEntry.findOne({ _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } }).lean();
    if (!entry) return res.status(404).send('Salary entry not found');
    return res.render('salary/edit', { title: 'Edit Employee Salary', salary_page: true, entry });
  } catch (error) { return next(error); }
});

router.post('/edit/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const employeeName = String(req.body.employeeName || '').trim();
    const monthlySalary = Number(req.body.monthlySalary);
    if (!employeeName || !Number.isFinite(monthlySalary) || monthlySalary < 0) {
      return res.status(400).send('Valid employee name and monthly salary are required');
    }
    const entry = await PayrollEntry.findOneAndUpdate(
      { _id: req.params.id, companyId: String(req.session.companyId), isArchived: { $ne: true } },
      { employeeName, monthlySalary },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).send('Salary entry not found');
    return res.redirect('/salary/list');
  } catch (error) { return next(error); }
});

router.post('/delete/:id', sameOriginOnly, async (req, res, next) => {
  try {
    const entry = await PayrollEntry.findOneAndUpdate(
      { _id: req.params.id, companyId: String(req.session.companyId) },
      { isArchived: true },
      { new: true }
    );
    if (!entry) return res.status(404).send('Salary entry not found');
    return res.redirect('/salary/list');
  } catch (error) { return next(error); }
});

module.exports = router;
