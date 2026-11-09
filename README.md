# SN Enterprises

Company website and internal portal for **SN Enterprises**, built with React (Vite) and Firebase (Firestore).

## Routes

| Path | Description |
|------|-------------|
| `/`, `/about`, `/services`, `/contact` | Public, customer-facing website |
| `/admin` | Portal dashboard (welcome board) |
| `/admin/tax-invoices` | Tax invoice list (search, view, edit, delete) |
| `/admin/tax-invoices/new` | Create a tax invoice |
| `/admin/tax-invoices/:id` | View / print a tax invoice |
| `/admin/tax-invoices/:id/edit` | Edit a tax invoice |
| `/admin/commercial-invoices` | Placeholder (coming soon) |
| `/admin/companies` | Companies (buyers) — list, search, add, edit, delete |
| `/admin/products` | Products — list, search, add, edit, delete |

> `/admin` is **not secured yet**. Add Firebase Authentication and a route guard before going live.

## Getting started

```bash
npm install
npm run dev
```

Without Firebase keys the app runs in **demo mode** and saves data in the browser's localStorage.

## Connecting Firebase

1. Create a project at https://console.firebase.google.com.
2. Build → **Firestore Database** → Create database.
3. Project settings → General → **Add app → Web**, copy the config values.
4. `cp .env.example .env.local` and paste the values.
5. Restart `npm run dev`. The yellow "Demo mode" banner disappears once Firestore is in use.

Data is stored in the `taxInvoices`, `companies` and `products` collections. Development rules are in `firestore.rules`
(open access — lock them down before going live).

## Companies & products

Companies and products are managed from their own tabs in the portal. The tax invoice form picks the PO company and items from
these collections; the item's HSN code is filled in automatically. Each invoice stores a copy of the
buyer's details, so editing or deleting a company later doesn't change existing invoices.

SN Enterprises' own details (address, GSTIN, IEC, bank, LUT) are in `src/config/company.js`.

## Tax invoice fields

Invoice date, invoice number (auto-suggested as `SNE/<FY>/<nnn>`), PO date, PO number, PO company,
currency, payment terms, line items (item, HSN, qty, rate, amount) and tax
(CGST 9% + SGST 9%, or IGST 18%). Sub total, taxes and grand total are calculated automatically.

## Deploying (later)

```bash
npm run build
npx firebase-tools deploy   # uses firebase.json (hosting serves ./dist with SPA rewrites)
```

Any static host works as long as all routes fall back to `index.html`.

## Project structure

```
src/
  config/        company details, currencies, tax types, suggestions
  services/      Firestore data access (with localStorage fallback)
  utils/         invoice calculations and formatting
  components/    public and admin layouts
  pages/public/  website pages
  pages/admin/   portal pages (dashboard, tax invoices)
```
