const express = require('express');
const User = require('../models/user');
const { sameOriginOnly } = require('../middleware/security');

const router = express.Router();

router.post('/register', sameOriginOnly, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).send('Username, email and password are required');
    }
    if (String(password).length < 8) {
      return res.status(400).send('Password must be at least 8 characters');
    }

    const user = await User.create({ username, email, password });
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    return res.redirect('/home');
  } catch (error) {
    if (error && error.code === 11000) return res.status(409).send('An account with this email already exists');
    return next(error);
  }
});

router.post('/login', sameOriginOnly, async (req, res) => {
  try {
    const user = await User.authenticate(req.body.email, req.body.password);

    return req.session.regenerate((sessionError) => {
      if (sessionError) return res.status(500).send('Unable to start session');
      req.session.userId = user._id.toString();
      req.session.username = user.username;
      req.session.companyName = '';
      req.session.companyId = '';
      return res.redirect('/home');
    });
  } catch (error) {
    return res.status(401).render('pages/login', { title: 'Login', loginForm: 'Invalid email or password' });
  }
});

module.exports = router;
