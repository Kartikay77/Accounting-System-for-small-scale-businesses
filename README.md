# Easy Accounting — Small Business Accounting System

A runnable full-stack modernization of the original 2020 CSE3002 project using **Node.js, Express, Handlebars and MongoDB**.

The repository retains the original academic report (`18BCE2199_IWP_PROJECT.pdf`), screenshots, AJAX coursework, and React salary coursework for historical reference. The main application now implements the documented business workflows in one integrated server application.

## Original-report functionality covered

- Landing page
- Login and registration with validation and bcrypt password hashing
- MongoDB-backed user data and sessions
- Create, list, select, edit and archive companies
- Sales party/customer management
- Inventory/item management with price, GST and quantity-on-hand
- Invoice creation using company, party and item data from MongoDB
- Multiple invoice line items
- Serial numbers per invoice line
- Server-authoritative subtotal, GST and grand-total calculation
- Invoice list and printable invoice
- AJAX refresh of company and invoice lists from MongoDB without a page reload
- Salary management with employee add/edit/archive and daily/monthly/yearly views
- Dashboard counts
- Historical screenshots served from `media/`
- Local/offline-capable runtime after dependencies and Docker images are installed; no CDN assets are required by the main UI

## Fastest way to run

Prerequisite: Docker Desktop / Docker Engine with Compose.

```bash
git clone https://github.com/Kartikay77/Accounting-System-for-small-scale-businesses.git
cd Accounting-System-for-small-scale-businesses
docker compose up --build
```

Open **http://localhost:3000**.

Compose starts MongoDB, waits for database health, seeds demonstration data, and starts the application.

### Demo account

- Email: `demo@easyaccounting.local`
- Password: `DemoPass123!`

Seed data includes a company, customer, inventory item, serial-numbered invoice and salary entry.

## Run without Docker

1. Install Node.js 20+ and MongoDB 8.0 (or a compatible supported MongoDB version).
2. Copy `.env.example` to `.env`.
3. Run:

```bash
npm install
npm run seed
npm start
```

Default local MongoDB URI: `mongodb://127.0.0.1:27017/accounting_system`.

## Environment variables

```dotenv
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/accounting_system
SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
```

Use `COOKIE_SECURE=true` only behind HTTPS in production.

## Validation

```bash
npm test
npm run lint
```

CI launches MongoDB and executes the authenticated workflow: register → company → AJAX company fetch → party → item → serial-numbered invoice → AJAX invoice fetch → invoice list/print → salary management.

## Main structure

```text
app.js
bin/www
config/
middleware/
models/
  payrollEntry.js
routes/
  salary.js
scripts/seed.js
public/
  css/app.css
  js/app.js
  js/ajax-lists.js
  js/invoice-form.js
views/
  salary/
test/
Dockerfile
docker-compose.yml
```

## About the historical `AJAX/` and `REACT/` folders

They are preserved because they are part of the original coursework/report. They are **not required to run the main application**. The report's AJAX behavior and salary-management functionality have been integrated into the main app instead, so a fresh clone no longer depends on those old standalone demos.

## Accounting scope

This is a functional small-business invoicing, master-data, inventory-summary and salary-management application. It is **not** a complete commercial ERP/general-ledger product. Models for accounts, journals, payments, audit logs and inventory transactions provide a foundation, but automatic double-entry posting, bank reconciliation, accounts payable, Trial Balance, P&L and Balance Sheet remain future accounting modules.

## Security basics

- bcrypt password hashing
- no plaintext password logging
- environment-based secrets
- HTTP-only session cookies
- optional secure cookie for HTTPS deployments
- authentication rate limiting
- user/company ownership checks
- archive/void behavior for business records
- same-origin checks for state-changing browser requests
