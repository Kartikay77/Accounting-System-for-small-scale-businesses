# Easy Accounting — Small Business Accounting System

A runnable full-stack demonstration of company-scoped invoicing and small-business master-data management using **Node.js, Express, Handlebars and MongoDB**.

## What works

- User registration and login with bcrypt password hashing
- Server-side sessions stored in MongoDB outside test mode
- Multiple companies per user with active-company switching
- Company create/edit/archive
- Party/customer create/edit/archive
- Item master create/edit/archive, GST rate, price and quantity-on-hand fields
- Invoice creation with multiple line items
- Server-authoritative subtotal, GST and grand-total calculation
- Company-scoped invoice access and unique invoice numbers per company
- Invoice list, voiding and printable invoice view
- Dashboard counts
- Dockerized MongoDB and app startup
- Idempotent demo-data seed
- Unit tests plus a Mongo-backed integration workflow in CI
- Self-contained runtime CSS/JavaScript; the app does not depend on the removed Bootstrap/DataTables asset bundle

> The repository also contains historical `AJAX/` and `REACT/` coursework examples. They are preserved for project history but are not required by the main Express application.

## Fastest way to run

Prerequisite: Docker Desktop / Docker Engine with Compose.

```bash
git clone https://github.com/Kartikay77/Accounting-System-for-small-scale-businesses.git
cd Accounting-System-for-small-scale-businesses
docker compose up --build
```

Open **http://localhost:3000**.

The Compose startup waits for MongoDB, seeds demonstration data, then starts the web server.

### Demo account

- Email: `demo@easyaccounting.local`
- Password: `DemoPass123!`

You can also register a new account from the UI.

## Run without Docker

1. Install Node.js 20+ and MongoDB.
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

CI additionally launches MongoDB and exercises the real authenticated workflow: register → company → party → item → invoice → list → print.

## Main structure

```text
app.js
bin/www
config/
middleware/
models/
routes/
scripts/seed.js
public/
  css/app.css
  js/app.js
  js/invoice-form.js
views/
test/
Dockerfile
docker-compose.yml
```

## Accounting scope

This repository is now a **functional invoicing application and accounting-domain foundation**, not a finished commercial ERP. Domain models for accounts, journal entries, payments, inventory transactions, company memberships and audit logs are present, but automatic double-entry posting, bank reconciliation, accounts payable, Trial Balance, P&L and Balance Sheet are future modules.

That distinction is intentional: the implemented workflows are runnable and tested, while roadmap functionality is not presented as completed.

## Security basics

- bcrypt password hashing
- no plaintext password logging
- environment-based secrets
- HTTP-only session cookie
- optional secure cookie for HTTPS deployments
- rate limiting on authentication routes
- user/company ownership checks
- soft archive/void behavior for business records
- same-origin protection for state-changing browser requests

## Historical screenshots

Original project screenshots remain under `media/` and are displayed on the landing page. The original academic report is retained as `18BCE2199_IWP_PROJECT.pdf`.
