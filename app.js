require('dotenv').config();

const express = require('express');
const path = require('path');
const hbs = require('hbs');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { rateLimit } = require('express-rate-limit');
require('./config/mongoose');

const company = require('./routes/company');
const mainRouter = require('./routes/index');
const invoice = require('./routes/invoice');
const item = require('./routes/item');
const party = require('./routes/party');
const user = require('./routes/user');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/accounting_system';
const sessionSecret = process.env.SESSION_SECRET || 'development-only-change-me';

if (process.env.NODE_ENV === 'production' && sessionSecret === 'development-only-change-me') {
  throw new Error('SESSION_SECRET must be configured in production');
}

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(session({
  name: 'accounting.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({ mongoUrl, ttl: 60 * 60 * 8 }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const publicDirectoryPath = path.join(__dirname, 'public');
const viewsPath = path.join(__dirname, 'views');
const partialsPath = path.join(__dirname, 'views', 'partials');

app.set('views', viewsPath);
app.set('view engine', 'hbs');
hbs.registerPartials(partialsPath);
app.use(express.static(publicDirectoryPath));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

app.use('/company', company);
app.use('/invoice', invoice);
app.use('/item', item);
app.use('/party', party);
app.use('/user', authLimiter, user);
app.use('/', mainRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
