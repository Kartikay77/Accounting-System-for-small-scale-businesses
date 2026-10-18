# Small Business Accounting System

A full-stack Node.js application for small-business company management, customers/parties, item masters, GST-aware invoicing, serial-number tracking and invoice printing. The repository began as an academic Internet & Web Programming project and is now being modernized into a safer, testable accounting/ERP foundation.

## Current stack

- Node.js 20+
- Express 5
- MongoDB + Mongoose
- Handlebars (`hbs`)
- Session authentication backed by MongoDB
- Jest for unit tests
- ESLint + Prettier
- Docker / Docker Compose
- GitHub Actions CI

## Implemented application features

- User registration, login and logout
- Multi-company records per user
- Company-scoped access controls
- Customer / sales-party master data
- Item master data, HSN, GST rate, price, stock/reorder fields
- Invoice creation with **server-side subtotal and tax calculation**
- Company-scoped invoice numbers
- GST/IGST-aware invoice printing
- Serial-number records on invoice lines
- Soft deletion / voiding for business records instead of destructive GET requests
- Health endpoint at `GET /health`

## Accounting-domain foundation

The modernization also introduces schemas for functionality that can be expanded without redesigning the database again:

- Chart of Accounts (`Account`)
- Balanced journal entries (`JournalEntry`)
- Payments and invoice allocations (`Payment`)
- Inventory movement ledger (`InventoryTransaction`)
- Company memberships and roles (`CompanyMembership`)
- Audit history (`AuditLog`)

> The current UI does not yet expose every accounting-domain model. They are the foundation for the next product layer: posting invoices/payments to the ledger, A/R aging, inventory valuation, trial balance, P&L and balance sheet.

## Security improvements

The current backend includes:

- Password hashing with bcrypt
- No plaintext password logging
- Session regeneration at login
- Mongo-backed sessions with HTTP-only/SameSite cookies
- Environment-based session secret and MongoDB connection
- Helmet security headers
- Authentication rate limiting
- Same-origin protection on state-changing HTML form requests
- Authorization checks that scope companies, customers, items and invoices to the logged-in account/company
- Soft-delete/archive behavior for master data and invoices
- Centralized 404 and error handling

## Local setup

1. Install Node.js 20+ and MongoDB, or use Docker.
2. Copy the environment template:

```bash
cp .env.example .env
```

3. Change `SESSION_SECRET` to a long random value.
4. Install dependencies:

```bash
npm install
```

5. Start the application:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

### Docker

```bash
docker compose up --build
```

## Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/accounting_system` |
| `SESSION_SECRET` | Session signing secret | Use a long random value |

## Quality checks

```bash
npm test
npm run lint
```

CI runs the same checks on pushes and pull requests.

## Project structure

```text
config/                 MongoDB configuration
middleware/             Authentication, security and error handling
models/                 Application and accounting-domain models
routes/                 Express route handlers
test/                   Unit tests
utils/                  Money, GST and number-formatting utilities
views/                   Handlebars UI
public/                  Static assets
AJAX/                    Preserved historical coursework/demo
REACT/                   Preserved historical React coursework/demo
```

## Important accounting behavior

Invoice totals are recalculated on the server from quantity, rate and the stored item tax rate. The browser-provided total is not trusted. Invoice numbers are unique inside each company, and invoice/customer/item lookups are company-scoped.

The `JournalEntry` schema enforces the core double-entry invariant that total debits equal total credits. Automatic ledger posting is intentionally not claimed as complete until account mapping and posting rules are wired into the invoice/payment flows.

## Roadmap

- Post sales invoices and payments automatically into the general ledger
- Add accounts receivable and payment allocation screens
- Add inventory movement posting and valuation
- Add credit/debit notes and returns
- Add GST tax summaries and period reports
- Add Trial Balance, Profit & Loss and Balance Sheet
- Add role-based UI permissions using `CompanyMembership`
- Add immutable audit entries for financial changes
- Add integration tests with an isolated MongoDB database

## Historical project report

The original academic report and screenshots remain in the repository for provenance and comparison with the modernized application.

## Author

**Kartikay Gupta**

GitHub: `Kartikay77`
