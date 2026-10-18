require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');
const hbs = require('hbs');
const helmet = require('helmet');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
require('./config/mongoose');

const Company = require('./models/company');
const accounting = require('./routes/accounting');
const company = require('./routes/company');
const mainRouter = require('./routes/index');
const invoice = require('./routes/invoice');
const item = require('./routes/item');
const party = require('./routes/party');
const salary = require('./routes/salary');
const user = require('./routes/user');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/accounting_system';
const sessionSecret = process.env.SESSION_SECRET || 'development-only-change-me';

if (process.env.NODE_ENV === 'production' && sessionSecret === 'development-only-change-me') {
  throw new Error('SESSION_SECRET must be configured in production');
}

if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const sessionOptions = {
  name: 'accounting.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
};

if (process.env.NODE_ENV !== 'test') {
  sessionOptions.store = MongoStore.create({ mongoUrl, ttl: 60 * 60 * 8 });
}
app.use(session(sessionOptions));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(path.join(__dirname, 'media')));

app.use(async (req, res, next) => {
  try {
    res.locals.userName = req.session?.username || '';
    res.locals.companyName = req.session?.companyName || '';
    res.locals.currentCompanyId = req.session?.companyId || '';
    res.locals.availableCompanies = req.session?.userId
      ? await Company.findByUserId(req.session.userId).lean()
      : [];
    return next();
  } catch (error) {
    return next(error);
  }
});

const appLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

app.use(appLimiter);
app.use('/accounting', accounting);
app.use('/company', company);
app.use('/invoice', invoice);
app.use('/item', item);
app.use('/party', party);
app.use('/salary', salary);
app.use('/user', authLimiter, user);
app.use('/', mainRouter);

app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
