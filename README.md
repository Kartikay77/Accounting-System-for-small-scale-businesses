# Easy Accounting — Small Business Accounting System

A runnable modernization of the original 2020 CSE3002 project using **Node.js, Express, Handlebars, React and MongoDB**.

The repository retains the original academic report (`18BCE2199_IWP_PROJECT.pdf`), screenshots, AJAX coursework and React coursework, while also making the report's core workflows demonstrable in the current application.

## What is runnable now

- Landing page
- Login and registration with validation and bcrypt password hashing
- MongoDB-backed users and sessions
- Create, list, select, edit and archive companies
- Sales party/customer management
- Inventory/item management with price, GST and quantity-on-hand
- Invoice creation from company, party and item data in MongoDB
- Multiple invoice line items and serial numbers
- Server-authoritative subtotal, GST and grand-total calculation
- Invoice list and printable invoice
- **Live AJAX refresh** of company and invoice lists from MongoDB without a full page reload
- Server-rendered salary management with add/edit/archive and daily/monthly/yearly views
- **Live React salary-management module** using JSON APIs backed by the same Express session and MongoDB data
- Dashboard counts
- Historical screenshots served from `media/`

## Fastest way to run everything

Prerequisite: Docker Desktop / Docker Engine with Compose.

```bash
git clone https://github.com/Kartikay77/Accounting-System-for-small-scale-businesses.git
cd Accounting-System-for-small-scale-businesses
docker compose up --build
```

Open **http://localhost:3000**.

Compose starts MongoDB, waits for database health, builds the React salary module into the Express static assets, seeds demonstration data, and starts the application.

### Demo account

- Email: `demo@easyaccounting.local`
- Password: `DemoPass123!`

Seed data includes a company, customer, inventory item, serial-numbered invoice and salary entry.

## Demonstrate AJAX

After login and company selection:

1. Open **Companies** and click **Refresh via AJAX**.
2. Open browser DevTools → Network and verify the JSON request to `/company/getcompanyforlist`.
3. Open **Invoices** and click **Refresh via AJAX**.
4. Verify the JSON request to `/invoice/getinvoiceforlist`.

The table updates without a complete page reload. The original standalone XMLHttpRequest coursework remains in `AJAX/` for historical reference.

## Demonstrate React

After login and company selection, open:

**http://localhost:3000/react-salary/**

or click **React Salary Module** in the sidebar.

The module is an actual React application. It:

- fetches payroll records from `/salary/api`
- creates salary records with React form state
- edits records through `PUT /salary/api/:id`
- archives records through `DELETE /salary/api/:id`
- calculates daily, monthly and yearly payroll views in the React UI
- persists everything in the same MongoDB `payrollentries` collection used by the main application

This recreates the salary-management behavior described in the original React section of the project report while keeping it connected to the modernized backend.

## Run without Docker

1. Install Node.js 20+ and MongoDB 8.0 (or a compatible supported version).
2. Copy `.env.example` to `.env`.
3. Run:

```bash
npm install
npm run build:react
npm run seed
npm start
```

Default local MongoDB URI: `mongodb://127.0.0.1:27017/accounting_system`.

For React-only development, keep the Express app running on port 3000 and run:

```bash
cd REACT
npm install
npm run dev
```

The Vite development server runs on port 3001 and proxies the salary API to the Express application.

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

CI also installs and builds the React salary module. The Mongo-backed integration workflow covers register → company → AJAX company fetch → party → item → serial-numbered invoice → AJAX invoice fetch → invoice list/print → salary management → React salary JSON API read/edit/archive.

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
scripts/
  seed.js
  build-react.js
public/
  css/app.css
  js/ajax-lists.js
  js/invoice-form.js
  react-salary/        # generated React production build
REACT/
  package.json
  vite.config.js
  src/App.jsx
  src/main.jsx
  src/react-salary.css
AJAX/
views/
test/
Dockerfile
docker-compose.yml
```

## Historical coursework

`AJAX/` still contains the original XMLHttpRequest + JSON exercise and screenshots. `REACT/` retains the historical source files and screenshots, but it now also contains the modern runnable React salary entry point used by the current project.

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
