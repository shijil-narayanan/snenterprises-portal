import { useSyncExternalStore } from 'react';
import { COMPANY as DEFAULTS } from './company';

// The company's own details as currently saved in Settings (falls back to the defaults).
// Kept in a small module-level store so on-screen pages and off-screen PDF rendering
// read the same values.

let current = DEFAULTS;
const listeners = new Set();

/** Saved settings on top of the defaults (so a missing field never breaks a document). */
export const mergeCompany = (saved = {}) => ({
  ...DEFAULTS,
  ...saved,
  address: { ...DEFAULTS.address, ...saved.address },
  bankDetails: { ...DEFAULTS.bankDetails, ...saved.bankDetails },
});

export const getCompany = () => current;

export function setCompany(saved) {
  current = mergeCompany(saved || {});
  listeners.forEach((l) => l());
}

/** React hook: the current company details, re-rendering when Settings are saved or loaded. */
export function useCompany() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getCompany,
  );
}

/** The current details to store on an invoice (without Settings bookkeeping). */
export function sellerSnapshot() {
  // Not copied onto invoices: private details (Aadhaar), and the signature/stamp images
  // (documents always use the ones in Settings, which keeps each invoice small)
  const { updatedAt: _a, updatedBy: _b, aadhaar: _c, signatureImage: _d, stampImage: _e, signOnDocuments: _f, ...company } = current;
  return company;
}
