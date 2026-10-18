# Easy Accounting — Small Business Accounting System

A runnable modernization of the original 2020 CSE3002 project using **Node.js, Express, Handlebars, React and MongoDB**.

The repository retains the original academic report (`18BCE2199_IWP_PROJECT.pdf`), screenshots, AJAX coursework and React coursework, while extending the application into a functional double-entry accounting demo.

## What is runnable now

### Core application
- Landing page, login and registration with bcrypt password hashing
- MongoDB-backed users and sessions
- Company creation, selection, editing and archiving
- Customer/vendor party management
- Inventory item management with selling price, GST, unit cost and quantity on hand
- Multi-line sales invoices with serial numbers, E-way bill and printable invoice
- Server-authoritative subtotal, GST and grand-total calculation
- Live AJAX refresh for company and invoice lists
- Server-rendered salary management
- Live React salary-management module backed by Express JSON APIs and the same MongoDB database

### Double-entry accounting
The accounting module is available at **`/accounting`** after login and company selection.

- Default Chart of Accounts per company
- Manual balanced journal posting
- Automatic sales-invoice posting:
  - Dr Accounts Receivable
  - Cr Sales Revenue
  - Cr GST Payable
- Automatic COGS posting:
  - Dr Cost of Goods Sold
  - Cr Inventory
- Opening inventory capitalization:
  - Dr Inventory
  - Cr Owner Equity
- Customer receipts:
  - Dr Bank/Cash
  - Cr Accounts Receivable
- Expense vendor bills:
  - Dr Operating Expense
  - Dr GST Input Credit
  - Cr Accounts Payable
- Inventory vendor bills:
  - Dr Inventory
  - Dr GST Input Credit
  - Cr Accounts Payable
  - increases quantity on hand and recalculates weighted-average unit cost
- Vendor payments:
  - Dr Accounts Payable
  - Cr Bank/Cash
- Inventory adjustments with corresponding gain/shrinkage accounting
- Invoice voids automatically reverse journal entries and restore inventory
- Closed periods reject subsequent postings into the closed date range

### Reports and subledgers
- **Journal Entries** — `/accounting/journals`
- **General Ledger** — `/accounting/ledger`
- **Trial Balance** — `/accounting/trial-balance`
- **Profit & Loss** — `/accounting/profit-loss`
- **Balance Sheet** — `/accounting/balance-sheet`
- **Accounts Receivable** — `/accounting/ar`
- **Accounts Payable** — `/accounting/ap`
- **Inventory Accounting** — `/accounting/inventory`
- **Bank Reconciliation** — `/accounting/bank-reconciliation`
- **Financial Period Closing** — `/accounting/periods`

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

Seed data includes a company, customer, costed inventory item, serial-numbered invoice, accounting entries and salary entry. This means the GL, Trial Balance, P&L and Balance Sheet contain meaningful data immediately after a fresh startup.

## Demonstrate the accounting cycle

After login and company selection:

1. Open **Items** and create inventory with quantity and unit cost. Opening inventory is posted automatically.
2. Create an invoice. The system posts AR/Sales/GST and COGS/Inventory automatically.
3. Open **Accounts Receivable** and receive the customer payment.
4. Open **Accounts Payable** and create either an expense bill or an inventory-purchase bill.
5. Pay the vendor bill.
6. Open **General Ledger** and **Trial Balance** to inspect the postings.
7. Open **P&L** and **Balance Sheet** to view financial statements.
8. Open **Bank Reconciliation**, add a bank-statement transaction and match it to a bank journal movement.
9. Open **Financial Periods** and close a period. Revenue and expense accounts are closed into Owner Equity and new postings into that date range are blocked.

## Demonstrate AJAX

After login and company selection:

1. Open **Companies** and click **Refresh via AJAX**.
2. Open browser DevTools → Network and verify `/company/getcompanyforlist`.
3. Open **Invoices** and click **Refresh via AJAX**.
4. Verify `/invoice/getinvoiceforlist`.

The table updates without a complete page reload. The original standalone XMLHttpRequest coursework remains in `AJAX/` for historical reference.

## Demonstrate React

After login and company selection, open:

**http://localhost:3000/react-salary/**

or click **React Salary Module** in the sidebar.

The module is an actual React application. It fetches, creates, edits and archives payroll records through `/salary/api`, calculates daily/monthly/yearly payroll views, and persists to the same MongoDB `payrollentries` collection used by the server-rendered application.

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

CI starts MongoDB, builds React, runs unit tests, and runs a Mongo-backed integration cycle covering registration → company → party → opening inventory → invoice → automatic journal/COGS → customer receipt → AP bill/payment → inventory adjustment → manual journal → bank reconciliation → reports → salary/React APIs → financial-period close. It also verifies that every posted journal remains debit/credit balanced and that a closed period rejects a new posting.

## Main structure

```text
app.js
bin/www
config/
middleware/
models/
  account.js
  journalEntry.js
  accountingPeriod.js
  vendorBill.js
  bankTransaction.js
  payment.js
  inventoryTransaction.js
  payrollEntry.js
routes/
  accounting.js
  invoice.js
  item.js
  salary.js
services/
  accounting.js
scripts/
  seed.js
  build-react.js
public/
  css/app.css
  js/ajax-lists.js
  js/invoice-form.js
  react-salary/        # generated React production build
REACT/
AJAX/
views/
test/
Dockerfile
docker-compose.yml
```

## Historical coursework

`AJAX/` still contains the original XMLHttpRequest + JSON exercise and screenshots. `REACT/` retains historical source/screenshots and also contains the modern runnable React salary entry point.

## Accounting scope

The repository now implements a functional **single-company/single-currency small-business double-entry accounting workflow** with GL, subledgers, financial statements, inventory valuation/COGS, bank matching and period closing.

It should still be treated as a portfolio/demo accounting system rather than a regulated commercial ERP. Production expansion would typically include statutory GST filing/e-invoicing integrations, multi-currency and FX revaluation, fixed assets/depreciation, approval workflows, granular accounting roles, immutable audit-event enforcement, automated bank feeds, backups/disaster recovery and professional tax/accounting review.

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
