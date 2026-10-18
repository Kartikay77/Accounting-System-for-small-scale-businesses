# Easy Accounting — Small Business Accounting System

A modernized full-stack accounting application built from an original academic project using **Node.js, Express, MongoDB, Handlebars, AJAX, and React**.

The project has evolved from a basic invoicing/coursework application into a runnable small-business system with authentication, company-scoped data, customers, inventory, invoicing, payroll, AJAX-backed views, a React module, Docker support, automated tests, and an expanded accounting engine currently implemented in **PR #7**.

> **Repository status:** `main` contains the modernized operational application. The full double-entry accounting engine and financial reporting layer have been implemented in [PR #7](https://github.com/Kartikay77/Accounting-System-for-small-scale-businesses/pull/7) and will become part of `main` after that PR is merged.

---

## Features available on `main`

### Authentication and company management

- User registration and login
- bcrypt password hashing
- MongoDB-backed sessions
- Company creation, selection, editing, listing, and archiving
- Company ownership checks and scoped business data
- Authentication rate limiting
- Secure HTTP-only session cookies

### Customers / parties

- Create and manage sales parties/customers
- GSTIN, address, city, phone, and contact information
- Company-scoped party records
- Archive behavior instead of destructive deletion

### Inventory

- Item master management
- Selling price and GST rate
- Quantity-on-hand tracking
- Company-specific inventory records
- Archived item support

### Sales invoicing

- Create invoices from MongoDB-backed company, customer, and item data
- Multiple invoice line items
- Serial-number support
- Server-side subtotal, tax, and grand-total calculations
- Invoice listing
- Printable invoices
- Invoice void/archive workflow
- GST/IGST-aware invoice presentation

### AJAX

The application includes live AJAX-backed list refreshes for core workflows.

Examples:

- `/company/getcompanyforlist`
- `/invoice/getinvoiceforlist`

The original standalone AJAX coursework is also retained under `AJAX/` for historical reference.

### Salary / payroll module

The repository contains two payroll interfaces backed by the same MongoDB data:

- Server-rendered Handlebars salary management
- A live React salary-management application

Supported operations include:

- Add salary records
- Edit salary records
- Archive salary records
- Daily salary calculation
- Monthly salary calculation
- Yearly salary calculation
- JSON API access from React

The React application is available at:

```text
http://localhost:3000/react-salary/
```

---

# Accounting engine — implemented in PR #7

A substantially larger accounting layer has already been implemented and tested in **PR #7: Add full double-entry accounting engine and financial reports**.

It adds the following modules.

## Double-entry posting

Business events create balanced journal entries rather than only updating operational records.

Examples:

```text
Sales Invoice
Dr Accounts Receivable
    Cr Sales Revenue
    Cr GST Payable

Customer Receipt
Dr Bank / Cash
    Cr Accounts Receivable

Vendor Bill
Dr Expense or Inventory
Dr GST Input Credit
    Cr Accounts Payable

Vendor Payment
Dr Accounts Payable
    Cr Bank / Cash

Cost of Goods Sold
Dr Cost of Goods Sold
    Cr Inventory
```

The accounting service also supports:

- Manual balanced journal entries
- Opening-inventory capitalization
- Inventory adjustments
- Invoice reversal entries
- Closed-period posting checks
- Default company Chart of Accounts

## General Ledger

The accounting branch adds:

```text
/accounting/ledger
```

with:

- Account-level journal activity
- Debit and credit totals
- Running balances
- Date filtering
- Company-scoped ledger data

## Trial Balance

```text
/accounting/trial-balance
```

Provides account debit/credit totals and validates the core accounting identity that posted debits equal posted credits.

## Profit & Loss

```text
/accounting/profit-loss
```

Includes revenue and expense accounts such as:

- Sales Revenue
- Inventory Adjustment Gain
- Cost of Goods Sold
- Operating Expense
- Inventory Shrinkage
- Net Income

## Balance Sheet

```text
/accounting/balance-sheet
```

Includes assets, liabilities, and equity such as:

- Cash
- Bank
- Accounts Receivable
- Inventory
- GST Input Credit
- Accounts Payable
- GST Payable
- Owner Equity
- Retained/current earnings treatment

## Accounts Receivable

```text
/accounting/ar
```

Supports customer receipts and invoice payment-state changes including:

```text
ISSUED → PARTIALLY_PAID → PAID
```

## Accounts Payable

```text
/accounting/ap
```

Supports:

- Vendor bills
- Expense bills
- Inventory-purchase bills
- Due dates
- Open / partially paid / paid tracking
- Vendor payments
- Overdue-day calculations

## Automatic inventory and COGS accounting

Inventory transactions are tied to the accounting ledger.

Implemented behavior includes:

- Opening inventory capitalization
- Automatic stock reduction on sale
- Automatic COGS posting
- Inventory purchase posting
- Weighted-average unit-cost recalculation
- Inventory adjustments
- Inventory ledger transactions
- Stock restoration when eligible invoices are voided

## Bank reconciliation

```text
/accounting/bank-reconciliation
```

Supports:

- Bank-statement transactions
- Deposits and withdrawals
- Matching statement entries with Bank journal movements
- Matched / unmatched reconciliation status

## Financial-period closing

```text
/accounting/periods
```

Supports:

- Defined accounting periods
- Period close
- Revenue and expense closing entries
- Transfer of period earnings into equity
- Protection against posting transactions into closed periods

---

# Quick start with Docker

The easiest way to run the project is Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose

## Run

```bash
git clone https://github.com/Kartikay77/Accounting-System-for-small-scale-businesses.git
cd Accounting-System-for-small-scale-businesses
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Docker Compose starts MongoDB, waits for database health, builds the React salary module, seeds demonstration data, and starts the Express application.

## Demo account

```text
Email:    demo@easyaccounting.local
Password: DemoPass123!
```

The seeded environment includes demonstration business data so the application can be explored immediately.

---

# Run without Docker

Install Node.js and MongoDB locally, then:

```bash
cp .env.example .env
npm install
npm run build:react
npm run seed
npm start
```

Default local database:

```text
mongodb://127.0.0.1:27017/accounting_system
```

Node.js **22** is recommended for development and CI.

---

# Environment variables

Example `.env`:

```dotenv
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/accounting_system
SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
```

Use:

```dotenv
COOKIE_SECURE=true
```

when the application is deployed behind HTTPS.

Never commit production secrets to the repository.

---

# React development

For React-only development, keep Express running on port `3000` and run:

```bash
cd REACT
npm install
npm run dev
```

The Vite development server runs separately and proxies the salary API to the Express backend.

The production React bundle is generated into the Express static assets with:

```bash
npm run build:react
```

---

# Testing and code quality

Run:

```bash
npm test
npm run lint
```

GitHub Actions also builds the React application and performs application validation.

The expanded accounting work in PR #7 additionally includes a Mongo-backed integration flow covering major accounting operations and verifies that posted journal entries remain balanced:

```text
Total Debits = Total Credits
```

The integration flow exercises registration, company setup, parties, inventory, invoicing, customer receipts, AP bills, vendor payments, inventory adjustments, manual journals, financial reports, bank reconciliation, payroll, and financial-period closing.

---

# Project structure

```text
.
├── app.js
├── bin/
│   └── www
├── config/
├── middleware/
├── models/
│   ├── user.js
│   ├── company.js
│   ├── party.js
│   ├── account.js
│   ├── journalEntry.js
│   ├── payment.js
│   ├── inventoryTransaction.js
│   ├── auditLog.js
│   ├── payrollEntry.js
│   ├── invoice/
│   └── items/
├── routes/
│   ├── user.js
│   ├── company.js
│   ├── party.js
│   ├── item.js
│   ├── invoice.js
│   └── salary.js
├── scripts/
│   ├── seed.js
│   └── build-react.js
├── public/
│   ├── css/
│   ├── js/
│   └── react-salary/
├── views/
├── test/
├── REACT/
├── AJAX/
├── media/
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

After PR #7 is merged, the project structure also includes the accounting routes, services, views, AP models, bank transactions, and accounting-period models introduced by that branch.

---

# Security improvements

The modernization work includes:

- bcrypt password hashing
- No plaintext-password logging
- Environment-based secrets
- HTTP-only session cookies
- HTTPS secure-cookie option
- Authentication rate limiting
- Company ownership validation
- Company-scoped database queries
- Field allowlisting instead of unrestricted mass assignment
- Archive/void workflows instead of destructive GET deletes
- Same-origin checks for state-changing browser requests
- Centralized error handling
- Helmet HTTP security headers
- Production session-secret enforcement

This improves the original academic implementation substantially, but production financial software would require additional security review and controls.

---

# Historical coursework

This repository intentionally retains parts of the original university project for comparison and historical context.

These include:

- `18BCE2199_IWP_PROJECT.pdf`
- `AJAX/`
- historical React coursework
- screenshots and project media

The modern application is therefore both a working software project and an example of how an older academic codebase can be incrementally refactored into a safer and more maintainable system.

---

# Current scope and limitations

The project is intended as a **small-business accounting and ERP-style portfolio application**, not as a replacement for production products such as SAP Business One, QuickBooks, Xero, or Tally.

Even after the expanded accounting engine is merged, production financial software would require additional capabilities such as:

- statutory GST filing integrations
- e-invoicing integrations
- multi-currency and FX revaluation
- fixed-asset accounting and depreciation
- automated bank feeds
- approval workflows
- stronger role segregation and authorization policies
- immutable audit controls
- backups and disaster recovery
- formal migrations and upgrade tooling
- accounting/legal validation for the target jurisdiction

---

# Modernization goals

This project demonstrates work across:

- Full-stack web development
- REST/JSON APIs
- Server-side rendering
- React integration
- AJAX
- MongoDB data modeling
- Authentication and authorization
- ERP-style master data
- Inventory workflows
- Sales invoicing
- Payroll
- Double-entry accounting architecture
- Financial reporting
- Docker-based development
- Automated integration testing
- Legacy-code modernization

---

## Original author

**Kartikay Gupta**

GitHub: [Kartikay77](https://github.com/Kartikay77)
