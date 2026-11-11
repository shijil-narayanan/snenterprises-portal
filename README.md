# SN Enterprises

Internal admin portal for **SN Enterprises** (invoices, packing lists, companies, products), built with React (Vite) and Firebase.
It is admin-only: every page requires sign-in. A public website, if needed, lives in a separate app.

## Routes

| Path | Description |
|------|-------------|
| `/login` | Sign-in page for the portal |
| `/` | Dashboard — every page except `/login` requires sign-in |
| `/tax-invoices` | Tax invoice list (search, view, edit, delete) |
| `/tax-invoices/new` | Create a tax invoice |
| `/tax-invoices/:id` | View / print a tax invoice |
| `/tax-invoices/:id/edit` | Edit a tax invoice |
| `/commercial-invoices` | Commercial (export) invoices — list, create, view/print, PDF, edit, delete |
| `/packing-lists` | Packing lists — create from a commercial invoice or from scratch, view/print, PDF, edit, delete |
| `/companies` | Companies (buyers) — list, search, add, edit, delete |
| `/products` | Products — list, search, add, edit, delete |
| `/settings` | Settings — your own company name, GSTIN, IEC, address, contact, bank account and LUT |

> Every page requires sign-in (Firebase Authentication, email + password); `/login` is the sign-in page.
> Old `/admin/...` links redirect to the same page without `/admin`.

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

Data is stored in the `taxInvoices`, `commercialInvoices`, `packingLists`, `companies` and `products` collections. Development rules are in `firestore.rules`
allow reads and writes only for signed-in users.

## Companies & products

Companies and products are managed from their own tabs in the portal. The tax invoice form picks the PO company and items from
these collections; the item's HSN code is filled in automatically. Each invoice stores a copy of the
buyer's details, so editing or deleting a company later doesn't change existing invoices.

SN Enterprises' own details (address, GSTIN, IEC, contact, bank, LUT) are edited on the **Settings** page and
stored in Firestore (`settings/company`); `src/config/company.js` only holds the starting values. Each invoice and
packing list saves a copy of these details when it is saved, so later changes don't alter documents already issued.

## Commercial invoice fields

Invoice number (suggested as `01/26-27`, per financial year) and date, PO number and date,
consignee/importer and buyer (or "same as consignee") picked from Companies, shipping
(origin, destination, vessel/flight, origin port, port of discharge, destination port — filled from
the consignee's saved export details), items (product, HSN, qty + unit, price, amount; grouped by
HSN on the document), optional notes (printed under the items), packages and marks & numbers,
terms of delivery & payment, and the LUT reference (default from Settings).

## Packing list fields

Same header details as the commercial invoice (invoice no./date, PO, consignee/buyer, shipping,
marks, terms, LUT). Each item has packing rows — boxes, pieces per box, net and gross weight per box —
from which pieces, weights, package numbers ("1 to 5") and the package count are calculated. A
packing list can be started from a commercial invoice ("Create packing list"), which copies its details.

## Tax invoice fields

Invoice date, invoice number (auto-suggested as `SNE/<FY>/<nnn>`), PO date, PO number, PO company,
currency, payment terms, line items (item, HSN, qty, rate, amount) and tax
(CGST 9% + SGST 9%, or IGST 18%). Sub total, taxes and grand total are calculated automatically.

## Sign-in (Firebase Authentication)

One-time setup in the Firebase console:

1. **Build → Authentication → Get started**, then under **Sign-in method** enable **Email/Password**.
2. **Authentication → Users → Add user**: enter the email and password for each person who should
   use the portal. There is no public sign-up page, so only users added here can sign in.
3. Publish the rules in `firestore.rules` (signed-in users only) — `npm run deploy` does this, or paste
   them into **Firestore Database → Rules** and click **Publish**.

"Forgot password?" on the sign-in page emails a reset link to existing users.

For local testing you can run the Firebase emulators and point the app at them with
`VITE_AUTH_EMULATOR=http://127.0.0.1:9099` and `VITE_FIRESTORE_EMULATOR=127.0.0.1:8080`.

## Emailing PDFs (Brevo + Cloudflare Worker, all free plans)

Invoices and packing lists have an **Email** button that sends the PDF as an attachment. Sending goes
through a tiny Cloudflare Worker (`email-worker/`) so the Brevo API key never reaches the browser; the
Worker only accepts requests from signed-in users of this Firebase project and from the allowed websites.

One-time setup:

1. **Brevo** (free: 300 emails/day) — create an account at brevo.com, then
   - *Senders, Domains & Dedicated IPs → Senders*: add and verify the address you'll send from;
   - *SMTP & API → API Keys*: create an API key (keep it secret).
2. **Cloudflare** (free, no card) — create an account at cloudflare.com, then from the project folder:
   ```bash
   cd email-worker && npm install
   npx wrangler login
   npx wrangler secret put BREVO_API_KEY     # paste the Brevo key when asked
   npx wrangler deploy                       # prints the Worker address
   ```
3. Put the printed address in `.env.local`: `VITE_EMAIL_API_URL=https://sn-enterprises-email.<you>.workers.dev`,
   then `npm run deploy`.
4. In the portal, **Settings → Email**: set *Send emails from* to the Brevo-verified address (and optionally
   *Replies go to*).

If you add a custom domain for the portal, add it to `ALLOWED_ORIGINS` in `email-worker/wrangler.toml` and run
`npm run deploy:email`. Each send is recorded on the document ("Emailed to … by … on …").

## Deploying to Firebase Hosting

One-time setup on your computer:

```bash
npx firebase-tools@14 login
```

Then, from the project folder (with `.env.local` in place):

```bash
npm run deploy
```

This builds the site and deploys hosting plus the Firestore rules in `firestore.rules` to the
`sn-enterprises-portal` project (set in `.firebaserc`). The site is served at
`https://sn-enterprises-portal.web.app`; a custom domain can be added later under
Hosting → Add custom domain in the Firebase console.

## Project structure

```
src/
  config/        company details, currencies, tax types, suggestions
  services/      Firestore data access (with localStorage fallback)
  utils/         invoice calculations and formatting
  components/    admin layout, document layouts, shared UI
  auth/          sign-in state and route guard
  pages/admin/   portal pages (dashboard, tax invoices)
```
